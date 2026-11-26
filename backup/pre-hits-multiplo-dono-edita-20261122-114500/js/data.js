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

  // Pontos iniciais por raridade. O nível concede pontos extras e, no máximo,
  // todas as raridades convergem para o mesmo total (28 pontos).
  T.LV = { comum: 10, raro: 15, epico: 10, lendario: 5 };
  T.LVLMAX = 10;
  // Bônus ao subir do nível N para N+1 (índice 0 = subir para o nível 2).
  // Comum/épico somam +18, raro +13 e lendário +23: todos chegam a 28.
  T.LVLBONUS = {
    comum:    [2, 2, 2, 2, 2, 2, 2, 2, 2],
    raro:     [1, 2, 1, 2, 1, 2, 1, 2, 1],
    epico:    [2, 2, 2, 2, 2, 2, 2, 2, 2],
    lendario: [3, 2, 3, 2, 3, 2, 3, 2, 3]
  };
  T.RN = { comum: '⚪ Comum', raro: '🔵 Raro', epico: '🟣 Épico', lendario: '🟠 Lendário' };
  T.TC = ['#38bdf8', '#f87171', '#22c55e', '#a855f7'];
  T.TAGS = [
    'tank', 'bruiser', 'dps', 'atirador', 'assassino', 'mago',
    'suporte', 'curandeiro', 'controlador', 'utilitario'
  ];
  T.TE = {
    tank: '🛡️', bruiser: '💪', dps: '🗡️', atirador: '🏹', assassino: '🥷',
    mago: '🔮', suporte: '💚', curandeiro: '✨', controlador: '🌀', utilitario: '🔧'
  };
  T.TAGN = {
    tank: 'Tanque', bruiser: 'Briguento', dps: 'Dano', atirador: 'Atirador',
    assassino: 'Assassino', mago: 'Mago', suporte: 'Suporte',
    curandeiro: 'Curandeiro', controlador: 'Controlador', utilitario: 'Utilitário'
  };

  T.SKN = { area: '💥 Área', heal: '💚 Cura', push: '🌬️ Empurrão', proj: '🏹 Projétil' };
  T.SKC = { area: 7, heal: 9, push: 6, proj: 6 };

  T.SCAT = { dano: '⚔️ Dano', buff: '✨ Buff', debuff: '💜 Debuff', outro: '🔧 Outro' };
  T.SMODE = { '': '— (nenhuma)', contato: '🤜 Contato', proj: '🏹 Projétil' };
  // Alvo da habilidade. Buffs/debuffs não usam alcance nem projétil: eles
  // simplesmente funcionam no alvo escolhido quando a habilidade dispara.
  T.SALVO = { self: '👤 Você', ally: '🤝 Aliados', enemy: '👾 Inimigo atual' };

  // Efeitos que uma habilidade pode aplicar. `power` substitui o buff implícito
  // de +30% que existia em toda habilidade do tipo Buff.
  T.EFN = {
    area: '⭕ Área', heal: '💚 Cura', push: '🌬️ Empurrão',
    burn: '🔥 Chamas', poison: '☠️ Veneno', bleed: '🩸 Sangramento',
    curse: '🌑 Maldição', paralyze: '⚡ Paralisia', slow: '🐌 Lentidão',
    shield: '🛡️ Escudo', power: '💥 Impulso',
    crit: '🎯 Crítico', haste: '⚡ Vel. ataque', move: '👟 Movimento',
    dodge: '💨 Esquiva', drain: '🩸 Roubar vida', rage: '😤 Fúria',
    guard: '🔰 Guarda', regen: '💚 Regeneração', cleanse: '✨ Purificar'
  };
  // Valores antigos, usados apenas como fallback de campeões salvos sem `efv`.
  T.EFX = {
    burn: { dmg: 0.22, dur: 4 },
    poison: { dmg: 0.14, dur: 6 },
    bleed: { dmg: 0.18, dur: 4 },
    curse: { dur: 5 },
    paralyze: { dur: 1.6 },
    slow: { dur: 3 },
    shield: { pct: 0.20, dur: 5 },
    power: { pct: 0.30, dur: 5 },
    crit: { amount: 18, dur: 6 },
    haste: { mult: 1.35, dur: 6 },
    move: { mult: 1.40, dur: 6 },
    dodge: { amount: 14, dur: 6 },
    drain: { pct: 0.18, dur: 6 },
    rage: { dur: 6 },
    guard: { dr: 0.72, dur: 6 },
    regen: { pct: 0.02, dur: 6 }
  };
  T.CC = { dano: '#ef4444', debuff: '#a855f7', buff: '#38bdf8', outro: '#9ca3af' };

  // Grupos do seletor de efeitos e metadados completos de cada um. `d` é a
  // duração padrão em segundos; `p` é a força padrão na unidade descrita em
  // `unit`. `d:null` / `p:null` significa que o efeito não usa esse ajuste.
  T.EFGROUPS = { positivo: '✨ Positivos', negativo: '💜 Negativos', mecanico: '🔧 Mecânicos' };
  const em = (g, desc, basis, opts) => Object.assign({
    g, desc, basis, d: null, p: null, unit: '', min: 0, max: 100, step: 1
  }, opts || {});
  T.EFMETA = {
    area: em('mecanico',
      'Atinge todos os inimigos dentro do raio da habilidade.',
      'Raio configurado no campo ⭕ Área (20 a 300).'),
    heal: em('positivo',
      'Cura o alvo escolhido; com ⭕ Área, cura os aliados dentro do raio.',
      'Força em % da vida máxima do alvo. Um ponto = 1% da vida.',
      { p: 25, min: 1, max: 100, unit: '% da vida' }),
    push: em('mecanico',
      'Empurra o alvo para longe e trava o movimento por um instante.',
      'Força multiplica o empurrão padrão do jogo.',
      { p: 1, min: 0.5, max: 3, step: 0.1, unit: '×' }),
    burn: em('negativo',
      'Causa dano contínuo por segundo enquanto o efeito durar.',
      'Força em % do ataque de quem aplicou, por segundo.',
      { d: 4, p: 22, unit: '% atk/s' }),
    poison: em('negativo',
      'Dano contínuo mais longo; ignora esquiva.',
      'Força em % do ataque de quem aplicou, por segundo.',
      { d: 6, p: 14, unit: '% atk/s' }),
    bleed: em('negativo',
      'Dano contínuo que ignora parte da resistência do alvo.',
      'Força em % do ataque de quem aplicou, por segundo.',
      { d: 4, p: 18, unit: '% atk/s' }),
    curse: em('negativo',
      'O alvo recebe mais dano e a cura nele é reduzida pela metade.',
      'Força em % extra de dano recebido. A redução de cura é fixa em 50%.',
      { d: 5, p: 25, unit: '% dano recebido' }),
    paralyze: em('negativo',
      'O alvo fica parado: não se move nem ataca.',
      'Duração reduzida pela resistência a controle da personalidade.',
      { d: 1.6, unit: 's' }),
    slow: em('negativo',
      'Reduz a velocidade de movimento e a recarga do alvo.',
      'Força em % de redução de velocidade; resistência a controle reduz o tempo.',
      { d: 3, p: 35, unit: '% mais lento' }),
    shield: em('positivo',
      'Cria uma barreira que absorve dano antes da vida.',
      'Força em % da vida máxima de quem recebe o escudo.',
      { d: 5, p: 20, unit: '% da vida' }),
    power: em('positivo',
      'Aumenta o dano causado e a velocidade de ataque e recarga.',
      'Força em % de ataque e velocidade. É o antigo buff implícito do tipo Buff.',
      { d: 5, p: 30, unit: '% atk/vel' }),
    crit: em('positivo',
      'Aumenta a chance de crítico.',
      'Força em pontos percentuais somados ao crítico final.',
      { d: 6, p: 18, unit: 'pontos %' }),
    haste: em('positivo',
      'Acelera ataques e recargas das habilidades.',
      'Força em % de velocidade de ataque e recarga.',
      { d: 6, p: 35, unit: '% mais rápido' }),
    move: em('positivo',
      'Aumenta a velocidade de movimento.',
      'Força em % de velocidade de movimento.',
      { d: 6, p: 40, unit: '% mais rápido' }),
    dodge: em('positivo',
      'Aumenta a chance de esquiva.',
      'Força em pontos percentuais somados à esquiva final.',
      { d: 6, p: 14, unit: 'pontos %' }),
    drain: em('positivo',
      'Converte parte do dano causado em cura.',
      'Força em % do dano causado que volta como vida.',
      { d: 6, p: 18, unit: '% do dano' }),
    rage: em('positivo',
      'Fúria: aumenta o dano causado e reduz o dano recebido.',
      'Força em % de dano causado; a redução de dano recebido é fixa em 10%.',
      { d: 6, p: 20, unit: '% dano causado' }),
    guard: em('positivo',
      'Reduz o dano recebido.',
      'Força em % de redução de dano (100% anula todo o dano).',
      { d: 6, p: 28, unit: '% menos dano' }),
    regen: em('positivo',
      'Recupera vida continuamente por segundo.',
      'Força em % da vida máxima recuperada por segundo.',
      { d: 6, p: 2, unit: '% vida/s' }),
    cleanse: em('positivo',
      'Remove chamas, veneno, sangramento, maldição, paralisia e lentidão.',
      'Efeito imediato: não usa duração nem força.')
  };

  T.efDesc = key => (T.EFMETA[key] || {}).desc || '';
  T.efBasis = key => (T.EFMETA[key] || {}).basis || '';
  T.efDefault = key => {
    const meta = T.EFMETA[key];
    if (!meta) return { d: 0, p: 0 };
    return { d: meta.d == null ? 0 : meta.d, p: meta.p == null ? 0 : meta.p };
  };
  T.inferAlvo = s => {
    if (!s || typeof s !== 'object') return 'self';
    if (s.cat === 'debuff') return 'enemy';
    if (s.cat === 'dano') return 'enemy';
    const ef = s.ef || {};
    if (ef.burn || ef.poison || ef.bleed || ef.curse || ef.paralyze || ef.slow || ef.push) return 'enemy';
    if (s.cat === 'buff' || ef.heal || ef.shield || ef.power || ef.crit ||
        ef.haste || ef.move || ef.dodge || ef.drain || ef.rage || ef.guard ||
        ef.regen || ef.cleanse) {
      return ef.area ? 'ally' : 'self';
    }
    return 'self';
  };
  // Configuração absoluta de um efeito. Campeões antigos (sem `efv`) mantêm o
  // cálculo pelo multiplicador da habilidade; efeitos adicionados no editor
  // usam os números escolhidos pelo jogador.
  T.efCfg = (s, key) => {
    const meta = T.EFMETA[key];
    if (!meta) return { d: 0, p: 0, legacy: false };
    const def = T.efDefault(key);
    const raw = s && s.efv && s.efv[key];
    if (raw && typeof raw === 'object' &&
        (Object.hasOwn(raw, 'd') || Object.hasOwn(raw, 'p'))) {
      const d = raw.d == null ? def.d : T.clamp(+raw.d || 0, 0, 60);
      const p = raw.p == null ? def.p : T.clamp(+raw.p || 0, meta.min, meta.max);
      return { d, p, legacy: false };
    }
    const m = Math.max(0.5, Math.min(+(s && s.mult) || 1, 8));
    const scale = 0.7 + 0.3 * Math.min(m, 2.5);
    const e = T.EFX[key] || {};
    let d = e.dur ? e.dur * scale : 0;
    let p = def.p;
    if (key === 'burn' || key === 'poison' || key === 'bleed') p = (e.dmg || 0) * 100 * scale;
    else if (key === 'shield') { d = e.dur * m; p = (e.pct || 0) * 100 * m; }
    else if (key === 'heal') p = 25 * m;
    else if (key === 'push') p = m;
    else if (key === 'crit' || key === 'dodge') p = e.amount || p;
    else if (key === 'haste' || key === 'move') p = Math.round(((e.mult || 1) - 1) * 100);
    else if (key === 'drain') p = (e.pct || 0) * 100;
    else if (key === 'guard') p = Math.round((1 - (e.dr || 1)) * 100);
    else if (key === 'regen') p = (e.pct || 0) * 100 * m;
    else if (key === 'power') { d = e.dur * m; p = (e.pct || 0) * 100; }
    else if (key === 'curse' || key === 'slow' || key === 'rage') p = def.p;
    if (s && s.cat === 'debuff' && key === 'slow' && !s.efv) d = 3 * m;
    if (s && s.cat === 'buff' && key === 'power' && !s.efv) { d = 5 * m; p = 30; }
    return { d, p, legacy: true };
  };
  T.efText = (key, cfg) => {
    const meta = T.EFMETA[key];
    if (!meta) return '';
    const c = cfg || T.efDefault(key);
    const d = (c.d || 0).toFixed(1);
    const p = Math.round(c.p || 0);
    const texts = {
      area: 'Atinge em área.',
      heal: `Cura ${p}% da vida máxima.`,
      push: `Empurra com força ${(c.p || 0).toFixed(1)}×.`,
      burn: `Queima por ${d}s: ${p}% do ataque por segundo.`,
      poison: `Envenena por ${d}s: ${p}% do ataque por segundo.`,
      bleed: `Sangra por ${d}s: ${p}% do ataque por segundo.`,
      curse: `Maldiz por ${d}s: +${p}% de dano recebido e cura pela metade.`,
      paralyze: `Paralisa por ${d}s.`,
      slow: `Deixa ${p}% mais lento por ${d}s.`,
      shield: `Escudo de ${p}% da vida por ${d}s.`,
      power: `+${p}% de ataque e velocidade por ${d}s.`,
      crit: `+${p} pontos de crítico por ${d}s.`,
      haste: `+${p}% de velocidade de ataque por ${d}s.`,
      move: `+${p}% de movimento por ${d}s.`,
      dodge: `+${p} pontos de esquiva por ${d}s.`,
      drain: `Rouba ${p}% do dano causado por ${d}s.`,
      rage: `Fúria: +${p}% de dano e −10% de dano recebido por ${d}s.`,
      guard: `Reduz o dano recebido em ${p}% por ${d}s.`,
      regen: `Recupera ${p}% da vida por segundo por ${d}s.`,
      cleanse: 'Remove todos os efeitos negativos.'
    };
    return texts[key] || meta.desc;
  };

  T.ST = ['hp', 'atk', 'spd', 'dod', 'crit', 'obe'];
  T.UPMIN = -30;      // valores negativos reduzem o atributo e devolvem pontos
  T.UPMAX = 60;
  // "Modo livre" ignora o orçamento de pontos e eleva o teto percentual.
  T.isFreeBuild = c => !!(c && c.livre);
  T.statCap = c => (T.isFreeBuild(c) ? 95 : 76);
  T.SL = {
    hp: '❤️ Vida', atk: '⚔️ Ataque', spd: '👟 Velocidade',
    dod: '💨 Esquiva', crit: '💥 Crítico', obe: '🎯 Obediência'
  };

  // Limites usados ao criar habilidades. São amplos de propósito: o editor
  // deixa mexer em tempo, multiplicador, alcance, raio e velocidade livremente.
  T.SKILL_RANGE = {
    multMin: 0.1, multMax: 8,
    cdMin: 1, cdMax: 60,
    rngMin: 20, rngMax: 600,
    pspdMin: 60, pspdMax: 900,
    radMin: 20, radMax: 300
  };

  // Três níveis fixos de habilidade por campeão.
  T.TIERS = ['normal', 'media', 'ultimate'];
  T.TIER = {
    normal: { n: 'Normal', icon: '◆', mult: 1.6, multMax: T.SKILL_RANGE.multMax, cd: 6, cdMin: T.SKILL_RANGE.cdMin, cdMax: T.SKILL_RANGE.cdMax, color: '#60a5fa' },
    media: { n: 'Média', icon: '◆◆', mult: 2.0, multMax: T.SKILL_RANGE.multMax, cd: 9, cdMin: T.SKILL_RANGE.cdMin, cdMax: T.SKILL_RANGE.cdMax, color: '#c084fc' },
    ultimate: { n: 'Ultimate', icon: '★', mult: 2.6, multMax: T.SKILL_RANGE.multMax, cd: 16, cdMin: T.SKILL_RANGE.cdMin, cdMax: T.SKILL_RANGE.cdMax, color: '#fbbf24' }
  };

  T.PN = {
    corajosa: '🦁 Corajosa', medrosa: '🐢 Medrosa', sadico: '😈 Sádica',
    masoquista: '😖 Masoquista', furiosa: '🔥 Furiosa', cautelosa: '🧐 Cautelosa',
    leal: '🫶 Leal', impulsiva: '⚡ Impulsiva', orgulhosa: '👑 Orgulhosa',
    estrategista: '🧠 Estrategista', mesquinho: '🤑 Mesquinha',
    vingativa: '🗡️ Vingativa', sanguinaria: '🩸 Sanguinária',
    teimosa: '🪨 Teimosa', sortuda: '🍀 Sortuda', protetora: '🛡️ Protetora',
    mimada: '💅 Mimada'
  };

  T.PD = {
    corajosa: '🦁 <b>Corajosa</b>: nunca recua e luta até o fim.',
    medrosa: '🐢 <b>Medrosa</b>: abaixo de 35% de vida recua sozinha; ataca um pouco mais devagar, mas corre mais.',
    sadico: '😈 <b>Sádica</b>: persegue o inimigo com menos vida e causa +18% de dano em alvos feridos. Recua abaixo de 22% de vida.',
    masoquista: '😖 <b>Masoquista</b>: gosta de apanhar — recebe 12% menos dano e ganha fúria (+20% de ataque) ao ser atingida. Nunca recua.',
    furiosa: '🔥 <b>Furiosa</b>: quanto menos vida tem, mais dano causa (até +30%). Nunca recua.',
    cautelosa: '🧐 <b>Cautelosa</b>: mantém distância, recebe 6% menos dano e recua abaixo de 30% de vida.',
    leal: '🫶 <b>Leal</b>: fica perto dos aliados feridos, recebe +15% de cura e nunca abandona o time.',
    impulsiva: '⚡ <b>Impulsiva</b>: ataca 20% mais rápido, mas recebe +10% de dano e obedece um pouco menos.',
    orgulhosa: '👑 <b>Orgulhosa</b>: causa +8% de dano, mas desobedece mais às ordens.',
    estrategista: '🧠 <b>Estrategista</b>: escolhe melhor os alvos e tem +6% de crítico.',
    mesquinho: '🤑 <b>Mesquinha</b>: é atraída pelas caixas de bônus e corre mais para pegá-las; ganha +25% de efeito das caixas.',
    vingativa: '🗡️ <b>Vingativa</b>: guarda quem a atingiu por último e causa +20% de dano nesse alvo.',
    sanguinaria: '🩸 <b>Sanguinária</b>: recupera 18% do dano que causa e ataca mais forte alvos feridos.',
    teimosa: '🪨 <b>Teimosa</b>: resiste 50% a paralisia e lentidão, tem +10% de obediência e recebe 5% menos dano.',
    sortuda: '🍀 <b>Sortuda</b>: +8% de esquiva, +8% de crítico e efeitos de caixa 25% melhores.',
    protetora: '🛡️ <b>Protetora</b>: aliados a até 90 de distância recebem 10% menos dano; protege os feridos.',
    mimada: '💅 <b>Mimada</b>: causa +12% de dano, mas obedece bem menos e cura 20% menos.'
  };

  // Modificadores usados pelo motor de batalha.
  // dr < 1 reduz o dano recebido; dmg é multiplicador de dano causado;
  // flee é a fração de vida em que a unidade recua sozinha.
  T.PI = {
    corajosa: {},
    medrosa: { flee: 0.35, dmg: 0.95, atkSpeed: 0.9, move: 1.15 },
    sadico: { flee: 0.22, aggro: 'weak', bonusVsHurt: 1.18 },
    masoquista: { dr: 0.88, rage: true },
    furiosa: { dmgLow: 1.30 },
    cautelosa: { flee: 0.30, dr: 0.94, keepAway: true },
    leal: { healBonus: 1.15, aggro: 'protect' },
    impulsiva: { atkSpeed: 1.20, dr: 1.10, obe: -8 },
    orgulhosa: { dmg: 1.08, obe: -10 },
    estrategista: { dmg: 1.03, crit: 6, smart: true },
    mesquinho: { greed: true, boxBonus: 1.25, move: 1.12 },
    vingativa: { vengeful: true, dmg: 1.05 },
    sanguinaria: { lifesteal: 0.18, bonusVsHurt: 1.12, aggro: 'weak' },
    teimosa: { controlResist: 0.5, obe: 10, dr: 0.95 },
    sortuda: { dod: 8, crit: 8, boxBonus: 1.25 },
    protetora: { allyDr: 0.90, aggro: 'protect' },
    mimada: { dmg: 1.12, healBonus: 0.8, obe: -14 }
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
    buff: ['✨', 'Buff', '#38bdf8'],
    crit: ['🎯', 'Crítico', '#fde047'],
    haste: ['⚡', 'Velocidade', '#facc15'],
    move: ['👟', 'Movimento', '#7dd3c0'],
    dodge: ['💨', 'Esquiva', '#93c5fd'],
    drain: ['🩸', 'Roubo de vida', '#fb7185'],
    guard: ['🔰', 'Guarda', '#38bdf8'],
    power: ['💥', 'Impulso', '#38bdf8'],
    regen: ['💚', 'Regeneração', '#86efac'],
    cleanse: ['✨', 'Purificação', '#c4b5fd']
  };
  T.ORD = {
    def: '🛡 Defender', ret: '↩ Recuar', atk: '⚔ Atacar',
    fin: '⏳ Finalizar', foc: '📍 Focar', stun: '💫 Atordoado'
  };

  // Ajustes de balanceamento centralizados.
  T.BAL = {
    pace: 1,            // ritmo geral da simulação (1 = normal)
    hpBase: 200,        // vida mínima de qualquer campeão
    hpPer: 20,          // vida por ponto de atributo
    atkBase: 12,        // ataque base
    atkPer: 2,          // ataque por ponto de atributo
    moveBase: 48,       // velocidade de movimento base (px/s)
    moveSpd: 0.95,      // velocidade por ponto de velocidade
    pushBase: 420,      // força base de empurrão
    skillWindup: 0.42,  // pausa antes de uma habilidade acontecer
    damageCap: 5,       // multiplicador máximo de dano de um golpe
    dotTick: 0.5,       // intervalo entre pulos de dano contínuo
    shrinkStart: 20,    // segundos até a arena começar a fechar
    shrinkRate: 3.0,    // unidades por segundo
    minRadius: 75,      // raio mínimo
    collapseDps: 10,    // dano por segundo no colapso
    arenaBase: 210,     // raio com poucos campeões
    arenaPer: 18,       // raio adicional por campeão
    arenaMax: 380,      // raio máximo
    prepTime: 15,       // segundos de posicionamento antes da luta
    boxEvery: 6,        // intervalo médio entre caixas de bônus
    boxMax: 5,          // caixas simultâneas
    boxLife: 18,        // duração de uma caixa
    dprMax: 2,          // limite de devicePixelRatio para performance
    hudHz: 10,          // atualizações do HUD por segundo
    nerfFixed: 0.10,    // penalidade fixa quando existe qualquer atributo negativo
    nerfPer: 0.025,     // penalidade por ponto negativo
    nerfMax: 0.60,      // teto da parte progressiva
    nerfCap: 0.85,      // teto do redutor total
    camZoom: 1.28       // aproximação quando a câmera segue o campeão
  };

  // E-mail do dono. A verificação real também vive nas regras do Firestore
  // (firestore.rules) — aqui só controlamos o que a interface mostra.
  T.OWNER_EMAILS = ['sanunguer3@gmail.com'];
  T.isAdminEmail = email => T.OWNER_EMAILS.includes(String(email || '').trim().toLowerCase());

  // Sobrevivência: criaturas fracas aparecem por tempo, campeões fortes viram
  // "minibosses" e ficam mais comuns quanto mais tempo passa.
  T.SURVIVAL = {
    spawnStart: 3.0,     // primeiro reforço depois que a luta começa
    spawnMin: 0.7,       // intervalo mínimo entre spawns
    spawnRamp: 95,       // segundos para o intervalo encurtar bastante
    jitter: 0.35,        // variação aleatória do intervalo
    maxFoes: 16,         // teto de inimigos vivos ao mesmo tempo
    champFirst: 24,      // primeiro campeão forte garantido
    champEvery: 26,      // campeões fortes garantidos a partir daí
    champChanceMax: 0.30 // chance extra por spawn no fim da curva
  };

  // Arquétipos básicos da sobrevivência. Todos usam a mesma moeda de pontos
  // dos campeões normais, mas com nerfs leves para poderem cair rápido.
  T.SURV_MOBS = {
    zumbi: {
      n: 'Zumbi', t: 'terra', f: 'lutador', r: 'comum', tag: 'tank', p: 'teimosa',
      up: { hp: 5, atk: 0, spd: -2, dod: -2, crit: 0, obe: 5 }
    },
    demonio: {
      n: 'Demônio', t: 'trevas', f: 'maldoso', r: 'comum', tag: 'dps', p: 'sanguinária',
      up: { hp: 2, atk: 4, spd: 1, dod: -1, crit: 2, obe: 2 }
    },
    criatura: {
      n: 'Criatura', t: 'neutro', f: 'fera', r: 'comum', tag: 'dps', p: 'medrosa',
      up: { hp: 1, atk: 1, spd: 4, dod: -1, crit: 0, obe: 5 }
    }
  };

  // Variantes "shiny": cada campeão sorteado tem uma chance pequena de nascer
  // com um filtro de cor diferente. As chances são independentes e somam 8,1%.
  T.SHINY = {
    prata:   { p: 0.02,  n: 'Prata',    icon: '🥈', col: '#e5e7eb',
               filter: 'grayscale(1) brightness(1.35) contrast(1.05)' },
    dourado: { p: 0.01,  n: 'Dourado',  icon: '🥇', col: '#fbbf24',
               filter: 'sepia(1) saturate(3) hue-rotate(-12deg) brightness(1.07)' },
    rgb:     { p: 0.001, n: 'Colorido', icon: '🌈', col: '#f472b6', dynamic: true },
    cor:     { p: 0.05,  n: 'Aleatório', icon: '🎨', col: '#c084fc', dynamic: true }
  };

  // Sorteia a variante de um campeão. Se o jogador "tem" um shiny (c.shiny),
  // ele sempre aparece com aquela cor — o resto é roleta por unidade.
  T.rollShiny = c => {
    if (c && Object.hasOwn(T.SHINY, c.shiny)) {
      return { k: c.shiny, hue: Math.floor(Math.random() * 360) };
    }
    // Ordem do mais raro para o mais comum: o primeiro limiar que cair vale.
    const r = Math.random();
    let acc = 0;
    for (const k of ['rgb', 'dourado', 'prata', 'cor']) {
      acc += T.SHINY[k].p;
      if (r < acc) return { k, hue: Math.floor(Math.random() * 360) };
    }
    return null;
  };

  // Modos de jogo.
  T.MODES = {
    classico: '⚔️ Clássico',
    infinito: '♾️ Infinito',
    sobrevivencia: '🧟 Sobrevivência'
  };

  // Níveis de dificuldade da IA.
  T.AI_LEVELS = {
    facil: {
      n: 'Fácil', icon: '🌱', hp: 0.85, atk: 0.85, crit: -3, dodge: -2,
      cast: 1.35, orderChance: 0.15, noise: 34, smart: 0.35, reaction: 1.35
    },
    normal: {
      n: 'Normal', icon: '⚖️', hp: 1, atk: 1, crit: 0, dodge: 0,
      cast: 1, orderChance: 0.5, noise: 12, smart: 0.7, reaction: 1
    },
    dificil: {
      n: 'Difícil', icon: '🔥', hp: 1.08, atk: 1.08, crit: 4, dodge: 2,
      cast: 0.8, orderChance: 0.85, noise: 4, smart: 0.9, reaction: 0.72
    },
    brutal: {
      n: 'Brutal', icon: '💀', hp: 1.16, atk: 1.16, crit: 7, dodge: 4,
      cast: 0.65, orderChance: 1, noise: 0, smart: 1, reaction: 0.5
    }
  };

  // Arenas temáticas. Cada uma muda o piso, a parede e cria pequenas zonas
  // de perigo que combinam com o tema.
  T.ARENAS = [
    { id: 'terra', n: 'Terra Antiga', icon: '🪨', floor: '#7f8a79', floor2: '#4a5448', wall: '#a39b8b', accent: '#6ee7a0', hazard: 'none', hz: '—' },
    { id: 'fogo', n: 'Forja Ardente', icon: '🔥', floor: '#7a3a28', floor2: '#351711', wall: '#f97316', accent: '#fb923c', hazard: 'burn', hz: 'chamas' },
    { id: 'gelo', n: 'Geleira Eterna', icon: '❄️', floor: '#7c9fb5', floor2: '#334b5c', wall: '#bae6fd', accent: '#7dd3fc', hazard: 'slow', hz: 'lentidão' },
    { id: 'raio', n: 'Campo de Raios', icon: '⚡', floor: '#6b5b2a', floor2: '#2b2614', wall: '#facc15', accent: '#fde047', hazard: 'shock', hz: 'choque' },
    { id: 'vento', n: 'Pico dos Ventos', icon: '🌪️', floor: '#5f7f74', floor2: '#2e433d', wall: '#7dd3c0', accent: '#5eead4', hazard: 'gust', hz: 'rajadas' },
    { id: 'espinhos', n: 'Fosso de Espinhos', icon: '🌵', floor: '#6b5b45', floor2: '#30281f', wall: '#d6b26a', accent: '#a3e635', hazard: 'spike', hz: 'espinhos' }
  ];

  // Caixas de bônus que aparecem na arena.
  T.BOXES = {
    heal: { n: 'Cura', icon: '💚', col: '#86efac', desc: 'recupera 22% da vida' },
    shield: { n: 'Escudo', icon: '🛡️', col: '#38bdf8', desc: 'ganha escudo por 8s' },
    fury: { n: 'Fúria', icon: '😤', col: '#fb7185', desc: '+20% de dano por 8s' },
    bless: { n: 'Bênção', icon: '✨', col: '#c4b5fd', desc: '+30% de ataque e velocidade por 8s' },
    luck: { n: 'Sorte', icon: '🍀', col: '#fde047', desc: '+8% de crítico nesta luta' }
  };

  const skill = (n, cat, mode, ef, mult, cd, extra) => Object.assign({
    n, cat, mode, ef, mult, cd,
    rng: 150, pspd: 230, rad: 65,
    castSprite: '', // troca o boneco enquanto o golpe é preparado/desferido
    sprite: ''      // imagem do projétil ( habilidades 'proj' )
  }, extra || {});

  // Habilidade padrão de um slot (normal/média/ultimate), usada para migrar
  // campeões antigos e completar os três slots.
  T.mkSkill = (tier, c) => {
    const key = T.TIER[tier] ? tier : 'normal';
    const tag = (c && c.tag) || 'dps';
    const tierInfo = T.TIER[key];
    if (tag === 'suporte' || tag === 'curandeiro') {
      if (key === 'normal') return skill('Pulso', 'dano', 'contato', { area: 1 }, 1.3, 5, { rad: 70 });
      if (key === 'media') return skill('Bênção', 'outro', '', { heal: 1 }, 1.1, 9, { rad: 70 });
      return skill('Aurora', 'outro', '', { heal: 1, area: 1, shield: 1 }, 1.6, 16, { rad: 85 });
    }
    if (tag === 'tank' || tag === 'bruiser') {
      if (key === 'normal') return skill('Tapa', 'dano', 'contato', { push: 1 }, 1.3, 5, { rad: 65 });
      if (key === 'media') return skill('Muralha', 'buff', '', { shield: 1, power: 1 }, 1.0, 9, { rad: 70 });
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
    const R = T.SKILL_RANGE;
    s.mult = T.clamp(s.mult == null ? ti.mult : s.mult, R.multMin, R.multMax);
    s.cd = T.clamp(s.cd == null ? ti.cd : s.cd, R.cdMin, R.cdMax);
    s.rng = T.clamp(s.rng == null ? 150 : s.rng, R.rngMin, R.rngMax);
    s.pspd = T.clamp(s.pspd == null ? 230 : s.pspd, R.pspdMin, R.pspdMax);
    s.rad = T.clamp(s.rad == null ? 60 : s.rad, R.radMin, R.radMax);
    s.mode = Object.hasOwn(T.SMODE, s.mode) ? s.mode : '';
    s.cat = Object.hasOwn(T.SCAT, s.cat) ? s.cat : 'dano';
    // Buff/debuff não têm projétil nem alcance: funcionam no alvo escolhido.
    if (s.cat === 'buff' || s.cat === 'debuff') s.mode = '';
    s.alvo = Object.hasOwn(T.SALVO, s.alvo) ? s.alvo : T.inferAlvo(s);
    s.ef = s.ef && typeof s.ef === 'object' ? s.ef : {};
    Object.keys(s.ef).forEach(k => { if (!Object.hasOwn(T.EFN, k)) delete s.ef[k]; });
    const rawEfv = s.efv && typeof s.efv === 'object' ? s.efv : {};
    s.efv = {};
    Object.keys(T.EFN).forEach(k => {
      if (!s.ef[k]) return;
      const meta = T.EFMETA[k];
      const given = rawEfv[k];
      if (!given || typeof given !== 'object' ||
          (!Object.hasOwn(given, 'd') && !Object.hasOwn(given, 'p'))) return;
      const cfg = T.efCfg({ ef: s.ef, efv: rawEfv, mult: s.mult, cat: s.cat }, k);
      s.efv[k] = {
        d: meta.d == null ? 0 : T.clamp(cfg.d, 0, 60),
        p: meta.p == null ? 0 : T.clamp(cfg.p, meta.min, meta.max)
      };
    });
    // Sem configuração explícita, mantém o fallback dos campeões antigos.
    if (!Object.keys(s.efv).length) delete s.efv;
    s.castSprite = typeof s.castSprite === 'string' ? s.castSprite : '';
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

  // Banco de campeões: fica disponível para importar no editor, mas não entra
  // sozinho no elenco (os personagens iniciais não são mais carregados).
  T.BANK = T.DEFAULT_RO;

  // Migração de habilidades no formato antigo (sk: 'area' etc).
  T.KM = {
    area: { cat: 'dano', mode: 'contato', ef: { area: 1 }, rad: 65, mult: 1.8, rng: 150, pspd: 230, cd: 7 },
    heal: { cat: 'outro', mode: '', ef: { heal: 1 }, mult: 1, rng: 150, pspd: 230, rad: 60, cd: 9 },
    push: { cat: 'dano', mode: 'contato', ef: { push: 1 }, rad: 45, mult: 1.2, rng: 150, pspd: 230, cd: 6 },
    proj: { cat: 'dano', mode: 'proj', ef: {}, mult: 1.5, rng: 150, pspd: 230, rad: 60, cd: 6 }
  };

  T.lvlOf = c => T.clamp(Math.floor(T.num(c && c.lvl, 1)), 1, T.LVLMAX);

  T.xpNeed = lvl => {
    const n = T.clamp(Math.floor(T.num(lvl, 1)), 1, T.LVLMAX);
    return n >= T.LVLMAX ? 0 : 50 * n;
  };

  T.pointsFor = c => {
    const r = (c && c.r) || 'comum';
    const lvl = T.lvlOf(c);
    const bonus = T.LVLBONUS[r] || T.LVLBONUS.comum;
    let extra = 0;
    for (let i = 0; i < lvl - 1; i++) extra += bonus[i] || 0;
    return (T.LV[r] || T.LV.comum) + extra;
  };

  T.levelInfo = c => {
    const lvl = T.lvlOf(c);
    const need = T.xpNeed(lvl);
    return {
      lvl,
      xp: Math.max(0, Math.floor(T.num(c && c.xp, 0))),
      need,
      points: T.pointsFor(c),
      max: need === 0
    };
  };

  // Nível/XP existem como sistema, mas nenhum modo ainda concede XP.
  T.addXp = (c, amount) => {
    if (!c) return null;
    c.lvl = T.lvlOf(c);
    c.xp = Math.max(0, Math.floor(T.num(c.xp, 0)));
    c.xp += Math.max(0, Math.floor(T.num(amount, 0)));
    let levels = 0;
    while (c.lvl < T.LVLMAX && c.xp >= T.xpNeed(c.lvl)) {
      c.xp -= T.xpNeed(c.lvl);
      c.lvl++;
      levels++;
    }
    if (c.lvl >= T.LVLMAX) c.xp = 0;
    return Object.assign({ levels }, T.levelInfo(c));
  };

  T.free = c => T.pointsFor(c) - T.ST.reduce((sum, k) => sum + ((c && c.up[k]) || 0), 0);

  // Atributos negativos devolvem pontos, mas não são grátis: quanto mais pontos
  // negativos, maior o redutor global. Há uma parte fixa só por ter algum.
  T.negStats = c => {
    const up = (c && c.up) || {};
    return T.ST.filter(k => (up[k] || 0) < 0).map(k => ({ k, v: up[k] }));
  };

  T.nerf = c => {
    const list = T.negStats(c);
    const total = list.reduce((s, x) => s - x.v, 0);
    const fixed = total ? T.BAL.nerfFixed : 0;
    const per = Math.min(T.BAL.nerfMax, total * T.BAL.nerfPer);
    const pct = Math.min(T.BAL.nerfCap, fixed + per);
    const fmt = v => Math.round(v * 1000) / 10;
    const label = total
      ? `−${fmt(pct)}% (fixo ${fmt(fixed)}% + ${total}×${fmt(T.BAL.nerfPer)}%)`
      : '';
    return { list, total, fixed, per, pct, mult: 1 - pct, label };
  };

  T.stv = (c, k) => {
    const up = (c && c.up) || {};
    if (k === 'hp') return Math.max(50, T.BAL.hpBase + T.BAL.hpPer * (up.hp || 0));
    if (k === 'atk') return Math.max(2, T.BAL.atkBase + T.BAL.atkPer * (up.atk || 0));
    const base = k === 'obe' ? 50 : 1;
    return Math.max(0, Math.min(T.statCap(c), base + 5 * (up[k] || 0)));
  };

  // Distribuição usada quando um campeão é "gerado": mexe em 2 a 4 atributos
  // com a mesma moeda de pontos da rarity, mas permitindo valores negativos
  // (o atributo fica menor e os pontos volta para o orçamento).
  T.rollUp = c => {
    const budget = Math.max(0, T.pointsFor(c));
    const up = {};
    T.ST.forEach(k => { up[k] = 0; });
    const keys = T.ST.slice();
    for (let i = keys.length - 1; i > 0; i--) {
      const j = T.rnd(i + 1);
      const tmp = keys[i]; keys[i] = keys[j]; keys[j] = tmp;
    }
    const n = 2 + T.rnd(3);
    const chosen = keys.slice(0, n);
    // Uma redução "paga" os aumentos. Com orçamento zero (comum) isso é
    // obrigatório: o campeão sempre sai com pelo menos um ponto para baixo.
    const negs = budget === 0 ? 1 + T.rnd(Math.min(2, n - 1)) : T.rnd(2);
    for (let i = 0; i < negs; i++) up[chosen[i]] = -1 - T.rnd(2);
    // available já inclui os pontos devolvidos pelas reduções.
    let available = budget - T.ST.reduce((s, k) => s + up[k], 0);
    for (let i = negs; i < n; i++) {
      const k = chosen[i];
      if (available <= 0) {
        if (Math.random() < 0.45 && up[k] > T.UPMIN) { up[k] = -1; available++; }
        continue;
      }
      const take = 1 + T.rnd(Math.min(3, available));
      up[k] = take;
      available -= take;
    }
    // Rede de segurança: nunca devolver um campeão com dívida de pontos.
    for (let guard = 0; available < 0 && guard < 100; guard++) {
      const k = chosen[guard % chosen.length];
      if (up[k] <= T.UPMIN) continue;
      up[k]--;
      available++;
    }
    // Se tudo zerou, cria um par negativo/positivo (custo líquido zero).
    if (T.ST.every(k => !up[k])) {
      up[chosen[0]] = -1;
      up[chosen[1] || chosen[0]] = 1;
    }
    T.ST.forEach(k => { up[k] = T.clamp(up[k], T.UPMIN, T.UPMAX); });
    return up;
  };

  // Cálculos derivados usados pelo editor e pelo HUD. Mantém as fórmulas em
  // um só lugar para que os números mudem em tempo real.
  T.calc = c => {
    if (!c) return null;
    const pi = T.PI[c.p] || {};
    const nerf = T.nerf(c);
    const m = nerf.mult;
    const hp = T.stv(c, 'hp') * m;
    const atk = T.stv(c, 'atk') * m;
    const spd = T.stv(c, 'spd') * m;
    const cap = T.statCap(c);
    const dod = Math.min(cap, (T.stv(c, 'dod') + (pi.dod || 0)) * m);
    const crit = Math.min(cap, (T.stv(c, 'crit') + (pi.crit || 0)) * m);
    const obe = Math.min(95, Math.max(0, (T.stv(c, 'obe') + (pi.obe || 0)) * m));
    const dr = (pi.dr || 1);
    const hpEff = Math.round(hp / dr);
    const move = Math.round(T.BAL.moveBase + T.BAL.moveSpd * spd);
    const atkRate = (1 * (pi.atkSpeed || 1)).toFixed(2);
    const dmgBase = Math.round(atk * (pi.dmg || 1) * (pi.dmgLow ? (1 + pi.dmgLow) / 2 : 1));
    const skills = (c.sks || []).map(s => ({
      n: s.n,
      tier: s.tier,
      hit: Math.round(atk * (s.mult || 1)),
      dps: +((atk * (s.mult || 1)) / Math.max(1, s.cd || 1)).toFixed(1)
    }));
    return { hp, atk, spd, dod, crit, obe, hpEff, move, atkRate, dmgBase, skills, nerf, free: T.free(c) };
  };

  // A arena cresce com o número de campeões e fica dentro de limites seguros.
  T.arenaRadius = n => T.clamp(T.BAL.arenaBase + T.BAL.arenaPer * Math.max(2, n | 0), 240, T.BAL.arenaMax);

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
    if (u.critT > now) out.push('crit');
    if (u.hasteT > now) out.push('haste');
    if (u.moveT > now) out.push('move');
    if (u.dodgeT > now) out.push('dodge');
    if (u.stealT > now) out.push('drain');
    if (u.drT > now) out.push('guard');
    if (u.regenT > now) out.push('regen');
    return out;
  };
})(window.TBB = window.TBB || {});
