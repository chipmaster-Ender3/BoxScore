/* BoxScore — telemetria de uso (shared 1.4.2, Beta 7.8; p_dur_n na 7.10.1; p_sh_* na 7.11)
 * Só contagens de uso (quantas vezes cada recurso foi usado por dia). Nunca nomes, placares, mensagens, fotos ou local.
 * Um documento por pessoa por dia: telemetry/{uid}_{AAAAMMDD} (com login) ou telemetry/a_{id do aparelho}_{AAAAMMDD} (sem login).
 * Os contadores somam no aparelho (localStorage, sobrevive offline e ao fechar) e são enviados poucas vezes:
 * ao iniciar, a cada 10 min e quando o app vai para segundo plano. Ligado por padrão; desligar apaga o que ainda não foi enviado.
 * Uso: BXTel.init({ module: 'placar', build: '7.8.0', lang: 'pt-BR', getDb: fn, getUid: fn }); BXTel.count('p_start');
 */
(function () {
  var K_BUF = 'boxscore.tel.buf', K_ON = 'boxscore.tel.on', K_AID = 'boxscore.tel.aid', K_LOCK = 'boxscore.tel.lock';
  // Lista fechada de contadores (a mesma lista está nas regras do Firestore)
  var KEYS = [
    // Placar
    'p_open', 'p_start', 'p_doubles', 'p_warm', 'p_rest', 'p_limit', 'p_voice', 'p_vol', 'p_preset', 'p_from_game',
    'p_end', 'p_min', 'p_dur_n', 'p_end_tb', 'p_end_now', 'p_later', 'p_abandon', 'p_resume',
    'p_pt_screen', 'p_pt_band', 'p_pt_notif', 'p_bg_on', 'p_live', 'p_live_ann', 'p_ace_screen', 'p_ace_band', 'p_undo',
    'p_hist', 'p_hist_filter', 'p_sum', 'p_prof', 'p_stats', 'p_share', 'p_sh_rede', 'p_sh_ig', 'p_sh_apps', 'p_sh_copy', 'p_sh_save', 'p_band_conn', 'p_settings', 'p_login',
    // Comunidade
    'r_open', 'r_tab_feed', 'r_tab_find', 'r_tab_neu', 'r_tab_groups', 'r_tab_notif',
    'r_game_new', 'r_game_accept', 'r_post', 'r_post_photo', 'r_like', 'r_comment', 'r_msg', 'r_follow',
    'r_group_new', 'r_group_join', 'r_result', 'r_tour_new', 'r_tour_join', 'r_live_open', 'r_suggest', 'r_tor_hdr', 'p_tour', 'p_stream', 'v_overlay', 'r_settings',
    // Página pública do ao vivo (7.52): quem abriu o link, sem conta
    'v_live_open', 'v_live_tv'
  ];
  var OK = {}; KEYS.forEach(function (k) { OK[k] = 1; });
  var cfg = { module: '', build: '', lang: '', getDb: null, getUid: null }, timer = null, started = false;

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function load() { try { return JSON.parse(ls(K_BUF) || '{}') || {}; } catch (e) { return {}; } }
  function save(b) { ls(K_BUF, JSON.stringify(b)); }
  function day(t) { var d = new Date(t || Date.now()); return '' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }
  function isOn() { return ls(K_ON) !== '0'; }
  function aid() {
    var a = ls(K_AID);
    if (!a || !/^[A-Za-z0-9]{16}$/.test(a)) {
      var c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', r = new Uint8Array(16); a = '';
      try { crypto.getRandomValues(r); } catch (e) { for (var j = 0; j < 16; j++) r[j] = Math.floor(Math.random() * 256); }
      for (var i = 0; i < 16; i++) a += c[r[i] % c.length];
      ls(K_AID, a);
    }
    return a;
  }
  function plat() { return window.BX_NATIVE ? String(window.BX_NATIVE) : (window.matchMedia && matchMedia('(display-mode: standalone)').matches ? 'pwa' : 'web'); }

  function count(k, n) {
    if (!OK[k] || !isOn()) return;
    n = Math.round(n == null ? 1 : n); if (!(n > 0)) return;
    var b = load(), d = day(); b[d] = b[d] || {}; b[d][k] = Math.min(100000, (b[d][k] || 0) + n);
    var days = Object.keys(b).sort(); while (days.length > 14) delete b[days.shift()];   // guarda no máximo 14 dias sem envio
    save(b);
  }

  function flush() { try { flush0(); } catch (e) { ls(K_LOCK, null); } }
  function flush0() {
    if (!isOn() || !cfg.getDb) return;
    var db = null; try { db = cfg.getDb(); } catch (e) {}
    if (!db || !window.firebase || !firebase.firestore || (navigator.onLine === false)) return;
    var lock = +ls(K_LOCK) || 0; if (Date.now() - lock < 15000) return;   // outra aba/módulo enviando agora
    ls(K_LOCK, String(Date.now()));
    var b = load(), uid = null; try { uid = cfg.getUid && cfg.getUid(); } catch (e) {}
    var who = uid ? uid : 'a_' + aid(), FV = firebase.firestore.FieldValue, sent = {}, jobs = [];
    if (!FV || !FV.increment) { ls(K_LOCK, null); return; }
    Object.keys(b).forEach(function (d) {
      var c = b[d], inc = {}, any = false;
      Object.keys(c).forEach(function (k) { if (OK[k] && c[k] > 0) { inc[k] = FV.increment(c[k]); any = true; } });
      if (!any) return;
      sent[d] = c;
      jobs.push(db.collection('telemetry').doc(who + '_' + d).set({ d: d, v: 1, anon: !uid, plat: plat(), build: String(cfg.build || '').slice(0, 12), lang: String(cfg.lang || '').slice(0, 8), c: inc }, { merge: true })
        .then(function () { return null; }, function () { return d; }));
    });
    if (!jobs.length) { ls(K_LOCK, null); return; }
    // tira do aparelho antes de enviar (sem risco de contar duas vezes); se falhar, devolve
    var nb = load(); Object.keys(sent).forEach(function (d) { Object.keys(sent[d]).forEach(function (k) { if (nb[d]) { nb[d][k] = (nb[d][k] || 0) - sent[d][k]; if (nb[d][k] <= 0) delete nb[d][k]; } }); if (nb[d] && !Object.keys(nb[d]).length) delete nb[d]; });
    save(nb);
    Promise.all(jobs).then(function (fails) {
      var back = load();
      fails.forEach(function (d) { if (!d) return; back[d] = back[d] || {}; Object.keys(sent[d]).forEach(function (k) { back[d][k] = (back[d][k] || 0) + sent[d][k]; }); });
      save(back); ls(K_LOCK, null);
    });
  }

  function setOn(v) { ls(K_ON, v ? '1' : '0'); if (!v) ls(K_BUF, null); }
  function init(o) {
    Object.keys(o || {}).forEach(function (k) { cfg[k] = o[k]; });
    if (started) return; started = true;
    setTimeout(flush, 8000);
    timer = setInterval(flush, 10 * 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
    window.addEventListener('online', function () { setTimeout(flush, 3000); });
  }
  window.BXTel = { init: init, count: count, flush: flush, isOn: isOn, setOn: setOn, keys: KEYS.slice(), _day: day };
})();
