// Áudio: trilha por tela/modo (arquivo opcional ou música gerada) e efeitos.
// Tudo funciona em file://: se não houver arquivo em assets/audio/, o jogo
// toca melodias procedurais com Web Audio. Nada toca antes de um gesto do
// jogador, como exigem os navegadores.
(function (T) {
  'use strict';

  const KEY_MUTED = 'tbb_audio_muted';
  const KEY_VOL = 'tbb_audio_vol';
  const MUSIC_LEVEL = 0.42;
  const FILE_EXTS = ['mp3', 'ogg', 'wav'];
  const FADE_MS = 450;

  // Timbres aplicados ao som das habilidades. Cada campeão recebe um; no modo
  // história a escolha é fixa (hash do nome), nos outros modos é sorteada.
  const VOICES = [
    { id: 'deep', label: 'Grave', type: 'lowpass', freq: 760, q: 0.9 },
    { id: 'bright', label: 'Agudo', type: 'highpass', freq: 820, q: 0.7 },
    { id: 'hollow', label: 'Oco', type: 'bandpass', freq: 1150, q: 2.2 },
    { id: 'nasal', label: 'Nasal', type: 'peaking', freq: 1750, q: 4, gain: 10 },
    { id: 'soft', label: 'Suave', type: 'lowpass', freq: 1600, q: 0.4 },
    { id: 'metal', label: 'Metálico', type: 'bandpass', freq: 2600, q: 5 }
  ];

  // Cada cena tem andamento, acordes, linha de baixo, melodia e bateria.
  // As listas são cicladas, então não precisam ter exatamente 16 passos.
  const SCENES = {
    home: {
      bpm: 78, drum: 0,
      chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
      bass: [45, null, 45, null, 48, null, 48, null, 50, null, 50, null, 48, null, 45, null],
      lead: [69, null, null, 72, null, 76, null, 74, null, 72, null, 69, null, null, 67, null]
    },
    menu: {
      bpm: 96, drum: 0,
      chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]],
      bass: [45, 45, null, 48, 48, null, 43, 43, null, 47, 47, null, 40, 40, null, 43],
      lead: [72, null, 76, null, 74, null, 72, null, 69, null, 71, null, 72, null, 76, null]
    },
    help: {
      bpm: 84, drum: 0,
      chords: [[60, 64, 67], [57, 60, 64], [59, 62, 67], [55, 59, 62]],
      bass: [48, null, 48, null, 45, null, 45, null, 47, null, 47, null, 43, null, 43, null],
      lead: [76, null, 72, null, 74, null, 71, null, 72, null, null, 76, 79, null, 76, null]
    },
    ed: {
      bpm: 104, drum: 1,
      chords: [[57, 61, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
      bass: [45, 45, 52, 45, 41, 41, 48, 41, 43, 43, 50, 43, 40, 40, 47, 40],
      lead: [72, 76, null, 79, 76, null, 72, null, 69, 72, null, 76, 74, null, 71, null]
    },
    hist: {
      bpm: 100, drum: 1,
      chords: [[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 60, 64]],
      bass: [50, 50, null, 57, 46, 46, null, 53, 48, 48, null, 55, 45, 45, null, 52],
      lead: [74, null, 77, 81, null, 77, 74, null, 72, null, 76, 79, null, 76, 72, null]
    },
    hloja: {
      bpm: 112, drum: 1,
      chords: [[60, 64, 67], [57, 60, 64], [65, 69, 72], [62, 65, 69]],
      bass: [48, 48, 55, 48, 45, 45, 52, 45, 53, 53, 60, 53, 50, 50, 57, 50],
      lead: [79, 76, 72, 76, 79, null, 81, 79, 76, 72, 76, 79, 84, null, 81, 79]
    },
    hcolecao: {
      bpm: 88, drum: 0,
      chords: [[57, 60, 64], [60, 64, 67], [55, 59, 62], [59, 62, 67]],
      bass: [45, null, 45, null, 48, null, 48, null, 43, null, 43, null, 47, null, 47, null],
      lead: [69, null, 72, null, 76, null, 79, null, 76, null, 72, null, 71, null, 74, null]
    },
    battle_classico: {
      bpm: 132, drum: 2,
      chords: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 43, 47]],
      bass: [33, 33, 40, 33, 29, 29, 36, 29, 31, 31, 38, 31, 28, 28, 35, 28],
      lead: [69, null, 72, 76, 74, null, 72, null, 69, null, 67, 69, 72, null, 76, null]
    },
    battle_infinito: {
      bpm: 142, drum: 2,
      chords: [[45, 49, 52], [43, 47, 50], [40, 43, 47], [42, 45, 49]],
      bass: [33, 40, 33, 45, 31, 38, 31, 43, 28, 35, 28, 40, 30, 37, 30, 42],
      lead: [72, 76, 79, 76, 74, 77, 81, 77, 71, 74, 79, 74, 72, 76, 79, 84]
    },
    battle_sobrevivencia: {
      bpm: 150, drum: 3,
      chords: [[40, 43, 47], [39, 43, 46], [41, 44, 48], [38, 41, 45]],
      bass: [28, 28, 35, 28, 27, 27, 34, 27, 29, 29, 36, 29, 26, 26, 33, 26],
      lead: [64, null, 67, 68, 71, null, 68, 67, 65, null, 68, 70, 72, null, 70, 68]
    },
    battle_historia: {
      bpm: 124, drum: 2,
      chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 48, 52]],
      bass: [38, 38, 45, 38, 34, 34, 41, 34, 36, 36, 43, 36, 33, 33, 40, 33],
      lead: [74, null, 77, 81, 79, null, 77, 74, 72, null, 76, 79, 77, null, 74, null]
    },
    result: {
      bpm: 72, drum: 0,
      chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
      bass: [45, null, null, null, 41, null, null, null, 43, null, null, null, 40, null, null, null],
      lead: [72, null, 76, null, 74, null, null, null, 71, null, 74, null, 72, null, null, null]
    }
  };

  const DRUMS = {
    0: null,
    1: { kick: [0, 8], hat: [4, 12] },
    2: { kick: [0, 4, 8, 12], hat: [2, 6, 10, 14] },
    3: { kick: [0, 3, 6, 8, 11, 14], hat: [1, 2, 5, 7, 9, 13] }
  };

  const THROTTLE = {
    click: 70, hit: 70, crit: 100, ko: 180, dodge: 160, heal: 170,
    shield: 200, buff: 180, cast: 100, ultimate: 300, field: 240, box: 200,
    fire: 160, ice: 160, shock: 160, gust: 160, spike: 160,
    hex: 200, venom: 200, mire: 200, siphon: 200, summon: 200,
    level: 300, buy: 140, win: 600, lose: 600, start: 500
  };

  const files = {};
  const elements = [];
  let elIndex = 0;
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let musicBuses = [];
  let sfxBus = null;
  const voiceBuses = {};
  const unitVoices = new Map();
  let paused = false;
  let activeBus = 0;
  let noiseBuf = null;
  let timer = 0;
  let step = 0;
  let nextTime = 0;
  let scene = 'home';
  let playingFile = false;
  let unlocked = false;
  let fileToken = 0;
  const lastSfx = {};
  let uiMute = null;
  let uiVol = null;
  let uiSfx = null;
  let uiMusic = null;

  let muted = T.audioMuted === true;
  let volume = Number(T.audioVol);
  if (!Number.isFinite(volume)) volume = 0.7;
  volume = Math.max(0, Math.min(1, volume));
  let sfxVol = Number(T.sfxVol);
  let musicVol = Number(T.musicVol);
  if (!Number.isFinite(sfxVol)) sfxVol = 1;
  if (!Number.isFinite(musicVol)) musicVol = 1;
  sfxVol = Math.max(0, Math.min(1, sfxVol));
  musicVol = Math.max(0, Math.min(1, musicVol));

  const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
  const gainOf = () => (muted ? 0 : volume);
  const musicGainOf = () => (muted ? 0 : volume * musicVol);
  const sfxGainOf = () => (muted ? 0 : volume * sfxVol);

  const hashKey = key => {
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
    return h >>> 0;
  };
  const voiceKey = c => String((c && (c.id || c.n)) || 'campeao');
  const fixedVoice = c => VOICES[hashKey(voiceKey(c)) % VOICES.length].id;
  const rollVoice = () => VOICES[Math.floor(Math.random() * VOICES.length)].id;

  function envelope(node, t, dur, peak, attack, release) {
    const a = Math.max(0.004, attack == null ? 0.008 : attack);
    const r = Math.max(0.01, release == null ? Math.min(0.22, dur * 0.6) : release);
    const hold = Math.max(a, dur - r);
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    node.gain.setValueAtTime(Math.max(0.0002, peak), t + hold);
    node.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return t + dur;
  }

  function tone(freq, t, dur, type, peak, dest, attack, release) {
    if (!ctx || !dest || !Number.isFinite(freq)) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    const end = envelope(g, t, dur, peak, attack, release);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(end + 0.03);
  }

  function sweep(from, to, t, dur, type, peak, dest) {
    if (!ctx || !dest) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(Math.max(20, from), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const end = envelope(g, t, dur, peak);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(end + 0.03);
  }

  function noise(t, dur, peak, dest, type, freq, q) {
    if (!ctx || !dest) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = noiseBuf;
    src.loop = true;
    filter.type = type || 'highpass';
    filter.frequency.setValueAtTime(freq || 1200, t);
    if (q != null) filter.Q.value = q;
    const end = envelope(g, t, dur, peak, 0.004, Math.min(0.12, dur * 0.5));
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(end + 0.03);
  }

  function kick(t, peak, dest) {
    if (!ctx || !dest) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.16);
    const end = envelope(g, t, 0.22, peak, 0.004, 0.12);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(end + 0.03);
  }

  function hat(t, dest) {
    noise(t, 0.045, 0.05, dest, 'highpass', 6500);
  }

  function arp(notes, t, gap, dur, type, peak, dest) {
    notes.forEach((n, i) => {
      if (n == null) return;
      tone(mtof(n), t + i * gap, dur, type, peak, dest, 0.006, Math.min(0.18, dur * 0.5));
    });
  }

  function scheduleStep(t, cfg, bus) {
    if (!bus) return;
    const s = step % 16;
    const bar = Math.floor(step / 16) % cfg.chords.length;
    const chord = cfg.chords[bar];
    const beat = 60 / cfg.bpm;

    if (s === 0) {
      chord.forEach((n, i) => tone(mtof(n), t + i * 0.012, beat * 3.2, 'sine', 0.045, bus, 0.16, 0.8));
    }
    const b = cfg.bass[s % cfg.bass.length];
    if (b != null) tone(mtof(b), t, beat * 0.42, 'triangle', 0.16, bus, 0.008, 0.12);
    const lead = cfg.lead[s % cfg.lead.length];
    if (lead != null) tone(mtof(lead), t, beat * 0.44, 'triangle', 0.085, bus, 0.008, 0.16);
    const d = DRUMS[cfg.drum || 0];
    if (d) {
      if (d.kick.indexOf(s) >= 0) kick(t, 0.13, bus);
      if (d.hat.indexOf(s) >= 0) hat(t, bus);
    }
  }

  function tick() {
    if (!ctx || ctx.state !== 'running' || playingFile || muted || volume <= 0 || musicVol <= 0) return;
    const cfg = SCENES[scene] || SCENES.home;
    const stepDur = 60 / cfg.bpm / 4;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.04;
    while (nextTime < ctx.currentTime + 0.25) {
      scheduleStep(nextTime, cfg, musicBuses[activeBus]);
      nextTime += stepDur;
      step++;
    }
  }

  function startProcedural() {
    if (!ctx || playingFile || timer) return;
    step = 0;
    nextTime = ctx.currentTime + 0.05;
    tick();
    timer = setInterval(tick, 90);
  }

  function stopProcedural() {
    if (timer) clearInterval(timer);
    timer = 0;
  }

  function fadeBus(node, to, ms) {
    if (!ctx || !node) return;
    const now = ctx.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(node.gain.value, now);
    node.gain.linearRampToValueAtTime(to, now + ms / 1000);
  }

  function fadeElement(el, to, ms) {
    if (!el) return;
    if (el._fade) clearInterval(el._fade);
    const from = Number(el.volume) || 0;
    const t0 = performance.now();
    el._fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / Math.max(1, ms));
      el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k >= 1) {
        clearInterval(el._fade);
        el._fade = 0;
        if (to <= 0) { try { el.pause(); } catch (e) { /* ignore */ } }
      }
    }, 35);
  }

  function makeElements() {
    if (elements.length) return;
    for (let i = 0; i < 2; i++) {
      const a = new Audio();
      a.loop = true;
      a.preload = 'auto';
      a.volume = 0;
      elements.push(a);
    }
  }

  function probeFile(name, token) {
    if (files[name] != null) return Promise.resolve(files[name] || '');
    return new Promise(resolve => {
      let done = false;
      let index = 0;
      let current = null;
      const finish = url => {
        if (done || token !== fileToken) return;
        done = true;
        clearTimeout(guard);
        if (current) {
          current.onerror = null;
          current.oncanplay = null;
          current.onloadedmetadata = null;
        }
        files[name] = url || false;
        resolve(url || '');
      };
      // MP3 primeiro: com as trilhas instaladas, evita pedir extensões que
      // não existem. Se falhar, tenta OGG e WAV antes de usar o procedural.
      const tryNext = () => {
        if (done || token !== fileToken) return;
        if (current) {
          current.onerror = null;
          current.oncanplay = null;
          current.onloadedmetadata = null;
        }
        if (index >= FILE_EXTS.length) { finish(''); return; }
        const url = 'assets/audio/' + name + '.' + FILE_EXTS[index++];
        const p = document.createElement('audio');
        p.preload = 'metadata';
        p.onloadedmetadata = () => finish(url);
        p.oncanplay = () => finish(url);
        p.onerror = () => tryNext();
        current = p;
        try {
          p.src = url;
          p.load();
        } catch (e) { tryNext(); }
      };
      const guard = setTimeout(() => finish(''), 1500);
      tryNext();
    });
  }

  function applyScene(name, force) {
    const target = SCENES[name] ? name : 'home';
    if (target === scene && !force) return;
    scene = target;
    updateUi();
    if (!unlocked) return;

    const oldEl = elements[elIndex];
    const oldBus = activeBus;
    activeBus = 1 - activeBus;
    elIndex = 1 - elIndex;
    const newEl = elements[elIndex];

    fadeBus(musicBuses[oldBus], 0, FADE_MS);
    fadeBus(musicBuses[activeBus], MUSIC_LEVEL, FADE_MS);
    fadeElement(oldEl, 0, FADE_MS);
    stopProcedural();

    const token = ++fileToken;
    const wanted = scene;
    probeFile(wanted, token).then(url => {
      if (token !== fileToken || wanted !== scene) return;
      if (url) {
        playingFile = true;
        newEl.src = url;
        newEl.loop = true;
        try { newEl.currentTime = 0; } catch (e) { /* ignore */ }
        const p = newEl.play();
        if (p && p.catch) p.catch(() => {
          // O gesto do jogador pode expirar enquanto o arquivo é sondado.
          if (token !== fileToken || wanted !== scene) return;
          playingFile = false;
          try { newEl.pause(); newEl.removeAttribute('src'); newEl.load(); } catch (e) { /* ignore */ }
          startProcedural();
        });
        fadeElement(newEl, musicGainOf(), FADE_MS);
      } else {
        playingFile = false;
        try { newEl.pause(); newEl.removeAttribute('src'); newEl.load(); } catch (e) { /* ignore */ }
        startProcedural();
      }
    });
  }

  function sceneFor(screen) {
    if (screen === 'pvp') return 'menu';
    if (screen === 'g') {
      const mode = T.mode === 'historia' ? 'historia' : T.mode;
      return 'battle_' + (SCENES['battle_' + mode] ? mode : 'classico');
    }
    return SCENES[screen] ? screen : 'home';
  }

  function unlock() {
    if (paused) return;
    if (unlocked) {
      if (ctx && ctx.state === 'suspended' && ctx.resume) {
        ctx.resume().catch(() => { /* silencioso */ });
      }
      return;
    }
    unlocked = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = gainOf();
        const comp = ctx.createDynamicsCompressor();
        master.connect(comp);
        comp.connect(ctx.destination);
        musicGain = ctx.createGain();
        musicGain.gain.value = musicVol;
        musicGain.connect(master);
        sfxGain = ctx.createGain();
        sfxGain.gain.value = sfxVol;
        sfxGain.connect(master);
        musicBuses = [ctx.createGain(), ctx.createGain()];
        musicBuses.forEach(g => {
          g.gain.value = 0;
          g.connect(musicGain);
        });
        sfxBus = ctx.createGain();
        sfxBus.gain.value = 0.9;
        sfxBus.connect(sfxGain);
        VOICES.forEach(v => {
          const f = ctx.createBiquadFilter();
          f.type = v.type;
          f.frequency.value = v.freq;
          f.Q.value = v.q;
          if (v.gain != null) f.gain.value = v.gain;
          f.connect(sfxBus);
          voiceBuses[v.id] = f;
        });
        activeBus = 0;
      }
    } catch (e) {
      ctx = null;
      master = null;
      musicGain = null;
      sfxGain = null;
      musicBuses = [];
      sfxBus = null;
    }
    makeElements();
    applyScene(scene, true);
  }

  const SFX = {
    click: t => tone(mtof(84), t, 0.055, 'sine', 0.06, sfxBus),
    hit: t => { noise(t, 0.075, 0.12, sfxBus, 'bandpass', 900, 1); tone(140, t, 0.09, 'triangle', 0.11, sfxBus); },
    crit: t => { arp([76, 83, 88], t, 0.045, 0.15, 'triangle', 0.13, sfxBus); noise(t, 0.09, 0.09, sfxBus, 'highpass', 2200); },
    ko: t => { sweep(240, 70, t, 0.34, 'sawtooth', 0.13, sfxBus); noise(t, 0.18, 0.08, sfxBus, 'lowpass', 700); },
    dodge: t => { noise(t, 0.19, 0.1, sfxBus, 'bandpass', 1500, 0.8); },
    heal: t => arp([72, 76, 79, 84], t, 0.07, 0.23, 'sine', 0.1, sfxBus),
    shield: t => arp([60, 64, 67], t, 0.02, 0.36, 'triangle', 0.08, sfxBus),
    buff: t => sweep(330, 660, t, 0.24, 'sine', 0.1, sfxBus),
    cast: t => arp([67, 74], t, 0.05, 0.13, 'triangle', 0.09, sfxBus),
    fire: t => {
      sweep(180, 520, t, 0.3, 'sawtooth', 0.07, sfxBus);
      noise(t + 0.04, 0.26, 0.08, sfxBus, 'lowpass', 900);
    },
    ice: t => {
      arp([88, 93, 98, 103], t, 0.035, 0.18, 'sine', 0.09, sfxBus);
      noise(t, 0.2, 0.045, sfxBus, 'highpass', 5200);
    },
    shock: t => {
      sweep(900, 120, t, 0.18, 'square', 0.07, sfxBus);
      noise(t, 0.1, 0.07, sfxBus, 'bandpass', 2600, 3);
    },
    gust: t => {
      sweep(300, 1400, t, 0.28, 'sine', 0.06, sfxBus);
      noise(t, 0.3, 0.075, sfxBus, 'bandpass', 1200, 0.7);
    },
    spike: t => {
      sweep(120, 740, t, 0.14, 'triangle', 0.1, sfxBus);
      noise(t + 0.1, 0.09, 0.06, sfxBus, 'highpass', 2400);
    },
    hex: t => {
      arp([55, 58, 62], t, 0.06, 0.34, 'triangle', 0.08, sfxBus);
      noise(t, 0.32, 0.05, sfxBus, 'lowpass', 500);
    },
    venom: t => {
      sweep(420, 160, t, 0.34, 'sine', 0.08, sfxBus);
      arp([69, 67, 64], t + 0.08, 0.06, 0.16, 'sine', 0.06, sfxBus);
    },
    mire: t => {
      sweep(220, 70, t, 0.42, 'triangle', 0.09, sfxBus);
      noise(t, 0.38, 0.06, sfxBus, 'lowpass', 420);
    },
    siphon: t => {
      sweep(640, 110, t, 0.38, 'sawtooth', 0.06, sfxBus);
      noise(t + 0.06, 0.28, 0.05, sfxBus, 'lowpass', 700);
    },
    summon: t => arp([60, 64, 67, 72, 76], t, 0.055, 0.26, 'triangle', 0.09, sfxBus),
    ultimate: t => {
      arp([48, 55, 60, 64, 67], t, 0.05, 0.42, 'sawtooth', 0.07, sfxBus);
      noise(t, 0.3, 0.07, sfxBus, 'lowpass', 900);
    },
    field: t => { sweep(180, 90, t, 0.3, 'sine', 0.1, sfxBus); noise(t, 0.25, 0.05, sfxBus, 'lowpass', 600); },
    box: t => arp([79, 84, 88], t, 0.05, 0.19, 'sine', 0.09, sfxBus),
    level: t => arp([72, 74, 76, 79, 84], t, 0.06, 0.25, 'triangle', 0.11, sfxBus),
    buy: t => arp([84, 91], t, 0.08, 0.15, 'square', 0.07, sfxBus),
    start: t => { kick(t, 0.16, sfxBus); arp([60, 64, 67], t + 0.08, 0.06, 0.21, 'triangle', 0.08, sfxBus); },
    win: t => arp([72, 76, 79, 84, 88], t, 0.1, 0.36, 'triangle', 0.13, sfxBus),
    lose: t => arp([67, 64, 60, 55], t, 0.13, 0.36, 'sine', 0.11, sfxBus)
  };

  function sfx(name, opts) {
    const fn = SFX[name];
    if (!ctx || ctx.state !== 'running' || muted || volume <= 0 || sfxVol <= 0 || !fn) return;
    const voice = typeof opts === 'string' ? opts : (opts && opts.voice);
    const bus = voice && voiceBuses[voice] ? voiceBuses[voice] : null;
    const now = performance.now();
    const key = name + ':' + (bus ? voice : '');
    const gap = THROTTLE[name] || 70;
    if (lastSfx[key] && now - lastSfx[key] < gap) return;
    lastSfx[key] = now;
    const previous = sfxBus;
    if (bus) sfxBus = bus;
    try { fn(ctx.currentTime + 0.005); } catch (e) { /* áudio nunca quebra o jogo */ }
    finally { sfxBus = previous; }
  }

  function voiceOf(champion, fixed) {
    const key = voiceKey(champion);
    if (fixed === true) return fixedVoice(champion);
    let id = unitVoices.get(key);
    if (!VOICES.some(v => v.id === id)) {
      id = rollVoice();
      unitVoices.set(key, id);
    }
    return id;
  }

  function applyVolume() {
    if (ctx && master) master.gain.setTargetAtTime(gainOf(), ctx.currentTime, 0.02);
    if (ctx && musicGain) musicGain.gain.setTargetAtTime(musicVol, ctx.currentTime, 0.02);
    if (ctx && sfxGain) sfxGain.gain.setTargetAtTime(sfxVol, ctx.currentTime, 0.02);
    elements.forEach((el, i) => {
      const target = (i === elIndex && playingFile) ? musicGainOf() : 0;
      if (el._fade) clearInterval(el._fade);
      el._fade = 0;
      el.volume = target;
    });
    updateUi();
  }

  function updateUi() {
    if (uiMute) {
      uiMute.textContent = muted ? '🔇' : '🔊';
      uiMute.title = muted ? 'Áudio desligado — toque para ligar' : 'Áudio ligado — toque para silenciar';
      uiMute.setAttribute('aria-label', uiMute.title);
      uiMute.setAttribute('aria-pressed', muted ? 'true' : 'false');
    }
    if (uiVol) {
      uiVol.value = String(Math.round(volume * 100));
      uiVol.title = 'Volume: ' + Math.round(volume * 100) + '%';
    }
    if (uiSfx) uiSfx.value = String(Math.round(sfxVol * 100));
    if (uiMusic) uiMusic.value = String(Math.round(musicVol * 100));
  }

  function persist() {
    T.store.set(KEY_MUTED, muted);
    T.store.set(KEY_VOL, volume);
    T.audioMuted = muted;
    T.audioVol = volume;
    T.sfxVol = sfxVol;
    T.musicVol = musicVol;
    if (T.saveSettings) T.saveSettings();
  }

  function setMuted(value) {
    const next = value === true;
    if (next === muted) return;
    muted = next;
    applyVolume();
    persist();
    if (!muted) unlock();
  }

  function setVolume(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const next = Math.max(0, Math.min(1, n));
    if (next === volume) return;
    volume = next;
    applyVolume();
    persist();
    if (!unlocked && volume > 0) unlock();
  }

  function setSfxVolume(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const next = Math.max(0, Math.min(1, n));
    if (next === sfxVol) return;
    sfxVol = next;
    applyVolume();
    persist();
  }

  function setMusicVolume(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const next = Math.max(0, Math.min(1, n));
    if (next === musicVol) return;
    musicVol = next;
    applyVolume();
    persist();
  }

  function setPaused(value) {
    paused = value === true;
    if (!ctx) return;
    if (paused) {
      elements.forEach(el => { try { el.pause(); } catch (e) { /* ignore */ } });
      if (ctx.suspend) ctx.suspend().catch(() => { /* silencioso */ });
    } else {
      if (ctx.resume) ctx.resume().catch(() => { /* silencioso */ });
      if (playingFile && elements[elIndex]) {
        const p = elements[elIndex].play();
        if (p && p.catch) p.catch(() => { /* silencioso */ });
      }
    }
  }

  function sync() {
    const nextMuted = T.audioMuted === true;
    const v = Number(T.audioVol);
    const sv = Number(T.sfxVol);
    const mv = Number(T.musicVol);
    muted = nextMuted;
    volume = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.7;
    sfxVol = Number.isFinite(sv) ? Math.max(0, Math.min(1, sv)) : 1;
    musicVol = Number.isFinite(mv) ? Math.max(0, Math.min(1, mv)) : 1;
    applyVolume();
  }

  T.audio = {
    unlock,
    setScene: applyScene,
    sfx,
    setMuted,
    setVolume,
    setSfxVolume,
    setMusicVolume,
    setPaused,
    toggleMute() { setMuted(!muted); },
    sync,
    voices: VOICES.map(v => ({ id: v.id, label: v.label })),
    fixedVoice,
    voiceOf,
    rerollVoices() { unitVoices.clear(); },
    get muted() { return muted; },
    get volume() { return volume; },
    get sfxVolume() { return sfxVol; },
    get musicVolume() { return musicVol; },
    get paused() { return paused; },
    get scene() { return scene; },
    get ready() { return unlocked; },
    info() {
      const el = elements[elIndex];
      return {
        scene: scene,
        source: playingFile ? 'file' : 'procedural',
        locked: !unlocked,
        paused: paused,
        sfxVol: sfxVol,
        musicVol: musicVol,
        fileState: el ? el.readyState : 0,
        filePaused: el ? el.paused : null,
        fileVolumes: elements.map(e => Math.round((Number(e.volume) || 0) * 1000) / 1000)
      };
    }
  };

  // Um hook por módulo: a história continua controlando aba/scroll e o áudio
  // apenas escolhe a trilha da tela.
  if (T.nav && T.nav.addOnApply) {
    T.nav.addOnApply(screen => applyScene(sceneFor(screen)));
  }

  uiMute = T.$('#audiomute');
  uiVol = T.$('#audiovol');
  uiSfx = T.$('#sfxvol');
  uiMusic = T.$('#musicvol');
  if (uiMute) uiMute.addEventListener('click', () => T.audio.toggleMute());
  // "input" cobre o arraste; "change" cobre teclado, toque e ferramentas de
  // acessibilidade que disparam só o evento final.
  [[uiVol, setVolume], [uiSfx, setSfxVolume], [uiMusic, setMusicVolume]].forEach(([el, fn]) => {
    if (!el) return;
    const apply = () => fn(+el.value / 100);
    el.addEventListener('input', apply);
    el.addEventListener('change', apply);
  });
  updateUi();

  // Navegadores só permitem áudio depois de interação do jogador.
  ['pointerdown', 'keydown', 'click'].forEach(evt => {
    document.addEventListener(evt, unlock, { once: true, capture: true, passive: true });
  });
  document.addEventListener('click', () => sfx('click'), true);
})(window.TBB = window.TBB || {});
