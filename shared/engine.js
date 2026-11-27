/* BoxScore — shared/engine.js (7.37): motor de pontuação do tênis, tirado de dentro do Placar.
   Roda no navegador, no Node e no JavaScriptCore do iPhone (partida com a tela bloqueada).
   As frases usam T, Tf e I18N globais (no Placar vêm do i18n; no iPhone, de um shim com o dicionário). */
/*
 * Motor de pontuação do tênis (sem tela, sem rádio, sem áudio).
 * Funciona no navegador e no Node. O estado é JSON puro, então pode ser salvo.
 *
 * Times são 0 e 1. Em simples, cada time é um jogador.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TennisEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULTS = {
    mode: 'singles',          // 'singles' | 'doubles'
    bestOf: 3,                // 1, 3 ou 5 sets
    gamesPerSet: 6,
    tiebreak: true,           // tie-break quando chega a gamesPerSet iguais
    tiebreakPoints: 7,
    finalSet: 'same',         // 'same' | 'super' | 'advantage' (set decisivo; em 1 set vale para o 6-6: tie-break, super tie-break ou sem tie-break)
    stb: false,               // 7.59: a partida é só um super tie-break
    stbPts: 0,                // 7.87: pontos desse tie-break único (0 = superTiebreakPoints; 7 = partida "Tie-break")
    superTiebreakPoints: 10,
    noAd: false,              // ponto decisivo no 40 iguais
    firstServer: 0
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function setsToWin(cfg) { return Math.ceil(cfg.bestOf / 2); }
  // 7.87: partida "Tie-break" (um único tie-break de 7 pontos; o super TB é de 10)
  function tb7(s) { return !!(s && s.cfg && s.cfg.stb && s.cfg.stbPts && s.cfg.stbPts < 10); }

  function isDeciding(s) {
    var n = setsToWin(s.cfg);
    return s.cfg.bestOf > 1 && s.setsWon[0] === n - 1 && s.setsWon[1] === n - 1;
  }
  // 7.59: em partida de 1 set, o "set decisivo" é o próprio set (super = super tie-break no 6-6)
  function onlySet(s) { return s.cfg.bestOf === 1 && !s.cfg.stb; }

  function hasTiebreak(s) {
    return s.cfg.tiebreak && !((isDeciding(s) || onlySet(s)) && s.cfg.finalSet === 'advantage');
  }

  // ---- saque -------------------------------------------------------------

  function startGame(s, team) {
    s.server = team;
    s.serverPlayer = s.cfg.mode === 'doubles' ? s.servedGames[team] % 2 : 0;
    s.servedGames[team]++;
  }

  function startTb(s, kind, target, firstTeam) {
    s.tb = {
      kind: kind,
      target: target,
      first: firstTeam,
      xp: s.servedGames[firstTeam] % 2,
      yp: s.servedGames[1 - firstTeam] % 2
    };
    s.server = firstTeam;
    s.serverPlayer = s.cfg.mode === 'doubles' ? s.tb.xp : 0;
  }

  // No tie-break, o primeiro saca 1 ponto e depois cada lado saca 2 em 2.
  function updateTbServer(s) {
    var t = s.points[0] + s.points[1];
    var slot = Math.floor((t + 1) / 2) % 4;
    var x = s.tb.first;
    s.server = slot % 2 === 0 ? x : 1 - x;
    if (s.cfg.mode === 'doubles') {
      s.serverPlayer = [s.tb.xp, s.tb.yp, 1 - s.tb.xp, 1 - s.tb.yp][slot];
    }
  }

  // ---- criação -----------------------------------------------------------

  function newMatch(config) {
    var cfg = Object.assign({}, DEFAULTS, config || {});
    var s = {
      cfg: cfg,
      sets: [],            // [{games:[a,b], tb:null|[a,b], kind:'normal'|'super'}]
      setsWon: [0, 0],
      games: [0, 0],
      points: [0, 0],
      tb: null,
      server: cfg.firstServer,
      serverPlayer: 0,
      servedGames: [0, 0],
      gameLog: [],         // games normais: [{srv: time que sacou, w: time que ganhou}] (tie-breaks ficam de fora)
      winner: null,
      pointsPlayed: 0
    };
    if (cfg.stb) { cfg.bestOf = 1; startTb(s, 'super', cfg.stbPts || cfg.superTiebreakPoints, cfg.firstServer); }   // 7.59: só um super tie-break; 7.87: ou um tie-break de 7
    else startGame(s, cfg.firstServer);
    return s;
  }

  // ---- fluxo -------------------------------------------------------------

  function beginSet(s, ev, firstTeam) {
    s.games = [0, 0];
    s.points = [0, 0];
    if (isDeciding(s) && s.cfg.finalSet === 'super') {
      startTb(s, 'super', s.cfg.superTiebreakPoints, firstTeam);
      ev.push({ type: 'tiebreakStart', kind: 'super' });
    } else {
      s.tb = null;
      startGame(s, firstTeam);
    }
  }

  function endSet(s, w, ev, rec, lastServerTeam) {
    s.sets.push(rec);
    s.setsWon[w]++;
    ev.push({ type: 'set', winner: w, games: rec.games.slice(), tb: rec.tb ? rec.tb.slice() : null, kind: rec.kind });
    if (s.setsWon[w] === setsToWin(s.cfg)) {
      s.winner = w;
      s.games = [0, 0];
      s.points = [0, 0];
      s.tb = null;
      ev.push({ type: 'match', winner: w });
      return;
    }
    var total = rec.kind === 'super' ? 0 : rec.games[0] + rec.games[1];
    if (total % 2 === 1) ev.push({ type: 'changeEnds' });
    beginSet(s, ev, 1 - lastServerTeam);
  }

  function tbPoint(s, w, ev) {
    var l = 1 - w;
    var p = s.points[w], q = s.points[l];
    var t = s.points[0] + s.points[1];
    if (p >= s.tb.target && p - q >= 2) {
      var first = s.tb.first;
      var rec;
      if (s.tb.kind === 'quick') {
        // desempate rápido (Beta 1.4): decide a partida na hora; quem vence leva o game em disputa
        s.games[w]++;
        rec = { games: s.games.slice(), tb: s.points.slice(), kind: 'normal' };
        s.sets.push(rec);
        s.setsWon[w]++;
        ev.push({ type: 'set', winner: w, games: rec.games.slice(), tb: rec.tb.slice(), kind: 'normal' });
        s.winner = w; s.endedBy = 'quick';
        s.games = [0, 0]; s.points = [0, 0]; s.tb = null;
        ev.push({ type: 'match', winner: w });
        return;
      }
      if (s.tb.kind === 'super') {
        rec = { games: w === 0 ? [1, 0] : [0, 1], tb: s.points.slice(), kind: 'super' };
      } else {
        s.games[w]++;
        rec = { games: s.games.slice(), tb: s.points.slice(), kind: 'normal' };
      }
      s.servedGames[first]++;
      s.servedGames[1 - first]++;
      s.tb = null;
      endSet(s, w, ev, rec, first);
      return;
    }
    if (t % 6 === 0) ev.push({ type: 'changeEnds' });
    updateTbServer(s);
  }

  function pointWon(prev, w) {
    if (prev.winner !== null) return { state: prev, events: [] };
    var s = clone(prev);
    var ev = [];
    s.pointsPlayed++;
    s.points[w]++;
    ev.push({ type: 'point', winner: w });

    if (s.tb) {
      tbPoint(s, w, ev);
      return { state: s, events: ev };
    }

    var l = 1 - w;
    var p = s.points[w], q = s.points[l];
    var won = s.cfg.noAd ? p >= 4 : (p >= 4 && p - q >= 2);

    if (!won) {
      if (s.cfg.noAd) {
        if (p === 3 && q === 3) ev.push({ type: 'deciding' });
      } else if (p >= 3 && q >= 3) {
        if (p === q) ev.push({ type: 'deuce' });
        else ev.push({ type: 'advantage', player: w });
      }
      return { state: s, events: ev };
    }

    // game
    s.games[w]++;
    s.points = [0, 0];
    ev.push({ type: 'game', winner: w });
    if (!s.gameLog) s.gameLog = [];
    s.gameLog.push({ srv: s.server, w: w });
    var gps = s.cfg.gamesPerSet;
    var a = s.games[w], b = s.games[l];
    var gameServer = s.server;

    if (a >= gps && a - b >= 2) {
      endSet(s, w, ev, { games: s.games.slice(), tb: null, kind: 'normal' }, gameServer);
    } else if (hasTiebreak(s) && a === gps && b === gps) {
      var big = onlySet(s) && s.cfg.finalSet === 'super';   // 7.59: 1 set com super tie-break no 6-6
      ev.push({ type: 'tiebreakStart', kind: big ? 'super' : 'normal' });
      startTb(s, 'normal', big ? s.cfg.superTiebreakPoints : s.cfg.tiebreakPoints, 1 - gameServer);
    } else {
      if ((a + b) % 2 === 1) ev.push({ type: 'changeEnds' });
      startGame(s, 1 - gameServer);
    }
    return { state: s, events: ev };
  }

  // ---- histórico (Undo) ----------------------------------------------------

  function createGame(config) {
    return { state: newMatch(config), past: [] };
  }

  function addPoint(game, w) {
    if (game.state.winner !== null) return { game: game, events: [] };
    var r = pointWon(game.state, w);
    return { game: { state: r.state, past: game.past.concat([game.state]) }, events: r.events };
  }

  // Beta 1.4: desempate rápido no lugar do game em andamento (até `target`, com 2 de diferença).
  function startQuick(game, target) {
    if (game.state.winner !== null) return game;
    var s = clone(game.state);
    s.points = [0, 0];
    startTb(s, 'quick', target, s.server);
    return { state: s, past: game.past.concat([game.state]) };
  }
  // Beta 1.4: encerra a partida na hora, com o vencedor escolhido (placar parcial fica guardado).
  function endMatch(game, w, why) {
    if (game.state.winner !== null) return game;
    var s = clone(game.state);
    s.winner = w; s.endedBy = 'manual'; s.endWhy = why || '';
    s.points = [0, 0]; s.tb = null;
    return { state: s, past: game.past.concat([game.state]) };
  }

  function undo(game) {
    if (!game.past.length) return game;
    return { state: game.past[game.past.length - 1], past: game.past.slice(0, -1) };
  }

  // ---- exibição ------------------------------------------------------------

  var PT = ['0', '15', '30', '40'];

  // Quem tem match point / set point agora: simula o próximo ponto de cada jogador.
  function stakes(s) {
    var out = { matchPoint: [false, false], setPoint: [false, false] };
    if (s.winner !== null) return out;
    for (var p = 0; p < 2; p++) {
      var ev = pointWon(s, p).events;
      var isM = false, isS = false;
      for (var i = 0; i < ev.length; i++) { if (ev[i].type === 'match') isM = true; if (ev[i].type === 'set') isS = true; }
      if (isM) out.matchPoint[p] = true; else if (isS) out.setPoint[p] = true;
    }
    return out;
  }
  function stakesText(s, names, on) {
    if (on === false) return '';
    var nm = function (i) { return (names && names[i]) || (i === 0 ? T("jogador 1") : T("jogador 2")); };
    var k = stakes(s), parts = [];
    [0, 1].forEach(function (p) { if (k.matchPoint[p]) parts.push(Tf("Match point, {0}.", nm(p))); });
    if (!parts.length) [0, 1].forEach(function (p) { if (k.setPoint[p]) parts.push(Tf("Set point, {0}.", nm(p))); });
    return parts.join(' ');
  }

  function display(s) {
    var out = {
      points: ['0', '0'], games: s.games.slice(), sets: s.sets, setsWon: s.setsWon.slice(),
      server: s.server, serverPlayer: s.serverPlayer,
      // lado do saque: direita (quadra de iguais) nos pontos pares, esquerda nos ímpares
      serveSide: (s.points[0] + s.points[1]) % 2 === 0 ? 'right' : 'left',
      tiebreak: !!s.tb,
      tbKind: s.tb ? (s.tb.kind === 'normal' && s.tb.target >= 10 ? 'super' : s.tb.kind === 'super' && s.tb.target < 10 ? 'normal' : s.tb.kind) : null, deuce: false, advantage: null, deciding: false,
      winner: s.winner, matchPoint: null, setPoint: null
    };
    if (s.winner !== null) { out.points = ['', '']; return out; }
    var sk = stakes(s);
    out.matchPoint = sk.matchPoint[0] ? 0 : sk.matchPoint[1] ? 1 : null;
    out.setPoint = sk.setPoint[0] ? 0 : sk.setPoint[1] ? 1 : null;
    var a = s.points[0], b = s.points[1];
    if (s.tb) { out.points = [String(a), String(b)]; return out; }
    if (a >= 3 && b >= 3) {
      if (s.cfg.noAd) {
        out.points = ['40', '40'];
        out.deciding = true;
      } else if (a === b) {
        out.points = ['40', '40'];
        out.deuce = true;
      } else {
        out.advantage = a > b ? 0 : 1;
        out.points = a > b ? [T("AD"), '40'] : ['40', T("AD")];
      }
      return out;
    }
    out.points = [PT[a], PT[b]];
    return out;
  }

  // ---- narração em português ------------------------------------------------

  var NUM = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
    'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte'];
  var PTW = ['zero', 'quinze', 'trinta', 'quarenta'];

  function isPt() { return I18N.lang().indexOf('pt') === 0; }
  function ptw(i) { return I18N.pts()[i]; }
  function num(n) { return isPt() && n <= 20 ? NUM[n] : String(n); }

  /*
   * Devolve uma lista de frases para falar, na ordem.
   * s = estado depois do ponto; events = eventos devolvidos por pointWon.
   * names = ['Leandro', 'Gisele'] (nome de cada time).
   * opts.nameOnPoint: diz o nome de quem fez o ponto depois do placar.
   */
  function announce(s, events, names, opts) {
    opts = Object.assign({ nameOnPoint: true, stakes: true }, opts || {});
    var nm = function (i) { return (names && names[i]) || (i === 0 ? T("jogador 1") : T("jogador 2")); };
    var find = function (t) { for (var i = 0; i < events.length; i++) if (events[i].type === t) return events[i]; return null; };
    var out = [];
    var m = find('match'), st = find('set'), g = find('game'), pt = find('point');

    if (m) {
      var w = m.winner;
      out.push(Tf("Fim de jogo. Vitória de {0}.", nm(w)));
      out.push(s.sets.map(function (r) {
        return r.kind === 'super'
          ? Tf(tb7(s) ? "tie-break {0} a {1}" : "super tie-break {0} a {1}", num(r.tb[w]), num(r.tb[1 - w]))
          : num(r.games[w]) + ' a ' + num(r.games[1 - w]);
      }).join(', ') + '.');
      return out;
    }
    if (st) {
      var sw = st.winner;
      if (st.kind === 'super') out.push(Tf(tb7(s) ? "Tie-break para {0}, {1} a {2}." : "Super tie-break para {0}, {1} a {2}.", nm(sw), num(st.tb[sw]), num(st.tb[1 - sw])));
      else out.push(Tf("Set para {0}, {1} a {2}.", nm(sw), num(st.games[sw]), num(st.games[1 - sw])));
    } else if (g) {
      var gw = g.winner;
      out.push(Tf("Game {0}, {1} a {2}.", nm(gw), num(s.games[gw]), num(s.games[1 - gw])));
    } else if (pt) {
      var wn = pt.winner;
      var tail = opts.nameOnPoint ? ', ' + nm(wn) : '';
      var adv = find('advantage');
      if (find('deuce')) out.push(T('Iguais') + tail + '.');
      else if (adv) out.push(Tf("Vantagem {0}.", nm(adv.player)));
      else if (find('deciding')) out.push(T("Ponto decisivo."));
      else {
        var sv = s.server, rc = 1 - sv;
        var sp = s.points[sv], rp = s.points[rc];
        var phrase;
        if (s.tb) phrase = num(sp) + ' a ' + num(rp);
        else if (sp === rp) phrase = Tf('pts§{0} iguais', ptw(sp));
        else phrase = Tf('pts§{0} a {1}', ptw(sp), ptw(rp));
        out.push(phrase.charAt(0).toUpperCase() + phrase.slice(1) + tail + '.');
      }
    }
    var ts = find('tiebreakStart');
    if (ts) out.push(ts.kind === 'super' ? T("Super tie-break.") : T("Tie-break."));
    if (!m && opts.stakes !== false) { var sx = stakesText(s, names, true); if (sx) out.push(sx); }
    if (find('changeEnds')) out.push(T("Troca de lado."));
    return out;
  }

  function cap(x) { return x.charAt(0).toUpperCase() + x.slice(1); }

  // Placar atual falado (para o botão "falar placar" e para o desfazer).
  function scoreText(s, names) {
    var nm = function (i) { return (names && names[i]) || (i === 0 ? T("jogador 1") : T("jogador 2")); };
    if (s.winner !== null) return Tf("Fim de jogo. Vitória de {0}.", nm(s.winner));
    var sv = s.server, rc = 1 - sv, sp = s.points[sv], rp = s.points[rc];
    if (s.tb) return cap(num(sp) + ' a ' + num(rp)) + '.';
    if (sp >= 3 && rp >= 3) {
      if (s.cfg.noAd) return T("Ponto decisivo.");
      if (sp === rp) return T("Iguais.");
      return Tf("Vantagem {0}.", nm(sp > rp ? sv : rc));
    }
    if (sp === rp) return (sp === 0 ? T('pts§Zero a zero') : cap(Tf('pts§{0} iguais', ptw(sp)))) + '.';
    return cap(Tf('pts§{0} a {1}', ptw(sp), ptw(rp))) + '.';
  }

  // Resumo falado: sets, games e o placar do game.
  function fullText(s, names) {
    var nm = function (i) { return (names && names[i]) || (i === 0 ? T("jogador 1") : T("jogador 2")); };
    if (s.winner !== null) return scoreText(s, names);
    var out = [];
    if (s.sets.length) out.push(Tf("Sets: {0} {1}, {2} {3}.", nm(0), num(s.setsWon[0]), nm(1), num(s.setsWon[1])));
    if (!s.tb || s.tb.kind !== 'super') out.push(Tf("Games: {0} {1}, {2} {3}.", nm(0), num(s.games[0]), nm(1), num(s.games[1])));
    out.push(scoreText(s, names));
    var sx = stakesText(s, names, true); if (sx) out.push(sx);
    return out.join(' ');
  }

  return {
    scoreText: scoreText,
    stakes: stakes,
    fullText: fullText,
    DEFAULTS: DEFAULTS,
    newMatch: newMatch,
    pointWon: pointWon,
    createGame: createGame,
    addPoint: addPoint,
    startQuick: startQuick,
    endMatch: endMatch,
    undo: undo,
    display: display,
    announce: announce,
    isTb7: tb7
  };
});

