/* BoxScore: formato de partida v1 (compartilhado entre Placar e Rede).
   Regras do formato: só dados públicos da partida, sem arrays dentro de arrays (o Firestore não aceita),
   sem valores undefined. Campos novos entram como opcionais; mudar o significado de um campo exige v2. */
(function (g) {
  'use strict';
  var VERSION = 1, SCHEMA = 'boxscore.match';
  var MODES = ['singles', 'doubles'], STATUS = ['finished', 'unfinished'], ENDED = ['', 'manual', 'quick'], FINALS = ['same', 'super', 'advantage'];

  function num(x) { return typeof x === 'number' && isFinite(x) ? x : null; }
  function pair(a) { return a && a.length >= 2 ? [Number(a[0]) || 0, Number(a[1]) || 0] : null; }

  // e: partida do Placar (histórico). resolve(pid) devolve { uid, code } do jogador cadastrado (ou null).
  function fromEntry(e, resolve, appVersion) {
    resolve = resolve || function () { return null; };
    var cfg = e.cfg || {};
    var sides = [0, 1].map(function (ti) {
      var names = (e.players && e.players[ti] && e.players[ti].length ? e.players[ti] : [(e.names && e.names[ti]) || '']);
      var players = [];
      names.forEach(function (n, j) {
        n = String(n || '').trim(); if (!n) return;
        var pid = e.pids && e.pids[ti] && e.pids[ti][j], r = (pid && resolve(pid)) || {};
        players.push({ name: n, uid: r.uid || null, code: r.code || null });
      });
      if (!players.length) players.push({ name: String((e.names && e.names[ti]) || ''), uid: null, code: null });
      return { players: players };
    });
    var started = num(e.startedAt), play = num(e.playStart) || started, ended = num(e.endedAt);
    return {
      schema: SCHEMA, v: VERSION,
      id: String(e.id || ''),
      kind: e.kind || 'friendly',
      ref: { gameId: e.gameId || null, tournamentId: e.tournamentId || null, rankId: e.rankId || null },
      status: e.finished ? 'finished' : 'unfinished',
      endedBy: ENDED.indexOf(e.ended || '') >= 0 ? (e.ended || '') : '',
      why: String(e.why || ''),
      startedAt: started, playStart: play, endedAt: ended,
      durationSec: (ended && play) ? Math.max(0, Math.round((ended - play) / 1000)) : null,
      place: String(e.place || ''), surface: String(e.surface || ''),
      rules: {
        mode: cfg.mode || e.mode || 'singles', bestOf: cfg.bestOf || e.bestOf || 3,
        finalSet: cfg.finalSet || 'same', tiebreak: cfg.tiebreak !== false, noAd: !!cfg.noAd
      },
      sides: sides,
      sets: (e.sets || []).map(function (s) { return { g: pair(s.games) || [0, 0], tb: pair(s.tb), super: s.kind === 'super' }; }),
      setsWon: pair(e.setsWon) || [0, 0],
      winner: e.winner === 0 || e.winner === 1 ? e.winner : null,
      partial: pair(e.partial),
      current: e.current && !e.finished ? { games: pair(e.current.games) || [0, 0], points: [String(e.current.points && e.current.points[0] || '0'), String(e.current.points && e.current.points[1] || '0')] } : null,
      source: { app: 'placar', appVersion: String(appVersion || '') }
    };
  }

  // Monta uma partida do Placar a partir do formato v1 (por exemplo, partida criada por um convite da Rede).
  function toEntry(m) {
    var names = m.sides.map(function (s) { return s.players.map(function (p) { return p.name; }).join(' / '); });
    return {
      schema: 2, id: m.id, names: names, players: m.sides.map(function (s) { return s.players.map(function (p) { return p.name; }); }),
      mode: m.rules.mode, bestOf: m.rules.bestOf,
      cfg: { mode: m.rules.mode, bestOf: m.rules.bestOf, finalSet: m.rules.finalSet, tiebreak: m.rules.tiebreak, noAd: m.rules.noAd },
      place: m.place, surface: m.surface, startedAt: m.startedAt, playStart: m.playStart, endedAt: m.endedAt,
      sets: m.sets.map(function (s) { var r = { games: s.g.slice(), tb: s.tb ? s.tb.slice() : null }; if (s.super) r.kind = 'super'; return r; }),
      setsWon: m.setsWon.slice(), winner: m.winner, finished: m.status === 'finished', ended: m.endedBy || '', why: m.why || '',
      partial: m.partial ? m.partial.slice() : null,
      current: m.current ? { games: m.current.games.slice(), points: m.current.points.slice() } : null,
      gameId: m.ref && m.ref.gameId || null
    };
  }

  function validate(m) {
    var er = [];
    function bad(s) { er.push(s); }
    if (!m || typeof m !== 'object') return ['não é um objeto'];
    if (m.schema !== SCHEMA) bad('schema'); if (m.v !== VERSION) bad('v');
    if (typeof m.id !== 'string' || !m.id) bad('id');
    if (STATUS.indexOf(m.status) < 0) bad('status');
    if (ENDED.indexOf(m.endedBy) < 0) bad('endedBy');
    ['startedAt', 'playStart', 'endedAt', 'durationSec'].forEach(function (k) { if (m[k] !== null && num(m[k]) === null) bad(k); });
    if (!m.rules || MODES.indexOf(m.rules.mode) < 0) bad('rules.mode');
    else {
      if ([1, 3, 5].indexOf(m.rules.bestOf) < 0) bad('rules.bestOf');
      if (FINALS.indexOf(m.rules.finalSet) < 0) bad('rules.finalSet');
      if (typeof m.rules.tiebreak !== 'boolean' || typeof m.rules.noAd !== 'boolean') bad('rules.flags');
    }
    if (!Array.isArray(m.sides) || m.sides.length !== 2) bad('sides');
    else m.sides.forEach(function (s, i) {
      if (!s || !Array.isArray(s.players) || !s.players.length || s.players.length > 2) { bad('sides[' + i + '].players'); return; }
      s.players.forEach(function (p) { if (!p || typeof p.name !== 'string') bad('player.name'); });
    });
    if (!Array.isArray(m.sets)) bad('sets');
    else m.sets.forEach(function (s, i) { if (!s || !Array.isArray(s.g) || s.g.length !== 2 || (s.tb !== null && (!Array.isArray(s.tb) || s.tb.length !== 2))) bad('sets[' + i + ']'); });
    if (!Array.isArray(m.setsWon) || m.setsWon.length !== 2) bad('setsWon');
    if (m.winner !== null && m.winner !== 0 && m.winner !== 1) bad('winner');
    if (m.rules && m.sides && m.rules.mode === 'doubles' && m.sides.some(function (s) { return s.players.length !== 2; })) bad('doubles precisa de 2 jogadores por lado');
    // o Firestore não aceita undefined nem arrays dentro de arrays
    (function walk(x, path) {
      if (x === undefined) bad('undefined em ' + path);
      else if (Array.isArray(x)) x.forEach(function (y, i) { if (Array.isArray(y)) bad('array dentro de array em ' + path); walk(y, path + '[' + i + ']'); });
      else if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { walk(x[k], path + '.' + k); });
    })(m, 'm');
    return er;
  }

  g.BXMatch = { VERSION: VERSION, SCHEMA: SCHEMA, fromEntry: fromEntry, toEntry: toEntry, validate: validate };
})(typeof window !== 'undefined' ? window : this);
