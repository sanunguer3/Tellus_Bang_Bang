// Estado global: elenco, seleção, telas, tema e sincronização com a nuvem.
(function (T) {
  'use strict';

  const KEY_ROSTER = 'tbb_ro4';
  const KEY_ROSTER_OLD = ['tbb_ro3', 'tbb_ro2'];
  const KEY_PICK = 'tbb_pick';
  const KEY_TEAMS = 'tbb_nt';
  const KEY_THEME = 'tbb_theme';
  const KEY_MODE = 'tbb_mode';
  const KEY_AI = 'tbb_ai';
  const KEY_ARENA = 'tbb_arena';

  function defaults() {
    return T.BANK
      .map(c => T.san(T.norm(T.clone(c))))
      .filter(Boolean);
  }

  function loadRoster() {
    const saved = T.store.get(KEY_ROSTER, null);
    if (Array.isArray(saved)) {
      return saved.map(x => T.san(T.norm(T.clone(x)))).filter(Boolean);
    }

    // Migração: a partir desta versão os campeões prontos saem do elenco e
    // ficam apenas no Banco (importável). Só campeões criados pelo jogador ou
    // publicados na nuvem continuam no elenco.
    const stock = new Set(T.BANK.map(c => c.n));
    let base = [];
    for (const key of KEY_ROSTER_OLD) {
      const old = T.store.get(key, null);
      if (!Array.isArray(old) || !old.length) continue;
      base = old
        .map(x => T.san(T.norm(T.clone(x))))
        .filter(Boolean)
        .filter(c => !stock.has(c.n) || c.id || c.dono);
      break;
    }
    base.forEach(c => {
      if (c.n !== 'Sombra') return;
      c.sks.forEach(s => { if (s.n === 'Toque Sombri') s.n = 'Toque Sombra'; });
    });
    T.store.set(KEY_ROSTER, base);
    return base;
  }

  T.RO = loadRoster();
  T.tagOv = {};
  T.selI = 0;
  T.G = null;
  T.screen = 'home';
  T.editor = null;

  T.pickNames = (() => {
    const saved = T.store.get(KEY_PICK, []);
    if (!Array.isArray(saved)) return [];
    const seen = new Set();
    return saved
      .filter(n => {
        if (typeof n !== 'string' || seen.has(n)) return false;
        seen.add(n);
        return T.RO.some(c => c.n === n);
      })
      .slice(0, 3);
  })();

  T.nT = T.clamp(T.store.get(KEY_TEAMS, 2), 2, 4) | 0;
  T.theme = T.store.get(KEY_THEME, 'auto');
  const savedMode = T.store.get(KEY_MODE, 'classico');
  T.mode = Object.hasOwn(T.MODES, savedMode) ? savedMode : 'classico';
  const savedAI = T.store.get(KEY_AI, 'normal');
  T.aiLevel = Object.hasOwn(T.AI_LEVELS, savedAI) ? savedAI : 'normal';
  const savedArena = T.store.get(KEY_ARENA, 'random');
  T.arenaPick = savedArena === 'random' || T.ARENAS.some(a => a.id === savedArena) ? savedArena : 'random';

  T.saveRoster = () => {
    try {
      localStorage.setItem(KEY_ROSTER, JSON.stringify(T.RO));
      return true;
    } catch (err) {
      // Cota cheia: tenta salvar sem sprites para não perder os campeões.
      try {
        const slim = T.RO.map(c => ({
          ...c,
          sprite: undefined,
          sks: (c.sks || []).map(s => ({ ...s, sprite: undefined }))
        }));
        localStorage.setItem(KEY_ROSTER, JSON.stringify(slim));
        T.toast('Armazenamento cheio: sprites não foram salvos.', 'warn');
        return true;
      } catch (err2) {
        T.toast('Não foi possível salvar no navegador (armazenamento cheio).', 'err');
        return false;
      }
    }
  };

  T.savePick = () => T.store.set(KEY_PICK, T.pickNames);
  T.saveSettings = () => {
    T.store.set(KEY_TEAMS, T.nT);
    T.store.set(KEY_MODE, T.mode);
    T.store.set(KEY_AI, T.aiLevel);
    T.store.set(KEY_ARENA, T.arenaPick);
    T.savePick();
  };

  T.setTeamCount = n => {
    T.nT = T.clamp(n, 2, 4) | 0;
    T.saveSettings();
  };

  T.setMode = mode => {
    if (!Object.hasOwn(T.MODES, mode)) return;
    T.mode = mode;
    T.saveSettings();
  };

  T.setAI = level => {
    if (!Object.hasOwn(T.AI_LEVELS, level)) return;
    T.aiLevel = level;
    T.saveSettings();
  };

  T.setArena = id => {
    T.arenaPick = id === 'random' || T.ARENAS.some(a => a.id === id) ? id : 'random';
    T.saveSettings();
  };

  // Importa o banco de campeões para o elenco local (sem duplicar por nome).
  T.importBank = () => {
    let added = 0;
    defaults().forEach(c => {
      if (T.RO.some(r => r.n.toLowerCase() === c.n.toLowerCase())) return;
      T.RO.push(c);
      added++;
    });
    if (added) T.saveRoster();
    return added;
  };

  T.addPick = name => {
    if (T.pickNames.includes(name)) {
      T.pickNames = T.pickNames.filter(n => n !== name);
    } else if (T.pickNames.length >= 3) {
      T.toast('Seu time aceita no máximo 3 campeões.', 'warn');
      return false;
    } else {
      T.pickNames.push(name);
    }
    T.savePick();
    return true;
  };

  T.removePick = name => {
    T.pickNames = T.pickNames.filter(n => n !== name);
    T.savePick();
  };

  T.show = id => {
    ['home', 'help', 'menu', 'ed', 'g'].forEach(name => {
      const el = T.$('#' + name);
      if (!el) return;
      el.style.display = name === id ? ((name === 'home' || name === 'g') ? 'flex' : 'block') : 'none';
      el.setAttribute('aria-hidden', name === id ? 'false' : 'true');
    });
    T.screen = id;
    if (id !== 'g' && T.hideTip) T.hideTip();
  };

  T.mine = () => (T.G ? T.G.us.filter(u => u.team === 0) : []);

  T.applyTheme = () => {
    const root = document.documentElement;
    if (!T.theme || T.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', T.theme);
    const btn = T.$('#thm');
    if (btn) {
      const icon = T.theme === 'dark' ? '☀️' : T.theme === 'light' ? '🌙' : '🌓';
      btn.textContent = icon;
      btn.title = 'Tema: ' + (T.theme === 'auto' ? 'automático' : T.theme === 'dark' ? 'escuro' : 'claro');
    }
  };

  T.cycleTheme = () => {
    T.theme = T.theme === 'auto' ? 'light' : T.theme === 'light' ? 'dark' : 'auto';
    T.store.set(KEY_THEME, T.theme);
    T.applyTheme();
  };

  // Mescla campeões da nuvem com o cache local (offline-first).
  T.mergeCloud = list => {
    let added = 0;
    let updated = 0;
    for (const raw of list) {
      const c = T.san(raw);
      if (!c || !c.id) continue;
      const byId = T.RO.find(r => r.id === c.id);
      if (byId) {
        Object.assign(byId, c);
        updated++;
        continue;
      }
      const byName = T.RO.find(r => r.n.toLowerCase() === c.n.toLowerCase());
      if (byName) {
        // Campeão local com mesmo nome: preserva o conteúdo e marca como publicado.
        if (!byName.id) {
          byName.id = c.id;
          byName.dono = c.dono;
          updated++;
        }
        continue;
      }
      T.RO.push(c);
      added++;
    }
    if (added || updated) T.saveRoster();
    return { added, updated };
  };

  T.loadCloud = async () => {
    const FB = window.FB;
    if (!FB) return;
    T.cloudStatus('conectando…', 'wait');
    try {
      const user = await FB.ready;
      const list = await FB.load();
      const result = T.mergeCloud(list);
      const readOnly = !user;
      T.cloudStatus(readOnly ? 'nuvem só leitura' : 'nuvem ok', readOnly ? 'warn' : 'ok');
      if (T.renderMenu) T.renderMenu();
      if (T.screen === 'ed' && T.renderEditor) T.renderEditor();
      if (result.added) {
        T.toast(result.added + ' campeão(ões) novo(s) da nuvem.', 'ok');
      }
      if (readOnly) {
        T.toast('Nuvem em somente leitura. Ative o login anônimo no Firebase para publicar campeões.', 'warn', 7000);
      }
    } catch (err) {
      console.warn('Nuvem indisponível:', err);
      T.cloudStatus('offline', 'warn');
      T.toast('Sem conexão com a nuvem. Usando os campeões salvos neste navegador.', 'warn', 5000);
    }
  };

  T.isOwner = c => !c || !c.id || !c.dono || !window.FBU || !window.FBU() || c.dono === window.FBU();

  T.publish = async c => {
    const FB = window.FB;
    if (!FB) throw new Error('Nuvem ainda não carregou.');
    T.cloudStatus('salvando…', 'wait');
    try {
      const r = await FB.save(c);
      c.id = r.id;
      c.dono = r.dono;
      T.saveRoster();
      T.cloudStatus('nuvem ok', 'ok');
      return r;
    } catch (err) {
      T.cloudStatus('offline', 'warn');
      throw err;
    }
  };

  T.cloudDelete = async c => {
    if (!c || !c.id || !window.FB) return;
    await window.FB.del(c.id);
  };

  T.applyTheme();
})(window.TBB = window.TBB || {});
