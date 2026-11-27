/* BoxScore — shared/bgcore.js (7.37)
   O "miolo" de marcar um ponto, desfazer e montar as frases da narração, sem tela.
   Usado:
     - pelo Placar (point() e undo() chamam applyPoint/applyUndo; a tela, o som e o salvamento ficam no Placar);
     - pelo iPhone com a tela bloqueada: o app nativo roda este arquivo + engine.js no JavaScriptCore
       (session*), recebe os toques da pulseira, fala as frases e devolve a partida ao Placar quando a tela volta.
   Depende de TennisEngine (engine.js) e de T, Tf e I18N globais. Não toca em DOM, timers ou rede. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.BXCore = factory(root);
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  function E() { return root.TennisEngine; }
  function T(k) { return root.T(k); }
  function Tf() { return root.Tf.apply(null, arguments); }

  var LOCK_MS = 450;
  // gestos da pulseira (protocolo v1): 1 curto, 2 duplo, 3 longo — o mesmo MODES do Placar
  var MODES = { fast: { point: 'short', undo: 'long' }, safe: { point: 'long', undo: 'double' }, dbl: { point: 'double', undo: 'long' }, ace: { point: 'short', undo: 'double', ace: 'long' } };
  var GN = { 1: 'short', 2: 'double', 3: 'long' };

  /* ---------- frases ---------- */
  var UN = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  var TENS = { 20: 'vinte', 30: 'trinta', 40: 'quarenta', 50: 'cinquenta' };
  function w59(n) { if (root.I18N.lang().indexOf('pt') !== 0) return String(n); if (n < 20) return UN[n]; var t = Math.floor(n / 10) * 10, u = n % 10; return TENS[t] + (u ? ' e ' + UN[u] : ''); }
  function spokenDur(sec) {
    var m = Math.floor(sec / 60), s = sec % 60, out = [];
    if (m) out.push(m === 1 ? T("um minuto") : Tf("{0} minutos", w59(m)));
    if (s) out.push(s === 1 ? T("um segundo") : Tf("{0} segundos", w59(s)));
    return out.join(' ' + T('conj§e') + ' ');
  }
  function restCfg(meta) { return meta.rest || { on: false, change: 90, set: 120 }; }
  function restLine(meta, kind) { var c = restCfg(meta); return kind === 'set' ? Tf('Intervalo de {0}.', spokenDur(c.set)) : Tf('Descanso de {0}.', spokenDur(c.change)); }
  function speakNames(meta) { return meta.names.map(function (n) { return String(n).replace(/ \/ /g, ' e '); }); }
  function alertInfo(s) {
    if (s.winner !== null || s.tb) return null;
    var sv = s.server, rc = 1 - sv;
    function wins(p) { return E().pointWon(s, p).events.some(function (e) { return e.type === 'game' && e.winner === p; }); }
    var gs = wins(sv), gr = wins(rc);
    if (gs && gr) return null;          // ponto decisivo: os dois podem ganhar o game
    if (gr) return { type: 'bp', player: rc };
    if (gs) return { type: 'gp', player: sv };
    return null;
  }
  function alertText(s, meta, settings) {
    var k = E().stakes(s);
    if (k.matchPoint[0] || k.matchPoint[1] || k.setPoint[0] || k.setPoint[1]) return '';   // match point e set point têm prioridade
    var al = alertInfo(s); if (!al) return '';
    var nm = speakNames(meta)[al.player];
    if (al.type === 'bp' && settings.alertBP) return Tf("Break point, {0}.", nm);
    if (al.type === 'gp' && settings.alertGP) return Tf("Game point, {0}.", nm);
    return '';
  }
  // fala curta: "Ana saca pela direita." (nome do jogador que saca e o lado)
  function serveLine(s, meta) {
    var d = E().display(s);
    var who = s.cfg.mode === 'doubles' ? (meta.players[d.server] || [])[d.serverPlayer] : meta.names[d.server];
    who = String(who || '').replace(/ \/ /g, ' e ');
    if (!who) return d.serveSide === 'right' ? T('Saque pela direita') + '.' : T('Saque pela esquerda') + '.';
    return (d.serveSide === 'right' ? Tf('{0} saca pela direita', who) : Tf('{0} saca pela esquerda', who)) + '.';
  }
  function setText(r) {
    var n = function (x) { return +x | 0; }, g = r.games || [0, 0];
    if (r.kind === 'super' && r.tb) return '[' + n(r.tb[0]) + '-' + n(r.tb[1]) + ']';
    if (r.tb) return n(g[0]) + '-' + n(g[1]) + '(' + Math.min(n(r.tb[0]), n(r.tb[1])) + ')';
    return n(g[0]) + '-' + n(g[1]);
  }

  /* ---------- ponto e desfazer (o mesmo que o Placar fazia dentro de point() e undo()) ---------- */
  // G = { state, past, meta }. Devolve o novo G e o que falar. Não confere bloqueios (tela aberta, aquecimento etc.).
  function applyPoint(G, w, ace, now, settings) {
    var meta = G.meta;
    if (!meta.playStart) meta.playStart = now;
    if (!meta.limitStart) meta.limitStart = now;
    var prev = G.state;
    // break point: o devolvedor ganha o game se ganhar este ponto (fora do tie-break)
    var tbk = prev.tb ? (prev.tb.kind === 'super' ? 2 : 1) : 0, bp = 0;
    if (!tbk) { var rc0 = 1 - prev.server; bp = E().pointWon(prev, rc0).events.some(function (e) { return e.type === 'game' && e.winner === rc0; }) ? 1 : 0; }
    ace = !!ace && prev.server === w;   // ace só vale para quem estava sacando
    var r = E().addPoint(G, w);
    var evT = r.events.map(function (e) { return e.type; });
    if (evT.indexOf('game') >= 0 || evT.indexOf('set') >= 0) meta.marks = (meta.marks || []).concat([{ k: 'g', t: now, n: r.game.state.pointsPlayed }]);
    if (evT.indexOf('set') >= 0) meta.marks = meta.marks.concat([{ k: 's', t: now, n: r.game.state.pointsPlayed }]);
    // registro ponto a ponto: [vencedor, sacador, games0, games1, pontos0, pontos1, tb, breakPoint, set, segundos, fim (1 game, 2 set), ace]
    if (meta.plog && meta.plog.length === prev.pointsPlayed) {
      meta.plog.push([w, prev.server, prev.games[0], prev.games[1], prev.points[0], prev.points[1], tbk, bp, prev.sets.length,
        Math.round((now - meta.playStart) / 1000), ((evT.indexOf('game') >= 0 || evT.indexOf('set') >= 0) ? 1 : 0) | (evT.indexOf('set') >= 0 ? 2 : 0), ace ? 1 : 0]);
    } else if (meta.plog !== undefined) { meta.plog = null; }
    // descanso: troca de lado (não após o 1º game do set nem no tie-break) e intervalo entre sets
    var rs = meta.rest, restKind = null;
    if (rs && rs.on && r.game.state.winner === null) {
      if (evT.indexOf('set') >= 0) restKind = 'set';
      else if (evT.indexOf('changeEnds') >= 0 && !prev.tb && (prev.games[0] + prev.games[1]) > 0) restKind = 'change';
    }
    var NG = { state: r.game.state, past: r.game.past, meta: meta };
    var parts = E().announce(NG.state, r.events, speakNames(meta), { nameOnPoint: settings.nameOnPoint, stakes: settings.stakes });
    if (ace && settings.aceSay !== false) parts.unshift(T("Ace!"));
    var sc = settings.serveCall || 'game';
    if (NG.state.winner === null && (sc === 'point' || (sc === 'game' && (prev.server !== NG.state.server || prev.serverPlayer !== NG.state.serverPlayer)))) parts.push(serveLine(NG.state, meta));
    var at = alertText(NG.state, meta, settings); if (at) parts.push(at);
    if (restKind) parts.push(restLine(meta, restKind));
    return { G: NG, prev: prev, events: r.events, restKind: restKind, ace: ace, parts: parts };
  }
  function applyUndo(G) {
    if (!G.past.length) return null;
    var meta = G.meta, wasDone = G.state.winner !== null;
    if (meta.restRun) meta.restRun = null;
    var u = E().undo(G);
    var NG = { state: u.state, past: u.past, meta: meta };
    if (wasDone) delete meta.endedAt;
    meta.marks = (meta.marks || []).filter(function (m) { return m.n <= NG.state.pointsPlayed; });
    if (meta.plog) meta.plog.length = Math.min(meta.plog.length, NG.state.pointsPlayed);
    return { G: NG, wasDone: wasDone, parts: [T("Ponto desfeito."), E().scoreText(NG.state, speakNames(meta))] };
  }

  // Texto da notificação / Live Activity (o mesmo do Android).
  function info(G) {
    var s = G.state, m = G.meta, d = E().display(s), nm = function (i) { return m.names[i] || Tf('Jogador {0}', i + 1); };
    var sets = d.sets.map(setText).join(' '), sv = d.server, over = s.winner !== null;
    return {
      title: over ? Tf("Vitória de {0}", nm(s.winner)) : nm(0) + '  ' + d.points[0] + ' × ' + d.points[1] + '  ' + nm(1),
      text: [sets ? Tf('Sets {0}', sets) : '', over ? '' : Tf('Games {0}-{1}', d.games[0], d.games[1]), over ? '' : Tf('Saque: {0}', nm(sv))].filter(Boolean).join(' · '),
      n0: nm(0), n1: nm(1), p0: over ? '' : String(d.points[0]), p1: over ? '' : String(d.points[1]),
      g0: d.games[0], g1: d.games[1], s0: d.setsWon[0], s1: d.setsWon[1], server: over ? -1 : sv, over: over,
      undo: T('Desfazer'), point: T('Ponto'), channel: T('Partida em andamento')
    };
  }

  /* ---------- sessão com a tela bloqueada (iPhone) ----------
     O Placar entrega { G, settings, bands: [{ id, team }], mode, at } ao ir para segundo plano.
     O nativo chama sessionGesture(id, código do gesto) a cada toque e sessionAction('p0'|'p1'|'undo') nos botões.
     Cada chamada devolve JSON { ok, parts: [frases], info, over, changed }. */
  var S = null;
  function sessionStart(json) {
    var o = typeof json === 'string' ? JSON.parse(json) : json;
    S = { G: o.G, settings: o.settings || {}, bands: o.bands || [], mode: MODES[o.mode] ? o.mode : 'fast', lock: 0, changed: false, n: 0, live: o.live || null };
    return JSON.stringify({ ok: true, info: info(S.G) });
  }
  function teamOf(id) { for (var i = 0; i < S.bands.length; i++) if (S.bands[i].id === id) return S.bands[i].team; return -1; }
  function run(team, act, now) {
    var G = S.G, out = { ok: false, parts: [], over: G.state.winner !== null, changed: false };
    if (act === 'undo') {
      var u = applyUndo(G); if (!u) return out;
      S.G = u.G; S.lock = 0; out.parts = u.parts;
    } else {
      if (G.state.winner !== null) return out;
      if (G.meta.warm && !G.meta.warm.done) return out;                // aquecimento: só na tela
      if (G.meta.restRun) { G.meta.restRun = null; S.lock = now + 900; S.changed = true; out.ok = true; out.changed = true; out.info = info(S.G); return out; }   // ponto durante o descanso: encerra o descanso
      if (now < S.lock) return out;
      S.lock = now + LOCK_MS;
      var r = applyPoint(G, team, act === 'ace', now, S.settings);
      S.G = r.G; out.parts = r.parts;
      if (r.restKind) S.G.meta.restRun = { kind: r.restKind, sec: r.restKind === 'set' ? restCfg(S.G.meta).set : restCfg(S.G.meta).change, start: now, extra: 0 };
      if (S.G.state.winner !== null) S.G.meta.endedAt = now;
    }
    S.changed = true; S.n++;
    out.ok = true; out.changed = true; out.over = S.G.state.winner !== null; out.info = info(S.G);
    if (S.settings.voice === false) out.parts = [];
    out.parts = out.parts.map(say);
    return out;
  }
  function sessionGesture(id, code, now) {
    if (!S) return JSON.stringify({ ok: false });
    var team = teamOf(id), g = GN[code]; if (team < 0 || !g) return JSON.stringify({ ok: false });
    var m = MODES[S.mode], act = m.point === g ? 'point' : m.undo === g ? 'undo' : m.ace === g ? 'ace' : null;
    if (!act) return JSON.stringify({ ok: false });
    return JSON.stringify(run(team, act, now || Date.now()));
  }
  function sessionAction(a, now) {
    if (!S) return JSON.stringify({ ok: false });
    return JSON.stringify(a === 'undo' ? run(0, 'undo', now || Date.now()) : (a === 'p0' || a === 'p1') ? run(a === 'p0' ? 0 : 1, 'point', now || Date.now()) : { ok: false });
  }
  /* ---------- 7.49: placar ao vivo (documento live/{id}) ----------
     O mesmo formato que o Placar grava (ver shared/live.js). base = { owner, ownerName, ann, aud[], startedAt, endedAt }.
     Com a tela bloqueada, o nativo pede sessionLive() a cada ponto e grava pelo Firestore REST (o corpo já sai no formato REST). */
  var LIVE_MS = 6 * 3600e3, AFTER_MS = 3 * 3600e3;
  // 7.50: números da partida a partir do registro ponto a ponto (o mesmo que o Placar usa nas estatísticas)
  function liveStats(m) {
    var L = m.plog, z = function () { return [0, 0]; }, st = { pts: z(), ace: z(), sp: z(), spw: z(), rp: z(), rpw: z(), bpO: z(), bpC: z() };
    if (!L || !L.length) return { st: st, last: null };
    L.forEach(function (x) {
      var w = x[0], sv = x[1], rc = 1 - sv; if ((w !== 0 && w !== 1) || (sv !== 0 && sv !== 1)) return;
      st.pts[w]++; st.sp[sv]++; st.rp[rc]++;
      if (w === sv) { st.spw[sv]++; if (x[11]) st.ace[sv]++; } else st.rpw[rc]++;
      if (x[7]) { st.bpO[rc]++; if (w === rc) st.bpC[rc]++; }
    });
    var l = L[L.length - 1];
    return { st: st, last: { w: l[0], ace: !!l[11], n: L.length } };
  }
  // 7.56: momento decisivo para a página ao vivo: match point > set point > break point (t = '' quando não há)
  function liveStake(s) {
    if (s.winner !== null) return { t: '', p: -1 };
    var k = E().stakes(s);
    for (var i = 0; i < 2; i++) if (k.matchPoint[i]) return { t: 'mp', p: i };
    for (i = 0; i < 2; i++) if (k.setPoint[i]) return { t: 'sp', p: i };
    var al = alertInfo(s); if (al && al.type === 'bp') return { t: 'bp', p: al.player };
    return { t: '', p: -1 };
  }
  function liveDoc(base, G, now, ins) {
    var s = G.state, m = G.meta, d = E().display(s), over = s.winner !== null, ended = over ? (base.endedAt || now) : 0, ls = liveStats(m);
    return {
      owner: String(base.owner || ''), ownerName: String(base.ownerName || '').slice(0, 80), on: true, ann: !!base.ann,
      audience: base.ann ? (base.aud || []).slice(0, 400) : [], names: [String(m.names[0] || '').slice(0, 80), String(m.names[1] || '').slice(0, 80)],
      mode: s.cfg.mode === 'doubles' ? 'doubles' : 'singles', place: String(m.place || '').slice(0, 80),
      sc: { sets: (s.sets || []).map(setText), g: s.games.slice(), p: over ? ['', ''] : [String(d.points[0]), String(d.points[1])], srv: over ? -1 : d.server, tb: !!d.tiebreak, w: over ? s.winner : -1, sw: s.setsWon.slice(),
        st: ls.st, last: ls.last || { w: -1, ace: false, n: 0 }, k: liveStake(s) },
      sport: 'tennis', surf: String(m.surface || '').slice(0, 20), playAt: m.playStart || m.startedAt || base.startedAt || now,
      ins: over ? (ins || []) : [], startedAt: base.startedAt || now, updatedAt: now, endedAt: ended,
      expAt: over ? ended + AFTER_MS : now + LIVE_MS
    };
  }
  function restVal(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return (isFinite(v) && v % 1 === 0) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'string') return { stringValue: v };
    if (Object.prototype.toString.call(v) === '[object Array]') return { arrayValue: v.length ? { values: v.map(restVal) } : {} };
    var f = {}; Object.keys(v).forEach(function (k) { f[k] = restVal(v[k]); }); return { mapValue: { fields: f } };
  }
  function liveRest(doc) { return JSON.stringify({ fields: restVal(doc).mapValue.fields }); }
  function sessionLive(now) {
    if (!S || !S.live || !S.live.id) return 'null';
    now = now || Date.now();
    if (S.G.state.winner !== null) { if (!S.live.endedAt) S.live.endedAt = now; } else S.live.endedAt = 0;
    return JSON.stringify({ id: S.live.id, body: liveRest(liveDoc(S.live, S.G, now, [])) });
  }
  function sessionTake() { if (!S) return JSON.stringify({ ok: false }); var o = { ok: true, changed: S.changed, points: S.n, G: S.G }; return JSON.stringify(o); }

  /* 7.87: pronúncia só no texto que vai para a voz (a tela continua "ACE"). Cada voz lê do seu jeito:
     a grafia fonética por idioma faz o "ace" soar como em inglês ("êis"). Para ajustar outra palavra, acrescente aqui. */
  var SAY = {
    'pt-BR': [[/\bace\b/gi, 'êis']],
    es: [[/\bace\b/gi, 'eis']],
    fr: [[/\bace\b/gi, 'esse']]
  };
  function say(t, lang) {
    var l = lang || (typeof I18N !== 'undefined' && I18N.lang ? I18N.lang() : 'pt-BR'), r = SAY[l], out = String(t == null ? '' : t);
    if (r) r.forEach(function (x) { out = out.replace(x[0], function (m) { return m.charAt(0) === m.charAt(0).toUpperCase() ? x[1].charAt(0).toUpperCase() + x[1].slice(1) : x[1]; }); });   // mantém a maiúscula
    return out;
  }

  return {
    say: say, SAY: SAY,
    LOCK_MS: LOCK_MS, MODES: MODES, GN: GN,
    spokenDur: spokenDur, restLine: restLine, speakNames: speakNames, alertInfo: alertInfo, alertText: alertText, serveLine: serveLine, setText: setText,
    applyPoint: applyPoint, applyUndo: applyUndo, info: info,
    sessionStart: sessionStart, sessionGesture: sessionGesture, sessionAction: sessionAction, sessionTake: sessionTake,
    liveDoc: liveDoc, liveRest: liveRest, sessionLive: sessionLive
  };
});
