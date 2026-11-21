/* BoxScore — shared/bgi18n.js (7.37)
   Tradução mínima para rodar engine.js + bgcore.js fora da página (JavaScriptCore do iPhone).
   Mesma regra do Placar: chave = texto em pt-BR; "prefixo§texto" mostra só o texto; {0} {1}… são trocados.
   Uso: BXI18N.install({ lang: 'pt-BR', locale: 'pt-BR', pts: ['zero', …], dict: { 'texto pt-BR': 'tradução' } }) */
(function (root) {
  root.BXI18N = {
    install: function (o) {
      var lang = o.lang || 'pt-BR', dict = o.dict || {}, pts = o.pts || ['zero', 'quinze', 'trinta', 'quarenta'];
      function t(k) {
        var s = String(k), lead = /^\s*/.exec(s)[0], core = s.trim(), trail = core ? /\s*$/.exec(s)[0] : '', v;
        if (!core) return s;
        if (lang !== 'pt-BR') v = dict[core];
        if (v === undefined) { v = core; var i = v.indexOf('§'); if (i >= 0) v = v.slice(i + 1); }
        return lead + v + trail;
      }
      function tf(k) {
        var a = arguments, v = t(k);
        return v.replace(/\{(\d+)\}/g, function (m, i) { var x = a[Number(i) + 1]; return x === undefined ? m : x; });
      }
      root.T = t; root.Tf = tf;
      root.I18N = { lang: function () { return lang; }, pts: function () { return pts; }, locale: function () { return o.locale || lang; }, t: t, tf: tf };
      return true;
    }
  };
})(typeof self !== 'undefined' ? self : this);
