/* BoxScore — páginas legais (Beta 7.9.2).
 * Preenche os dados de config.js, escolhe o idioma (mesmo do app) e cuida do botão Voltar.
 * Ordem do idioma: ?lang= na URL → idioma salvo no app (boxscore.lang) → idioma do aparelho → pt-BR.
 */
(function () {
  var L = window.BX_LEGAL || {};
  var LANGS = ['pt-BR', 'pt-PT', 'en', 'es', 'fr', 'de'];
  var UI = {
    'pt-BR': { back: 'Voltar', prev: '' },
    'pt-PT': { back: 'Voltar', prev: 'Versão em português de Portugal. Em caso de divergência, prevalece a versão em português do Brasil.' },
    en: { back: 'Back', prev: 'Translated version. If there is any difference, the Brazilian Portuguese version prevails.' },
    es: { back: 'Volver', prev: 'Versión traducida. En caso de discrepancia, prevalece la versión en portugués de Brasil.' },
    fr: { back: 'Retour', prev: 'Version traduite. En cas de divergence, la version en portugais du Brésil prévaut.' },
    de: { back: 'Zurück', prev: 'Übersetzte Fassung. Bei Abweichungen gilt die brasilianisch-portugiesische Fassung.' }
  };
  function norm(v) {
    if (!v) return null;
    v = String(v).trim();
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].toLowerCase() === v.toLowerCase()) return LANGS[i];
    var b = v.slice(0, 2).toLowerCase();
    if (b === 'pt') return /pt[-_](pt|ao|mz|cv|gw|st|tl)/i.test(v) ? 'pt-PT' : 'pt-BR';
    return LANGS.indexOf(b) >= 0 ? b : null;
  }
  function pick() {
    var q = null; try { q = new URLSearchParams(location.search).get('lang'); } catch (e) {}
    var s = null; try { s = localStorage.getItem('boxscore.lang'); } catch (e) {}
    var n = (navigator.languages && navigator.languages[0]) || navigator.language;
    return norm(q) || norm(s) || norm(n) || 'pt-BR';
  }
  function fmtDate(lang) {
    var iso = L.updatedISO || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return L.updated || null;
    try {
      var p = iso.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12));
      return new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' }).format(d);
    } catch (e) { return L.updated || iso; }
  }
  // dados fixos (nome, responsável, prazos…) em todas as versões
  [].forEach.call(document.querySelectorAll('[data-k]'), function (el) {
    var k = el.getAttribute('data-k'); if (k === 'updated') return;
    var v = L[k]; if (v != null && v !== '') el.textContent = v;
  });
  // e-mail: mostra só se configurado
  [].forEach.call(document.querySelectorAll('[data-email]'), function (el) {
    if (L.email) { var a = document.createElement('a'); a.href = 'mailto:' + L.email; a.textContent = L.email; el.textContent = ''; el.appendChild(a); }
    else { var w = el.closest('[data-if-email]'); if (w) w.hidden = true; else el.textContent = '—'; }
  });
  var arts = document.querySelectorAll('article[data-lang]');
  var sel = document.getElementById('langSel');
  function show(lang) {
    var found = false;
    [].forEach.call(arts, function (a) { var on = a.getAttribute('data-lang') === lang; a.hidden = !on; if (on) found = true; });
    if (!found) lang = 'pt-BR', [].forEach.call(arts, function (a) { a.hidden = a.getAttribute('data-lang') !== 'pt-BR'; });
    document.documentElement.lang = lang;
    var art = document.querySelector('article[data-lang="' + lang + '"]');
    var dt = fmtDate(lang);
    if (art && dt) [].forEach.call(art.querySelectorAll('[data-k="updated"]'), function (el) { el.textContent = dt; });
    var h = art && art.querySelector('h1');
    if (h) document.title = h.textContent.trim() + ' · ' + (L.app || 'BoxScore');
    var u = UI[lang] || UI['pt-BR'];
    var bt = document.getElementById('backTxt'); if (bt) bt.textContent = u.back;
    var pv = document.getElementById('prevails'); if (pv) { pv.textContent = u.prev; pv.hidden = !u.prev; }
    if (sel) sel.value = lang;
    return lang;
  }
  var cur = show(pick());
  if (sel) sel.addEventListener('change', function () {
    cur = show(sel.value);
    try { var u = new URL(location.href); u.searchParams.set('lang', cur); history.replaceState(null, '', u.toString()); } catch (e) {}
  });
  // links entre as páginas legais mantêm o idioma escolhido
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/^(privacidade|termos|excluir-conta)\.html(#.*)?$/.test(href)) {
      var parts = href.split('#'); a.setAttribute('href', parts[0] + '?lang=' + encodeURIComponent(cur) + (parts[1] ? '#' + parts[1] : ''));
    }
  }, true);
  var back = document.getElementById('back');
  if (back) back.addEventListener('click', function (e) {
    var ref = document.referrer || '';
    if (ref && ref.indexOf(location.origin) === 0 && history.length > 1) { e.preventDefault(); history.back(); }
  });
})();
