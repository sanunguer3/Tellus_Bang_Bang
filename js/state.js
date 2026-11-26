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
  const KEY_AUDIO_MUTED = 'tbb_audio_muted';
  const KEY_AUDIO_VOL = 'tbb_audio_vol';
  const KEY_SFX_VOL = 'tbb_sfx_vol';
  const KEY_MUSIC_VOL = 'tbb_music_vol';
  const KEY_KEYS = 'tbb_keys';

  // Atalhos configuráveis na tela inicial. A ordem também define a ordem em
  // que aparecem no painel de configurações.
  T.KEY_ACTIONS = [
    { id: 'prevLeader', label: 'Campeão anterior' },
    { id: 'nextLeader', label: 'Próximo campeão' },
    { id: 'slot1', label: 'Selecionar campeão 1' },
    { id: 'slot2', label: 'Selecionar campeão 2' },
    { id: 'slot3', label: 'Selecionar campeão 3' },
    { id: 'slot4', label: 'Selecionar campeão 4' },
    { id: 'def', label: 'Defender' },
    { id: 'ret', label: 'Recuar' },
    { id: 'free', label: 'Livre' },
    { id: 'atk', label: 'Atacar' },
    { id: 'fin', label: 'Finalizar' },
    { id: 'foc', label: 'Focar' },
    { id: 'pause', label: 'Pausa' }
  ];
  T.DEFAULT_KEYS = {
    prevLeader: 'a', nextLeader: 'd',
    slot1: '1', slot2: '2', slot3: '3', slot4: '4',
    def: 'j', ret: 'k', free: 'l', atk: 'u', fin: 'i', foc: 'o', pause: 'p'
  };

  // Os antigos campeões padrão não podem reaparecer por save, perfil ou nuvem.
  const legacyName = n => !!T.LEGACY_NAMES && T.LEGACY_NAMES.includes(n);
  const notLegacy = c => !legacyName(c && c.n);

  function defaults() {
    return T.BANK
      .map(c => T.san(T.norm(T.clone(c))))
      .filter(Boolean);
  }

  function mergeSeedRoster(list) {
    const seeds = Array.isArray(T.SEED_RO) ? T.SEED_RO : [];
    if (!seeds.length) return list;
    const byId = new Set(list.map(c => c && c.id).filter(Boolean));
    const byName = new Set(list.map(c => String(c && c.n || '').toLowerCase()).filter(Boolean));
    let changed = false;
    for (const raw of seeds) {
      const c = T.san(T.norm(T.clone(raw)));
      if (!c) continue;
      if (c.id && byId.has(c.id)) continue;
      if (byName.has(c.n.toLowerCase())) continue;
      list.push(c);
      if (c.id) byId.add(c.id);
      byName.add(c.n.toLowerCase());
      changed = true;
    }
    return changed ? list : list;
  }

  function loadRoster() {
    const saved = T.store.get(KEY_ROSTER, null);
    if (Array.isArray(saved)) {
      const clean = saved.map(x => T.san(T.norm(T.clone(x)))).filter(Boolean).filter(notLegacy);
      const before = clean.length;
      mergeSeedRoster(clean);
      if (clean.length !== saved.length || clean.length !== before) T.store.set(KEY_ROSTER, clean);
      return clean;
    }

    // Migração: carrega saves antigos, mantém só criados/publicados e mescla seeds.
    const stock = new Set((Array.isArray(T.SEED_RO) ? T.SEED_RO : T.BANK).map(c => c.n));
    let base = [];
    for (const key of KEY_ROSTER_OLD) {
      const old = T.store.get(key, null);
      if (!Array.isArray(old) || !old.length) continue;
      base = old
        .map(x => T.san(T.norm(T.clone(x))))
        .filter(Boolean)
        .filter(c => !stock.has(c.n) || c.id || c.dono)
        .filter(notLegacy);
      break;
    }
    base.forEach(c => {
      if (c.n !== 'Sombra') return;
      c.sks.forEach(s => { if (s.n === 'Toque Sombri') s.n = 'Toque Sombra'; });
    });
    mergeSeedRoster(base);
    T.store.set(KEY_ROSTER, base);
    return base;
  }

  T.RO = loadRoster();
  T.tagOv = {};
  T.selI = 0;
  T.G = null;
  T.screen = 'home';
  T.paused = false;
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
        if (typeof n !== 'string' || seen.has(n) || legacyName(n)) return false;
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
  T.audioMuted = T.store.get(KEY_AUDIO_MUTED, false) === true;
  T.audioVol = Number(T.store.get(KEY_AUDIO_VOL, 0.7));
  if (!Number.isFinite(T.audioVol)) T.audioVol = 0.7;
  T.audioVol = T.clamp(T.audioVol, 0, 1);
  T.sfxVol = Number(T.store.get(KEY_SFX_VOL, 1));
  T.musicVol = Number(T.store.get(KEY_MUSIC_VOL, 1));
  if (!Number.isFinite(T.sfxVol)) T.sfxVol = 1;
  if (!Number.isFinite(T.musicVol)) T.musicVol = 1;
  T.sfxVol = T.clamp(T.sfxVol, 0, 1);
  T.musicVol = T.clamp(T.musicVol, 0, 1);

  const BAD_KEYS = ['escape', 'enter', 'tab', ' ', 'shift', 'control', 'alt', 'meta'];
  T.normalizeKeys = raw => {
    const out = T.clone(T.DEFAULT_KEYS);
    if (!raw || typeof raw !== 'object') return out;
    const used = {};
    T.KEY_ACTIONS.forEach(a => {
      let k = raw[a.id];
      if (typeof k !== 'string') return;
      k = k.toLowerCase();
      if (k.length !== 1 || BAD_KEYS.indexOf(k) >= 0 || used[k]) return;
      used[k] = true;
      out[a.id] = k;
    });
    return out;
  };
  T.keys = T.normalizeKeys(T.store.get(KEY_KEYS, null));
  T.setKey = (action, key) => {
    if (!Object.hasOwn(T.DEFAULT_KEYS, action)) return false;
    const k = String(key || '').toLowerCase();
    if (k.length !== 1 || BAD_KEYS.indexOf(k) >= 0) return false;
    for (const a of T.KEY_ACTIONS) {
      if (a.id !== action && T.keys[a.id] === k) T.keys[a.id] = T.DEFAULT_KEYS[a.id];
    }
    T.keys[action] = k;
    T.store.set(KEY_KEYS, T.keys);
    T.saveSettings();
    if (T.updateKeyLabels) T.updateKeyLabels();
    return true;
  };
  T.resetKeys = () => {
    T.keys = T.clone(T.DEFAULT_KEYS);
    T.store.set(KEY_KEYS, T.keys);
    T.saveSettings();
    if (T.updateKeyLabels) T.updateKeyLabels();
  };
  T.zoomFocus = 0;               // término do foco extra na ultimate
  T.panX = 0;
  T.panY = 0;

  // Modo história: progresso separado do elenco normal. Os campeões são os
  // mesmos, mas nível, pontos, XP e cor são próprios deste modo.
  T.HIST_SHOP = {
    small: { n: 'Baú pequeno', icon: '📦', price: 70, desc: 'Sorteio barato: campeão, moedas ou XP.' },
    medium: { n: 'Baú médio', icon: '🧰', price: 115, desc: 'Sorteio com mais chances de campeão e XP.' },
    large: { n: 'Baú grande', icon: '🎁', price: 180, desc: 'Sorteio com campeão garantido se faltar alguém.' }
  };
  T.HIST_SHINY = {
    '': '🚫 Sem filtro',
    prata: '🥈 Prata',
    dourado: '🥇 Dourado',
    cor: '🎨 Cor fixa'
  };
  // Cosméticos só se compram na Loja; a Coleção apenas mostra a cor já travada.
  T.HIST_SKINS = {
    '': { n: T.HIST_SHINY[''], price: 60 },
    prata: { n: T.HIST_SHINY.prata, price: 120 },
    dourado: { n: T.HIST_SHINY.dourado, price: 200 },
    cor: { n: T.HIST_SHINY.cor, price: 280 }
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

  // v:3 = começa sem campeões; os comuns vêm da nuvem, não do código.
  function freshHistModes() {
    return {
      aventura: { runs: 0, coins: 0, xp: 0 },
      infinito: { runs: 0, coins: 0, xp: 0, bestRound: 0, bestWins: 0 },
      sobrevivencia: { runs: 0, coins: 0, xp: 0, bestTime: 0, bestKills: 0 }
    };
  }

  function loadHistModes(raw) {
    const out = freshHistModes();
    if (!raw || typeof raw !== 'object') return out;
    ['aventura', 'infinito', 'sobrevivencia'].forEach(k => {
      const s = raw[k];
      if (!s || typeof s !== 'object') return;
      out[k] = {
        runs: Math.max(0, Math.floor(T.num(s.runs, 0))),
        coins: Math.max(0, Math.floor(T.num(s.coins, 0))),
        xp: Math.max(0, Math.floor(T.num(s.xp, 0))),
        bestRound: Math.max(0, Math.floor(T.num(s.bestRound, 0))),
        bestWins: Math.max(0, Math.floor(T.num(s.bestWins, 0))),
        bestTime: Math.max(0, Math.floor(T.num(s.bestTime, 0))),
        bestKills: Math.max(0, Math.floor(T.num(s.bestKills, 0)))
      };
    });
    return out;
  }

  function freshHist() {
    return {
      v: 3,
      coins: 0,
      stage: 1,
      tab: 'aventura',
      mode: 'aventura',
      modes: freshHistModes(),
      owned: {},
      chars: {},
      wins: 0
    };
  }

  function loadHist() {
    const raw = T.store.get(KEY_HIST, null);
    // Versões antigas davam todos os campeões de graça; recomeçamos a
    // progressão para valer a regra do campeão inicial e das compras.
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.v !== 3) return freshHist();
    const h = freshHist();
    h.coins = Math.max(0, Math.floor(T.num(raw.coins, 0)));
    h.stage = T.clamp(Math.floor(T.num(raw.stage, 1)), 1, 999);
    h.wins = Math.max(0, Math.floor(T.num(raw.wins, 0)));
    h.tab = Object.hasOwn({ loja: 1, aventura: 1, colecao: 1 }, raw.tab) ? raw.tab : 'aventura';
    h.mode = Object.hasOwn({ aventura: 1, infinito: 1, sobrevivencia: 1 }, raw.mode) ? raw.mode : 'aventura';
    h.modes = loadHistModes(raw.modes);
    h.owned = {};
    h.chars = {};
    const names = Array.isArray(raw.owned) ? raw.owned : Object.keys(raw.owned || {});
    names.forEach(n => {
      if (typeof n !== 'string' || legacyName(n) || !T.RO.some(c => c.n === n)) return;
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
  T.meta = { v: 1, wins: 0, battles: 0, pulls: 0, vortex: 0, objects: 0, dmg: 0 };
  T.metaAdd = (k, n) => {
    if (!T.meta || !Object.hasOwn(T.meta, k)) return;
    T.meta[k] = Math.max(0, Math.floor((T.meta[k] || 0) + (n == null ? 1 : n)));
    scheduleProfileSync();
  };

  T.saveHist = () => {
    T.store.set(KEY_HIST, T.hist);
    scheduleProfileSync();
  };

  T.histSetMode = mode => {
    if (!Object.hasOwn({ aventura: 1, infinito: 1, sobrevivencia: 1 }, mode)) return;
    T.hist.mode = mode;
    T.saveHist();
    if (T.renderHistory) T.renderHistory();
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

  // Só garante o registro de progresso dos campeões já possuídos na história.
  // Estar no elenco normal NÃO dá posse aqui: os outros são comprados na loja.
  T.histSyncRoster = () => {
    let added = false;
    T.RO.filter(c => !T.isCreature(c) && T.hist.owned[c.n]).forEach(c => {
      if (!T.hist.chars[c.n]) {
        T.hist.chars[c.n] = histChar(c);
        added = true;
      }
    });
    return added;
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
    audioMuted: T.audioMuted,
    audioVol: T.audioVol,
    audioSfxVol: T.sfxVol,
    audioMusicVol: T.musicVol,
    keys: T.keys,
    tagOv: T.tagOv,
    hist: T.hist,
    meta: T.meta
  });

  T.applyProfile = data => {
    if (!data || typeof data !== 'object') return false;
    if (Array.isArray(data.roster)) {
      const before = data.roster.length;
      T.RO = data.roster
        .map(x => T.san(T.norm(T.clone(x))))
        .filter(Boolean)
        .filter(notLegacy);
      const had = T.RO.length;
      mergeSeedRoster(T.RO);
      if (T.RO.length !== had || T.RO.length !== before) T.store.set(KEY_ROSTER, T.RO);
      else T.store.set(KEY_ROSTER, T.RO);
    }
    if (Array.isArray(data.pickNames)) {
      T.pickNames = data.pickNames
        .filter(n => typeof n === 'string' && !legacyName(n) && T.RO.some(c => c.n === n))
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
    if (data.audioMuted != null) T.audioMuted = data.audioMuted === true;
    if (data.audioVol != null) {
      const av = Number(data.audioVol);
      if (Number.isFinite(av)) T.audioVol = T.clamp(av, 0, 1);
    }
    if (data.audioSfxVol != null) {
      const sv = Number(data.audioSfxVol);
      if (Number.isFinite(sv)) T.sfxVol = T.clamp(sv, 0, 1);
    }
    if (data.audioMusicVol != null) {
      const mv = Number(data.audioMusicVol);
      if (Number.isFinite(mv)) T.musicVol = T.clamp(mv, 0, 1);
    }
    if (data.keys && typeof data.keys === 'object') {
      T.keys = T.normalizeKeys(data.keys);
      T.store.set(KEY_KEYS, T.keys);
    }
    if (data.tagOv && typeof data.tagOv === 'object') T.tagOv = T.clone(data.tagOv);
    if (data.hist && typeof data.hist === 'object' && !Array.isArray(data.hist) && data.hist.v === 3) {
      const h = T.hist || {};
      T.hist = {
        v: 3,
        coins: Math.max(0, Math.floor(T.num(data.hist.coins, h.coins || 0))),
        stage: T.clamp(Math.floor(T.num(data.hist.stage, h.stage || 1)), 1, 999),
        wins: Math.max(0, Math.floor(T.num(data.hist.wins, h.wins || 0))),
        tab: Object.hasOwn({ loja: 1, aventura: 1, colecao: 1 }, data.hist.tab) ? data.hist.tab : 'aventura',
        mode: Object.hasOwn({ aventura: 1, infinito: 1, sobrevivencia: 1 }, data.hist.mode) ? data.hist.mode : 'aventura',
        modes: loadHistModes(data.hist.modes),
        owned: {},
        chars: {}
      };
      const names = Array.isArray(data.hist.owned) ? data.hist.owned : Object.keys(data.hist.owned || {});
      names.forEach(n => {
        if (typeof n !== 'string' || legacyName(n) || !T.RO.some(c => c.n === n)) return;
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
    if (data.meta && typeof data.meta === 'object') {
      const m = T.meta || { v: 1, wins: 0, battles: 0, pulls: 0, vortex: 0, objects: 0, dmg: 0 };
      ['wins','battles','pulls','vortex','objects','dmg'].forEach(k => { m[k] = Math.max(0, Math.floor(T.num(data.meta[k], m[k] || 0))); });
      m.v = 1; T.meta = m;
    }
    T.store.set(KEY_TEAMS, T.nT);
    T.store.set(KEY_THEME, T.theme);
    T.store.set(KEY_MODE, T.mode);
    T.store.set(KEY_AI, T.aiLevel);
    T.store.set(KEY_ARENA, T.arenaPick);
    T.store.set(KEY_CAM, T.camMode);
    T.store.set(KEY_ZOOM, T.zoom);
    T.store.set(KEY_NOFX, T.noFx);
    T.store.set(KEY_AUDIO_MUTED, T.audioMuted);
    T.store.set(KEY_AUDIO_VOL, T.audioVol);
    T.store.set(KEY_SFX_VOL, T.sfxVol);
    T.store.set(KEY_MUSIC_VOL, T.musicVol);
    T.store.set(KEY_KEYS, T.keys);
    if (T.updateKeyLabels) T.updateKeyLabels();
    T.applyTheme();
    if (T.audio && T.audio.sync) T.audio.sync();
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
    T.store.set(KEY_AUDIO_MUTED, T.audioMuted);
    T.store.set(KEY_AUDIO_VOL, T.audioVol);
    T.store.set(KEY_SFX_VOL, T.sfxVol);
    T.store.set(KEY_MUSIC_VOL, T.musicVol);
    T.store.set(KEY_KEYS, T.keys);
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

  // Importa o banco local (hoje vazio: os campeões vêm da nuvem).
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
    ['home', 'help', 'menu', 'ed', 'g', 'hist', 'hloja', 'hcolecao', 'pvp'].forEach(name => {
      const el = T.$('#' + name);
      if (!el) return;
      el.style.display = name === id ? ((name === 'home' || name === 'g') ? 'flex' : 'block') : 'none';
      el.setAttribute('aria-hidden', name === id ? 'false' : 'true');
    });
    T.screen = id;
    if (id !== 'g' && T.hideTip) T.hideTip();
  };

  // No 2v2 cada jogador pilota somente o campeão do seu assento; o companheiro
  // de equipe e os adversários são pilotados pela mesma IA dos dois clientes.
  T.mine = () => {
    const G = T.G;
    if (!G) return [];
    if (G.pvp && G.pvpCoop && G.pvpSeat >= 0) return G.us.filter(u => u.id === G.pvpSeat);
    if (G.pvp) return G.us.filter(u => u.team === G.pvpTeam);
    return G.us.filter(u => u.team === 0);
  };

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
      if (!c || !c.id || !notLegacy(c)) continue;
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
