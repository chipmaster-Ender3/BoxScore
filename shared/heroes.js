/* BoxScore — imagens dos cabeçalhos (shared 1.5.1, Beta 7.20; 7.50: cenas live_* da página ao vivo, por piso; 7.64: warm_* e rest_*)
 * Cada janela do Placar e cada tela da Comunidade tem uma ilustração de tênis ligada ao seu título,
 * desenhada aqui no canvas (sem fotos de terceiros, funciona sem internet). O assunto fica à direita;
 * o título vai à esquerda, sobre um escurecimento feito no CSS.
 * Uso: BXHero.get('hist').then(url => ...)  ·  BXHero.apply(elemento, 'hist')  (põe --hero no elemento)
 */
(function () {
  'use strict';
  var W = 960, H = 300, CACHE = {};
  function seeded(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return function () { h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  // ---------- pisos ----------
  function grain(c, rnd, n, a, x0, y0, w, h, tall) {
    for (var i = 0; i < n; i++) { c.fillStyle = rnd() < .5 ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + (a + .02) + ')'; c.fillRect((x0 || 0) + rnd() * (w || W), (y0 || 0) + rnd() * (h || H), tall ? 1.3 : 2 + rnd() * 2, tall ? 3 + rnd() * 4 : 2 + rnd() * 2); }
  }
  function surface(c, kind, rnd) {
    var g;
    if (kind === 'clay') { g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#C9602F'); g.addColorStop(1, '#A9471F'); c.fillStyle = g; c.fillRect(0, 0, W, H); grain(c, rnd, 5200, .09); }
    else if (kind === 'grass') { for (var b = 0; b < 12; b++) { c.fillStyle = b % 2 ? '#4C8A36' : '#58993F'; c.fillRect(b * 80, 0, 80, H); } grain(c, rnd, 4200, .06, 0, 0, W, H, true); }
    else if (kind === 'hard') { c.fillStyle = '#2F7351'; c.fillRect(0, 0, W, H); c.fillStyle = '#2D63AD'; c.fillRect(120, 40, W, H); grain(c, rnd, 2600, .04); }
    else if (kind === 'night') { c.fillStyle = '#060E19'; c.fillRect(0, 0, W, H); c.fillStyle = '#143462'; c.fillRect(120, 50, W, H); grain(c, rnd, 2000, .035);
      [[W * .62, -40, .5], [W * .95, -50, .4]].forEach(function (p) { var l = c.createRadialGradient(p[0], p[1], 10, p[0], p[1], 360); l.addColorStop(0, 'rgba(255,248,210,' + p[2] + ')'); l.addColorStop(1, 'rgba(255,248,210,0)'); c.fillStyle = l; c.fillRect(0, 0, W, H); }); }
    else if (kind === 'red') { c.fillStyle = '#8E2F27'; c.fillRect(0, 0, W, H); c.fillStyle = '#2F7A4A'; c.beginPath(); c.moveTo(W * .45, 0); c.lineTo(W, 0); c.lineTo(W, H * .78); c.closePath(); c.fill(); grain(c, rnd, 3000, .05); }
    else if (kind === 'dusk') { g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3B4A5E'); g.addColorStop(1, '#1E2733'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(45,99,173,.45)'; c.fillRect(120, 120, W, H); grain(c, rnd, 1600, .03); }
    else if (kind === 'stands') { c.fillStyle = '#1B2433'; c.fillRect(0, 0, W, H);
      var cols = ['#E2572B', '#F4F2EC', '#2D63AD', '#E4C826', '#3E9A5A', '#C2577D', '#8FA3BF'];
      for (var row = 0; row < 7; row++) for (var x = 0; x < W + 20; x += 22) { c.fillStyle = cols[Math.floor(rnd() * cols.length)]; c.globalAlpha = .55 + rnd() * .4; c.beginPath(); c.arc(x + (row % 2) * 11 + rnd() * 4, 14 + row * 22, 7, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1; c.fillStyle = '#2D63AD'; c.fillRect(0, 170, W, H); c.fillStyle = '#16314F'; c.fillRect(0, 160, W, 12); grain(c, rnd, 1200, .04, 0, 170, W, 130); }
  }
  function lines(c, segs, w, col) { c.strokeStyle = col || 'rgba(255,255,255,.9)'; c.lineWidth = w || 9; c.lineCap = 'square'; segs.forEach(function (s) { c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.stroke(); }); }

  // ---------- objetos ----------
  function ball(c, x, y, r, glow) {
    c.save();
    if (glow) { var g0 = c.createRadialGradient(x, y, r * .6, x, y, r * 3); g0.addColorStop(0, 'rgba(230,255,80,.5)'); g0.addColorStop(1, 'rgba(230,255,80,0)'); c.fillStyle = g0; c.beginPath(); c.arc(x, y, r * 3, 0, Math.PI * 2); c.fill(); }
    c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = r * .5; c.shadowOffsetY = r * .18;
    var g = c.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r); g.addColorStop(0, '#F4FF7A'); g.addColorStop(.6, '#D7EA2C'); g.addColorStop(1, '#A9BC14');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.shadowColor = 'transparent'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
    c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = r * .13; c.lineCap = 'round';
    c.beginPath(); c.arc(x - r * 1.25, y, r * .95, -0.9, 0.9); c.stroke();
    c.beginPath(); c.arc(x + r * 1.25, y, r * .95, Math.PI - 0.9, Math.PI + 0.9); c.stroke();
    c.restore();
  }
  function racket(c, x, y, s, ang, frame, accent, strings, grip) {
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
    c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 22; c.shadowOffsetX = 8; c.shadowOffsetY = 12;
    c.fillStyle = grip; rr(c, -22, 205, 44, 250, 14); c.fill(); c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 3; for (var gy = 225; gy < 445; gy += 26) { c.beginPath(); c.moveTo(-22, gy); c.lineTo(22, gy + 14); c.stroke(); }
    c.fillStyle = frame; rr(c, -24, 440, 48, 26, 8); c.fill();
    c.strokeStyle = frame; c.lineWidth = 20; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-18, 210); c.lineTo(-92, 150); c.moveTo(18, 210); c.lineTo(92, 150); c.stroke();
    c.save(); c.beginPath(); c.ellipse(0, -40, 132, 182, 0, 0, Math.PI * 2); c.clip(); c.strokeStyle = strings; c.lineWidth = 3.2;
    for (var sx = -130; sx <= 130; sx += 19) { c.beginPath(); c.moveTo(sx, -230); c.lineTo(sx, 150); c.stroke(); }
    for (var sy = -220; sy <= 140; sy += 19) { c.beginPath(); c.moveTo(-140, sy); c.lineTo(140, sy); c.stroke(); }
    c.restore();
    c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 16; c.shadowOffsetX = 6; c.shadowOffsetY = 8;
    c.lineWidth = 24; c.strokeStyle = frame; c.beginPath(); c.ellipse(0, -40, 146, 196, 0, 0, Math.PI * 2); c.stroke();
    c.shadowColor = 'transparent'; c.lineWidth = 7; c.strokeStyle = accent; c.beginPath(); c.ellipse(0, -40, 146, 196, 0, Math.PI * .62, Math.PI * 1.38); c.stroke();
    c.restore();
  }
  var RK = { // cores de raquete
    a: ['#F4F2EC', '#1D1D22', 'rgba(30,30,30,.7)', '#E2572B'], b: ['#1B1B20', '#E4C826', 'rgba(250,250,245,.85)', '#7A1E22'],
    c: ['#2D63AD', '#F4F2EC', 'rgba(250,250,245,.85)', '#F4F2EC'], d: ['#101114', '#E4FF4F', 'rgba(230,240,255,.85)', '#22252C'] };
  function rk(c, x, y, s, ang, k) { var p = RK[k || 'a']; racket(c, x, y, s, ang, p[0], p[1], p[2], p[3]); }
  function net(c, y, x0, x1, hgt) {
    c.save(); c.strokeStyle = 'rgba(20,20,20,.55)'; c.lineWidth = 1.5;
    for (var x = x0; x <= x1; x += 11) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + hgt); c.stroke(); }
    for (var yy = y; yy <= y + hgt; yy += 11) { c.beginPath(); c.moveTo(x0, yy); c.lineTo(x1, yy); c.stroke(); }
    c.fillStyle = '#F4F2EC'; c.fillRect(x0, y - 8, x1 - x0, 12); c.fillStyle = '#2A2F36'; c.fillRect(x1 - 6, y - 26, 14, hgt + 30);
    c.restore();
  }
  function basket(c, x, y, s, rnd) {
    c.save(); c.translate(x, y); c.scale(s, s);
    for (var i = 0; i < 22; i++) ball(c, -70 + rnd() * 140, -10 - rnd() * 70 + (i > 14 ? -40 : 0), 20);
    c.strokeStyle = '#1C1F24'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(-95, -90); c.lineTo(-80, 60); c.lineTo(80, 60); c.lineTo(95, -90); c.stroke();
    for (var k = -80; k <= 80; k += 22) { c.beginPath(); c.moveTo(k * 1.15, -90); c.lineTo(k, 60); c.stroke(); }
    c.beginPath(); c.moveTo(-95, -90); c.lineTo(95, -90); c.stroke(); c.beginPath(); c.moveTo(-88, -20); c.lineTo(88, -20); c.stroke();
    c.lineWidth = 6; c.beginPath(); c.moveTo(-70, 60); c.lineTo(-110, 190); c.moveTo(70, 60); c.lineTo(110, 190); c.stroke();
    c.restore();
  }
  function board(c, x, y, w, h, rows) {
    c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 20; c.shadowOffsetY = 10;
    c.fillStyle = '#10161D'; rr(c, x, y, w, h, 14); c.fill(); c.shadowColor = 'transparent';
    c.strokeStyle = '#2B3A4A'; c.lineWidth = 4; rr(c, x, y, w, h, 14); c.stroke();
    var rh = (h - 30) / rows.length;
    rows.forEach(function (r, i) {
      var yy = y + 15 + i * rh; c.fillStyle = i ? '#4FA3D9' : '#F08A5D'; rr(c, x + 18, yy + rh * .3, w * .32, rh * .36, 4); c.fill();
      c.font = '900 ' + Math.round(rh * .62) + 'px "Big Shoulders Display", Impact, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#F4F2EC';
      r.forEach(function (n, j) { var cx = x + w * .48 + j * (w * .5 / r.length) + w * .25 / r.length; c.fillStyle = '#1C2733'; rr(c, cx - rh * .32, yy + rh * .1, rh * .64, rh * .8, 6); c.fill(); c.fillStyle = '#FFE45C'; c.fillText(String(n), cx, yy + rh * .72); });
    });
    c.restore();
  }
  function bubble(c, x, y, w, h, fill, tailRight, dots) {
    c.save(); c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 14; c.shadowOffsetY = 6; c.fillStyle = fill;
    rr(c, x, y, w, h, h * .4); c.fill();
    c.beginPath(); if (tailRight) { c.moveTo(x + w * .78, y + h - 2); c.lineTo(x + w * .92, y + h + 26); c.lineTo(x + w * .62, y + h - 2); } else { c.moveTo(x + w * .22, y + h - 2); c.lineTo(x + w * .08, y + h + 26); c.lineTo(x + w * .38, y + h - 2); } c.fill();
    c.shadowColor = 'transparent';
    if (dots) { c.fillStyle = dots; for (var i = 0; i < 3; i++) { c.beginPath(); c.arc(x + w / 2 + (i - 1) * h * .3, y + h / 2, h * .09, 0, Math.PI * 2); c.fill(); } }
    c.restore();
  }
  function magnifier(c, x, y, r) {
    c.save(); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 16; c.shadowOffsetY = 8;
    c.strokeStyle = '#1B1F26'; c.lineWidth = r * .55; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + r * .75, y + r * .75); c.lineTo(x + r * 1.7, y + r * 1.7); c.stroke();
    c.lineWidth = r * .16; c.strokeStyle = '#E8EDF2'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
    c.shadowColor = 'transparent'; c.fillStyle = 'rgba(200,230,255,.18)'; c.beginPath(); c.arc(x, y, r * .92, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function padlock(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 16; c.shadowOffsetY = 8;
    c.strokeStyle = '#C9CED6'; c.lineWidth = 16; c.beginPath(); c.arc(0, -30, 42, Math.PI, 0); c.lineTo(42, 0); c.moveTo(-42, -30); c.lineTo(-42, 0); c.stroke();
    var g = c.createLinearGradient(0, -10, 0, 90); g.addColorStop(0, '#F2C94C'); g.addColorStop(1, '#C9971C'); c.fillStyle = g; rr(c, -62, -10, 124, 100, 16); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = '#3B2E10'; c.beginPath(); c.arc(0, 28, 11, 0, Math.PI * 2); c.fill(); c.fillRect(-5, 30, 10, 28); c.restore();
  }
  function fence(c, x0, x1) {
    c.save(); c.strokeStyle = 'rgba(210,220,230,.55)'; c.lineWidth = 2.2;
    for (var x = x0 - H; x < x1; x += 26) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + H, H); c.stroke(); c.beginPath(); c.moveTo(x + H, 0); c.lineTo(x, H); c.stroke(); }
    c.fillStyle = '#4B5563'; c.fillRect(x0, 0, 10, H); c.restore();
  }
  function calendar(c, x, y, s, mark) {
    c.save(); c.translate(x, y); c.scale(s, s); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 18; c.shadowOffsetY = 8;
    c.fillStyle = '#F7F5EF'; rr(c, -110, -90, 220, 190, 18); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = '#D9532B'; rr(c, -110, -90, 220, 52, 18); c.fill(); c.fillRect(-110, -60, 220, 22);
    c.fillStyle = '#2A2F36'; [-60, 60].forEach(function (k) { rr(c, k - 8, -108, 16, 40, 8); c.fill(); });
    for (var r = 0; r < 4; r++) for (var k2 = 0; k2 < 5; k2++) { c.fillStyle = (r === mark[0] && k2 === mark[1]) ? '#2D63AD' : '#D8DEE6'; rr(c, -92 + k2 * 38, -24 + r * 30, 28, 22, 5); c.fill(); }
    c.restore();
  }
  function bars(c, x, y, vals, bw, gap) {
    vals.forEach(function (v, i) { var g = c.createLinearGradient(0, y - v, 0, y); g.addColorStop(0, '#F4FF7A'); g.addColorStop(1, '#B8C91F'); c.fillStyle = g; c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 10; rr(c, x + i * (bw + gap), y - v, bw, v, 8); c.fill(); });
    c.shadowColor = 'transparent'; c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 5; c.beginPath(); c.moveTo(x - 14, y + 6); c.lineTo(x + vals.length * (bw + gap) + 4, y + 6); c.stroke();
  }
  function band(c, x, y, s, col) {      // munhequeira vista de lado (anel grosso) + ondas de sinal
    c.save(); c.translate(x, y); c.scale(s, s);
    c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 18; c.shadowOffsetY = 10;
    c.fillStyle = col; c.beginPath(); c.ellipse(0, 22, 120, 52, 0, 0, Math.PI * 2); c.fill();         // parte de baixo
    c.fillRect(-120, -22, 240, 44);                                                                        // lateral
    c.shadowColor = 'transparent';
    c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(-120, -6, 240, 12);                                   // listra
    c.fillStyle = col; c.beginPath(); c.ellipse(0, -22, 120, 52, 0, 0, Math.PI * 2); c.fill();           // borda de cima
    c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(0, -22, 88, 32, 0, 0, Math.PI * 2); c.fill(); // furo
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; for (var k = -110; k <= 110; k += 12) { c.beginPath(); c.moveTo(k, 16); c.lineTo(k, 40 - Math.abs(k) * .1); c.stroke(); }
    c.strokeStyle = '#7FD3FF'; c.lineWidth = 9; c.lineCap = 'round';
    [40, 70, 100].forEach(function (r, i) { c.globalAlpha = 1 - i * .25; c.beginPath(); c.arc(130, -70, r, -1.2, -0.2); c.stroke(); });
    c.restore();
  }
  function trophy(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 18; c.shadowOffsetY = 8;
    var g = c.createLinearGradient(-60, 0, 60, 0); g.addColorStop(0, '#C9971C'); g.addColorStop(.5, '#F7DA6B'); g.addColorStop(1, '#B9861A'); c.fillStyle = g;
    c.beginPath(); c.moveTo(-60, -80); c.lineTo(60, -80); c.quadraticCurveTo(60, 10, 0, 20); c.quadraticCurveTo(-60, 10, -60, -80); c.fill();
    c.fillRect(-10, 18, 20, 40); rr(c, -45, 56, 90, 22, 6); c.fill();
    c.strokeStyle = g; c.lineWidth = 10; c.beginPath(); c.arc(-62, -45, 26, Math.PI * .5, Math.PI * 1.5); c.stroke(); c.beginPath(); c.arc(62, -45, 26, -Math.PI * .5, Math.PI * .5); c.stroke();
    c.restore();
  }
  function photo(c, x, y, w, h, ang, inner) {
    c.save(); c.translate(x, y); c.rotate(ang); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 20; c.shadowOffsetY = 10;
    c.fillStyle = '#FBFAF6'; c.fillRect(-w / 2, -h / 2, w, h); c.shadowColor = 'transparent';
    c.save(); c.beginPath(); c.rect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 52); c.clip(); c.translate(-w / 2 + 12, -h / 2 + 12); inner(c, w - 24, h - 52); c.restore();
    c.restore();
  }
  function avatar(c, x, y, r) {
    c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 18; c.fillStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.shadowColor = 'transparent';
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip(); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(x, y - r * .2, r * .36, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(x, y + r * .78, r * .7, r * .55, 0, 0, Math.PI * 2); c.fill(); c.restore();
    c.save(); c.strokeStyle = '#F4F2EC'; c.lineWidth = 8; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); c.restore();
  }
  function bell(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 16; c.shadowOffsetY = 8;
    var g = c.createLinearGradient(-60, 0, 60, 0); g.addColorStop(0, '#C9971C'); g.addColorStop(.5, '#F7DA6B'); g.addColorStop(1, '#B9861A'); c.fillStyle = g;
    c.beginPath(); c.moveTo(-70, 40); c.quadraticCurveTo(-60, 20, -55, -20); c.quadraticCurveTo(-50, -80, 0, -84); c.quadraticCurveTo(50, -80, 55, -20); c.quadraticCurveTo(60, 20, 70, 40); c.closePath(); c.fill();
    c.fillRect(-78, 38, 156, 14); c.beginPath(); c.arc(0, 62, 14, 0, Math.PI * 2); c.fill(); c.restore();
  }
  function dotted(c, pts) { c.save(); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 5; c.setLineDash([3, 14]); c.lineCap = 'round'; c.beginPath(); c.moveTo(pts[0], pts[1]); c.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); c.stroke(); c.restore(); }

  // ---------- 7.64: aquecimento e descanso ----------
  // quadra vista de cima, rede na vertical no meio; boxes = destaca os quadrados de saque
  function courtTop(c, x0, y0, x1, y1, boxes, col) {
    var w = x1 - x0, h = y1 - y0, mx = x0 + w / 2, al = h * .125, sv = w * .269, ya = y0 + al, yb = y1 - al;
    if (boxes) { c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(mx - sv, ya, sv * 2, yb - ya); }
    lines(c, [[x0, y0, x1, y0], [x0, y1, x1, y1], [x0, y0, x0, y1], [x1, y0, x1, y1], [x0, ya, x1, ya], [x0, yb, x1, yb],
      [mx - sv, ya, mx - sv, yb], [mx + sv, ya, mx + sv, yb], [mx - sv, (y0 + y1) / 2, mx + sv, (y0 + y1) / 2]], 6, col);
    c.save(); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 10; c.fillStyle = '#F4F2EC'; c.fillRect(mx - 4, y0 - 16, 8, h + 32);
    c.fillStyle = '#2A2F36'; c.fillRect(mx - 7, y0 - 24, 14, 12); c.fillRect(mx - 7, y1 + 12, 14, 12); c.restore();
  }
  function arc(c, x0, y0, cx, cy, x1, y1, col, wd) { c.save(); c.strokeStyle = col || 'rgba(255,255,255,.85)'; c.lineWidth = wd || 6; c.setLineDash([4, 14]); c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke(); c.restore(); }
  function swoosh(c, x, y, r, a0, a1) { c.save(); c.lineCap = 'round'; [0, 1, 2].forEach(function (i) { c.strokeStyle = 'rgba(255,255,255,' + (.55 - i * .15) + ')'; c.lineWidth = 10 - i * 3; c.beginPath(); c.arc(x, y, r + i * 26, a0, a1); c.stroke(); }); c.restore(); }
  function target(c, x, y, r) { c.save(); [1, .66, .33].forEach(function (k, i) { c.fillStyle = i % 2 ? 'rgba(255,255,255,.85)' : 'rgba(228,255,79,.85)'; c.beginPath(); c.ellipse(x, y, r * k, r * k * .55, 0, 0, Math.PI * 2); c.fill(); }); c.restore(); }
  function bench(c, x, y, w) {
    c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 18; c.shadowOffsetY = 10;
    c.fillStyle = '#2A2F36'; c.fillRect(x - w / 2 + 20, y, 14, 80); c.fillRect(x + w / 2 - 34, y, 14, 80);
    var g = c.createLinearGradient(0, y - 22, 0, y + 6); g.addColorStop(0, '#2D63AD'); g.addColorStop(1, '#1E4A86'); c.fillStyle = g; rr(c, x - w / 2, y - 22, w, 28, 8); c.fill();
    c.fillStyle = '#2D63AD'; rr(c, x - w / 2, y - 92, w, 40, 8); c.fill(); c.fillStyle = '#2A2F36'; c.fillRect(x - w / 2 + 20, y - 56, 14, 40); c.fillRect(x + w / 2 - 34, y - 56, 14, 40);
    c.restore();
  }
  function bottle(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 14; c.shadowOffsetY = 6;
    var g = c.createLinearGradient(-34, 0, 34, 0); g.addColorStop(0, '#5FB0E8'); g.addColorStop(.45, '#BFE6FF'); g.addColorStop(1, '#3E8CC4'); c.fillStyle = g;
    rr(c, -34, -70, 68, 150, 22); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = '#E2572B'; rr(c, -22, -100, 44, 34, 8); c.fill(); c.fillStyle = '#F4F2EC'; rr(c, -34, -10, 68, 30, 4); c.fill();
    c.restore();
  }
  function towel(c, x, y, w) { c.save(); c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 10; c.fillStyle = '#F4F2EC'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w - 8, y + 70); c.lineTo(x + 6, y + 64); c.closePath(); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = '#E2572B'; c.fillRect(x + 4, y + 46, w - 10, 7); c.restore(); }
  function swap(c, x, y, r) {      // duas setas curvas trocando de lado
    c.save(); c.strokeStyle = '#E4FF4F'; c.fillStyle = '#E4FF4F'; c.lineWidth = 12; c.lineCap = 'round'; c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 10;
    c.beginPath(); c.arc(x, y + r * .5, r, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    c.beginPath(); c.arc(x, y - r * .5, r, Math.PI * .15, Math.PI * .85); c.stroke();
    function head(px, py, a) { c.save(); c.translate(px, py); c.rotate(a); c.beginPath(); c.moveTo(14, 0); c.lineTo(-12, -16); c.lineTo(-12, 16); c.closePath(); c.fill(); c.restore(); }
    head(x + r * Math.cos(Math.PI * 1.85), y + r * .5 + r * Math.sin(Math.PI * 1.85), Math.PI * 1.85 + Math.PI / 2);
    head(x + r * Math.cos(Math.PI * .85), y - r * .5 + r * Math.sin(Math.PI * .85), Math.PI * .85 + Math.PI / 2);
    c.restore();
  }

  // ---------- cenas (assunto à direita) ----------
  var SCENES = {
    'new': function (c, r) { surface(c, 'clay', r); lines(c, [[0, 230, W, 230], [700, 0, 700, 230]]); dotted(c, [560, 250, 640, 30, 800, 70]); rk(c, 600, 210, .48, -0.7, 'a'); ball(c, 805, 72, 26); },
    prof: function (c, r) { surface(c, 'grass', r); lines(c, [[0, 60, W, 60], [520, 60, 520, H]]); rk(c, 880, 190, .5, 0.5, 'b'); avatar(c, 720, 150, 92); ball(c, 800, 230, 24); },
    set: function (c, r) { surface(c, 'hard', r); lines(c, [[120, 40, W, 40], [120, 40, 120, H], [120, 170, W, 170]]); rk(c, 760, 230, 1.0, 0.9, 'c'); ball(c, 610, 210, 26); },
    more: function (c, r) { surface(c, 'clay', r); lines(c, [[0, 250, W, 250], [480, 0, 480, 250]]); basket(c, 760, 150, .9, r); ball(c, 590, 255, 22); ball(c, 900, 262, 22); },
    band: function (c, r) { surface(c, 'night', r); lines(c, [[120, 50, W, 50], [120, 50, 120, H]], 8, 'rgba(220,232,255,.75)'); band(c, 720, 165, .85, '#E2572B'); ball(c, 870, 240, 24, true); },
    contact: function (c, r) { surface(c, 'hard', r); lines(c, [[120, 40, W, 40], [520, 40, 520, H]]); bubble(c, 560, 46, 230, 96, '#F7F5EF', false, '#2D63AD'); bubble(c, 700, 160, 200, 80, '#FFE45C', true, '#7A5A00'); ball(c, 900, 90, 26); },
    share: function (c, r) { surface(c, 'grass', r); lines(c, [[0, 240, W, 240]]); rk(c, 690, 170, .55, -0.55, 'a'); rk(c, 840, 170, .55, 0.55, 'b'); ball(c, 765, 60, 24); ball(c, 900, 50, 18); ball(c, 640, 46, 16); },
    del: function (c, r) { surface(c, 'dusk', r); lines(c, [[120, 120, W, 120], [120, 120, 120, H]], 7, 'rgba(255,255,255,.55)'); net(c, 150, 380, 940, 70); ball(c, 860, 250, 20); },
    data: function (c, r) { surface(c, 'night', r); board(c, 560, 50, 360, 200, [[6, 4, 7], [3, 6, 5]]); ball(c, 520, 230, 24, true); },
    hist: function (c, r) { surface(c, 'clay', r); lines(c, [[0, 270, W, 270]]); board(c, 540, 40, 360, 200, [[6, 3, 6], [4, 6, 2]]); calendar(c, 880, 230, .42, [1, 2]); },
    sum: function (c, r) { surface(c, 'hard', r); lines(c, [[120, 40, W, 40], [120, 40, 120, H]]); bars(c, 560, 250, [70, 120, 95, 170, 140, 205], 40, 18); ball(c, 900, 60, 26); },
    priv: function (c, r) { surface(c, 'grass', r); fence(c, 470, W); padlock(c, 740, 150, .95); ball(c, 880, 250, 22); },
    user: function (c, r) { surface(c, 'clay', r); lines(c, [[0, 80, W, 80], [600, 80, 600, H]]); ball(c, 720, 140, 46); magnifier(c, 720, 140, 78); },
    fr: function (c, r) { surface(c, 'red', r); lines(c, [[W * .45, 0, W, H * .78]], 12); rk(c, 700, 190, .5, -0.55, 'a'); rk(c, 860, 190, .5, 0.55, 'b'); ball(c, 760, 70, 24); ball(c, 820, 92, 24); },
    close: function (c, r) { surface(c, 'night', r); net(c, 150, 420, 940, 90); ball(c, 720, 128, 28, true); },
    // Comunidade
    avisos: function (c, r) { surface(c, 'night', r); lines(c, [[120, 50, W, 50], [520, 50, 520, H]], 8, 'rgba(220,232,255,.75)'); bell(c, 740, 140, 1.0); ball(c, 860, 230, 24, true); },
    feed: function (c, r) { surface(c, 'stands', r); lines(c, [[0, 200, W, 200]], 7); ball(c, 760, 230, 26); rk(c, 880, 300, .32, 0.4, 'c'); },
    jogos: function (c, r) { surface(c, 'hard', r); lines(c, [[120, 40, W, 40], [120, 40, 120, H]]); net(c, 140, 300, 940, 70); rk(c, 840, 230, .38, 0.9, 'a'); ball(c, 620, 240, 22); },
    marcar: function (c, r) { surface(c, 'clay', r); lines(c, [[0, 250, W, 250], [500, 0, 500, 250]]); calendar(c, 730, 150, .95, [2, 3]); ball(c, 880, 240, 26); },
    grupos: function (c, r) { surface(c, 'grass', r); lines(c, [[0, 250, W, 250]]);
      var s2 = .36, gx = 740, gy = 318;   // 4 raquetes em leque, cabos juntos (time)
      [-0.95, -0.32, 0.32, 0.95].forEach(function (a, i) { rk(c, gx + Math.sin(a) * 460 * s2, gy - Math.cos(a) * 460 * s2, s2, a, 'abcd'.charAt(i)); });
      ball(c, 905, 70, 22); },
    ajustes: function (c, r) { SCENES.set(c, r); },
    conversas: function (c, r) { SCENES.contact(c, r); },
    publicar: function (c, r) { surface(c, 'clay', r); lines(c, [[0, 250, W, 250]]); photo(c, 720, 150, 220, 250, -0.08, function (k, w, h) { k.fillStyle = '#5DA043'; k.fillRect(0, 0, w, h); k.strokeStyle = '#fff'; k.lineWidth = 4; k.strokeRect(14, 14, w - 28, h - 28); k.beginPath(); k.moveTo(14, h / 2); k.lineTo(w - 14, h / 2); k.stroke(); ball(k, w * .65, h * .35, 16); }); ball(c, 880, 70, 24); },
    jogador: function (c, r) { surface(c, 'hard', r); lines(c, [[120, 40, W, 40], [520, 40, 520, H], [120, 200, W, 200]]); rk(c, 880, 200, .5, 0.45, 'c'); avatar(c, 720, 150, 92); ball(c, 610, 240, 22); },
    // 7.77: lista dos meus torneios (chave de 8 levando ao troféu)
    torneios: function (c, r) { surface(c, 'hard', r);
      var col = 'rgba(255,255,255,.88)', s = [], ys = [52, 92, 132, 172, 212, 252];
      [[56, 96], [136, 176], [216, 256]].forEach(function (p) { s.push([360, p[0], 440, p[0]], [360, p[1], 440, p[1]], [440, p[0], 440, p[1]], [440, (p[0] + p[1]) / 2, 520, (p[0] + p[1]) / 2]); });
      s.push([520, 76, 520, 156], [520, 116, 600, 116], [520, 236, 600, 236], [600, 116, 600, 236], [600, 176, 660, 176]);
      lines(c, s, 6, col);
      [[400, 56], [400, 96], [400, 136], [400, 176], [400, 216], [400, 256]].forEach(function (q) { c.fillStyle = 'rgba(228,255,79,.95)'; c.beginPath(); c.arc(q[0] - 40, q[1], 7, 0, Math.PI * 2); c.fill(); });
      trophy(c, 770, 150, .95); ball(c, 892, 226, 22, true); },
    trofeu: function (c, r) { surface(c, 'night', r); trophy(c, 740, 150, 1.0); ball(c, 870, 240, 22, true); },
    // 7.50: página do placar ao vivo, uma por piso (quadra com linhas, rede, raquete e bola)

    // 7.64: aquecimento (uma imagem por exercício) e descanso
    warm_pronto: function (c, r) { surface(c, 'clay', r); lines(c, [[0, 250, W, 250], [420, 0, 420, 250]]); basket(c, 650, 150, .78, r); rk(c, 800, 175, .42, 0.32, 'b'); ball(c, 540, 258, 22); ball(c, 860, 268, 20); },
    warm_quad: function (c, r) { surface(c, 'hard', r); courtTop(c, 340, 60, 920, 262, true);
      arc(c, 530, 205, 625, 20, 712, 128); rk(c, 505, 238, .2, -1.05, 'a'); rk(c, 742, 112, .2, 1.1, 'c'); ball(c, 668, 82, 18); },
    warm_fundo: function (c, r) { surface(c, 'clay', r); courtTop(c, 330, 60, 930, 262, false);
      arc(c, 352, 120, 630, -70, 905, 205); arc(c, 905, 232, 630, 330, 352, 190, 'rgba(255,255,255,.5)'); rk(c, 360, 212, .21, -0.95, 'b'); rk(c, 900, 112, .21, 1.0, 'a'); ball(c, 560, 62, 20); },
    warm_vol: function (c, r) { surface(c, 'grass', r); net(c, 168, 330, 940, 76);
      arc(c, 360, 40, 470, 60, 590, 118); rk(c, 700, 92, .36, 0.18, 'c'); ball(c, 612, 124, 22); },
    warm_smash: function (c, r) { surface(c, 'night', r); lines(c, [[120, 50, W, 50], [120, 50, 120, H]], 8, 'rgba(220,232,255,.75)');
      swoosh(c, 760, 210, 110, -2.3, -1.2); rk(c, 760, 120, .34, 0.55, 'd'); ball(c, 640, 62, 22, true); arc(c, 628, 82, 560, 210, 470, 280, 'rgba(228,255,79,.85)', 7); },
    warm_saq: function (c, r) { surface(c, 'red', r); lines(c, [[300, 280, W, 280]], 10);
      arc(c, 700, 262, 700, 140, 700, 86, 'rgba(255,255,255,.7)'); ball(c, 700, 58, 22, true); rk(c, 820, 190, .36, 0.75, 'a'); target(c, 450, 230, 56); arc(c, 682, 66, 520, 70, 462, 214, 'rgba(228,255,79,.75)'); },
    rest_troca: function (c, r) { surface(c, 'dusk', r); lines(c, [[120, 120, W, 120], [120, 120, 120, H]], 7, 'rgba(255,255,255,.55)');
      bench(c, 760, 200, 300); towel(c, 820, 178, 90); bottle(c, 560, 210, .62); swap(c, 640, 62, 70); },
    // 7.76: placar na transmissão (celular no tripé filmando, com o placar por cima da imagem)
    stream: function (c, r) {
      surface(c, 'grass', r); lines(c, [[120, 250, W, 250], [420, 0, 420, 250]]);
      c.save(); c.strokeStyle = '#1D2328'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(760, 200); c.lineTo(690, 310); c.moveTo(760, 200); c.lineTo(830, 310); c.moveTo(760, 200); c.lineTo(760, 310); c.stroke();
      c.fillStyle = '#1D2328'; rr(c, 744, 186, 32, 22, 6); c.fill();
      c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 22; c.shadowOffsetY = 8; c.fillStyle = '#14191D'; rr(c, 600, 36, 320, 160, 24); c.fill(); c.shadowColor = 'transparent';
      var g = c.createLinearGradient(0, 50, 0, 182); g.addColorStop(0, '#62A05A'); g.addColorStop(1, '#2F6131'); c.fillStyle = g; rr(c, 616, 50, 288, 132, 12); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(616, 120); c.lineTo(904, 120); c.moveTo(760, 50); c.lineTo(760, 120); c.stroke();
      c.fillStyle = 'rgba(9,17,22,.94)'; rr(c, 628, 140, 168, 34, 6); c.fill();
      c.fillStyle = '#C4502A'; c.fillRect(628, 140, 5, 17); c.fillStyle = '#2C6A86'; c.fillRect(628, 157, 5, 17);
      c.fillStyle = '#D7F24A'; rr(c, 770, 140, 26, 34, 4); c.fill();
      c.fillStyle = 'rgba(255,255,255,.88)'; c.fillRect(640, 145, 62, 6); c.fillRect(640, 162, 52, 6); [718, 738].forEach(function (x) { c.fillRect(x, 144, 9, 9); c.fillRect(x, 161, 9, 9); });
      c.fillStyle = '#D92D20'; rr(c, 628, 60, 62, 22, 6); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(640, 71, 4, 0, 7); c.fill(); c.font = '800 13px sans-serif'; c.fillText('LIVE', 650, 76);
      c.restore(); ball(c, 520, 236, 20); ball(c, 900, 262, 18);
    },
    // 7.66: janela "Sair do BoxScore?" (fim do treino: raquete no banco, garrafa e a bola parada)
    sair: function (c, r) { surface(c, 'dusk', r); lines(c, [[120, 120, W, 120], [120, 120, 120, H]], 7, 'rgba(255,255,255,.55)'); bench(c, 740, 210, 320); rk(c, 760, 168, .3, 1.5, 'b'); bottle(c, 560, 215, .55); ball(c, 900, 262, 20); },
    rest_set: function (c, r) { surface(c, 'night', r); board(c, 600, 40, 320, 160, [[6, 3], [4, 6]]); bottle(c, 520, 200, .66); rk(c, 790, 262, .28, 1.45, 'b'); ball(c, 900, 250, 20); },
    live_saibro: function (c, r) { liveCourt(c, r, 'clay'); },
    live_rapida: function (c, r) { liveCourt(c, r, 'hard'); },
    live_grama: function (c, r) { liveCourt(c, r, 'grass'); },
    live_carpete: function (c, r) { liveCourt(c, r, 'dusk'); },
    live_outro: function (c, r) { liveCourt(c, r, 'stands'); }
  };
  function liveCourt(c, r, kind) {
    surface(c, kind, r);
    var top = kind === 'stands' ? 190 : 60;
    lines(c, [[300, top, W, top], [300, H - 20, W, H - 20], [300, top, 300, H - 20], [620, top, 620, H - 20], [620, (top + H - 20) / 2, W, (top + H - 20) / 2]]);
    net(c, top - 10, 560, 600, H - top - 10);
    rk(c, 820, 170, .5, 0.55, 'a'); ball(c, 700, kind === 'stands' ? 150 : 110, 24, kind === 'dusk'); dotted(c, [470, 250, 560, 40, 690, 100]);
  }
  function draw(key) {
    var f = SCENES[key]; if (!f) return '';
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var c = cv.getContext('2d');
    f(c, seeded('hero-' + key));
    return cv.toDataURL('image/jpeg', 0.78);
  }
  function get(key) {
    if (!CACHE[key]) CACHE[key] = new Promise(function (res) { try { res(draw(key)); } catch (e) { res(''); } });
    return CACHE[key];
  }
  function apply(el, key) {
    if (!el || !key) return;
    if (el.getAttribute('data-hero-on') === key) return;
    el.setAttribute('data-hero-on', key);
    get(key).then(function (u) { if (u && el.getAttribute('data-hero-on') === key) el.style.setProperty('--hero', 'url("' + u + '")'); });
  }
  window.BXHero = { get: get, apply: apply, keys: Object.keys(SCENES), _draw: draw };
})();
