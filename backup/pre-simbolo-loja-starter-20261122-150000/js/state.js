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
  const KEY_CAM = 'tbb_cam';
  const KEY_ZOOM = 'tbb_zoom';
  const KEY_NOFX = 'tbb_nofx';
  const KEY_NICK = 'tbb_nick';
  const KEY_HIST = 'tbb_hist';

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

  // Sessão do jogador. Mesmo sem login o jogo continua funcionando localmente.
  T.user = { uid: '', email: '', nome: '', admin: false, signed: false };
  T.nick = String(T.store.get(KEY_NICK, '') || '').slice(0, 16);
  T._profileTimer = 0;
  T._loadingProfile = false;

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
  T.camMode = T.store.get(KEY_CAM, 'fixa') === 'seguir' ? 'seguir' : 'fixa';
  const CZ = T.CAM_ZOOM || { min: 0.75, max: 2.4 };
  T.zoom = T.clamp(T.store.get(KEY_ZOOM, 1), CZ.min, CZ.max);
  T.noFx = T.store.get(KEY_NOFX, false) === true;
  T.zoomFocus = 0;               // término do foco extra na ultimate
  T.panX = 0;
  T.panY = 0;

  // Modo história: progresso separado do elenco normal. Os campeões são os
  // mesmos, mas nível, pontos, XP e cor são próprios deste modo.
  T.HIST_SHOP = {
    small: { n: 'Baú pequeno', icon: '📦', price: 35, desc: 'Sorteio barato: campeão, moedas ou XP.' },
    medium: { n: 'Baú médio', icon: '🧰', price: 55, desc: 'Sorteio com mais chances de campeão e XP.' },
    large: { n: 'Baú grande', icon: '🎁', price: 80, desc: 'Sorteio com campeão garantido se faltar alguém.' }
  };
  T.HIST_SHINY = {
    '': '🚫 Sem filtro',
    prata: '🥈 Prata',
    dourado: '🥇 Dourado',
    cor: '🎨 Cor fixa'
  };
  T.HIST_STATS = [
    ['hp', '❤️ Vida'], ['atk', '⚔️ Ataque'], ['spd', '👟 Velocidade'],
    ['dod', '💨 Esquiva'], ['crit', '🎯 Crítico'], ['obe', '🛡️ Obediência']
  ];

  function histChar(c) {
    return {
      lvl: T.lvlOf(c),
      xp: Math.max(0, Math.floor(T.num(c && c.xp, 0))),
      up: Object.assign({}, c && c.up ? c.up : {}),
      shiny: (c && Object.hasOwn(T.SHINY, c.shiny) && c.shiny !== 'rgb') ? c.shiny : '',
      hue: Math.floor(Math.random() * 360)
    };
  }

  function freshHist() {
    const h = {
      coins: 150,
      stage: 1,
      tab: 'aventura',
      owned: {},
      chars: {},
      wins: 0
    };
    if (!T.RO.length) {
      const start = T.BANK.filter(c => !T.isCreature(c)).slice(0, 3);
      start.forEach(c => {
        const clean = T.san(T.norm(T.clone(c)));
        if (clean) T.RO.push(clean);
      });
      T.store.set(KEY_ROSTER, T.RO);
    }
    T.RO.filter(c => !T.isCreature(c)).forEach(c => {
      h.owned[c.n] = true;
      h.chars[c.n] = histChar(c);
    });
    return h;
  }

  function loadHist() {
    const raw = T.store.get(KEY_HIST, null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return freshHist();
    const h = freshHist();
    h.coins = Math.max(0, Math.floor(T.num(raw.coins, 150)));
    h.stage = T.clamp(Math.floor(T.num(raw.stage, 1)), 1, 999);
    h.wins = Math.max(0, Math.floor(T.num(raw.wins, 0)));
    h.tab = Object.hasOwn({ loja: 1, aventura: 1, colecao: 1 }, raw.tab) ? raw.tab : 'aventura';
    h.owned = {};
    h.chars = {};
    const names = Array.isArray(raw.owned) ? raw.owned : Object.keys(raw.owned || {});
    names.forEach(n => {
      if (typeof n !== 'string' || !T.RO.some(c => c.n === n)) return;
      h.owned[n] = true;
      const src = raw.chars && raw.chars[n];
      const base = T.byName(n);
      const rec = src && typeof src === 'object' ? histChar(base) : histChar(base);
      if (src && typeof src === 'object') {
        rec.lvl = T.clamp(Math.floor(T.num(src.lvl, 1)), 1, T.LVLMAX);
        rec.xp = Math.max(0, Math.floor(T.num(src.xp, 0)));
        rec.shiny = Object.hasOwn(T.HIST_SHINY, src.shiny) ? src.shiny : '';
        rec.hue = T.clamp(Math.floor(T.num(src.hue, 0)), 0, 359);
        if (src.up && typeof src.up === 'object') {
          T.ST.forEach(k => { rec.up[k] = T.clamp(Math.floor(T.num(src.up[k], 0)), T.UPMIN, T.UPMAX); });
        }
      }
      if (rec.lvl >= T.LVLMAX) rec.xp = 0;
      h.chars[n] = rec;
    });
    return h;
  }

  T.hist = loadHist();

  T.saveHist = () => {
    T.store.set(KEY_HIST, T.hist);
    scheduleProfileSync();
  };

  T.histRec = name => {
    if (!T.hist.chars[name]) {
      const c = T.byName(name);
      if (!c) return null;
      T.hist.chars[name] = histChar(c);
    }
    return T.hist.chars[name];
  };

  T.histOwn = c => {
    const name = typeof c === 'string' ? c : c && c.n;
    if (!name || !T.byName(name)) return false;
    T.hist.owned[name] = true;
    T.histRec(name);
  };

  T.histBuild = c => {
    if (!c) return c;
    const rec = T.histRec(c.n);
    const out = T.clone(c);
    if (rec) {
      out.lvl = rec.lvl;
      out.xp = rec.xp;
      out.up = T.clone(rec.up);
      out.shiny = rec.shiny || '';
      out.histHue = rec.hue || 0;
      out._hist = true;
    }
    return out;
  };

  T.histGrantXp = (name, amount) => {
    const rec = T.histRec(name);
    if (!rec) return null;
    const fake = { lvl: rec.lvl, xp: rec.xp, r: (T.byName(name) || {}).r, up: rec.up };
    const info = T.addXp(fake, amount);
    rec.lvl = fake.lvl;
    rec.xp = fake.xp;
    return info;
  };

  // Campeões que já estão no elenco normal também pertencem à coleção do
  // modo história. Campeões comprados na loja entram nos dois lugares.
  T.histSyncRoster = () => {
    T.RO.filter(c => !T.isCreature(c)).forEach(c => {
      if (!T.hist.owned[c.n]) {
        T.hist.owned[c.n] = true;
        T.hist.chars[c.n] = histChar(c);
        return true;
      }
      if (!T.hist.chars[c.n]) T.hist.chars[c.n] = histChar(c);
    });
    return false;
  };

  // Tudo que acompanha o jogador: elenco, time, configurações e aparência.
  T.profileData = () => ({
    nick: T.nick,
    roster: T.RO,
    pickNames: T.pickNames,
    nT: T.nT,
    theme: T.theme,
    mode: T.mode,
    aiLevel: T.aiLevel,
    arenaPick: T.arenaPick,
    camMode: T.camMode,
    zoom: T.zoom,
    noFx: T.noFx,
    tagOv: T.tagOv,
    hist: T.hist
  });

  T.applyProfile = data => {
    if (!data || typeof data !== 'object') return false;
    if (Array.isArray(data.roster)) {
      T.RO = data.roster
        .map(x => T.san(T.norm(T.clone(x))))
        .filter(Boolean);
      T.store.set(KEY_ROSTER, T.RO);
    }
    if (Array.isArray(data.pickNames)) {
      T.pickNames = data.pickNames
        .filter(n => typeof n === 'string' && T.RO.some(c => c.n === n))
        .slice(0, 3);
      T.savePick();
    }
    if (data.nick != null) {
      T.nick = String(data.nick).slice(0, 16);
      T.store.set(KEY_NICK, T.nick);
    }
    if (data.nT != null) T.nT = T.clamp(data.nT, 2, 4) | 0;
    if (data.theme === 'auto' || data.theme === 'light' || data.theme === 'dark') T.theme = data.theme;
    if (Object.hasOwn(T.MODES, data.mode)) T.mode = data.mode;
    if (Object.hasOwn(T.AI_LEVELS, data.aiLevel)) T.aiLevel = data.aiLevel;
    if (data.arenaPick === 'random' || T.ARENAS.some(a => a.id === data.arenaPick)) T.arenaPick = data.arenaPick;
    if (data.camMode === 'fixa' || data.camMode === 'seguir') T.camMode = data.camMode;
    if (data.zoom != null) T.zoom = T.clamp(data.zoom, CZ.min, CZ.max);
    if (data.noFx != null) T.noFx = data.noFx === true;
    if (data.tagOv && typeof data.tagOv === 'object') T.tagOv = T.clone(data.tagOv);
    if (data.hist && typeof data.hist === 'object' && !Array.isArray(data.hist)) {
      const h = T.hist || {};
      T.hist = {
        coins: Math.max(0, Math.floor(T.num(data.hist.coins, h.coins || 0))),
        stage: T.clamp(Math.floor(T.num(data.hist.stage, h.stage || 1)), 1, 999),
        wins: Math.max(0, Math.floor(T.num(data.hist.wins, h.wins || 0))),
        tab: Object.hasOwn({ loja: 1, aventura: 1, colecao: 1 }, data.hist.tab) ? data.hist.tab : 'aventura',
        owned: {},
        chars: {}
      };
      const names = Array.isArray(data.hist.owned) ? data.hist.owned : Object.keys(data.hist.owned || {});
      names.forEach(n => {
        if (typeof n !== 'string' || !T.RO.some(c => c.n === n)) return;
        T.hist.owned[n] = true;
        const base = T.byName(n);
        const src = data.hist.chars && data.hist.chars[n];
        const rec = histChar(base);
        if (src && typeof src === 'object') {
          rec.lvl = T.clamp(Math.floor(T.num(src.lvl, 1)), 1, T.LVLMAX);
          rec.xp = Math.max(0, Math.floor(T.num(src.xp, 0)));
          rec.shiny = Object.hasOwn(T.HIST_SHINY, src.shiny) ? src.shiny : '';
          rec.hue = T.clamp(Math.floor(T.num(src.hue, 0)), 0, 359);
          if (src.up && typeof src.up === 'object') {
            T.ST.forEach(k => { rec.up[k] = T.clamp(Math.floor(T.num(src.up[k], 0)), T.UPMIN, T.UPMAX); });
          }
        }
        if (rec.lvl >= T.LVLMAX) rec.xp = 0;
        T.hist.chars[n] = rec;
      });
      T.store.set(KEY_HIST, T.hist);
    }
    T.store.set(KEY_TEAMS, T.nT);
    T.store.set(KEY_THEME, T.theme);
    T.store.set(KEY_MODE, T.mode);
    T.store.set(KEY_AI, T.aiLevel);
    T.store.set(KEY_ARENA, T.arenaPick);
    T.store.set(KEY_CAM, T.camMode);
    T.store.set(KEY_ZOOM, T.zoom);
    T.store.set(KEY_NOFX, T.noFx);
    T.applyTheme();
    return true;
  };

  function scheduleProfileSync() {
    if (T._loadingProfile || !T.user.signed || !window.FB || !window.FB.saveProfile) return;
    clearTimeout(T._profileTimer);
    T._profileTimer = setTimeout(() => {
      if (T.syncProfile) T.syncProfile(true).catch(() => { /* silencioso */ });
    }, 600);
  }

  T.saveRoster = () => {
    try {
      localStorage.setItem(KEY_ROSTER, JSON.stringify(T.RO));
      scheduleProfileSync();
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
        scheduleProfileSync();
        return true;
      } catch (err2) {
        T.toast('Não foi possível salvar no navegador (armazenamento cheio).', 'err');
        scheduleProfileSync();
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
    T.store.set(KEY_CAM, T.camMode);
    T.store.set(KEY_ZOOM, T.zoom);
    T.store.set(KEY_NOFX, T.noFx);
    T.savePick();
    scheduleProfileSync();
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

  T.setCamMode = mode => {
    T.camMode = mode === 'seguir' ? 'seguir' : 'fixa';
    T.panX = T.panY = 0;
    T.saveSettings();
  };

  // Ajusta o zoom manual e mantém o valor dentro dos limites permitidos.
  T.setZoom = (value, relative) => {
    const C = T.CAM_ZOOM || { min: 0.75, max: 2.4, step: 0.12 };
    const v = +value;
    T.zoom = T.clamp(Number.isFinite(v) ? (relative ? T.zoom + v : v) : T.zoom, C.min, C.max);
    T.saveSettings();
    return T.zoom;
  };

  T.setNoFx = on => {
    T.noFx = !!on;
    T.saveSettings();
    return T.noFx;
  };

  T.toggleNoFx = () => T.setNoFx(!T.noFx);

  // Volta a enquadrar a arena e cancela qualquer foco/pan ativo.
  T.resetCamera = () => {
    T.panX = T.panY = 0;
    T.zoomFocus = 0;
    T.setZoom(1);
  };

  // Arrastar fora da arena move a câmera; o limite depende do zoom atual para
  // que o cenário não saia totalmente da tela.
  T.panCamera = (dx, dy) => {
    const G = T.G;
    if (!G || !T.sc) return;
    const R = (G.R || G.R0 || T.BAL.arenaMax) + 24;
    const halfW = T.cw / (2 * T.sc);
    const halfH = T.ch / (2 * T.sc);
    // Mesmo com a arena inteira visível há uma folga pequena para o arraste
    // sempre responder, sem deixar o cenário sair da área desenhada.
    const slack = CZ.panSlack || 0;
    const limX = Math.max(slack, R - halfW);
    const limY = Math.max(slack, R - halfH);
    T.panX = T.clamp((T.panX || 0) + dx / T.sc, -limX, limX);
    T.panY = T.clamp((T.panY || 0) + dy / T.sc, -limY, limY);
  };

  // Foco curto na ultimate do líder selecionado.
  T.focusCamera = seconds => {
    T.zoomFocus = performance.now() + Math.max(0, seconds || 0) * 1000;
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
    ['home', 'help', 'menu', 'ed', 'g', 'hist'].forEach(name => {
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
    scheduleProfileSync();
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

  T.setUser = user => {
    const email = String((user && user.email) || '').trim().toLowerCase();
    const uid = String((user && user.uid) || '');
    T.user = {
      uid,
      email,
      nome: String((user && user.nome) || (user && user.displayName) ||
        (email ? email.split('@')[0] : '') || '').slice(0, 16),
      admin: T.isAdminEmail(email),
      signed: !!uid
    };
    if (T.user.nome) {
      T.nick = T.user.nome;
      T.store.set(KEY_NICK, T.nick);
    }
    if (T.renderLogin) T.renderLogin();
    return T.user;
  };

  T.syncProfile = async upload => {
    const FB = window.FB;
    if (!FB || !T.user.signed) return null;
    const profile = Object.assign(T.profileData(), { nome: T.user.nome || T.nick });
    if (!upload && FB.loadProfile) {
      T._loadingProfile = true;
      try {
        const remote = await FB.loadProfile();
        if (remote) T.applyProfile(remote);
        else await FB.saveProfile(profile);
        return remote || profile;
      } finally {
        T._loadingProfile = false;
      }
    }
    await FB.saveProfile(profile);
    return profile;
  };

  T.loginAccount = async (email, password, register, nome) => {
    const FB = window.FB;
    if (!FB) throw new Error('Firebase ainda não carregou.');
    const user = register
      ? await FB.signUp(email, password, nome)
      : await FB.signIn(email, password);
    T.setUser(user);

    // O Auth já concluiu. Se o Firestore negar o perfil, a conta continua
    // conectada — só avisamos em vez de transformar isso em erro de login.
    let syncErr = null;
    try {
      await T.syncProfile(false);
    } catch (err) {
      syncErr = err;
      console.warn('Perfil não sincronizado:', err);
    }
    await T.loadCloud();
    if (syncErr) {
      const code = syncErr && syncErr.code ? ' (' + syncErr.code + ')' : '';
      T.cloudStatus('conta ok · perfil bloqueado', 'warn');
      T.toast('Conta conectada, mas o perfil na nuvem falhou' + code +
        '. Publique firestore.rules no Firebase Console.', 'warn', 7000);
    }
    return T.user;
  };

  T.logoutAccount = async () => {
    const FB = window.FB;
    if (FB && FB.signOut) await FB.signOut();
    T.setUser(null);
    T.cloudStatus('salve neste navegador', 'warn');
    if (T.renderLogin) T.renderLogin();
  };

  T.loadCloud = async () => {
    const FB = window.FB;
    if (!FB) return;
    T.cloudStatus('conectando…', 'wait');
    try {
      // Depois de entrar na mesma sessão, FB.ready continua resolvendo o
      // estado inicial (null). Usa o UID atual quando ele já existe.
      const uid = (window.FBU && window.FBU()) || '';
      const user = uid ? T.user : await FB.ready;
      if (user && T.setUser) T.setUser(user);
      if ((uid || user) && T.user.signed) await T.syncProfile(false);
      const list = await FB.load();
      const result = T.mergeCloud(list);
      const signed = !!T.user.signed;
      T.cloudStatus(signed
        ? 'nuvem ok · ' + (T.user.nome || T.user.email)
        : 'entre para salvar na nuvem', signed ? 'ok' : 'warn');
      if (T.renderLogin) T.renderLogin();
      if (T.renderMenu) T.renderMenu();
      if (T.screen === 'ed' && T.renderEditor) T.renderEditor();
      if (result.added) T.toast(result.added + ' campeão(ões) novo(s) da nuvem.', 'ok');
      if (!signed) {
        T.toast('Entre com e-mail e senha para salvar seus campeões e configurações na nuvem.', 'info', 6500);
      }
    } catch (err) {
      console.warn('Nuvem indisponível:', err);
      T.cloudStatus('offline', 'warn');
      T.toast('Sem conexão com a nuvem. Usando os campeões salvos neste navegador.', 'warn', 5000);
    }
  };

  // Criador e dono do jogo podem alterar a ficha; outros jogadores, não.
  T.isOwner = c => {
    if (T.user.admin) return true;
    if (!c || !c.id || !c.dono || !T.user.uid) return true;
    return c.dono === T.user.uid;
  };

  T.publish = async c => {
    const FB = window.FB;
    if (!FB) throw new Error('Nuvem ainda não carregou.');
    if (!T.user.signed) throw new Error('Entre com e-mail e senha para publicar.');
    // O criador edita o próprio campeão; o dono do jogo pode editar qualquer um.
    if (c && c.id && c.dono && c.dono !== T.user.uid && !T.user.admin) {
      throw new Error('Esse campeão pertence a outro jogador.');
    }
    T.cloudStatus('salvando…', 'wait');
    try {
      const r = await FB.save(c);
      c.id = r.id;
      c.dono = r.dono;
      if (r.usuario) c.usuario = r.usuario;
      T.saveRoster();
      T.cloudStatus('nuvem ok', 'ok');
      return r;
    } catch (err) {
      T.cloudStatus('offline', 'warn');
      throw err;
    }
  };

  const dropCloudChamp = id => {
    T.RO = T.RO.filter(c => c.id !== id);
    T.pickNames = T.pickNames.filter(n => T.RO.some(c => c.n === n));
    T.saveRoster();
    T.savePick();
    if (T.renderMenu) T.renderMenu();
    if (T.screen === 'ed' && T.renderEditor) T.renderEditor();
  };

  T.cloudDelete = async c => {
    if (!c || !c.id || !window.FB) return;
    if (!T.isOwner(c)) throw new Error('Você só pode apagar seus próprios campeões.');
    await window.FB.del(c.id, c);
    dropCloudChamp(c.id);
  };

  T.adminDelete = async c => {
    if (!T.user.admin) throw new Error('Somente o dono pode apagar campeões de outras pessoas.');
    if (!c || !c.id || !window.FB || !window.FB.adminDelete) {
      throw new Error('Nuvem indisponível.');
    }
    await window.FB.adminDelete(c.id);
    dropCloudChamp(c.id);
  };

  T.applyTheme();
})(window.TBB = window.TBB || {});
