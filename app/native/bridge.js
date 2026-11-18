/* BoxScore — ponte do app nativo (Capacitor).
   Carregada antes de tudo em cada página do app. No navegador (PWA) não faz nada.
   Ideia: em vez de mudar o código do Placar/Rede, oferecemos as mesmas APIs do navegador
   (Web Bluetooth, speechSynthesis, wakeLock, login Google) implementadas com plugins nativos. */
import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

(function () {
  if (!Capacitor.isNativePlatform()) return;
  window.BX_NATIVE = Capacitor.getPlatform();   // 'android' | 'ios'

  /* ---------- sem service worker no app (os arquivos já estão dentro do app) ---------- */
  try { if (navigator.serviceWorker) navigator.serviceWorker.register = function () { return Promise.reject(new Error('native')); }; } catch (e) {}

  /* ---------- Bluetooth: Web Bluetooth em cima do plugin nativo ---------- */
  var inited = null, KEY = 'boxscore.native.bleDevices';
  function init() { return inited || (inited = BleClient.initialize({ androidNeverForLocation: true })); }
  function known() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function remember(d) { var l = known().filter(function (x) { return x.id !== d.id; }); l.push({ id: d.id, name: d.name || '' }); try { localStorage.setItem(KEY, JSON.stringify(l.slice(-8))); } catch (e) {} }
  function u128(u) { return String(u).toLowerCase(); }
  function toDV(buf) {
    if (buf instanceof DataView) return buf;
    if (ArrayBuffer.isView(buf)) return new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    return new DataView(buf);
  }
  function Emitter(o) { var L = {}; o.addEventListener = function (t, f) { (L[t] = L[t] || []).push(f); }; o.removeEventListener = function (t, f) { L[t] = (L[t] || []).filter(function (x) { return x !== f; }); }; o._emit = function (t, ev) { (L[t] || []).slice().forEach(function (f) { try { f(ev); } catch (e) {} }); }; return o; }
  var devices = {};
  function Device(id, name) {
    if (devices[id]) return devices[id];
    var dev = Emitter({ id: id, name: name || '' });
    var gatt = { device: dev, connected: false };
    gatt.connect = function () {
      return init().then(function () {
        return BleClient.connect(id, function () { gatt.connected = false; dev._emit('gattserverdisconnected', { target: dev }); }, { timeout: 12000 });
      }).then(function () { gatt.connected = true; remember(dev); return gatt; });
    };
    gatt.disconnect = function () { gatt.connected = false; BleClient.disconnect(id).catch(function () {}); };
    gatt.getPrimaryService = function (svcUuid) {
      var svc = u128(svcUuid);
      return Promise.resolve({
        uuid: svc,
        getCharacteristic: function (chUuid) {
          var cu = u128(chUuid), ch = Emitter({ uuid: cu, value: null });
          ch.readValue = function () { return BleClient.read(id, svc, cu).then(function (v) { ch.value = v; return v; }); };
          ch.writeValue = function (buf) { return BleClient.write(id, svc, cu, toDV(buf)); };
          ch.writeValueWithResponse = ch.writeValue;
          ch.startNotifications = function () {
            return BleClient.startNotifications(id, svc, cu, function (v) { ch.value = v; ch._emit('characteristicvaluechanged', { target: ch }); }).then(function () { return ch; });
          };
          ch.stopNotifications = function () { return BleClient.stopNotifications(id, svc, cu).then(function () { return ch; }); };
          return Promise.resolve(ch);
        }
      });
    };
    dev.gatt = gatt;
    return (devices[id] = dev);
  }
  var bt = {
    getAvailability: function () { return init().then(function () { return true; }, function () { return false; }); },
    requestDevice: function (opts) {
      var o = { optionalServices: (opts && opts.optionalServices || []).map(u128) }, f = (opts && opts.filters && opts.filters[0]) || {};
      if (f.services) o.services = f.services.map(u128);
      if (f.name) o.name = f.name;
      if (f.namePrefix) o.namePrefix = f.namePrefix;
      return init().then(function () { return BleClient.requestDevice(o); }).then(function (d) { var dev = Device(d.deviceId, d.name); remember(dev); return dev; })
        .catch(function (e) { var er = new Error((e && e.message) || 'cancel'); er.name = /cancel/i.test(er.message) ? 'NotFoundError' : 'NetworkError'; throw er; });
    },
    // pulseiras já pareadas: no Android dá para conectar direto pelo endereço, sem procurar de novo
    getDevices: function () { return Promise.resolve(known().map(function (x) { return Device(x.id, x.name); })); }
  };
  try { Object.defineProperty(navigator, 'bluetooth', { value: bt, configurable: true }); } catch (e) {}

  /* ---------- Voz: speechSynthesis em cima do TTS nativo ---------- */
  // 7.6.1: no Android, depois de TextToSpeech.stop() a promessa do speak() interrompido às vezes nunca volta.
  // Antes isso deixava a fila "ocupada" para sempre (a voz parava ao marcar ponto durante a fala).
  // Agora cada fala tem um número (gen): cancelar libera a fila na hora e ignora a resposta antiga,
  // e um vigia libera a fila se o nativo não responder no tempo esperado.
  var queue = [], busy = false, gen = 0, cur = null, guard = 0, stopping = null;
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function fire(u, k, ev) { try { if (u && u[k]) u[k](ev); } catch (e) {} }
  function release(g) { if (g !== gen || !busy) return; busy = false; cur = null; clearTimeout(guard); next(); }
  function next() {
    synth.pending = queue.length > 0;
    if (busy || !queue.length) { synth.speaking = busy; return; }
    var u = queue.shift(), g = ++gen; busy = true; cur = u; synth.speaking = true; synth.pending = queue.length > 0;
    function go() {
      if (g !== gen) return;
      fire(u, 'onstart', { utterance: u });
      clearTimeout(guard);
      guard = setTimeout(function () { release(g); }, 4000 + 110 * String(u.text || '').length / Math.max(0.5, u.rate || 1));
      TextToSpeech.speak({ text: u.text, lang: u.lang || 'pt-BR', rate: u.rate || 1, volume: u.volume == null ? 1 : u.volume, pitch: 1, category: 'playback' })
        .then(function () { if (g === gen) fire(u, 'onend', { utterance: u }); },
              function (e) { if (g === gen) fire(u, 'onerror', { utterance: u, error: (e && e.message) || 'synthesis-failed' }); })
        .then(function () { release(g); });
    }
    if (stopping) stopping.then(go, go); else go();
  }
  var synth = {
    speaking: false, pending: false, paused: false, onvoiceschanged: null,
    speak: function (u) { queue.push(u); next(); },
    cancel: function () {
      queue = []; synth.pending = false;
      if (!busy) return;
      var u = cur; gen++; busy = false; cur = null; clearTimeout(guard); synth.speaking = false;
      fire(u, 'onerror', { utterance: u, error: 'interrupted' });
      // espera o stop (no máximo 600 ms) antes da próxima fala, para o stop não cortar a fala nova
      var p = Promise.race([TextToSpeech.stop().catch(function () {}), wait(600)]);
      stopping = p; p.then(function () { if (stopping === p) stopping = null; });
    },
    getVoices: function () { return []; }, pause: function () {}, resume: function () {},
    addEventListener: function () {}, removeEventListener: function () {}
  };
  function Utterance(text) { this.text = text || ''; this.lang = ''; this.rate = 1; this.volume = 1; this.pitch = 1; this.voice = null; }
  try { Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true }); } catch (e) {}
  window.SpeechSynthesisUtterance = Utterance;

  /* ---------- Tela ligada ---------- */
  var wake = {
    request: function () {
      return KeepAwake.keepAwake().then(function () {
        var l = Emitter({ released: false, type: 'screen' });
        l.release = function () { l.released = true; return KeepAwake.allowSleep().then(function () { l._emit('release', {}); }); };
        return l;
      });
    }
  };
  try { Object.defineProperty(navigator, 'wakeLock', { value: wake, configurable: true }); } catch (e) {}

  /* ---------- Login Google nativo (a sessão continua no Firebase JS do app) ---------- */
  function patchAuth() {
    var fb = window.firebase; if (!fb || !fb.auth || !fb.auth.Auth || fb.auth.Auth.prototype._bxNative) return false;
    var P = fb.auth.Auth.prototype; P._bxNative = true;
    var google = function (auth) {
      return FirebaseAuthentication.signInWithGoogle().then(function (r) {
        var tok = r && r.credential && r.credential.idToken; if (!tok) throw Object.assign(new Error('Login cancelado'), { code: 'auth/cancelled-popup-request' });
        return auth.signInWithCredential(fb.auth.GoogleAuthProvider.credential(tok));
      });
    };
    var pop = P.signInWithPopup, red = P.signInWithRedirect, out = P.signOut;
    P.signInWithPopup = function (prov) { return prov && prov.providerId === 'google.com' ? google(this) : pop.apply(this, arguments); };
    P.signInWithRedirect = function (prov) { return prov && prov.providerId === 'google.com' ? google(this) : red.apply(this, arguments); };
    P.getRedirectResult = function () { return Promise.resolve({ user: null, credential: null }); };
    P.signOut = function () { var me = this; return FirebaseAuthentication.signOut().catch(function () {}).then(function () { return out.call(me); }); };
    return true;
  }
  if (!patchAuth()) { var tries = 0, iv = setInterval(function () { if (patchAuth() || ++tries > 600) clearInterval(iv); }, 50); }
})();
