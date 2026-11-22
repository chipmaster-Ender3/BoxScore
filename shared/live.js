/* BoxScore shared/live.js — Placar ao vivo (7.47): endereço público do link, id, texto do placar.
 * O documento live/{id} é gravado pelo Placar (dono) e lido pela página aovivo/ (sem login) e pela Comunidade (anúncio).
 * Formato: { owner, ownerName, on, ann, audience[], names[2], mode, place, sc:{ sets:['6-4','7-6'...], g:[a,b], p:['15','30'], srv:0|1|-1, tb:bool, w:-1|0|1, sw:[a,b] },
 *            ins[] (resumo no fim), startedAt, updatedAt, endedAt (0 = em andamento), expAt (o link vale até aqui) } */
(function (root) {
  'use strict';
  // site público (o app nativo não tem endereço próprio: o link vai sempre para o site). Ao mudar de hospedagem, trocar aqui.
  var SITE = 'https://chipmaster-ender3.github.io/BoxScore/';
  var LIVE_MS = 6 * 3600e3, AFTER_MS = 3 * 3600e3;   // em andamento: vale 6 h desde o último ponto; depois do fim: 3 h
  function isNative() { try { return !!(root.Capacitor && root.Capacitor.isNativePlatform && root.Capacitor.isNativePlatform()); } catch (e) { return false; } }
  function base() {
    if (!isNative() && /^https?:$/.test(location.protocol)) { try { return new URL('../', location.href).href; } catch (e) {} }
    return SITE;
  }
  function url(id) { return base() + 'aovivo/?id=' + encodeURIComponent(id); }
  function newId() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', s = '', b = new Uint8Array(22);
    try { crypto.getRandomValues(b); } catch (e) { for (var k = 0; k < b.length; k++) b[k] = Math.floor(Math.random() * 256); }
    for (var i = 0; i < b.length; i++) s += A.charAt(b[i] % A.length);
    return s;
  }
  // "6-4 3-2 · 30-15" (o ponto do game em andamento só enquanto a partida não acabou)
  function line(d) {
    var sc = (d && d.sc) || {}, sets = (sc.sets || []).map(function (x) { return Array.isArray(x) ? x[0] + '-' + x[1] : String(x); });
    var g = sc.g || [0, 0], over = sc.w === 0 || sc.w === 1;
    if (!over) sets.push(g[0] + '-' + g[1]);
    var t = sets.join(' ');
    if (!over && sc.p && (sc.p[0] !== '0' || sc.p[1] !== '0')) t += ' · ' + sc.p[0] + '-' + sc.p[1];
    return t;
  }
  function active(d, now) { now = now || Date.now(); return !!(d && d.on && !d.endedAt && d.expAt > now); }
  function waText(name0, name1, u) { return name0 + ' x ' + name1 + ' · ' + u; }
  root.BXLive = { SITE: SITE, LIVE_MS: LIVE_MS, AFTER_MS: AFTER_MS, base: base, url: url, newId: newId, line: line, active: active, waText: waText };
})(typeof self !== 'undefined' ? self : this);
