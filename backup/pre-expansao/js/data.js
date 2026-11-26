// Dados estáticos: tipos, funções, vantagens, raridades, habilidades e campeões padrão.
(function (T) {
  'use strict';

  T.TY = {
    fogo: '#ef4444', agua: '#3b82f6', terra: '#a16207', vento: '#7dd3c0',
    raio: '#facc15', luz: '#fff3b0', trevas: '#7c3aed', neutro: '#9ca3af'
  };
  T.TN = {
    fogo: '🔥 Fogo', agua: '💧 Água', terra: '⛰️ Terra', vento: '🌪️ Vento',
    raio: '⚡ Raio', luz: '✨ Luz', trevas: '🌑 Trevas', neutro: '⚪ Neutro'
  };
  T.FN = {
    lutador: '🥊 Lutador', magico: '🔮 Mágico', genial: '🧠 Genial', fera: '🐾 Fera',
    angelical: '😇 Angelical', maldoso: '😈 Maldoso', outro: '❓ Outro', heroi: '🦸 Herói'
  };

  // Cada tipo/função tem vantagem sobre 1 tipo e 1 função.
  T.BT = { fogo: 'vento', vento: 'terra', terra: 'raio', raio: 'agua', agua: 'fogo', luz: 'trevas', trevas: 'neutro', neutro: 'luz' };
  T.TF = { fogo: 'fera', vento: 'magico', terra: 'lutador', raio: 'genial', agua: 'angelical', luz: 'maldoso', trevas: 'heroi', neutro: 'outro' };
  T.FT = { lutador: 'vento', fera: 'terra', magico: 'raio', genial: 'fogo', maldoso: 'neutro', angelical: 'trevas', heroi: 'agua', outro: 'luz' };
  T.BF = { lutador: 'fera', fera: 'magico', magico: 'genial', genial: 'maldoso', maldoso: 'angelical', angelical: 'heroi', heroi: 'outro', outro: 'lutador' };

  T.rel = (attacker, defender) =>
    (T.BT[attacker.t] === defender.t) +
    (T.TF[attacker.t] === defender.f) +
    (T.FT[attacker.f] === defender.t) +
    (T.BF[attacker.f] === defender.f);

  T.LV = { comum: 1, raro: 5, epico: 10, lendario: 15 };
  T.RN = { comum: '⚪ Comum', raro: '🔵 Raro', epico: '🟣 Épico', lendario: '🟠 Lendário' };
  T.TC = ['#38bdf8', '#f87171', '#a3e635', '#fbbf24'];
  T.TAGS = ['tank', 'dps', 'suporte'];
  T.TE = { tank: '🛡️', dps: '🗡️', suporte: '💚' };

  T.SKN = { area: '💥 Área', heal: '💚 Cura', push: '🌬️ Empurrão', proj: '🏹 Projétil' };
  T.SKC = { area: 7, heal: 9, push: 6, proj: 6 };

  T.SCAT = { dano: '⚔️ Dano', buff: '✨ Buff', debuff: '💜 Debuff', outro: '🔧 Outro' };
  T.SMODE = { '': '— (nenhuma)', contato: '🤜 Contato', proj: '🏹 Projétil' };

  // Efeitos que uma habilidade pode aplicar.
  T.EFN = {
    area: '⭕ Área', heal: '💚 Cura', push: '🌬️ Empurrão',
    burn: '🔥 Chamas', poison: '☠️ Veneno', bleed: '🩸 Sangramento',
    curse: '🌑 Maldição', paralyze: '⚡ Paralisia', slow: '🐌 Lentidão',
    shield: '🛡️ Escudo'
  };
  // Intensidade base dos efeitos (duração em segundos; dano por segundo como
  // fração do ataque de quem aplicou).
  T.EFX = {
    burn: { dmg: 0.22, dur: 4 },
    poison: { dmg: 0.14, dur: 6 },
    bleed: { dmg: 0.18, dur: 4 },
    curse: { dur: 5 },
    paralyze: { dur: 1.6 },
    slow: { dur: 3 },
    shield: { pct: 0.20, dur: 5 }
  };
  T.CC = { dano: '#ef4444', debuff: '#a855f7', buff: '#38bdf8', outro: '#9ca3af' };

  T.efDesc = key => ({
    area: 'Atinge todos os inimigos dentro do raio.',
    heal: 'Cura o aliado mais ferido (ou os aliados dentro da área).',
    push: 'Empurra o alvo para longe.',
    burn: 'Dano contínuo por alguns segundos.',
    poison: 'Dano contínuo mais longo, sem depender de esquiva.',
    bleed: 'Dano contínuo, bom contra alvos resistentes.',
    curse: 'O alvo recebe +25% de dano e cura pela metade.',
    paralyze: 'O alvo não se move nem ataca por alguns segundos.',
    slow: 'Reduz a velocidade de movimento do alvo.',
    shield: 'Absorve dano antes da vida (em si ou nos aliados da área).'
  }[key] || '');

  T.ST = ['hp', 'atk', 'spd', 'dod', 'crit', 'obe'];
  T.SL = {
    hp: '❤️ Vida', atk: '⚔️ Ataque', spd: '👟 Velocidade',
    dod: '💨 Esquiva', crit: '💥 Crítico', obe: '🎯 Obediência'
  };

  // Três níveis fixos de habilidade por campeão.
  T.TIERS = ['normal', 'media', 'ultimate'];
  T.TIER = {
    normal: { n: 'Normal', icon: '◆', mult: 1.6, multMax: 2.2, cd: 6, cdMin: 4, cdMax: 10, color: '#60a5fa' },
    media: { n: 'Média', icon: '◆◆', mult: 2.0, multMax: 2.8, cd: 9, cdMin: 6, cdMax: 14, color: '#c084fc' },
    ultimate: { n: 'Ultimate', icon: '★', mult: 2.6, multMax: 4.0, cd: 16, cdMin: 10, cdMax: 22, color: '#fbbf24' }
  };

  T.PN = {
    corajosa: '🦁 Corajosa', medrosa: '🐢 Medrosa', sadico: '😈 Sádica',
    masoquista: '😖 Masoquista', furiosa: '🔥 Furiosa', cautelosa: '🧐 Cautelosa',
    leal: '🫶 Leal', impulsiva: '⚡ Impulsiva', orgulhosa: '👑 Orgulhosa',
    estrategista: '🧠 Estrategista'
  };

  T.PD = {
    corajosa: '🦁 <b>Corajosa</b>: nunca recua por conta própria e luta até o fim.',
    medrosa: '🐢 <b>Medrosa</b>: abaixo de 35% de vida recua sozinha; ataca um pouco mais devagar, mas corre mais.',
    sadico: '😈 <b>Sádica</b>: persegue o inimigo com menos vida e causa +20% de dano em alvos feridos. Um pouco medrosa: recua abaixo de 25% de vida.',
    masoquista: '😖 <b>Masoquista</b>: gosta de apanhar — recebe 15% menos dano e ganha fúria (+20% de ataque) ao ser atingida. Nunca recua.',
    furiosa: '🔥 <b>Furiosa</b>: quanto menos vida tem, mais dano causa (até +35%). Nunca recua.',
    cautelosa: '🧐 <b>Cautelosa</b>: mantém distância, recebe 8% menos dano e recua abaixo de 30% de vida.',
    leal: '🫶 <b>Leal</b>: fica perto dos aliados feridos, recebe +20% de cura e nunca abandona o time.',
    impulsiva: '⚡ <b>Impulsiva</b>: ataca 25% mais rápido, mas recebe +10% de dano e obedece um pouco menos.',
    orgulhosa: '👑 <b>Orgulhosa</b>: causa +10% de dano, mas desobedece mais às ordens.',
    estrategista: '🧠 <b>Estrategista</b>: escolhe melhor os alvos e tem +8% de crítico.'
  };

  // Modificadores usados pelo motor de batalha.
  // dr < 1 reduz o dano recebido; dmg é multiplicador de dano causado;
  // flee é a fração de vida em que a unidade recua sozinha.
  T.PI = {
    corajosa: {},
    medrosa: { flee: 0.35, dmg: 0.95, atkSpeed: 0.9 },
    sadico: { flee: 0.25, aggro: 'weak', bonusVsHurt: 1.2 },
    masoquista: { dr: 0.85, rage: true },
    furiosa: { dmgLow: 1.35 },
    cautelosa: { flee: 0.30, dr: 0.92, keepAway: true },
    leal: { healBonus: 1.2, aggro: 'protect' },
    impulsiva: { atkSpeed: 1.25, dr: 1.10, obe: -8 },
    orgulhosa: { dmg: 1.10, obe: -12 },
    estrategista: { dmg: 1.05, crit: 8, smart: true }
  };

  // Indicadores de status (ícone, nome, cor).
  T.STAT = {
    burn: ['🔥', 'Chamas', '#fb923c'],
    poison: ['☠️', 'Veneno', '#a3e635'],
    bleed: ['🩸', 'Sangramento', '#f87171'],
    curse: ['🌑', 'Maldição', '#a855f7'],
    para: ['⚡', 'Paralisia', '#facc15'],
    slow: ['🐌', 'Lentidão', '#c4b5fd'],
    shield: ['🛡️', 'Escudo', '#38bdf8'],
    rage: ['😤', 'Fúria', '#fb7185'],
    buff: ['✨', 'Buff', '#38bdf8']
  };
  T.ORD = {
    def: '🛡 Defender', ret: '↩ Recuar', atk: '⚔ Atacar',
    fin: '⏳ Finalizar', foc: '📍 Focar', stun: '💫 Atordoado'
  };

  // Ajustes de balanceamento centralizados.
  T.BAL = {
    pace: 0.85,         // ritmo geral da simulação (1 = normal; menor = mais lento)
    hpBase: 200,        // vida mínima de qualquer campeão
    hpPer: 20,          // vida por ponto de atributo
    atkBase: 12,        // ataque base
    atkPer: 2,          // ataque por ponto de atributo
    damageCap: 5,       // multiplicador máximo de dano de um golpe
    dotTick: 0.5,       // intervalo entre pulos de dano contínuo
    shrinkStart: 8,     // segundos até a arena começar a fechar
    shrinkRate: 2.4,    // unidades por segundo
    minRadius: 60,      // raio mínimo
    collapseDps: 10,    // dano por segundo no colapso
    dprMax: 2,          // limite de devicePixelRatio para performance
    hudHz: 10           // atualizações do HUD por segundo
  };

  const skill = (n, cat, mode, ef, mult, cd, extra) => Object.assign({
    n, cat, mode, ef, mult, cd,
    rng: 150, pspd: 230, rad: 65, sprite: ''
  }, extra || {});

  // Habilidade padrão de um slot (normal/média/ultimate), usada para migrar
  // campeões antigos e completar os três slots.
  T.mkSkill = (tier, c) => {
    const key = T.TIER[tier] ? tier : 'normal';
    const tag = (c && c.tag) || 'dps';
    const tierInfo = T.TIER[key];
    if (tag === 'suporte') {
      if (key === 'normal') return skill('Pulso', 'dano', 'contato', { area: 1 }, 1.3, 5, { rad: 70 });
      if (key === 'media') return skill('Bênção', 'outro', '', { heal: 1 }, 1.1, 9, { rad: 70 });
      return skill('Aurora', 'outro', '', { heal: 1, area: 1, shield: 1 }, 1.6, 16, { rad: 85 });
    }
    if (tag === 'tank') {
      if (key === 'normal') return skill('Tapa', 'dano', 'contato', { push: 1 }, 1.3, 5, { rad: 65 });
      if (key === 'media') return skill('Muralha', 'buff', '', { shield: 1 }, 1.0, 9, { rad: 70 });
      return skill('Terremoto', 'dano', 'contato', { area: 1, push: 1 }, 2.4, 16, { rad: 90 });
    }
    if (key === 'normal') return skill('Golpe', 'dano', 'contato', { area: 1 }, tierInfo.mult, 6, { rad: 70 });
    if (key === 'media') return skill('Investida', 'dano', 'proj', {}, tierInfo.mult, 9, { rng: 180, pspd: 260 });
    return skill('Ímpeto', 'dano', 'proj', { area: 1 }, tierInfo.mult, 16, { rng: 190, pspd: 300, rad: 85 });
  };

  T.defaultSkills = c => T.TIERS.map(t => T.mkSkill(t, c));

  T.clampSkill = s => {
    if (!s || typeof s !== 'object') return s;
    const ti = T.TIER[s.tier] || T.TIER.normal;
    s.n = String(s.n || ti.n).slice(0, 12);
    s.mult = T.clamp(s.mult == null ? ti.mult : s.mult, 0.1, ti.multMax);
    s.cd = T.clamp(s.cd == null ? ti.cd : s.cd, ti.cdMin, ti.cdMax);
    s.rng = T.clamp(s.rng == null ? 150 : s.rng, 20, 400);
    s.pspd = T.clamp(s.pspd == null ? 230 : s.pspd, 60, 600);
    s.rad = T.clamp(s.rad == null ? 60 : s.rad, 20, 150);
    s.mode = Object.hasOwn(T.SMODE, s.mode) ? s.mode : '';
    s.cat = Object.hasOwn(T.SCAT, s.cat) ? s.cat : 'dano';
    s.ef = s.ef && typeof s.ef === 'object' ? s.ef : {};
    s.sprite = typeof s.sprite === 'string' ? s.sprite : '';
    return s;
  };

  T.DEFAULT_RO = [
    {
      n: 'Brasa', t: 'fogo', f: 'lutador', r: 'comum', tag: 'dps', p: 'corajosa', up: {},
      sks: [
        skill('Brasa', 'dano', 'contato', { area: 1, burn: 1 }, 1.5, 6, { rad: 70 }),
        skill('Labareda', 'dano', 'proj', { burn: 1 }, 2.0, 9, { rng: 180, pspd: 260 }),
        skill('Inferno', 'dano', 'contato', { area: 1, burn: 1 }, 2.9, 16, { rad: 95 })
      ]
    },
    {
      n: 'Maré', t: 'agua', f: 'angelical', r: 'comum', tag: 'suporte', p: 'medrosa', up: {},
      sks: [
        skill('Jato', 'dano', 'proj', { slow: 1 }, 1.4, 5, { rng: 170, pspd: 250 }),
        skill('Bênção', 'outro', '', { heal: 1 }, 1.1, 9),
        skill('Maré Alta', 'outro', '', { heal: 1, area: 1, shield: 1 }, 1.7, 16, { rad: 90 })
      ]
    },
    {
      n: 'Pedrão', t: 'terra', f: 'lutador', r: 'comum', tag: 'tank', p: 'masoquista', up: {},
      sks: [
        skill('Tapa', 'dano', 'contato', { push: 1 }, 1.3, 5, { rad: 65 }),
        skill('Muralha', 'buff', '', { shield: 1 }, 1.0, 9),
        skill('Terremoto', 'dano', 'contato', { area: 1, push: 1 }, 2.5, 16, { rad: 95 })
      ]
    },
    {
      n: 'Zéfiro', t: 'vento', f: 'magico', r: 'comum', tag: 'dps', p: 'medrosa', up: {},
      sks: [
        skill('Brisa', 'dano', 'proj', { slow: 1 }, 1.3, 5, { rng: 180, pspd: 270 }),
        skill('Rajada', 'dano', 'proj', { area: 1 }, 1.9, 9, { rng: 190, pspd: 280, rad: 80 }),
        skill('Ciclone', 'dano', 'proj', { area: 1, push: 1 }, 2.5, 16, { rng: 200, pspd: 300, rad: 100 })
      ]
    },
    {
      n: 'Fulgor', t: 'raio', f: 'genial', r: 'comum', tag: 'dps', p: 'impulsiva', up: {},
      sks: [
        skill('Faísca', 'dano', 'proj', {}, 1.5, 5, { rng: 190, pspd: 300 }),
        skill('Descarga', 'dano', 'proj', { paralyze: 1 }, 1.7, 9, { rng: 190, pspd: 320 }),
        skill('Tempestade', 'dano', 'proj', { area: 1, paralyze: 1 }, 2.5, 16, { rng: 210, pspd: 330, rad: 95 })
      ]
    },
    {
      n: 'Lúmen', t: 'luz', f: 'heroi', r: 'comum', tag: 'tank', p: 'leal', up: {},
      sks: [
        skill('Pulso', 'dano', 'contato', {}, 1.4, 5, { rad: 70 }),
        skill('Aurora', 'outro', '', { heal: 1, area: 1 }, 1.2, 10, { rad: 85 }),
        skill('Julgamento', 'dano', 'contato', { area: 1, heal: 1 }, 2.3, 16, { rad: 100 })
      ]
    },
    {
      n: 'Sombra', t: 'trevas', f: 'maldoso', r: 'comum', tag: 'dps', p: 'sadico', up: {},
      sks: [
        skill('Toque Sombra', 'dano', 'proj', { curse: 1 }, 1.4, 5, { rng: 170, pspd: 250 }),
        skill('Maldição', 'debuff', 'proj', { curse: 1, slow: 1 }, 1.5, 9, { rng: 180, pspd: 260 }),
        skill('Eclipse', 'debuff', 'proj', { area: 1, curse: 1, poison: 1, slow: 1 }, 2.2, 16, { rng: 200, pspd: 280, rad: 95 })
      ]
    },
    {
      n: 'Névoa', t: 'neutro', f: 'outro', r: 'comum', tag: 'tank', p: 'cautelosa', up: {},
      sks: [
        skill('Nevoeiro', 'debuff', 'proj', { slow: 1 }, 1.2, 5, { rng: 170, pspd: 240 }),
        skill('Veneno', 'debuff', 'proj', { poison: 1 }, 1.5, 9, { rng: 180, pspd: 250 }),
        skill('Miasma', 'debuff', 'proj', { area: 1, poison: 1, curse: 1 }, 2.1, 16, { rng: 200, pspd: 270, rad: 95 })
      ]
    },
    {
      n: 'Lava', t: 'fogo', f: 'fera', r: 'comum', tag: 'dps', p: 'furiosa', up: {},
      sks: [
        skill('Mordida', 'dano', 'contato', { bleed: 1 }, 1.6, 5, { rad: 65 }),
        skill('Presa', 'dano', 'contato', { bleed: 1, push: 1 }, 2.0, 9, { rad: 75 }),
        skill('Erupção', 'dano', 'contato', { area: 1, burn: 1, bleed: 1 }, 2.9, 16, { rad: 100 })
      ]
    }
  ];

  // Migração de habilidades no formato antigo (sk: 'area' etc).
  T.KM = {
    area: { cat: 'dano', mode: 'contato', ef: { area: 1 }, rad: 65, mult: 1.8, rng: 150, pspd: 230, cd: 7 },
    heal: { cat: 'outro', mode: '', ef: { heal: 1 }, mult: 1, rng: 150, pspd: 230, rad: 60, cd: 9 },
    push: { cat: 'dano', mode: 'contato', ef: { push: 1 }, rad: 45, mult: 1.2, rng: 150, pspd: 230, cd: 6 },
    proj: { cat: 'dano', mode: 'proj', ef: {}, mult: 1.5, rng: 150, pspd: 230, rad: 60, cd: 6 }
  };

  T.free = c => T.LV[c.r] - 1 - T.ST.reduce((sum, k) => sum + (c.up[k] || 0), 0);

  T.stv = (c, k) => {
    if (k === 'hp') return T.BAL.hpBase + T.BAL.hpPer * (c.up.hp || 0);
    if (k === 'atk') return T.BAL.atkBase + T.BAL.atkPer * (c.up.atk || 0);
    return Math.min(76, (k === 'obe' ? 50 : 1) + 5 * (c.up[k] || 0));
  };

  T.normSkill = s => {
    if (!s || typeof s !== 'object') return s;
    const legacy = s.k;
    if (legacy) {
      Object.assign(s, T.clone(T.KM[legacy] || T.KM.area));
      delete s.k;
    }
    s.n = String(s.n || (legacy && T.SKN[legacy] ? T.SKN[legacy].split(' ')[1] : '') || 'Habilidade').slice(0, 12);
    return T.clampSkill(s);
  };

  T.norm = c => {
    c.up = c.up && typeof c.up === 'object' ? c.up : {};
    let list = Array.isArray(c.sks) ? c.sks.slice() : [];
    if (!list.length && c.sk && T.SKN[c.sk]) {
      list = [{ n: T.SKN[c.sk].split(' ')[1], k: c.sk, cd: T.SKC[c.sk] || 7, sprite: '' }];
    }
    list = list.filter(s => s && typeof s === 'object');
    c.sks = T.TIERS.map(tier => {
      const idx = list.findIndex(s => s.tier === tier);
      const found = idx >= 0 ? list.splice(idx, 1)[0] : list.shift();
      if (found) found.tier = tier;
      const out = found ? T.normSkill(found) : T.mkSkill(tier, c);
      out.tier = tier;
      return T.clampSkill(out);
    });
    return c;
  };

  T.byName = name => T.RO.find(c => c.n === name) || null;

  T.inv = (map, value) => Object.keys(map).filter(k => map[k] === value);

  T.statusList = (u, G) => {
    if (!u) return [];
    const now = (G && G.T) || 0;
    const out = [];
    if (u.burnT > now) out.push('burn');
    if (u.poisonT > now) out.push('poison');
    if (u.bleedT > now) out.push('bleed');
    if (u.curseT > now) out.push('curse');
    if (u.paraT > now) out.push('para');
    if (u.slowT > now) out.push('slow');
    if (u.rageT > now) out.push('rage');
    if (u.shield > 0) out.push('shield');
    if (u.buffT > now) out.push('buff');
    return out;
  };
})(window.TBB = window.TBB || {});
