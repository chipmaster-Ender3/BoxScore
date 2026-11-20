/* BoxScore — cartão do resultado (imagem 1080×1350) para compartilhar. Beta 7.23.
 * Antes ficava dentro do Placar; agora o Placar e a Rede desenham a mesma imagem, com os mesmos 5 temas.
 * Uso: BXCard.draw(partida, tema, ctx) → Promise<canvas>
 *   partida: { names:[a,b], players:[[..],[..]], pids:[[..],[..]], setsWon:[x,y], winner:0|1|null, finished, sets:[{games:[a,b], tb?, kind?} ou {txt}], place, surface, playStart, endedAt, id }
 *   ctx: { colors:{p1,p2,num}, players:{id:{photo}}, locale, lang, surf:{saibro:'Saibro',…}, T, Tf } — T/Tf opcionais (sem eles usa o dicionário daqui)
 */
(function () {
  'use strict';
  var C = {};
  var DICT = {"en": {"BoxScore · placar de tênis": "BoxScore · tennis scoreboard", "PARTIDA INACABADA": "UNFINISHED MATCH", "Partida inacabada": "Unfinished match", "SETS": "SETS", "VENCEDOR": "WINNER", "Duração {0}": "Duration {0}", "VITÓRIA DE {0}": "{0} WINS", "{0} SETS A {1}": "{0} SETS TO {1}"}, "es": {"BoxScore · placar de tênis": "BoxScore · marcador de tenis", "PARTIDA INACABADA": "PARTIDO SIN TERMINAR", "Partida inacabada": "Partido sin terminar", "VENCEDOR": "GANADOR", "Duração {0}": "Duración {0}", "VITÓRIA DE {0}": "VICTORIA DE {0}"}, "fr": {"BoxScore · placar de tênis": "BoxScore · tableau de score de tennis", "PARTIDA INACABADA": "MATCH INACHEVÉ", "Partida inacabada": "Match inachevé", "VENCEDOR": "VAINQUEUR", "Duração {0}": "Durée {0}", "VITÓRIA DE {0}": "VICTOIRE DE {0}", "{0} SETS A {1}": "{0} SETS À {1}"}, "de": {"BoxScore · placar de tênis": "BoxScore · Tennis-Spielstand", "PARTIDA INACABADA": "UNVOLLENDETES MATCH", "Partida inacabada": "Unvollendetes Match", "SETS": "SÄTZE", "VENCEDOR": "SIEGER", "Duração {0}": "Dauer {0}", "VITÓRIA DE {0}": "SIEG FÜR {0}", "{0} SETS A {1}": "{0}:{1} SÄTZE", "{0} h {1} min": "{0} Std. {1} Min.", "{0} min": "{0} Min."}, "pt-PT": {"BoxScore · placar de tênis": "BoxScore · marcador de ténis"}};
  function T(s) { if (C.T) return C.T(s); var d = DICT[C.lang] || (C.lang && DICT[String(C.lang).slice(0, 2)]); return (d && d[s]) || s; }
  function Tf(s) { var a = arguments; if (C.Tf) return C.Tf.apply(null, a); return T(s).replace(/\{(\d)\}/g, function (m, i) { var v = a[+i + 1]; return v == null ? '' : String(v); }); }
  function durOf(e) {
    if (!e || !e.playStart) return 0;
    if (e.finished) return e.endedAt ? Math.max(0, e.endedAt - e.playStart) : 0;
    var l = e.plog && e.plog.length ? e.plog[e.plog.length - 1] : null;
    return l && l[9] > 0 ? l[9] * 1000 : 0;
  }
  function fmtDurText(ms) { var m = Math.round(ms / 60000), h = Math.floor(m / 60); return h ? Tf("{0} h {1} min", h, (m % 60)) : Tf("{0} min", Math.max(m, 1)); }
  function setText(r) {
    if (r.txt) return r.txt;
    if (r.kind === 'super') return '[' + r.tb[0] + '-' + r.tb[1] + ']';
    if (r.tb) return r.games[0] + '-' + r.games[1] + '(' + Math.min(r.tb[0], r.tb[1]) + ')';
    return r.games[0] + '-' + r.games[1];
  }
  function loadImg(src) { return new Promise(function (res) { if (!src) { res(null); return; } var im = new Image(); if (/^https?:/i.test(src)) im.crossOrigin = 'anonymous'; im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; }); }
  function fontsReady() {
    return new Promise(function (res) {
      var done = false; function fin() { if (!done) { done = true; res(); } }
      setTimeout(fin, 1500);
      try { if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('900 80px "Big Shoulders Display"'), document.fonts.load('800 80px "Big Shoulders Display"'), document.fonts.load('700 30px "Public Sans"')]).then(fin, fin); else fin(); } catch (x) { fin(); }
    });
  }
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fitFont(c, text, weight, family, maxW, start, min) {
    var sz = start; c.font = weight + ' ' + sz + 'px ' + family;
    while (sz > min && c.measureText(text).width > maxW) { sz -= 2; c.font = weight + ' ' + sz + 'px ' + family; }
    return sz;
  }
  // 7.13: temas do cartão (Clássico + 4 ilustrados, desenhados no próprio canvas, sem fotos de terceiros)
  var CARD_THEMES = ['classic', 'clay', 'grass', 'night', 'floral'];
  function seeded(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return function () { h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function spaced(c, px) { try { if ('letterSpacing' in c) c.letterSpacing = px + 'px'; } catch (x) {} }
  function drawBall(c, x, y, r, glow) {
    c.save();
    if (glow) { var g0 = c.createRadialGradient(x, y, r * .6, x, y, r * 3.2); g0.addColorStop(0, 'rgba(230,255,80,.55)'); g0.addColorStop(1, 'rgba(230,255,80,0)'); c.fillStyle = g0; c.beginPath(); c.arc(x, y, r * 3.2, 0, Math.PI * 2); c.fill(); }
    c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = r * .5; c.shadowOffsetY = r * .18;
    var g = c.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r); g.addColorStop(0, '#F4FF7A'); g.addColorStop(.6, '#D7EA2C'); g.addColorStop(1, '#A9BC14');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.shadowColor = 'transparent'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
    c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = r * .13; c.lineCap = 'round';
    c.beginPath(); c.arc(x - r * 1.25, y, r * .95, -0.9, 0.9); c.stroke();
    c.beginPath(); c.arc(x + r * 1.25, y, r * .95, Math.PI - 0.9, Math.PI + 0.9); c.stroke();
    c.restore();
  }
  function drawRacket(c, x, y, s, ang, frame, accent, strings, grip) {
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
    c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 26; c.shadowOffsetX = 10; c.shadowOffsetY = 14;
    // cabo e garganta
    c.fillStyle = grip; rrect(c, -22, 205, 44, 250, 14); c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 3; for (var gy = 225; gy < 445; gy += 26) { c.beginPath(); c.moveTo(-22, gy); c.lineTo(22, gy + 14); c.stroke(); }
    c.fillStyle = frame; rrect(c, -24, 440, 48, 26, 8); c.fill();
    c.strokeStyle = frame; c.lineWidth = 20; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-18, 210); c.lineTo(-92, 150); c.moveTo(18, 210); c.lineTo(92, 150); c.stroke();
    // cordas
    c.save(); c.beginPath(); c.ellipse(0, -40, 132, 182, 0, 0, Math.PI * 2); c.clip();
    c.strokeStyle = strings; c.lineWidth = 3.2;
    for (var sx = -130; sx <= 130; sx += 19) { c.beginPath(); c.moveTo(sx, -230); c.lineTo(sx, 150); c.stroke(); }
    for (var sy = -220; sy <= 140; sy += 19) { c.beginPath(); c.moveTo(-140, sy); c.lineTo(140, sy); c.stroke(); }
    c.restore();
    // aro
    c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 18; c.shadowOffsetX = 8; c.shadowOffsetY = 10;
    c.lineWidth = 24; c.strokeStyle = frame; c.beginPath(); c.ellipse(0, -40, 146, 196, 0, 0, Math.PI * 2); c.stroke();
    c.shadowColor = 'transparent'; c.lineWidth = 7; c.strokeStyle = accent; c.beginPath(); c.ellipse(0, -40, 146, 196, 0, Math.PI * .62, Math.PI * 1.38); c.stroke();
    c.restore();
  }
  function drawFlower(c, x, y, r, petals, col, center, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    for (var i = 0; i < petals; i++) {
      c.save(); c.rotate(i * Math.PI * 2 / petals);
      var g = c.createLinearGradient(0, 0, 0, -r); g.addColorStop(0, col[1]); g.addColorStop(1, col[0]);
      c.fillStyle = g; c.beginPath(); c.ellipse(0, -r * .55, r * .36, r * .58, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    c.fillStyle = center; c.beginPath(); c.arc(0, 0, r * .22, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)'; for (var d = 0; d < 6; d++) { c.beginPath(); c.arc(Math.cos(d) * r * .1, Math.sin(d * 1.7) * r * .1, r * .03, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  function drawLeaf(c, x, y, len, ang, col) {
    c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = col;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * .5, -len * .28, len, 0); c.quadraticCurveTo(len * .5, len * .28, 0, 0); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(len * .08, 0); c.lineTo(len * .9, 0); c.stroke(); c.restore();
  }
  function drawScene(c, e, teams, theme, DF, UF) {
    var W = 1080, H = 1350, rnd = seeded(String(e.id || e.playStart || 'x') + theme);
    var TH = {
      clay:   { bg: '#F3E9DD', panel: '#1E2A5A', ink: '#FFFFFF', sub: '#C9D2F0', lab: '#F2B48A', chipBg: 'rgba(20,24,40,.55)', chipInk: '#FFFFFF', brand: '#8A7A6A' },
      grass:  { bg: '#EFEDE3', panel: '#FBF8EE', ink: '#1F3B2A', sub: '#5E6B5F', lab: '#5B2A86', chipBg: 'rgba(255,255,255,.82)', chipInk: '#1F3B2A', brand: '#7A8370', serif: true },
      night:  { bg: '#060B16', panel: '#0F1830', ink: '#FFFFFF', sub: '#9FB0D6', lab: '#E4FF4F', chipBg: 'rgba(0,0,0,.45)', chipInk: '#FFFFFF', brand: '#5D6C8F', line: '#2B3A63' },
      floral: { bg: '#FBE9EC', panel: '#FFFAF7', ink: '#7A2E4C', sub: '#A26C80', lab: '#C2577D', chipBg: 'rgba(255,255,255,.8)', chipInk: '#7A2E4C', brand: '#C49AA8', serif: true }
    }[theme];
    var SF = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif';
    var HF = TH.serif ? SF : DF;
    c.fillStyle = TH.bg; c.fillRect(0, 0, W, H);
    var sx = 40, sy = 40, sw = 1000, sh = 700, R = 40;
    // ---- cena ilustrada
    c.save(); rrect(c, sx, sy, sw, sh, R); c.clip();
    if (theme === 'clay') {
      var g = c.createLinearGradient(0, sy, 0, sy + sh); g.addColorStop(0, '#D8703E'); g.addColorStop(1, '#B9542A'); c.fillStyle = g; c.fillRect(sx, sy, sw, sh);
      for (var i = 0; i < 9000; i++) { c.fillStyle = rnd() < .5 ? 'rgba(255,220,190,.10)' : 'rgba(90,30,10,.10)'; c.fillRect(sx + rnd() * sw, sy + rnd() * sh, 2 + rnd() * 3, 2 + rnd() * 2); }
      c.strokeStyle = 'rgba(255,250,240,.93)'; c.lineWidth = 16;
      c.beginPath(); c.moveTo(sx, sy + 250); c.lineTo(sx + sw, sy + 250); c.stroke();
      c.beginPath(); c.moveTo(sx + 470, sy + 250); c.lineTo(sx + 470, sy + sh); c.stroke();
      c.beginPath(); c.moveTo(sx + 140, sy - 10); c.lineTo(sx + 140, sy + sh); c.stroke();
      for (var j = 0; j < 160; j++) { c.fillStyle = 'rgba(185,84,42,.35)'; c.fillRect(sx + rnd() * sw, sy + 242 + rnd() * 16, 3, 3); }
      drawRacket(c, sx + 600, sy + 330, 1.05, -0.62, '#1B1B1F', '#E2462F', 'rgba(250,250,245,.9)', '#F1EEE6');
      drawBall(c, sx + 300, sy + 470, 46);
    } else if (theme === 'grass') {
      for (var b = 0; b < 12; b++) { c.fillStyle = b % 2 ? '#4F8F3A' : '#5DA043'; c.fillRect(sx + b * 90, sy, 90, sh); }
      for (var i2 = 0; i2 < 7000; i2++) { c.fillStyle = rnd() < .5 ? 'rgba(255,255,255,.06)' : 'rgba(0,40,0,.08)'; c.fillRect(sx + rnd() * sw, sy + rnd() * sh, 1.5, 4 + rnd() * 5); }
      c.strokeStyle = 'rgba(255,255,255,.94)'; c.lineWidth = 12;
      c.beginPath(); c.moveTo(sx, sy + 520); c.lineTo(sx + sw, sy + 520); c.stroke();
      c.beginPath(); c.moveTo(sx + 760, sy); c.lineTo(sx + 760, sy + 520); c.stroke();
      c.beginPath(); c.moveTo(sx, sy + 140); c.lineTo(sx + 760, sy + 140); c.stroke();
      var vg = c.createLinearGradient(0, sy, 0, sy + sh); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,30,0,.25)'); c.fillStyle = vg; c.fillRect(sx, sy, sw, sh);
      drawRacket(c, sx + 420, sy + 330, 1.0, 0.55, '#F7F5EE', '#5B2A86', 'rgba(60,60,60,.75)', '#3B2A55');
      drawBall(c, sx + 790, sy + 590, 44);
    } else if (theme === 'night') {
      c.fillStyle = '#123A3C'; c.fillRect(sx, sy, sw, sh);
      c.fillStyle = '#1D4F9C'; c.fillRect(sx + 110, sy + 70, sw - 220, sh);
      for (var i3 = 0; i3 < 5000; i3++) { c.fillStyle = 'rgba(255,255,255,.035)'; c.fillRect(sx + rnd() * sw, sy + rnd() * sh, 2, 2); }
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 10;
      c.strokeRect(sx + 110, sy + 70, sw - 220, sh + 40);
      c.beginPath(); c.moveTo(sx + 110, sy + 400); c.lineTo(sx + sw - 110, sy + 400); c.stroke();
      c.beginPath(); c.moveTo(sx + sw / 2, sy + 400); c.lineTo(sx + sw / 2, sy + sh); c.stroke();
      c.beginPath(); c.moveTo(sx + 210, sy + 70); c.lineTo(sx + 210, sy + sh); c.moveTo(sx + sw - 210, sy + 70); c.lineTo(sx + sw - 210, sy + sh); c.stroke();
      [[sx + 60, sy - 40], [sx + sw - 60, sy - 40]].forEach(function (p) { var lg = c.createRadialGradient(p[0], p[1], 10, p[0], p[1], 520); lg.addColorStop(0, 'rgba(255,255,235,.55)'); lg.addColorStop(1, 'rgba(255,255,235,0)'); c.fillStyle = lg; c.fillRect(sx, sy, sw, sh); });
      var vn = c.createRadialGradient(sx + sw / 2, sy + sh * .45, 200, sx + sw / 2, sy + sh * .45, 760); vn.addColorStop(0, 'rgba(0,0,0,0)'); vn.addColorStop(1, 'rgba(0,0,10,.65)'); c.fillStyle = vn; c.fillRect(sx, sy, sw, sh);
      drawRacket(c, sx + 330, sy + 360, 1.0, -0.35, '#101114', '#E4FF4F', 'rgba(230,240,255,.85)', '#22252C');
      drawBall(c, sx + 720, sy + 300, 44, true);
    } else {
      var fg = c.createLinearGradient(sx, sy, sx + sw, sy + sh); fg.addColorStop(0, '#F9D9DF'); fg.addColorStop(1, '#F3C6CF'); c.fillStyle = fg; c.fillRect(sx, sy, sw, sh);
      for (var d2 = 0; d2 < 260; d2++) { c.fillStyle = 'rgba(255,255,255,' + (0.15 + rnd() * .25) + ')'; c.beginPath(); c.arc(sx + rnd() * sw, sy + rnd() * sh, 2 + rnd() * 4, 0, Math.PI * 2); c.fill(); }
      var PAL = [['#F7A8B8', '#E86E8E'], ['#FFD3B6', '#F49A75'], ['#D9C2F0', '#A884D6'], ['#FFFFFF', '#F2C7D3'], ['#F8BFCB', '#D9567A']];
      var spots = [];
      for (var f = 0; f < 34; f++) {
        var edge = rnd(), fx, fy;
        if (edge < .3) { fx = sx + rnd() * sw; fy = sy + rnd() * 150; } else if (edge < .6) { fx = sx + rnd() * sw; fy = sy + sh - rnd() * 150; } else if (edge < .8) { fx = sx + rnd() * 170; fy = sy + rnd() * sh; } else { fx = sx + sw - rnd() * 170; fy = sy + rnd() * sh; }
        spots.push([fx, fy]);
      }
      spots.forEach(function (p) { for (var l = 0; l < 2; l++) drawLeaf(c, p[0], p[1], 70 + rnd() * 60, rnd() * Math.PI * 2, rnd() < .5 ? '#9DB79A' : '#7FA182'); });
      spots.forEach(function (p) { var pc = PAL[Math.floor(rnd() * PAL.length)]; drawFlower(c, p[0], p[1], 38 + rnd() * 44, rnd() < .5 ? 5 : 6, pc, rnd() < .5 ? '#F6C453' : '#E99A5A', rnd() * 6); });
      drawRacket(c, sx + 500, sy + 350, 0.98, -0.5, '#C98A9E', '#F6E2C8', 'rgba(255,255,255,.95)', '#E9B7C4');
      drawBall(c, sx + 300, sy + 520, 42);
    }
    c.restore();
    // chips sobre a cena
    var dt = ''; try { dt = new Date(e.playStart || e.startedAt).toLocaleDateString(C.locale, { day: '2-digit', month: 'long', year: 'numeric' }); } catch (x) {}
    function chip(txt, x, y, right) {
      c.font = '800 28px ' + UF; spaced(c, 3); var w = c.measureText(txt).width + 44; spaced(c, 0);
      var x0 = right ? x - w : x; c.fillStyle = TH.chipBg; rrect(c, x0, y, w, 56, 28); c.fill();
      c.fillStyle = TH.chipInk; c.textAlign = 'center'; spaced(c, 3); c.fillText(txt, x0 + w / 2, y + 38); spaced(c, 0);
    }
    chip('BOXSCORE', sx + 28, sy + 28, false); if (dt) chip(dt.toUpperCase(), sx + sw - 28, sy + 28, true);
    // ---- painel do resultado
    var py = 770, ph = 540; c.fillStyle = TH.panel; rrect(c, sx, py, sw, ph, R); c.fill();
    if (theme === 'floral') { c.strokeStyle = '#F2C7D3'; c.lineWidth = 4; rrect(c, sx + 14, py + 14, sw - 28, ph - 28, R - 10); c.stroke(); }
    if (theme === 'grass') { c.strokeStyle = '#5B2A86'; c.lineWidth = 3; rrect(c, sx + 14, py + 14, sw - 28, ph - 28, R - 10); c.stroke(); }
    var lab = e.finished && e.winner !== null && e.winner !== undefined ? Tf("VITÓRIA DE {0}", e.names[e.winner].toUpperCase()) + ' · ' + Tf("{0} SETS A {1}", Math.max(e.setsWon[0], e.setsWon[1]), Math.min(e.setsWon[0], e.setsWon[1])) : T("PARTIDA INACABADA");
    c.textAlign = 'left'; c.fillStyle = TH.lab; c.font = '800 30px ' + UF; spaced(c, 4); fitFont(c, lab, 800, UF, sw - 120, 30, 20); spaced(c, 4); c.fillText(lab, sx + 60, py + 88); spaced(c, 0);
    var sets = (e.sets || []).map(setText).join('   ');
    if (!sets) sets = e.setsWon[0] + '–' + e.setsWon[1];
    c.fillStyle = TH.ink; fitFont(c, sets, TH.serif ? 700 : 900, HF, sw - 120, TH.serif ? 140 : 170, 70); c.fillText(sets, sx + 56, py + (TH.serif ? 225 : 238));
    // jogadores: uma linha por lado — [fotos] Nome ............ sets
    var AR = 38;
    [0, 1].forEach(function (t) {
      var team = teams[t], ry = py + 318 + t * 92, n = team.length, step = AR * 1.45, x0 = sx + 60;
      team.forEach(function (p, i) {
        var ax = x0 + AR + i * step;
        c.save(); c.beginPath(); c.arc(ax, ry, AR, 0, Math.PI * 2); c.fillStyle = theme === 'clay' || theme === 'night' ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.08)'; c.fill(); c.clip();
        if (p.img) { var m = Math.min(p.img.width, p.img.height); c.drawImage(p.img, (p.img.width - m) / 2, (p.img.height - m) / 2, m, m, ax - AR, ry - AR, AR * 2, AR * 2); }
        else { c.fillStyle = TH.ink; c.textAlign = 'center'; c.font = '800 34px ' + UF; c.fillText((p.name || '?').trim().charAt(0).toUpperCase(), ax, ry + 12); }
        c.restore(); c.beginPath(); c.arc(ax, ry, AR, 0, Math.PI * 2); c.lineWidth = 4; c.strokeStyle = TH.panel; c.stroke();
      });
      var win = e.finished && e.winner === t, nx = x0 + AR * 2 + (n - 1) * step + 22;
      c.textAlign = 'right'; c.fillStyle = win || !e.finished ? TH.ink : TH.sub; c.font = (TH.serif ? '700 ' : '900 ') + '72px ' + HF;
      c.fillText(String(e.setsWon[t]), sx + sw - 60, ry + 26);
      c.textAlign = 'left'; fitFont(c, e.names[t], win ? 800 : 600, UF, sx + sw - 140 - nx, 42, 24); c.fillText(e.names[t], nx, ry + 15);
      if (t === 0) { c.fillStyle = TH.sub; c.globalAlpha = .25; c.fillRect(x0, ry + 46, sw - 120, 2); c.globalAlpha = 1; }
    });
    // local e duração
    var info = [e.place, e.surface ? (C.surf || {})[e.surface] : '', durOf(e) ? Tf("Duração {0}", fmtDurText(durOf(e))) : ''].filter(Boolean).join(' · ');
    if (info) { c.textAlign = 'left'; c.fillStyle = TH.sub; fitFont(c, info, 600, UF, sw - 120, 34, 22); c.fillText(info, sx + 60, py + 500); }
    c.textAlign = 'center'; c.fillStyle = TH.brand; c.font = '700 24px ' + UF; c.fillText(T("BoxScore · placar de tênis"), W / 2, H - 14 - 0);
  }
  function drawCard(e, theme) {
    var DF = '"Big Shoulders Display","Arial Narrow","Roboto Condensed",sans-serif', UF = '"Public Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
    var col = C.colors, W = 1080, H = 1350;
    var teams = [0, 1].map(function (t) {
      var names = (e.players && e.players[t]) || [e.names[t]], ids = (e.pids && e.pids[t]) || [];
      return names.map(function (n, i) { var pl = ids[i] && (C.players || {})[ids[i]]; return { name: n, photo: pl && pl.photo }; });
    });
    var srcs = []; teams.forEach(function (t) { t.forEach(function (p) { srcs.push(loadImg(p.photo)); }); });
    return Promise.all([fontsReady(), Promise.all(srcs)]).then(function (r) {
      var imgs = r[1], k = 0;
      teams.forEach(function (t) { t.forEach(function (p) { p.img = imgs[k++]; }); });
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var c = cv.getContext('2d');
      if (theme && theme !== 'classic') { c.textBaseline = 'alphabetic'; drawScene(c, e, teams, theme, DF, UF); return cv; }
      c.fillStyle = '#0B1217'; c.fillRect(0, 0, W, H);
      c.textBaseline = 'alphabetic';
      // cabeçalho
      c.fillStyle = '#9FB2BD'; c.font = '800 34px ' + UF; c.textAlign = 'left'; c.fillText('BOXSCORE', 56, 84);
      c.textAlign = 'right'; c.font = '600 30px ' + UF;
      var dt = ''; try { dt = new Date(e.playStart || e.startedAt).toLocaleDateString(C.locale, { day: '2-digit', month: 'long', year: 'numeric' }); } catch (x) {}
      c.fillText(dt, W - 56, 84);
      // painéis dos times
      var px = [40, 550], pw = 490, py = 130, ph = 740;
      [0, 1].forEach(function (t) {
        var x = px[t], cx = x + pw / 2, won = e.finished && e.winner === t, dim = e.finished && e.winner !== t;
        c.fillStyle = t === 0 ? col.p1 : col.p2; rrect(c, x, py, pw, ph, 30); c.fill();
        if (dim) { c.fillStyle = 'rgba(0,0,0,.28)'; rrect(c, x, py, pw, ph, 30); c.fill(); }
        c.fillStyle = col.num;
        // fotos
        var team = teams[t], n = team.length, R = n > 1 ? 92 : 120, cy = py + 215, gap = n > 1 ? 120 : 0;
        team.forEach(function (p, i) {
          var ax = cx + (n > 1 ? (i - 0.5) * (R * 2 - 36) : 0), ay = cy;
          c.save(); c.beginPath(); c.arc(ax, ay, R, 0, Math.PI * 2); c.closePath(); c.fillStyle = 'rgba(255,255,255,.22)'; c.fill(); c.clip();
          if (p.img) { var m = Math.min(p.img.width, p.img.height); c.drawImage(p.img, (p.img.width - m) / 2, (p.img.height - m) / 2, m, m, ax - R, ay - R, R * 2, R * 2); }
          else { c.fillStyle = col.num; c.textAlign = 'center'; c.font = '800 ' + Math.round(R * 0.9) + 'px ' + UF; c.fillText((p.name || '?').trim().charAt(0).toUpperCase() || '?', ax, ay + R * 0.32); }
          c.restore();
          c.beginPath(); c.arc(ax, ay, R, 0, Math.PI * 2); c.lineWidth = 6; c.strokeStyle = 'rgba(255,255,255,.8)'; c.stroke();
        });
        // nome
        c.fillStyle = col.num; c.textAlign = 'center';
        var nm = e.names[t].toUpperCase();
        fitFont(c, nm, 900, DF, pw - 50, 88, 34); c.fillText(nm, cx, py + 450);
        // sets
        c.font = '900 270px ' + DF; c.fillText(String(e.setsWon[t]), cx, py + 672);
        c.font = '800 28px ' + UF; c.globalAlpha = .85; c.fillText(T("SETS"), cx, py + 718); c.globalAlpha = 1;
        if (won) {
          c.font = '800 28px ' + UF; var tw = c.measureText(T("VENCEDOR")).width + 44;
          c.fillStyle = 'rgba(255,255,255,.25)'; rrect(c, cx - tw / 2, py + 22, tw, 48, 24); c.fill();
          c.fillStyle = col.num; c.fillText(T("VENCEDOR"), cx, py + 56);
        }
      });
      // parciais
      var sets = (e.sets || []).map(setText).join('     ');
      if (sets) { c.fillStyle = '#FFFFFF'; c.textAlign = 'center'; fitFont(c, sets, 900, DF, W - 140, 120, 48); c.fillText(sets, W / 2, 1010); }
      // informações
      var info = [];
      if (e.place || e.surface) info.push([e.place, e.surface ? (C.surf || {})[e.surface] : ''].filter(Boolean).join(' · '));
      if (durOf(e)) info.push(Tf("Duração {0}", fmtDurText(durOf(e))));
      if (!e.finished) info.push(T("Partida inacabada"));
      c.fillStyle = '#C9D6DD'; c.textAlign = 'center';
      info.forEach(function (t, i) { fitFont(c, t, 600, UF, W - 140, 40, 24); c.fillText(t, W / 2, 1100 + i * 62); });
      c.fillStyle = '#6F8591'; c.font = '700 26px ' + UF; c.fillText(T("BoxScore · placar de tênis"), W / 2, 1300);
      return cv;
    });
  }

  window.BXCard = {
    THEMES: CARD_THEMES,
    draw: function (e, theme, ctx) { C = ctx || {}; return drawCard(e, theme); },
    drawScene: function (c, e, teams, theme, DF, UF, ctx) { C = ctx || C; return drawScene(c, e, teams, theme, DF, UF); },
    loadImg: loadImg, fontsReady: fontsReady, rrect: rrect, fitFont: fitFont, seeded: seeded, spaced: spaced,
    drawBall: drawBall, drawRacket: drawRacket, drawFlower: drawFlower, drawLeaf: drawLeaf
  };
})();
