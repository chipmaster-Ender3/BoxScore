/* Preenche os dados de config.js nas páginas legais e cuida do botão Voltar. */
(function () {
  var L = window.BX_LEGAL || {};
  [].forEach.call(document.querySelectorAll('[data-k]'), function (el) {
    var v = L[el.getAttribute('data-k')]; if (v != null && v !== '') el.textContent = v;
  });
  // e-mail: mostra só se configurado
  [].forEach.call(document.querySelectorAll('[data-email]'), function (el) {
    if (L.email) { var a = document.createElement('a'); a.href = 'mailto:' + L.email; a.textContent = L.email; el.textContent = ''; el.appendChild(a); }
    else el.closest('[data-if-email]') ? el.closest('[data-if-email]').hidden = true : (el.textContent = '—');
  });
  var back = document.getElementById('back');
  if (back) back.addEventListener('click', function (e) {
    var ref = document.referrer || '';
    if (ref && ref.indexOf(location.origin) === 0 && history.length > 1) { e.preventDefault(); history.back(); }
  });
  try {
    var lang = (localStorage.getItem('boxscore.lang') || navigator.language || 'pt-BR');
    if (!/^pt/i.test(lang)) { var n = document.getElementById('langNote'); if (n) n.hidden = false; }
  } catch (e) {}
})();
