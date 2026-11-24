/* BoxScore — lugares: País › Estado › Cidade › Bairro (shared 1.17.0, Beta 7.68)
 * Listas geradas por tools/geo-build.mjs em shared/geo/ (IBGE para o Brasil; GeoNames, CC BY 4.0, para o resto).
 * Sem os arquivos (ou sem a lista daquele país), a cidade volta a ser digitada.
 * Bairros: os da lista + os que os jogadores cadastram (Firestore hoods/{país-estado-cidade}/n/{chave} = { name, by, at }).
 * Grafias parecidas viram uma só: a "chave" tira acento, maiúsculas, pontuação, "de/da/do" e expande abreviações (Jd. → Jardim).
 * Uso: BXGeo.picker(host, { db, wrap, value, onChange })  ·  BXGeo.key('Jd. São José')  ·  BXGeo.label(loc)
 */
(function (g) {
  'use strict';
  var cs = document.currentScript, BASE = new URL('geo/', cs && cs.src ? cs.src : location.href).href;
  function lang() { return g.BXMods ? g.BXMods.lang() : (document.documentElement.lang || 'pt-BR'); }
  var TX = {
    'pt-BR': { country: 'País', state: 'Estado', city: 'Cidade', hood: 'Bairro', pick: 'Escolha', city_ph: 'Digite para buscar a cidade', hood_ph: 'Digite para buscar o bairro', city_free: 'Sua cidade', hood_free: 'Bairro (opcional)', hood_add: 'Cadastrar o bairro “{0}”', hood_mean: 'Você quis dizer “{0}”?', hood_keep: 'Não, cadastrar “{0}”', city_pick: 'Escolha a cidade na lista.', none: 'Nada encontrado.', credit: 'Listas de lugares: IBGE e GeoNames', change: 'Trocar' },
    'pt-PT': { country: 'País', state: 'Distrito / região', city: 'Cidade', hood: 'Bairro / freguesia', pick: 'Escolha', city_ph: 'Escreva para procurar a cidade', hood_ph: 'Escreva para procurar o bairro', city_free: 'A sua cidade', hood_free: 'Bairro (opcional)', hood_add: 'Registar o bairro “{0}”', hood_mean: 'Queria dizer “{0}”?', hood_keep: 'Não, registar “{0}”', city_pick: 'Escolha a cidade na lista.', none: 'Nada encontrado.', credit: 'Listas de lugares: IBGE e GeoNames', change: 'Trocar' },
    en: { country: 'Country', state: 'State / province', city: 'City', hood: 'Neighborhood', pick: 'Choose', city_ph: 'Type to search for the city', hood_ph: 'Type to search for the neighborhood', city_free: 'Your city', hood_free: 'Neighborhood (optional)', hood_add: 'Add the neighborhood “{0}”', hood_mean: 'Did you mean “{0}”?', hood_keep: 'No, add “{0}”', city_pick: 'Choose the city from the list.', none: 'Nothing found.', credit: 'Place lists: IBGE and GeoNames', change: 'Change' },
    es: { country: 'País', state: 'Estado / provincia', city: 'Ciudad', hood: 'Barrio', pick: 'Elige', city_ph: 'Escribe para buscar la ciudad', hood_ph: 'Escribe para buscar el barrio', city_free: 'Tu ciudad', hood_free: 'Barrio (opcional)', hood_add: 'Agregar el barrio “{0}”', hood_mean: '¿Quisiste decir “{0}”?', hood_keep: 'No, agregar “{0}”', city_pick: 'Elige la ciudad de la lista.', none: 'No se encontró nada.', credit: 'Listas de lugares: IBGE y GeoNames', change: 'Cambiar' },
    fr: { country: 'Pays', state: 'Région', city: 'Ville', hood: 'Quartier', pick: 'Choisir', city_ph: 'Tapez pour chercher la ville', hood_ph: 'Tapez pour chercher le quartier', city_free: 'Votre ville', hood_free: 'Quartier (facultatif)', hood_add: 'Ajouter le quartier « {0} »', hood_mean: 'Vouliez-vous dire « {0} » ?', hood_keep: 'Non, ajouter « {0} »', city_pick: 'Choisissez la ville dans la liste.', none: 'Aucun résultat.', credit: 'Listes de lieux : IBGE et GeoNames', change: 'Changer' },
    de: { country: 'Land', state: 'Bundesland / Region', city: 'Stadt', hood: 'Stadtteil', pick: 'Auswählen', city_ph: 'Tippen, um die Stadt zu suchen', hood_ph: 'Tippen, um den Stadtteil zu suchen', city_free: 'Deine Stadt', hood_free: 'Stadtteil (optional)', hood_add: 'Stadtteil „{0}“ hinzufügen', hood_mean: 'Meintest du „{0}“?', hood_keep: 'Nein, „{0}“ hinzufügen', city_pick: 'Wähle die Stadt aus der Liste.', none: 'Nichts gefunden.', credit: 'Ortslisten: IBGE und GeoNames', change: 'Ändern' }
  };
  function t(k) { var L = TX[lang()] || TX[String(lang()).slice(0, 2)] || TX.en; return L[k] || TX['pt-BR'][k] || k; }
  function tf(k) { var a = arguments; return t(k).replace(/\{(\d)\}/g, function (m, i) { return a[+i + 1]; }); }

  // ---------- grafias ----------
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  var AB = { jd: 'jardim', jdm: 'jardim', jard: 'jardim', vl: 'vila', v: 'vila', pq: 'parque', prq: 'parque', sta: 'santa', sto: 'santo', s: 'sao', sao: 'sao', n: 'nossa', ns: 'nossa', nsa: 'nossa', sra: 'senhora',
    res: 'residencial', resid: 'residencial', cj: 'conjunto', conj: 'conjunto', lot: 'loteamento', dr: 'doutor', prof: 'professor', cel: 'coronel', gal: 'general', gen: 'general', pres: 'presidente', eng: 'engenheiro',
    st: 'saint', ste: 'sainte', mt: 'mount', ft: 'fort' };
  var STOP = { de: 1, da: 1, do: 1, dos: 1, das: 1, d: 1, e: 1, la: 1, el: 1, del: 1, the: 1, of: 1, bairro: 1, barrio: 1, quartier: 1 };
  function key(s) {
    var w = norm(s).split(' ').filter(Boolean).map(function (x) { return AB[x] || x; }).filter(function (x) { return !STOP[x]; });
    return w.join(' ');
  }
  function lev(a, b) {
    if (a === b) return 0; var m = a.length, n = b.length; if (!m || !n) return m || n; var p = [], i, j;
    for (j = 0; j <= n; j++) p[j] = j;
    for (i = 1; i <= m; i++) { var q = [i]; for (j = 1; j <= n; j++) q[j] = Math.min(p[j] + 1, q[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = q; }
    return p[n];
  }
  // a mais parecida de uma lista de nomes (para "Você quis dizer…"); null se nenhuma é parecida o bastante
  function near(names, text) {
    var k = key(text), best = null, bd = 99; if (k.length < 3) return null;
    names.forEach(function (nm) { var d = lev(k, key(nm)); if (d < bd) { bd = d; best = nm; } });
    return best && bd <= (k.length <= 6 ? 1 : 2) ? best : null;
  }
  function same(names, text) { var k = key(text); for (var i = 0; i < names.length; i++) if (key(names[i]) === k) return names[i]; return null; }
  function search(list, text, get, max) {           // começa com > palavra começa com > contém
    var k = key(text), out = [[], [], []]; if (!k) return [];
    list.forEach(function (it) { var v = key(get(it)); if (v.indexOf(k) === 0) out[0].push(it); else if ((' ' + v).indexOf(' ' + k) >= 0) out[1].push(it); else if (v.indexOf(k) >= 0) out[2].push(it); });
    return out[0].concat(out[1], out[2]).slice(0, max || 8);
  }

  // ---------- dados ----------
  var ISO = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(' ');
  var BR_UF = [['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'], ['SE', 'Sergipe'], ['TO', 'Tocantins']];
  var CACHE = {};
  function getJSON(rel) {
    if (!CACHE[rel]) CACHE[rel] = fetch(BASE + rel, { cache: 'force-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(function () { delete CACHE[rel]; return null; });
    return CACHE[rel];
  }
  // 7.70: cache em memória (o tablet levava ~80 ms montando os 250 nomes de país a cada abertura do perfil)
  var DN = {}, CL = {};
  function cname(cc) { var l = lang(); try { if (!DN[l]) DN[l] = new Intl.DisplayNames([l], { type: 'region' }); return DN[l].of(cc) || cc; } catch (e) { return cc; } }
  function countries() { var l = lang(); if (!CL[l]) { var col = new Intl.Collator(l); CL[l] = ISO.map(function (cc) { return [cc, cname(cc)]; }).sort(function (a, b) { return col.compare(a[1], b[1]); }); } return CL[l]; }
  function defCountry() { var l = String(lang()), m = /-([A-Z]{2})$/.exec(l); if (m) return m[1]; return { pt: 'BR', en: 'US', es: 'ES', fr: 'FR', de: 'DE' }[l.slice(0, 2)] || 'BR'; }
  function states(cc) { return getJSON('a1.json').then(function (a) { return (a && a[cc]) || (cc === 'BR' ? BR_UF : []); }); }
  function hasCities(cc) { return getJSON('index.json').then(function (x) { return !!(x && (x.cities || []).indexOf(cc) >= 0); }); }
  function cityFile(cc, a1) { return hasCities(cc).then(function (y) { return y ? getJSON('c/' + cc + '-' + String(a1).replace(/[^A-Za-z0-9]/g, '_') + '.json') : null; }); }
  function cid(loc) { return loc && loc.country && loc.state && loc.cityId ? loc.country + '-' + loc.state + '-' + loc.cityId : ''; }
  // bairros da lista + os cadastrados pelos jogadores (sem repetir grafias)
  var HM = {};      // bairros por cidade, guardados por 10 min (evita consultar o Firestore a cada abertura)
  function hoods(loc, db) {
    var id = cid(loc); if (!id) return Promise.resolve([]);
    var hm = HM[id]; if (hm && Date.now() - hm.at < 600000 && (hm.db || !db)) return hm.p;
    var fromFile = cityFile(loc.country, loc.state).then(function (f) { return (f && f.b && f.b[loc.cityId]) || []; });
    var fromDb = db ? db.collection('hoods').doc(id).collection('n').limit(2000).get().then(function (q) { return q.docs.map(function (d) { return (d.data() || {}).name || ''; }); }, function () { return []; }) : Promise.resolve([]);
    var p = Promise.all([fromFile, fromDb]).then(function (r) {
      var seen = {}, out = []; r[0].concat(r[1]).forEach(function (nm) { var k = key(nm); if (k && !seen[k]) { seen[k] = 1; out.push(nm); } });
      return out.sort(function (a, b) { return a.localeCompare(b, lang()); });
    });
    HM[id] = { p: p, at: Date.now(), db: !!db };
    return p;
  }
  function clean(s) { s = String(s || '').replace(/\s+/g, ' ').trim().slice(0, 60); return s.replace(/(^|[\s-])(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, function (w) { return w.toLowerCase(); }).replace(/^(\S)/, function (c) { return c.toUpperCase(); }); }
  function addHood(loc, name, db) {
    var id = cid(loc), k = key(name), nm = clean(name); if (!id || !k || !db) return Promise.resolve(nm);
    var uid = null; try { uid = g.firebase && g.firebase.auth().currentUser ? g.firebase.auth().currentUser.uid : null; } catch (e) {}
    if (!uid) return Promise.resolve(nm);
    // um documento por bairro (hoods/{país-estado-cidade}/n/{chave}): só cria, ninguém troca nem apaga; se a chave já existe, fica o nome que já estava
    delete HM[id];
    return db.collection('hoods').doc(id).collection('n').doc(k.replace(/ /g, '-').slice(0, 60)).set({ name: nm, by: uid, at: g.firebase.firestore.FieldValue.serverTimestamp() }).then(function () { return nm; }, function () { return nm; });
  }
  function stLab(loc) { return loc.country && loc.country !== 'BR' ? (loc.stateName || '') : (loc.state || ''); }
  function label(loc) { if (!loc) return ''; var st = stLab(loc), c = (loc.city || '') + (loc.city && st ? '/' + st : ''); return [loc.hood, c].filter(Boolean).join(' · '); }
  // perfil antigo (texto digitado) → códigos, quando a cidade existe na lista
  function resolve(loc) {
    loc = Object.assign({}, loc || {});
    if (!loc.country) loc.country = loc.state && BR_UF.some(function (u) { return u[0] === loc.state; }) ? 'BR' : '';
    if (loc.cityId || !loc.country || !loc.state || !loc.city) return Promise.resolve(loc);
    return cityFile(loc.country, loc.state).then(function (f) {
      if (!f) return loc; var k = key(loc.city), hit = null;
      f.c.forEach(function (c) { if (!hit && key(c[1]) === k) hit = c; });
      if (hit) { loc.cityId = hit[0]; loc.city = hit[1]; }
      return loc;
    });
  }

  function idle(fn) { if (g.requestIdleCallback) g.requestIdleCallback(function () { fn(); }, { timeout: 4000 }); else setTimeout(fn, 1200); }
  // pré-carrega num momento livre o que o perfil vai pedir (lista de países, estados e o arquivo do estado da pessoa)
  function warm(loc) { idle(function () { countries(); getJSON('index.json'); getJSON('a1.json'); if (loc && loc.country && loc.state) cityFile(loc.country, loc.state); }); }
  // ---------- componente: País › Estado › Cidade › Bairro ----------
  // opts.wrap(rotulo, elemento) devolve o campo no estilo do módulo; opts.itemCls = classe dos botões de sugestão
  function picker(host, opts) {
    opts = opts || {};
    var v = Object.assign({ country: '', state: '', stateName: '', city: '', cityId: '', hood: '' }, opts.value || {});
    if (!v.country) v.country = defCountry();
    var item = opts.itemCls || 'btn mini', wrap = opts.wrap || function (l, el) { var d = document.createElement('label'); d.textContent = l; d.appendChild(el); return d; };
    function el(tag, a) { var e = document.createElement(tag); Object.keys(a || {}).forEach(function (k) { if (k === 'text') e.textContent = a[k]; else e.setAttribute(k, a[k]); }); return e; }
    var root = el('div', { class: 'geo' }), selC = el('select', { 'data-geo': 'country', 'aria-label': t('country') }), selS = el('select', { 'data-geo': 'state', 'aria-label': t('state') });
    var inC = el('input', { type: 'text', 'data-geo': 'city', maxlength: '60', autocomplete: 'off', autocapitalize: 'words', 'aria-label': t('city') });
    var inH = el('input', { type: 'text', 'data-geo': 'hood', maxlength: '60', autocomplete: 'off', autocapitalize: 'words', 'aria-label': t('hood') });
    var sugC = el('div', { class: 'geo-sug', 'data-geo': 'city-sug' }), sugH = el('div', { class: 'geo-sug', 'data-geo': 'hood-sug' }), msg = el('div', { class: 'geo-msg' });
    var two = el('div', { class: 'two' }); two.appendChild(wrap(t('country'), selC)); two.appendChild(wrap(t('state'), selS));
    root.appendChild(two);
    var fC = wrap(t('city'), inC), fH = wrap(t('hood'), inH); fC.appendChild(sugC); fH.appendChild(sugH);
    root.appendChild(fC); root.appendChild(fH); root.appendChild(msg);
    host.appendChild(root);
    var cities = null, hl = [], seq = 0;
    var last = JSON.stringify(v);
    function fire() { var j = JSON.stringify(v); if (j === last) return; last = j; if (opts.onChange) opts.onChange(Object.assign({}, v)); }
    function btn(txt, fn, extra) { var b = el('button', { type: 'button', class: item + (extra ? ' ' + extra : '') }); b.textContent = txt; b.addEventListener('click', fn); return b; }
    // a lista dos ~250 países só é montada quando a pessoa abre a caixa (ou num momento livre); até lá, só o país escolhido
    var full = false;
    function oneCountry() { selC.innerHTML = ''; var o = el('option', { value: v.country }); o.textContent = cname(v.country); selC.appendChild(o); selC.value = v.country; }
    function allCountries() { if (full) return; full = true; var frag = document.createDocumentFragment(); countries().forEach(function (c) { var o = el('option', { value: c[0] }); o.textContent = c[1]; if (c[0] === v.country) o.selected = true; frag.appendChild(o); }); selC.innerHTML = ''; selC.appendChild(frag); selC.value = v.country; }
    oneCountry();
    ['pointerdown', 'focus', 'keydown'].forEach(function (ev) { selC.addEventListener(ev, allCountries); });
    idle(allCountries);
    function fillStates() {
      var my = ++seq; selS.innerHTML = ''; selS.appendChild(el('option', { value: '', text: t('pick') }));
      return states(v.country).then(function (l) {
        if (my !== seq) return;
        l.forEach(function (s) { var o = el('option', { value: s[0] }); o.textContent = s[1]; if (s[0] === v.state) o.selected = true; selS.appendChild(o); });
        if (v.state && !l.some(function (s) { return s[0] === v.state; })) { var o = el('option', { value: v.state }); o.textContent = v.stateName || v.state; o.selected = true; selS.appendChild(o); }
        selS.disabled = !l.length && !v.state;
        return loadCities();
      });
    }
    function loadCities() {
      cities = null; sugC.innerHTML = ''; if (!v.state) { syncInputs(); return Promise.resolve(); }
      var my = seq;
      return cityFile(v.country, v.state).then(function (f) { if (my !== seq) return; cities = f; syncInputs(); return loadHoods(); });
    }
    function loadHoods() { hl = []; return hoods(v, opts.db).then(function (l) { hl = l; }); }
    function syncInputs() {
      inC.value = v.city || ''; inH.value = v.hood || '';
      inC.placeholder = cities ? t('city_ph') : t('city_free'); inH.placeholder = cities ? t('hood_ph') : t('hood_free');
      inC.disabled = !v.state && !!cities; inH.disabled = !!cities && !v.cityId;
      msg.textContent = cities ? t('credit') : '';
    }
    selC.addEventListener('change', function () { v.country = selC.value; v.state = ''; v.stateName = ''; v.city = ''; v.cityId = ''; v.hood = ''; fillStates(); fire(); });
    selS.addEventListener('change', function () { v.state = selS.value; v.stateName = selS.selectedOptions[0] ? selS.selectedOptions[0].textContent : ''; v.city = ''; v.cityId = ''; v.hood = ''; seq++; loadCities(); fire(); });
    inC.addEventListener('input', function () {
      sugC.innerHTML = '';
      if (!cities) { v.city = inC.value.replace(/\s+/g, ' ').trim(); v.cityId = ''; fire(); return; }
      if (v.cityId && inC.value !== v.city) { v.cityId = ''; v.hood = ''; inH.value = ''; inH.disabled = true; fire(); }
      var res = search(cities.c, inC.value, function (c) { return c[1]; }, 8);
      if (!res.length && inC.value.trim()) sugC.appendChild(el('span', { class: 'geo-none', text: t('none') }));
      res.forEach(function (c) { sugC.appendChild(btn(c[1], function () { v.city = c[1]; v.cityId = c[0]; v.hood = ''; sugC.innerHTML = ''; syncInputs(); loadHoods(); fire(); try { inH.focus(); } catch (e) {} })); });
    });
    inC.addEventListener('blur', function () { setTimeout(function () { if (cities && !v.cityId && inC.value.trim()) { var hit = same(cities.c.map(function (c) { return c[1]; }), inC.value); if (hit) { var c = cities.c.filter(function (x) { return x[1] === hit; })[0]; v.city = c[1]; v.cityId = c[0]; sugC.innerHTML = ''; syncInputs(); loadHoods(); fire(); } else msg.textContent = t('city_pick'); } }, 250); });
    function pickHood(nm) { v.hood = nm; inH.value = nm; sugH.innerHTML = ''; fire(); }
    inH.addEventListener('input', function () {
      sugH.innerHTML = '';
      var txt = inH.value.replace(/\s+/g, ' ').trim();
      if (!cities || !v.cityId) { v.hood = txt; fire(); return; }
      v.hood = ''; fire();
      if (!txt) return;
      var res = search(hl, txt, function (x) { return x; }, 6), nr = res.length ? null : near(hl, txt);
      if (nr) res = [nr];                     // digitou com erro ("campexe"): já mostra o parecido ("Campeche")
      res.forEach(function (nm) { sugH.appendChild(btn(nm, function () { pickHood(nm); })); });
      if (same(hl, txt)) return;
      sugH.appendChild(btn('+ ' + tf('hood_add', clean(txt)), function () {
        var mean = near(hl, txt);
        if (mean) {
          sugH.innerHTML = ''; sugH.appendChild(el('span', { class: 'geo-none', text: tf('hood_mean', mean) }));
          sugH.appendChild(btn(mean, function () { pickHood(mean); }));
          sugH.appendChild(btn(tf('hood_keep', clean(txt)), function () { addNew(txt); }));
          return;
        }
        addNew(txt);
      }, 'geo-add'));
    });
    function addNew(txt) { addHood(v, txt, opts.db).then(function (nm) { if (!same(hl, nm)) hl.push(nm); pickHood(nm); }); }
    inH.addEventListener('blur', function () { setTimeout(function () { if (cities && v.cityId && !v.hood && inH.value.trim()) { var hit = same(hl, inH.value); if (hit) pickHood(hit); } }, 250); });
    var ready = resolve(v).then(function (r) { v = Object.assign(v, r); last = JSON.stringify(v); if (full) selC.value = v.country; else oneCountry(); return fillStates(); });
    return { root: root, ready: ready, value: function () { return Object.assign({}, v); } };
  }

  g.BXGeo = { base: BASE, t: t, norm: norm, key: key, near: near, same: same, search: search, countries: countries, defCountry: defCountry, states: states, hasCities: hasCities, cityFile: cityFile, cid: cid, hoods: hoods, addHood: addHood, clean: clean, label: label, stLab: stLab, resolve: resolve, picker: picker, cname: cname, warm: warm };
})(window);
