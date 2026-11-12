/* BoxScore: gerenciador de módulos (compartilhado). Cada módulo (Placar, Rede...) tem versão própria;
   o service worker (sw.js, na raiz) guarda os arquivos de cada um e atualiza só o que mudou. */
(function (g) {
  'use strict';
  var cs = document.currentScript;
  var BASE = new URL('../', cs && cs.src ? cs.src : location.href).href;
  var HAS_SW = 'serviceWorker' in navigator && /^https?:$/.test(location.protocol);

  var I = {
    'pt-BR': { title: 'Módulos', placar: 'Placar', rede: 'Rede', placar_d: 'Placar de tênis com voz, estatísticas e histórico.', rede_d: 'Rede social do tênis: marque jogos com data, hora e local e convide quem joga no seu nível.', use: 'Em uso', open: 'Abrir', activate: 'Ativar', update: 'Atualizar', loading: 'Baixando...', offline: 'Sem internet para baixar o módulo.', ver: 'Versão {0}', updated: 'Atualizado: {0}. Reabra para usar a nova versão.', back: 'Voltar ao Placar', soon: 'Em construção', soon_t: 'A primeira função será Marcar jogo: combine data, local e hora, encontre quem joga no seu nível e abra o Placar já preenchido.', sw: 'Os módulos precisam do app instalado pelo endereço da internet.' },
    'pt-PT': { title: 'Módulos', placar: 'Marcador', rede: 'Rede', placar_d: 'Marcador de ténis com voz, estatísticas e histórico.', rede_d: 'Rede social do ténis: marque jogos com data, hora e local e convide quem joga ao seu nível.', use: 'Em uso', open: 'Abrir', activate: 'Ativar', update: 'Atualizar', loading: 'A transferir...', offline: 'Sem internet para transferir o módulo.', ver: 'Versão {0}', updated: 'Atualizado: {0}. Reabra para usar a nova versão.', back: 'Voltar ao Marcador', soon: 'Em construção', soon_t: 'A primeira função será Marcar jogo: combine data, local e hora, encontre quem joga ao seu nível e abra o Marcador já preenchido.', sw: 'Os módulos precisam da app instalada pelo endereço da internet.' },
    en: { title: 'Modules', placar: 'Scoreboard', rede: 'Network', placar_d: 'Tennis scoreboard with voice, stats and history.', rede_d: 'The tennis social network: set up matches with date, time and place and invite players at your level.', use: 'In use', open: 'Open', activate: 'Activate', update: 'Update', loading: 'Downloading...', offline: 'No internet to download the module.', ver: 'Version {0}', updated: 'Updated: {0}. Reopen to use the new version.', back: 'Back to Scoreboard', soon: 'Under construction', soon_t: 'The first feature will be Set up a match: pick date, place and time, find players at your level and open the Scoreboard already filled in.', sw: 'Modules need the app to be installed from its web address.' },
    es: { title: 'Módulos', placar: 'Marcador', rede: 'Red', placar_d: 'Marcador de tenis con voz, estadísticas e historial.', rede_d: 'La red social del tenis: organiza partidos con fecha, hora y lugar e invita a jugadores de tu nivel.', use: 'En uso', open: 'Abrir', activate: 'Activar', update: 'Actualizar', loading: 'Descargando...', offline: 'Sin internet para descargar el módulo.', ver: 'Versión {0}', updated: 'Actualizado: {0}. Vuelve a abrir para usar la nueva versión.', back: 'Volver al Marcador', soon: 'En construcción', soon_t: 'La primera función será Organizar partido: elige fecha, lugar y hora, encuentra quién juega a tu nivel y abre el Marcador ya rellenado.', sw: 'Los módulos necesitan la app instalada desde su dirección web.' },
    fr: { title: 'Modules', placar: 'Tableau', rede: 'Réseau', placar_d: 'Tableau de score de tennis avec voix, statistiques et historique.', rede_d: 'Le réseau social du tennis : organisez des matchs avec date, heure et lieu et invitez des joueurs de votre niveau.', use: 'En cours', open: 'Ouvrir', activate: 'Activer', update: 'Mettre à jour', loading: 'Téléchargement...', offline: 'Pas d\'internet pour télécharger le module.', ver: 'Version {0}', updated: 'Mis à jour : {0}. Rouvrez pour utiliser la nouvelle version.', back: 'Retour au Tableau', soon: 'En construction', soon_t: 'La première fonction sera Organiser un match : choisissez date, lieu et heure, trouvez des joueurs de votre niveau et ouvrez le Tableau déjà rempli.', sw: 'Les modules nécessitent l\'app installée depuis son adresse web.' },
    de: { title: 'Module', placar: 'Anzeige', rede: 'Netzwerk', placar_d: 'Tennis-Anzeigetafel mit Stimme, Statistiken und Verlauf.', rede_d: 'Das Tennis-Netzwerk: Spiele mit Datum, Uhrzeit und Ort verabreden und Spieler deines Niveaus einladen.', use: 'In Benutzung', open: 'Öffnen', activate: 'Aktivieren', update: 'Aktualisieren', loading: 'Wird geladen...', offline: 'Kein Internet zum Laden des Moduls.', ver: 'Version {0}', updated: 'Aktualisiert: {0}. Neu öffnen, um die neue Version zu nutzen.', back: 'Zurück zur Anzeige', soon: 'In Arbeit', soon_t: 'Die erste Funktion wird Spiel verabreden: Datum, Ort und Uhrzeit wählen, Spieler auf deinem Niveau finden und die Anzeige vorausgefüllt öffnen.', sw: 'Module setzen die über die Webadresse installierte App voraus.' }
  };
  function lang() {
    try { var s = JSON.parse(localStorage.getItem('boxscore.placar.v1') || 'null'), l = s && s.settings && s.settings.lang; if (l && I[l]) return l; } catch (e) {}
    var n = (navigator.language || 'pt-BR');
    if (/^pt-PT/i.test(n)) return 'pt-PT'; if (/^pt/i.test(n)) return 'pt-BR';
    var b = n.slice(0, 2).toLowerCase(); return I[b] ? b : 'en';
  }
  function t(k) { var d = I[lang()] || I.en; return d[k] != null ? d[k] : (I['pt-BR'][k] || k); }
  function tf(k, a) { return t(k).replace('{0}', a); }

  function post(msg, ms) {
    return new Promise(function (res, rej) {
      if (!HAS_SW) return rej(new Error('nosw'));
      var to = setTimeout(function () { rej(new Error('timeout')); }, ms || 8000);
      navigator.serviceWorker.ready.then(function (reg) {
        var w = reg.active; if (!w) throw new Error('nosw');
        var ch = new MessageChannel();
        ch.port1.onmessage = function (e) { clearTimeout(to); e.data && e.data.error ? rej(new Error(e.data.error)) : res(e.data); };
        w.postMessage(msg, [ch.port2]);
      }).catch(function (e) { clearTimeout(to); rej(e); });
    });
  }
  function registry() { return fetch(BASE + 'modules.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return null; }); }
  var API = {
    base: BASE, t: t, tf: tf, lang: lang,
    state: function () { return post({ t: 'state' }).catch(function () { return registry().then(function (r) { return { registry: r, installed: {}, online: !!r, nosw: true }; }); }); },
    install: function (id) { return post({ t: 'install', id: id }, 120000); },
    update: function () { return post({ t: 'update' }, 120000); },
    mark: function (id) { try { localStorage.setItem('boxscore.lastModule', id); } catch (e) {} },
    last: function () { try { return localStorage.getItem('boxscore.lastModule') || 'placar'; } catch (e) { return 'placar'; } },
    open: function (id, st) {
      var go = function (s) { var m = s && s.registry && s.registry.modules.filter(function (x) { return x.id === id; })[0]; if (m) location.href = BASE + m.path; };
      st ? go(st) : API.state().then(go);
    }
  };

  var ICON = { placar: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6c3 2.5 3 10.3 0 12.8M18.4 5.6c-3 2.5-3 10.3 0 12.8"/>', rede: '<path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"/><circle cx="9.5" cy="7.5" r="3.5"/><path d="M21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8"/>' };
  function css() {
    if (document.getElementById('bx-mod-css')) return;
    var s = document.createElement('style'); s.id = 'bx-mod-css';
    s.textContent = '.bxm{display:grid;gap:10px}.bxm-c{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--line,#2a3a44);border-radius:18px;background:var(--bg,#0f171d);color:var(--ink,#eef3f6)}' +
      '.bxm-i{flex:none;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:var(--panel,#16222b);border:1px solid var(--line,#2a3a44)}.bxm-i svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '.bxm-t{flex:1;min-width:0;display:grid;gap:2px}.bxm-t b{font:800 16px/1.15 var(--ui,system-ui,sans-serif)}.bxm-t small{font:400 12.5px/1.3 var(--ui,system-ui,sans-serif);color:var(--muted,#8fa2ad)}' +
      '.bxm-b{flex:none;min-height:44px;min-width:92px;padding:0 14px;border-radius:999px;border:1px solid var(--line,#2a3a44);background:var(--panel,#16222b);color:inherit;font:700 14px var(--ui,system-ui,sans-serif);cursor:pointer}.bxm-b.pri{background:var(--ink,#eef3f6);color:var(--panel,#0f171d)}.bxm-b[disabled]{opacity:.55;cursor:default}' +
      '.bxm-n{font:400 12.5px/1.3 var(--ui,system-ui,sans-serif);color:var(--muted,#8fa2ad)}';
    document.head.appendChild(s);
  }
  // Desenha a lista de módulos em host. opts.current = módulo em uso; opts.onUpdated(ids) opcional.
  API.render = function (host, opts) {
    opts = opts || {}; css(); host.className = (host.className + ' bxm').trim(); host.textContent = '';
    return API.state().then(function (st) {
      host.textContent = '';
      var reg = st.registry; if (!reg) return;
      reg.modules.filter(function (m) { return !m.hidden; }).forEach(function (m) {
        var inst = st.installed[m.id], c = document.createElement('div'); c.className = 'bxm-c';
        var ic = document.createElement('span'); ic.className = 'bxm-i'; ic.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICON[m.id] || '') + '</svg>';
        var tx = document.createElement('span'); tx.className = 'bxm-t';
        tx.innerHTML = '<b></b><small></small><small></small>'; tx.children[0].textContent = t(m.id); tx.children[1].textContent = t(m.id + '_d'); tx.children[2].textContent = tf('ver', inst || m.version);
        var b = document.createElement('button'); b.type = 'button'; b.className = 'bxm-b';
        var cur = m.id === opts.current, upd = inst && inst !== m.version;
        function setBtn() {
          if (cur) { b.textContent = t('use'); b.disabled = true; return; }
          if (!inst) { b.textContent = t('activate'); b.classList.add('pri'); return; }
          b.textContent = upd ? t('update') : t('open'); b.classList.toggle('pri', true);
        }
        setBtn();
        b.addEventListener('click', function () {
          if (cur) return;
          if (!inst || upd) {
            b.disabled = true; b.textContent = t('loading');
            (inst ? API.update() : API.install(m.id)).then(function (s) { inst = s.installed[m.id]; upd = false; b.disabled = false; tx.children[2].textContent = tf('ver', inst); setBtn(); if (opts.onUpdated) opts.onUpdated(s); })
              .catch(function () { b.disabled = false; setBtn(); var n = host.querySelector('.bxm-n') || document.createElement('div'); n.className = 'bxm-n'; n.textContent = HAS_SW ? t('offline') : t('sw'); host.appendChild(n); });
            return;
          }
          API.open(m.id, st);
        });
        c.appendChild(ic); c.appendChild(tx); c.appendChild(b); host.appendChild(c);
      });
    });
  };
  g.BXMods = API;
})(window);
