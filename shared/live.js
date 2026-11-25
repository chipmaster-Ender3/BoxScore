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
  /* 7.82: vídeo da transmissão do jogador dentro da página ao vivo. livevid/{id do ao vivo} = { owner, p, v, dl, at }.
     p: 'yt' (vídeo do YouTube), 'ytc' (canal do YouTube: mostra a live que estiver no ar), 'tw' (Twitch), 'kk' (Kick); v: id do vídeo ou do canal;
     dl: atraso do vídeo em segundos (a página ao vivo segura o placar esse tempo). Nunca guardamos o endereço colado: só p + v, e o
     endereço do player é montado aqui, sempre num destes três sites. */
  var VID_DL = { yt: 15, ytc: 15, tw: 10, kk: 10 }, VID_NAME = { yt: 'YouTube', ytc: 'YouTube', tw: 'Twitch', kk: 'Kick' };
  var TW_RES = /^(directory|videos|settings|search|downloads|p|subscriptions|inventory|wallet|drops|turbo|jobs|login|signup)$/i;
  var KK_RES = /^(categories|category|following|search|video|videos|clips|dashboard|login|signup|terms-of-service|privacy-policy)$/i;
  // devolve { p, v } ou { err: 'handle' | 'site' | 'bad' }
  function parseVid(s) {
    s = String(s || '').trim(); if (!s) return null;
    if (!/^[a-z]+:\/\//i.test(s)) s = 'https://' + s;
    var u; try { u = new URL(s); } catch (e) { return { err: 'bad' }; }
    var h = u.hostname.toLowerCase().replace(/^(www|m|music)\./, ''), parts = u.pathname.split('/').filter(Boolean), id;
    var YT = /^[A-Za-z0-9_-]{11}$/;
    if (h === 'youtu.be') { id = parts[0] || ''; return YT.test(id) ? { p: 'yt', v: id } : { err: 'bad' }; }
    if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
      id = u.searchParams.get('v');
      if (id && YT.test(id)) return { p: 'yt', v: id };
      if (/^(live|embed|shorts|v)$/.test(parts[0] || '') && YT.test(parts[1] || '')) return { p: 'yt', v: parts[1] };
      if (parts[0] === 'channel' && /^UC[A-Za-z0-9_-]{22}$/.test(parts[1] || '')) return { p: 'ytc', v: parts[1] };
      if (parts[0] === 'embed' && parts[1] === 'live_stream' && /^UC[A-Za-z0-9_-]{22}$/.test(u.searchParams.get('channel') || '')) return { p: 'ytc', v: u.searchParams.get('channel') };
      if ((parts[0] || '').charAt(0) === '@' || parts[0] === 'c' || parts[0] === 'user') return { err: 'handle' };
      return { err: 'bad' };
    }
    if (h === 'twitch.tv' || h === 'player.twitch.tv') {
      id = h === 'player.twitch.tv' ? (u.searchParams.get('channel') || '') : (parts[0] || '');
      return /^[A-Za-z0-9_]{3,25}$/.test(id) && !TW_RES.test(id) ? { p: 'tw', v: id.toLowerCase() } : { err: 'bad' };
    }
    if (h === 'kick.com' || h === 'player.kick.com') {
      id = parts[0] || '';
      return /^[A-Za-z0-9_-]{3,25}$/.test(id) && !KK_RES.test(id) ? { p: 'kk', v: id.toLowerCase() } : { err: 'bad' };
    }
    return { err: 'site' };
  }
  function vidOk(x) { return !!(x && VID_DL[x.p] && /^[A-Za-z0-9_-]{2,30}$/.test(String(x.v || ''))); }
  // endereço do player (iframe). host = domínio da página (o Twitch exige)
  function vidSrc(x, host) {
    if (!vidOk(x)) return '';
    var v = encodeURIComponent(x.v);
    if (x.p === 'yt') return 'https://www.youtube.com/embed/' + v + '?autoplay=1&mute=1&playsinline=1&rel=0';
    if (x.p === 'ytc') return 'https://www.youtube.com/embed/live_stream?channel=' + v + '&autoplay=1&mute=1&playsinline=1';
    if (x.p === 'tw') return 'https://player.twitch.tv/?channel=' + v + '&parent=' + encodeURIComponent(host || 'localhost') + '&muted=true&autoplay=true';
    return 'https://player.kick.com/' + v + '?muted=true&autoplay=true';
  }
  // endereço para abrir no site/app da plataforma (quando o vídeo não pode ser incorporado)
  function vidPage(x) {
    if (!vidOk(x)) return '';
    var v = encodeURIComponent(x.v);
    return x.p === 'yt' ? 'https://www.youtube.com/watch?v=' + v : x.p === 'ytc' ? 'https://www.youtube.com/channel/' + v + '/live' : x.p === 'tw' ? 'https://www.twitch.tv/' + v : 'https://kick.com/' + v;
  }
  root.BXLive = { SITE: SITE, LIVE_MS: LIVE_MS, AFTER_MS: AFTER_MS, base: base, url: url, newId: newId, line: line, active: active, waText: waText,
    VID_DL: VID_DL, VID_NAME: VID_NAME, parseVid: parseVid, vidOk: vidOk, vidSrc: vidSrc, vidPage: vidPage };
})(typeof self !== 'undefined' ? self : this);
