// BoxScore casca (Beta 5.0): service worker que guarda cada módulo separado e abre sem internet.
// Módulos "core" (casca, compartilhado, Placar) são guardados na instalação; os demais (Rede) só quando o usuário ativa.
var SCOPE = self.registration.scope;
var FB = ['app', 'auth', 'firestore'].map(function (n) { return 'https://www.gstatic.com/firebasejs/10.12.2/firebase-' + n + '-compat.js'; });
var META = 'bx-meta';
var mods = [];                                   // [{id, path}] dos módulos com pasta própria
function url(p) { return new URL(p, SCOPE).href; }
function getJson(k) { return caches.open(META).then(function (c) { return c.match(url(k)); }).then(function (r) { return r ? r.json() : null; }); }
function putJson(k, o) { return caches.open(META).then(function (c) { return c.put(url(k), new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json' } })); }); }
function setMods(reg) { mods = ((reg && reg.modules) || []).filter(function (m) { return m.path; }).map(function (m) { return { id: m.id, path: m.path }; }); }
function fetchRegistry() {
  return fetch(new Request(url('modules.json'), { cache: 'no-store' })).then(function (r) { if (!r.ok) throw new Error('registro'); return r.json(); })
    .then(function (reg) { setMods(reg); return putJson('__registry', reg).then(function () { return { reg: reg, fresh: true }; }); })
    .catch(function () { return getJson('__registry').then(function (reg) { if (reg) setMods(reg); return { reg: reg, fresh: false }; }); });
}
function modOf(u) {
  if (u.indexOf(SCOPE) !== 0) return 'shell';
  var rel = u.slice(SCOPE.length);
  for (var i = 0; i < mods.length; i++) if (rel.indexOf(mods[i].path) === 0) return mods[i].id;
  return 'shell';
}
function cacheModule(m) {
  return caches.open('bx-' + m.id).then(function (c) {
    return Promise.all((m.files || []).map(function (f) {
      return fetch(new Request(url(f), { cache: 'reload' })).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + f); return c.put(url(f), r); });
    }));
  });
}
function getMeta() { return getJson('__meta').then(function (m) { return m || { installed: {} }; }); }
function stateOf(o, meta) { return { registry: o.reg, installed: meta.installed, online: o.fresh }; }
function cacheFB() { return caches.open('bx-shell').then(function (c) { return Promise.all(FB.map(function (u) { return c.add(new Request(u, { mode: 'no-cors' })).catch(function () {}); })); }); }

self.addEventListener('install', function (e) {
  e.waitUntil(fetchRegistry().then(function (o) {
    if (!o.reg) throw new Error('sem registro de módulos');
    var core = o.reg.modules.filter(function (m) { return m.core; });
    return Promise.all(core.map(cacheModule)).then(getMeta).then(function (meta) {
      core.forEach(function (m) { meta.installed[m.id] = m.version; });
      return putJson('__meta', meta);
    });
  }).then(cacheFB).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('bx-') !== 0; }).map(function (k) { return caches.delete(k); }));   // caches das versões antigas
  }).then(function () { return getJson('__registry'); }).then(function (reg) { if (reg) setMods(reg); }).then(function () { return self.clients.claim(); }));
});

var modsReady = null;
function ready() { return modsReady || (modsReady = getJson('__registry').then(function (reg) { if (reg) setMods(reg); })); }
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);
  if (u.origin !== self.location.origin && FB.indexOf(req.url) < 0) return;   // Firestore, login e outros ficam fora do cache
  e.respondWith(ready().then(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) {
          var copy = res.clone(), id = modOf(req.url);
          caches.has('bx-' + id).then(function (has) { if (has) caches.open('bx-' + id).then(function (c) { c.put(req, copy); }); });
        }
        return res;
      }).catch(function () {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match(url('placar/')).then(function (p) { return p || caches.match(url('./')); });
        return Response.error();
      });
      return hit || net;
    });
  }));
});

function handle(d) {
  if (d.t === 'state') return Promise.all([fetchRegistry(), getMeta()]).then(function (a) { return stateOf(a[0], a[1]); });
  if (d.t === 'install') {
    return fetchRegistry().then(function (o) {
      var m = o.reg && o.reg.modules.filter(function (x) { return x.id === d.id; })[0];
      if (!o.fresh) throw new Error('offline');
      if (!m) throw new Error('módulo desconhecido');
      return cacheModule(m).then(getMeta).then(function (meta) { meta.installed[m.id] = m.version; return putJson('__meta', meta).then(function () { return stateOf(o, meta); }); });
    });
  }
  if (d.t === 'update') {
    return Promise.all([fetchRegistry(), getMeta()]).then(function (a) {
      var o = a[0], meta = a[1], list = [];
      if (!o.fresh || !o.reg) return Object.assign(stateOf(o, meta), { updated: [] });
      var jobs = o.reg.modules.filter(function (m) { return meta.installed[m.id] && meta.installed[m.id] !== m.version; });
      return Promise.all(jobs.map(function (m) { return cacheModule(m).then(function () { meta.installed[m.id] = m.version; list.push(m.id); }); }))
        .then(function () { return putJson('__meta', meta); }).then(function () { return Object.assign(stateOf(o, meta), { updated: list }); });
    });
  }
  return Promise.reject(new Error('mensagem desconhecida'));
}
self.addEventListener('message', function (e) {
  var port = e.ports && e.ports[0];
  e.waitUntil(handle(e.data || {}).then(function (r) { if (port) port.postMessage(r); }).catch(function (err) { if (port) port.postMessage({ error: String(err && err.message || err) }); }));
});
