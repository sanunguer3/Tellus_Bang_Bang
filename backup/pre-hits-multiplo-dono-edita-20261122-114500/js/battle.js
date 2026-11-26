// Motor de batalha: preparo, modos, IA por dificuldade, dano, habilidades,
// empurrão, caixas de bônus, perigos de arena e loop.
(function (T) {
  'use strict';

  T.R0 = 300;
  T.raf = 0;

  // Força configurada pelo jogador. Unidades antigas não têm o campo: usa o
  // padrão do efeito para não quebrar campeões salvos antes do editor novo.
  const pow = (u, field, fallback) => {
    const v = u && u[field];
    return v == null || !Number.isFinite(+v) ? fallback : +v;
  };

  // ---------------------------------------------------------------------------
  // Registro e efeitos visuais
  // ---------------------------------------------------------------------------

  // Registro da batalha: habilidades usadas, ordens, quedas e avisos.
  T.logEvent = (txt, kind, team) => {
    const G = T.G;
    if (!G || !txt) return;
    if (!G.logs) G.logs = [];
    G.logs.push({
      t: G.T,
      txt: String(txt),
      kind: kind || 'info',
      team: team == null ? -1 : team
    });
    if (G.logs.length > 80) G.logs.shift();
    if (T.renderLog) T.renderLog();
  };

  T.fx = (x, y, txt, col, k, x2, y2) => {
    if (!T.G) return;
    if (!T.G.fx) T.G.fx = [];
    const kind = k || 't';
    const life = kind === 'ring' ? 0.4 : kind === 'r2' ? 0.55 : 0.62;
    // Limita os números flutuantes simultâneos para não poluir a arena.
    if (kind === 't' && T.G.fx.filter(f => f.k === 't').length >= 10) {
      const i = T.G.fx.findIndex(f => f.k === 't');
      if (i >= 0) T.G.fx.splice(i, 1);
    }
    T.G.fx.push({ x, y, txt, col, k: kind, x2, y2, l: life, max: life });
  };

  // Aviso curto acima do personagem (buff, debuff, ataque, cura...).
  const CALL_COL = {
    buff: '#7dd3fc', debuff: '#c084fc', atk: '#fda4af', heal: '#86efac',
    crit: '#fde047', box: '#fbbf24', push: '#a5f3fc', cast: '#fcd34d',
    info: '#e5e7eb', enemy: '#fca5a5'
  };

  T.callout = (u, txt, kind) => {
    const G = T.G;
    if (!G || !u || !txt) return;
    if (!G.fx) G.fx = [];
    const text = String(txt);
    const col = CALL_COL[kind] || CALL_COL.info;
    // No máximo 2 avisos por unidade: o novo entra embaixo e o anterior sobe.
    // Se o texto é o mesmo, apenas renova o tempo (sem pilha de repetidos).
    let kept = null;
    for (let i = G.fx.length - 1; i >= 0; i--) {
      const f = G.fx[i];
      if (f.k !== 'call' || f.ref !== u) continue;
      if (f.txt === text) {
        f.l = f.max;
        f.col = col;
        return;
      }
      if (kept) { G.fx.splice(i, 1); continue; }
      kept = f;
      f.off = 1;
    }
    G.fx.push({
      k: 'call',
      ref: u,
      txt: text,
      col,
      l: 0.95,
      max: 0.95,
      off: 0
    });
  };

  T.banner = (txt, kind) => {
    if (!T.G) return;
    T.G.banner = { txt: String(txt), kind: kind || 'info', t: 2.6, max: 2.6 };
  };

  // ---------------------------------------------------------------------------
  // Dano, golpes e projéteis
  // ---------------------------------------------------------------------------

  function onDeath(b) {
    const G = T.G;
    if (!G) return;
    T.fx(b.x, b.y - 22, '☠️', '#fca5a5');
    if (G.mode === 'sobrevivencia' && b.team !== 0) {
      G.kills = (G.kills || 0) + 1;
      // Reposição rápida quando um inimigo cai, sem parar o spawn por tempo.
      const quick = Math.max(0.45, T.survivalInterval(G.T) * 0.45);
      G.spawnQ.push(G.T + quick * (0.8 + Math.random() * 0.5));
    }
  }

  // Aplica dano direto (golpes, status e colapso), respeitando escudo e morte.
  T.damage = (b, amount, cause) => {
    const G = T.G;
    if (!G || !b || !b.alive || amount <= 0) return 0;
    let left = amount;
    if (b.shield > 0) {
      const absorbed = Math.min(b.shield, left);
      b.shield -= absorbed;
      left -= absorbed;
      if (absorbed > 0.5) T.fx(b.x, b.y - 20, '🛡 ' + Math.round(absorbed), '#38bdf8');
    }
    b.hp -= left;
    b.fl = G.T + 0.12;
    if (b.hp <= 0) {
      b.hp = 0;
      b.alive = false;
      b.o = null;
      b.wind = null;
      b.shield = 0;
      T.logEvent('💀 ' + b.c.n + ' ' + (cause || 'foi nocauteado'), 'ko', b.team);
      onDeath(b);
    }
    return left;
  };

  T.hit = (a, b, mult) => {
    const G = T.G;
    if (!G || !a || !b || !b.alive) return null;
    const pa = T.PI[a.c.p] || {};
    const pb = T.PI[b.c.p] || {};

    const dodgeChance = b.dod + (b.dodgeT > G.T ? pow(b, 'dodgePow', T.EFX.dodge.amount) : 0);
    if (Math.random() * 100 < dodgeChance) {
      T.fx(b.x, b.y - 18, 'esquiva', '#93c5fd');
      T.callout(b, '💨 esquivou', 'buff');
      return { dmg: 0, dodged: true };
    }

    let m = (mult || 1) * Math.pow(1.25, T.rel(a.c, b.c)) * Math.pow(0.75, T.rel(b.c, a.c));
    if (a.buffT > G.T) m *= 1 + pow(a, 'buffPow', 0.30);
    if (pa.dmg) m *= pa.dmg;
    if (pa.dmgLow) m *= 1 + (pa.dmgLow - 1) * (1 - a.hp / a.hpM);
    if (pa.bonusVsHurt && b.hp / b.hpM < 0.5) m *= pa.bonusVsHurt;
    if (pa.vengeful && a.lastHit === b) m *= 1.2;
    const rage = pow(a, 'ragePow', 0.20);
    if (a.rageT > G.T) m *= 1 + rage;
    if (pb.dr) m *= pb.dr;
    if (b.drT > G.T) m *= Math.max(0, 1 - pow(b, 'drPow', 0.28));
    if (b.rageT > G.T) m *= Math.max(0, 1 - rage / 2);
    if (b.curseT > G.T) m *= 1 + pow(b, 'cursePow', 0.25);

    // Protetora: aliados próximos dividem a proteção.
    const guard = G.us.find(x => x.alive && x !== b && x.team === b.team &&
      (T.PI[x.c.p] || {}).allyDr && T.dist(x, b) < 90);
    if (guard) m *= (T.PI[guard.c.p] || {}).allyDr || 0.9;

    const critBonus = a.o ? (a.o.k === 'atk' ? 15 : a.o.k === 'fin' ? 30 : 0) : 0;
    const critChance = a.crit + critBonus + (a.critT > G.T ? pow(a, 'critPow', T.EFX.crit.amount) : 0);
    const crit = Math.random() * 100 < critChance;
    if (crit) m *= 1.5;
    if (b.o && b.o.k === 'def') m *= 0.7;
    m = Math.min(m, T.BAL.damageCap);

    const dmg = a.atk * m;
    T.fx(b.x, b.y - 18, Math.round(dmg) + (crit ? '!' : ''), crit ? '#fde047' : '#fff');
    T.damage(b, dmg, 'foi nocauteado');
    b.lastHit = a;

    if (crit) {
      T.callout(a, '💥 crítico ' + Math.round(dmg), 'crit');
      // Todo crítico deixa uma caixinha de bônus perto de quem criticou.
      T.spawnBox(a.x + (Math.random() * 44 - 22), a.y + (Math.random() * 44 - 22));
    }

    // Sanguinária e o efeito Roubar vida recuperam parte do dano causado.
    const steal = (pa.lifesteal || 0) + (a.stealT > G.T ? pow(a, 'stealPow', T.EFX.drain.pct) : 0);
    if (steal && dmg > 0 && a.alive) {
      const heal = dmg * steal;
      a.hp = Math.min(a.hpM, a.hp + heal);
      T.callout(a, '🩸 +' + Math.round(heal), 'heal');
    }

    // Masoquista: apanhar deixa a unidade furiosa.
    if (pb.rage && b.alive) {
      b.rageT = G.T + 4;
      T.callout(b, '😤 fúria', 'buff');
    }
    return { dmg, crit };
  };

  T.shoot = (a, target, mult, speed, sprite, skill, rng) => {
    const G = T.G;
    if (!G || !a || !target) return;
    const d = T.dist(a, target);
    const v = Math.max(60, speed || 230);
    G.pr.push({
      x: a.x,
      y: a.y,
      vx: (target.x - a.x) / d,
      vy: (target.y - a.y) / d,
      v,
      m: mult,
      a,
      s: skill || null,
      sp: sprite || '',
      l: (rng || 300) / v,
      col: T.TY[a.c.t]
    });
  };

  // Empurrão de verdade: adiciona velocidade e trava o movimento por um instante.
  function pushAway(from, to, mult) {
    const G = T.G;
    if (!G || !to || !to.alive) return;
    let dx = to.x - from.x;
    let dy = to.y - from.y;
    let d = Math.hypot(dx, dy);
    if (d < 1) {
      const a = Math.random() * Math.PI * 2;
      dx = Math.cos(a);
      dy = Math.sin(a);
      d = 1;
    }
    const force = T.BAL.pushBase * Math.max(0.5, mult || 1);
    to.kx += dx / d * force;
    to.ky += dy / d * force;
    to.pushT = Math.max(to.pushT || 0, G.T + 0.34);
    T.callout(to, '🌬️ empurrão', 'push');
  }

  // ---------------------------------------------------------------------------
  // Status e habilidades
  // ---------------------------------------------------------------------------

  function controlDur(u, dur) {
    const pi = T.PI[u.c.p] || {};
    return dur * (1 - (pi.controlResist || 0));
  }

  // Aplica status ofensivos. Duração e força vêm da configuração do efeito;
  // campeões antigos sem `efv` continuam escalando pelo multiplicador.
  function applyStatus(u, e, s) {
    const G = T.G;
    if (!G || !e.alive) return;
    const ef = s.ef || {};
    const atk = u.atk || 10;
    const keys = [];
    if (ef.burn) {
      const c = T.efCfg(s, 'burn');
      e.burnT = Math.max(e.burnT, G.T + c.d);
      e.burnD = Math.max(e.burnD, atk * c.p / 100);
      keys.push('burn');
    }
    if (ef.poison) {
      const c = T.efCfg(s, 'poison');
      e.poisonT = Math.max(e.poisonT, G.T + c.d);
      e.poisonD = Math.max(e.poisonD, atk * c.p / 100);
      keys.push('poison');
    }
    if (ef.bleed) {
      const c = T.efCfg(s, 'bleed');
      e.bleedT = Math.max(e.bleedT, G.T + c.d);
      e.bleedD = Math.max(e.bleedD, atk * c.p / 100);
      keys.push('bleed');
    }
    if (ef.curse) {
      const c = T.efCfg(s, 'curse');
      e.curseT = Math.max(e.curseT, G.T + c.d);
      e.cursePow = c.p / 100;
      keys.push('curse');
    }
    if (ef.paralyze) {
      const c = T.efCfg(s, 'paralyze');
      e.paraT = Math.max(e.paraT, G.T + controlDur(e, c.d));
      keys.push('para');
    }
    if (ef.slow) {
      const c = T.efCfg(s, 'slow');
      e.slowT = Math.max(e.slowT, G.T + controlDur(e, c.d));
      e.slowPow = c.p / 100;
      keys.push('slow');
    }
    if (!keys.length) return;
    T.callout(e, keys.map(k => T.STAT[k][0]).join(''), 'debuff');
    T.logEvent(
      keys.map(k => T.STAT[k][0]).join('') + ' ' + e.c.n + ': ' +
      keys.map(k => T.STAT[k][1].toLowerCase()).join(', '),
      'debuff',
      e.team
    );
  }

  // Buffs positivos no alvo escolhido. Cada efeito usa sua própria duração e
  // força; `power` é o antigo buff implícito do tipo Buff, agora explícito.
  function applyBoost(u, s, chosen) {
    const G = T.G;
    if (!G) return;
    const ef = s.ef || {};
    const targets = (chosen == null ? [u] : chosen).filter(a => a && a.alive);
    if (!targets.length) return;
    const keys = [];
    const arm = (key, field, powField, c, fraction) => {
      targets.forEach(a => {
        a[field] = Math.max(a[field] || 0, G.T + c.d);
        if (powField) a[powField] = fraction ? c.p / 100 : c.p;
      });
      keys.push(key);
    };

    if (ef.power) arm('power', 'buffT', 'buffPow', T.efCfg(s, 'power'), true);
    else if (s.cat === 'buff' && !s.efv) {
      // Só campeões salvos antes do seletor de efeitos tinham buff implícito.
      arm('power', 'buffT', 'buffPow', T.efCfg({ ef: { power: 1 }, mult: s.mult }, 'power'), true);
    }
    if (ef.crit) arm('crit', 'critT', 'critPow', T.efCfg(s, 'crit'), false);
    if (ef.haste) arm('haste', 'hasteT', 'hastePow', T.efCfg(s, 'haste'), true);
    if (ef.move) arm('move', 'moveT', 'movePow', T.efCfg(s, 'move'), true);
    if (ef.dodge) arm('dodge', 'dodgeT', 'dodgePow', T.efCfg(s, 'dodge'), false);
    if (ef.drain) arm('drain', 'stealT', 'stealPow', T.efCfg(s, 'drain'), true);
    if (ef.rage) arm('rage', 'rageT', 'ragePow', T.efCfg(s, 'rage'), true);
    if (ef.guard) arm('guard', 'drT', 'drPow', T.efCfg(s, 'guard'), true);
    if (ef.regen) {
      const c = T.efCfg(s, 'regen');
      targets.forEach(a => {
        a.regenT = Math.max(a.regenT || 0, G.T + c.d);
        a.regenD = Math.max(a.regenD || 0, a.hpM * c.p / 100);
      });
      keys.push('regen');
    }
    if (ef.cleanse) {
      targets.forEach(a => {
        ['burnT', 'poisonT', 'bleedT', 'curseT', 'paraT', 'slowT',
          'burnD', 'poisonD', 'bleedD'].forEach(k => { a[k] = 0; });
      });
      keys.push('cleanse');
    }
    if (!keys.length) return;
    targets.forEach(a => T.callout(a, keys.map(k => T.STAT[k][0]).join(''), 'buff'));
    T.logEvent(
      keys.map(k => T.STAT[k][0]).join('') + ' ' + u.c.n + ': ' +
      keys.map(k => T.STAT[k][1].toLowerCase()).join(', '),
      'buff',
      u.team
    );
  }

  // Efeitos de uma habilidade. Buff/debuff caem direto no alvo escolhido e não
  // usam projétil nem alcance. Dano e status ofensivos só funcionam no acerto.
  T.apply = (u, s, primary) => {
    const G = T.G;
    if (!G) return;
    const ef = s.ef || {};
    const alvo = Object.hasOwn(T.SALVO, s.alvo) ? s.alvo : T.inferAlvo(s);
    const direct = s.cat === 'buff' || s.cat === 'debuff';
    const allies = G.us.filter(x => x.alive && x.team === u.team);
    const enemies = G.us.filter(x => x.alive && x.team !== u.team);
    const nearest = list => list.length
      ? list.reduce((a, b) => (T.dist(u, a) < T.dist(u, b) ? a : b)) : null;
    const lowAlly = allies.length
      ? allies.reduce((a, b) => (a.hp / a.hpM < b.hp / b.hpM ? a : b)) : u;
    let targets = [];

    if (direct) {
      if (alvo === 'enemy') {
        const picked = primary && primary.alive && primary.team !== u.team ? primary : nearest(enemies);
        targets = picked ? [picked] : [];
        if (ef.area && targets.length) {
          const center = targets[0];
          targets = enemies.filter(e => T.dist(e, center) < s.rad);
        }
        targets.forEach(e => {
          applyStatus(u, e, s);
          if (ef.push) pushAway(u, e, T.efCfg(s, 'push').p);
        });
      } else if (alvo === 'ally') {
        targets = ef.area ? allies.filter(a => T.dist(u, a) < s.rad) : [lowAlly];
      } else {
        targets = [u];
      }
    } else {
      if (s.mode === 'proj') {
        targets = primary && primary.alive ? [primary] : [];
      } else if (s.mode === 'contato') {
        targets = enemies.filter(e => T.dist(u, e) < s.rad);
      } else {
        const picked = primary && primary.alive ? primary : nearest(enemies);
        targets = picked ? [picked] : [];
      }
      if (ef.area && targets.length) {
        const center = targets[0];
        targets = enemies.filter(e => T.dist(e, center) < s.rad);
      }
      targets.forEach(e => {
        if (s.cat === 'dano') T.hit(u, e, s.mult);
        applyStatus(u, e, s);
        if (ef.push) pushAway(u, e, T.efCfg(s, 'push').p);
      });
    }

    const icon = ef.heal ? '💚'
      : s.cat === 'buff' ? '✨'
      : s.cat === 'debuff' ? '💜'
      : ef.push ? '🌬️'
      : (T.SCAT[s.cat] || '✨').split(' ')[0];
    const tierMark = s.tier === 'ultimate' ? '★ ' : '';
    const who = targets.length > 1 ? targets.length + (alvo === 'enemy' ? ' inimigos' : ' aliados')
      : (targets[0] ? targets[0].c.n : '');
    T.logEvent(
      icon + ' ' + u.c.n + ' usou ' + tierMark + s.n + (who ? ' em ' + who : ''),
      'skill',
      u.team
    );

    const support = (direct && alvo !== 'enemy') ? targets
      : (ef.area ? allies.filter(a => T.dist(u, a) < s.rad) : [lowAlly]);

    if (ef.heal && support.length) {
      const c = T.efCfg(s, 'heal');
      support.forEach(a => {
        let amount = a.hpM * c.p / 100;
        const pa = T.PI[a.c.p] || {};
        if (pa.healBonus) amount *= pa.healBonus;
        if (a.curseT > G.T) amount *= 0.5;
        const before = a.hp;
        a.hp = Math.min(a.hpM, a.hp + amount);
        const gained = Math.round(a.hp - before);
        T.fx(a.x, a.y - 16, '+cura', '#86efac');
        if (gained > 0) {
          T.callout(a, '💚 +' + gained, 'heal');
          T.logEvent('💚 ' + u.c.n + ' curou ' + a.c.n + ' (+' + gained + ')', 'heal', u.team);
        }
      });
    }

    if (ef.shield && support.length) {
      const c = T.efCfg(s, 'shield');
      support.forEach(a => {
        const amount = a.hpM * c.p / 100;
        a.shield = Math.max(a.shield || 0, amount);
        a.shieldT = G.T + c.d;
        T.callout(a, '🛡 ' + Math.round(amount), 'buff');
        T.logEvent('🛡 ' + a.c.n + ' ganhou escudo (' + Math.round(amount) + ')', 'buff', a.team);
      });
    }

    // Efeitos positivos marcados no editor (inclusive em habilidades "Outro").
    applyBoost(u, s, direct && alvo === 'enemy' ? [] : support);

    const ox = targets[0] ? targets[0].x : u.x;
    const oy = targets[0] ? targets[0].y : u.y;
    if (s.mode === 'contato' || ef.area) T.fx(ox, oy, '', T.CC[s.cat], 'r2', s.rad);
    else T.fx(ox, oy, '', T.CC[s.cat], 'ring');
    // A sprite `sprite` é exclusiva do projétil (T.shoot). Não desenhar imagem
    // genérica no alvo: isso fazia a mesma arte aparecer em lugares diferentes.
  };

  function skillScore(u, s, target, G) {
    const ef = s.ef || {};
    const team = G.us.filter(x => x.alive && x.team === u.team);
    const low = team.length
      ? team.reduce((a, b) => (a.hp / a.hpM < b.hp / b.hpM ? a : b))
      : u;
    if (ef.heal && low && low.hp < low.hpM * 0.65) {
      return 120 + (1 - low.hp / low.hpM) * 60;
    }
    const boosts = BOOST_EF.filter(k => ef[k]);
    // Buffos em golpes ofensivos são bônus, não mudam a prioridade da IA.
    const boostPrimary = s.cat === 'buff' || (s.cat === 'outro' && boosts.length);
    if (boostPrimary) {
      const allActive = boosts.length
        ? boosts.every(k => k === 'cleanse' ? false : u[BOOST_FIELD[k]] > G.T)
        : u.buffT > G.T;
      if (allActive) return -1;
      const enemyNear = G.us.some(e => e.alive && e.team !== u.team && T.dist(u, e) < 240);
      return enemyNear ? 55 : (u.hp < u.hpM * 0.6 ? 45 : -1);
    }
    // Debuff funciona no inimigo atual sem exigir alcance ou projétil.
    if (s.cat === 'debuff') {
      if (!target) return -1;
      const status = ['burn', 'poison', 'bleed', 'curse', 'paralyze', 'slow']
        .filter(k => ef[k]);
      const missing = status.filter(k => ({
        burn: target.burnT, poison: target.poisonT, bleed: target.bleedT,
        curse: target.curseT, paralyze: target.paraT, slow: target.slowT
      })[k] <= G.T).length;
      return 44 + s.mult * 6 + missing * 6;
    }
    const offensive = s.cat === 'dano' || !!ef.push;
    if (!offensive || !target) return -1;

    if (s.mode === 'contato') {
      const inRange = G.us.filter(e => e.alive && e.team !== u.team && T.dist(u, e) < s.rad);
      if (!inRange.length) return -1;
      let score = 20 + s.mult * 10 + inRange.length * 14;
      if (s.tier === 'ultimate') score += 12 + inRange.length * 6;
      if (ef.paralyze || ef.curse) score += 8;
      return score;
    }

    if (T.dist(u, target) > s.rng) return -1;
    let score = 18 + s.mult * 10 + T.rel(u.c, target.c) * 6;
    if (s.tier === 'ultimate') score += target.hp / target.hpM > 0.5 ? 16 : 5;
    if (s.tier === 'media') score += 4;
    if (ef.burn && target.burnT > G.T) score -= 6;
    if (ef.poison && target.poisonT > G.T) score -= 6;
    if (ef.bleed && target.bleedT > G.T) score -= 5;
    if (ef.curse && target.curseT > G.T) score -= 5;
    if (ef.paralyze && target.paraT > G.T) score -= 12;
    if (target.hp / target.hpM < 0.25 && s.mult > 2.6) score -= 10;
    return score;
  }

  // Pequena pausa (windup) antes da habilidade acontecer.
  function startWind(u, s, target) {
    const G = T.G;
    if (!G) return;
    const base = T.BAL.skillWindup;
    const t = base * (s.tier === 'ultimate' ? 1.35 : s.tier === 'media' ? 1.12 : 1);
    u.wind = {
      s,
      tgt: target && target.alive ? target : null,
      t,
      max: t
    };
    s.t = s.cd;
    // Sprite do golpe: troca o boneco durante a preparação e um pouco depois
    // do disparo, para o "fenômeno" durar o tempo de ver a habilidade.
    if (s.castSprite) {
      u.castImg = s.castSprite;
      u.castT = G.T + t + 0.3;
    }
    // Depois de preparar o golpe, dá um passo na direção do alvo se ele estiver
    // longe: o movimento acontece com o ataque, não antes dele.
    const direct = s.cat === 'buff' || s.cat === 'debuff';
    if (!direct && target && T.dist(u, target) > (s.rng || 150) * 0.75) {
      u.approachT = G.T + 1.1;
    }
    T.callout(u, (T.TIER[s.tier] || T.TIER.normal).icon + ' ' + s.n, 'cast');
    T.logEvent('✨ ' + u.c.n + ' prepara ' + s.n, 'skill', u.team);
  }

  function nearestEnemyOf(u) {
    const G = T.G;
    if (!G) return null;
    const list = G.us.filter(e => e.alive && e.team !== u.team);
    if (!list.length) return null;
    return list.reduce((a, b) => (T.dist(u, a) < T.dist(u, b) ? a : b));
  }

  function fireWind(u) {
    const G = T.G;
    const w = u.wind;
    if (!G || !w) return;
    u.wind = null;
    const s = w.s;
    let target = w.tgt && w.tgt.alive ? w.tgt : nearestEnemyOf(u);
    const direct = s.cat === 'buff' || s.cat === 'debuff';
    if (!direct && s.mode === 'proj' && target) {
      T.shoot(u, target, s.mult, s.pspd, s.sprite, s, s.rng);
    } else {
      T.apply(u, s, target);
    }
  }

  function useSkill(u, enemies, allies, target) {
    const G = T.G;
    if (!G || u.wind) return;
    const ai = u.team !== 0 ? (T.AI_LEVELS[G.aiLevel] || T.AI_LEVELS.normal) : null;
    const ready = u.ss.filter(s => s.t <= 0);
    if (!ready.length) return;
    let best = null;
    let bestScore = 0;
    ready.forEach(s => {
      const score = skillScore(u, s, target, G);
      if (score > bestScore) { best = s; bestScore = score; }
    });
    if (!best) return;
    // IA menos afiada pode escolher uma habilidade apenas razoável.
    if (ai && Math.random() > ai.smart) {
      const options = ready.filter(s => s !== best && skillScore(u, s, target, G) > 0);
      if (options.length) best = T.choose(options);
    }
    startWind(u, best, target);
  }

  // ---------------------------------------------------------------------------
  // IA: alvos, ordens e movimento
  // ---------------------------------------------------------------------------

  function expireOrder(u) {
    if (!u.o || u.o.t > T.G.T) return;
    u.o = null;
  }

  function lowestAlly(allies) {
    return allies.reduce((a, b) => (a.hp / a.hpM < b.hp / b.hpM ? a : b), allies[0]);
  }

  // Escolhe o melhor alvo: vantagem de tipo/função, vida baixa, distância,
  // ameaça e personalidade. A dificuldade adiciona ruído à decisão.
  function pickTarget(u, enemies, allies) {
    const G = T.G;
    const pi = T.PI[u.c.p] || {};
    const ai = u.team !== 0 ? (T.AI_LEVELS[G.aiLevel] || T.AI_LEVELS.normal) : null;
    const protectedAlly = pi.aggro === 'protect' && allies.length ? lowestAlly(allies) : null;
    const noise = ai ? ai.noise : 6;
    let best = enemies[0];
    let bestScore = -1e9;
    enemies.forEach(e => {
      const hpF = e.hp / e.hpM;
      let score = T.rel(u.c, e.c) * 26 - T.rel(e.c, u.c) * 20;
      score += (1 - hpF) * (pi.aggro === 'weak' ? 60 : 34);
      score += e.tag === 'suporte' ? 10 : 0;
      score += e.tag === 'dps' ? 4 : 0;
      score -= T.dist(u, e) * 0.10;
      if (e.o && e.o.tgt === u) score += 8;
      if (protectedAlly) score += Math.max(0, 90 - T.dist(e, protectedAlly)) * 0.10;
      if (u.ranged && e.ranged) score += 4;
      if (pi.smart && e.hp <= u.atk * 2) score += 14;
      if (pi.vengeful && u.lastHit === e) score += 30;
      if (ai && ai.smart > 0.7 && e.hp <= u.atk * 1.6) score += 10;
      score += (Math.random() - 0.5) * noise;
      if (score > bestScore) { bestScore = score; best = e; }
    });
    return best;
  }

  // A IA dos times adversários usa ordens táticas conforme a dificuldade.
  function aiCommand(u, enemies, allies, target) {
    const G = T.G;
    if (u.team === 0 || !G) return;
    const ai = T.AI_LEVELS[G.aiLevel] || T.AI_LEVELS.normal;
    const pi = T.PI[u.c.p] || {};
    if (u.o || u.paraT > G.T || G.T < (u.cmdT || 0) || G.T < (u.thinkT || 0)) return;
    u.thinkT = G.T + ai.reaction * (0.75 + Math.random() * 0.5);
    if (Math.random() > ai.orderChance) return;

    const hpF = u.hp / u.hpM;
    const near = enemies.filter(e => T.dist(u, e) < 70);
    const tgtAlive = !!(target && target.alive);
    let pick = null;

    if (hpF < (pi.flee || 0) && !(pi.rage && u.rageT > G.T)) {
      pick = { k: 'ret' };
    } else if (pi.keepAway && hpF < 0.35) {
      pick = { k: 'def' };
    } else if (tgtAlive && target.hp / target.hpM < 0.28 && T.dist(u, target) < (u.ranged ? 230 : 130)) {
      pick = { k: 'fin', tgt: target };
    } else if (u.tag === 'tank' && near.length >= 2 && hpF < 0.7) {
      pick = { k: 'def' };
    } else if (hpF < 0.4 && !pi.rage && u.tag !== 'dps') {
      pick = { k: 'def' };
    } else if (tgtAlive && T.rel(u.c, target.c) > 0 && T.dist(u, target) < (u.ranged ? 220 : 110)) {
      pick = { k: 'foc', tgt: target };
    }

    if (!pick) return;
    const duration = { def: 5, ret: 3.5, fin: 3, foc: 8 }[pick.k] || 4;
    u.o = { k: pick.k, tgt: pick.tgt || null, t: G.T + duration };
    u.cmdT = G.T + 6;
    T.callout(u, T.ORD[pick.k] || pick.k, 'cast');
    T.logEvent('🤖 ' + u.c.n + ': ' + (T.ORD[pick.k] || pick.k).split(' ').slice(1).join(' '), 'order', u.team);
  }

  function awayFrom(u, foe, strength) {
    const d = T.dist(u, foe);
    return { x: (u.x - foe.x) / d * strength, y: (u.y - foe.y) / d * strength };
  }

  // Caixa de bônus mais próxima que vale a pena buscar.
  function boxTarget(u) {
    const G = T.G;
    if (!G || !G.boxes || !G.boxes.length) return null;
    const pi = T.PI[u.c.p] || {};
    const reach = pi.greed ? 280 : 78;
    let best = null;
    let bestD = reach;
    G.boxes.forEach(b => {
      const d = T.dist(u, b);
      if (d < bestD) { bestD = d; best = b; }
    });
    return best;
  }

  // Movimento de combate estilo Digimon: o campeão vagueia em direções curtas
  // e aleatórias, em vez de perseguir o alvo em linha reta. De tempos em tempos
  // ele resolve se aproximar — bem mais frequentemente com ataque pronto —
  // e o faz de leve torto, como se estivesse se reposicionando para atacar.
  function wanderStep(u, G, target) {
    const d = target ? T.dist(u, target) : Infinity;
    const wish = u.wish && u.wish.t > G.T ? u.wish : null;
    if (!(u.wanderT > G.T)) {
      u.wanderT = G.T + 0.45 + Math.random() * 0.65;
      let wx;
      let wy;
      // O ponto tocado pelo jogador só existe no líder selecionado. Ele não
      // vira perseguição: apenas inclina o passeio aleatório naquela direção.
      if (wish && Math.random() < 0.7) {
        const wa = Math.atan2(wish.y - u.y, wish.x - u.x) + (Math.random() - 0.5) * 1.1;
        wx = Math.cos(wa);
        wy = Math.sin(wa);
      } else {
        const a = Math.random() * Math.PI * 2;
        wx = Math.cos(a);
        wy = Math.sin(a);
      }
      // Se o passeio apontar para fora, puxa um pouco em direção ao centro.
      const r = Math.hypot(u.x, u.y) || 1;
      if (r > G.R * 0.7) {
        wx = wx * 0.4 - u.x / r * 0.9;
        wy = wy * 0.4 - u.y / r * 0.9;
      }
      const l = Math.hypot(wx, wy) || 1;
      u.wx = wx / l;
      u.wy = wy / l;
      u.aimOff = (Math.random() - 0.5) * 0.8;

      let chance = 0.14;
      if (u.at <= 0) chance += 0.36;
      if (u.ss && u.ss.some(s => s.t <= 0)) chance += 0.14;
      if (d < 180) chance += 0.22;
      u.approachT = target && Math.random() < chance
        ? G.T + 0.5 + Math.random() * 0.65
        : 0;
    }

    let out;
    if (u.approachT > G.T && target) {
      const dd = d || 1;
      const ax = (target.x - u.x) / dd;
      const ay = (target.y - u.y) / dd;
      const c = Math.cos(u.aimOff || 0);
      const s = Math.sin(u.aimOff || 0);
      out = {
        x: (ax * c - ay * s) * 0.85 + u.wx * 0.15,
        y: (ax * s + ay * c) * 0.85 + u.wy * 0.15
      };
    } else {
      out = { x: u.wx, y: u.wy };
    }
    if (wish) {
      const dx = wish.x - u.x;
      const dy = wish.y - u.y;
      const dl = Math.hypot(dx, dy) || 1;
      out = {
        x: out.x * 0.45 + dx / dl * 0.55,
        y: out.y * 0.45 + dy / dl * 0.55
      };
      const l = Math.hypot(out.x, out.y) || 1;
      out.x /= l;
      out.y /= l;
    }
    return out;
  }

  function ai(u, dt, enemies, allies) {
    const G = T.G;
    if (!G) return;
    expireOrder(u);
    if (!enemies.length) return;

    const pi = T.PI[u.c.p] || {};
    let mode = u.o ? u.o.k : '';
    if (!mode && pi.flee && u.hp < u.hpM * pi.flee) mode = 'ret';

    // Durante o windup ou um empurrão a unidade fica parada.
    if (u.wind || (u.pushT || 0) > G.T) return;

    const slow = u.slowT > G.T;
    const paralyzed = u.paraT > G.T;
    if (paralyzed) return;

    const target0 = pickTarget(u, enemies, allies);
    aiCommand(u, enemies, allies, target0);
    mode = u.o ? u.o.k : '';

    const near = enemies.reduce((a, b) => (T.dist(u, a) < T.dist(u, b) ? a : b));
    const rng = u.ranged ? 95 : 26;
    let dx = 0;
    let dy = 0;
    let boost = 1;
    let target = target0;
    let canAttack = true;
    const box = (!mode || pi.greed) ? boxTarget(u) : null;

    if (mode === 'def') {
      u.hp = Math.min(u.hpM, u.hp + u.hpM * 0.05 * dt);
      if (Math.floor(G.T) !== Math.floor(G.T - dt)) {
        T.fx(u.x, u.y - 16, '+' + Math.round(u.hpM * 0.05), '#86efac');
      }
    } else if (mode === 'ret') {
      let best = null;
      let bestDist = -1;
      const radius = Math.max(20, G.R - 15);
      for (let i = 0; i < 24; i++) {
        const a = i * 0.2618;
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius;
        const d = Math.min(...enemies.map(e => Math.hypot(e.x - px, e.y - py)));
        if (d > bestDist) { bestDist = d; best = { x: px, y: py }; }
      }
      if (best) {
        const d = Math.hypot(best.x - u.x, best.y - u.y) || 1;
        if (d > 6) { dx = (best.x - u.x) / d; dy = (best.y - u.y) / d; }
      }
      boost = 1.25;
      canAttack = false;
    } else if (box) {
      const d = T.dist(u, box) || 1;
      dx = (box.x - u.x) / d;
      dy = (box.y - u.y) / d;
      boost = pi.greed ? 1.3 : 1.1;
    } else {
      if (mode === 'fin') {
        target = u.o && u.o.tgt && u.o.tgt.alive
          ? u.o.tgt
          : enemies.reduce((a, b) => (a.hp < b.hp ? a : b));
        boost = 1.35;
      } else if (mode === 'atk') {
        target = u.o && u.o.tgt && u.o.tgt.alive ? u.o.tgt : near;
        boost = 1.12;
      } else if (mode === 'foc' && u.o && u.o.tgt && u.o.tgt.alive) {
        target = u.o.tgt;
      }

      const low = allies
        .filter(a => a.alive && a.hp < a.hpM * 0.6)
        .sort((a, b) => a.hp / a.hpM - b.hp / b.hpM)[0];

      if (!mode && u.tag === 'suporte' && low) {
        const d = T.dist(u, low);
        if (d > 80) { dx = (low.x - u.x) / d; dy = (low.y - u.y) / d; }
        else if (T.dist(u, near) < 80) {
          const away = awayFrom(u, near, 1);
          dx = away.x; dy = away.y; boost = 1.1;
        }
      } else if (pi.keepAway && u.ranged) {
        const d = T.dist(u, near);
        if (d < 125) {
          const away = awayFrom(u, near, 1);
          dx = away.x; dy = away.y; boost = 1.1;
        } else if (d > 195 && target) {
          const dt2 = T.dist(u, target) || 1;
          dx = (target.x - u.x) / dt2;
          dy = (target.y - u.y) / dt2;
        }
      } else if (pi.aggro === 'protect' && low && T.dist(u, low) > 90) {
        const d = T.dist(u, low);
        dx = (low.x - u.x) / d;
        dy = (low.y - u.y) / d;
      } else {
        // Sem ordem: vagueia e aproxima só em surtos curtos (atalho para
        // atacar), nunca em perseguição direta.
        const w = wanderStep(u, G, target);
        dx = w.x;
        dy = w.y;
      }
    }

    const speed = (T.BAL.moveBase + T.BAL.moveSpd * u.spd) * boost *
      (pi.move || 1) * (slow ? 1 - pow(u, 'slowPow', 0.35) : 1) *
      (u.buffT > G.T ? 1 + pow(u, 'buffPow', 0.30) : 1) *
      (u.moveT > G.T ? 1 + pow(u, 'movePow', 0.40) : 1);
    const len = Math.hypot(dx, dy) || 1;
    if (dx || dy) {
      u.x += dx / len * speed * dt;
      u.y += dy / len * speed * dt;
    }

    const attackTarget = mode === 'def' ? near : target;
    if (canAttack && u.at <= 0 && attackTarget && T.dist(u, attackTarget) <= rng + 2) {
      u.at = 1;
      // Ataque básico usa a sprite do golpe normal, se o campeão tiver uma.
      const normal = u.ss[0];
      if (normal && normal.castSprite) {
        u.castImg = normal.castSprite;
        u.castT = G.T + 0.24;
      }
      if (u.ranged) T.shoot(u, attackTarget, 1, 260, '', null);
      else T.hit(u, attackTarget, 1);
    }

    useSkill(u, enemies, allies, target);
  }

  // ---------------------------------------------------------------------------
  // Status contínuos
  // ---------------------------------------------------------------------------

  const DOTS = [
    ['burnT', 'burnD', '#fb923c', 'chamas'],
    ['poisonT', 'poisonD', '#a3e635', 'veneno'],
    ['bleedT', 'bleedD', '#f87171', 'sangramento']
  ];

  const BOOST_EF = ['power', 'crit', 'haste', 'move', 'dodge', 'drain', 'rage', 'guard', 'regen', 'cleanse'];
  const BOOST_FIELD = {
    power: 'buffT', crit: 'critT', haste: 'hasteT', move: 'moveT', dodge: 'dodgeT',
    drain: 'stealT', rage: 'rageT', guard: 'drT', regen: 'regenT'
  };

  function tickStatus(u, dt) {
    const G = T.G;
    if (!G || !u.alive) return;
    u.dotAcc = (u.dotAcc || 0) + dt;
    const tick = u.dotAcc >= T.BAL.dotTick;
    if (tick) u.dotAcc -= T.BAL.dotTick;

    DOTS.forEach(([timeKey, dpsKey, col, label]) => {
      if (u[timeKey] > G.T) {
        if (tick && u.alive) {
          let dmg = (u[dpsKey] || 0) * T.BAL.dotTick;
          if (u.curseT > G.T) dmg *= 1 + pow(u, 'cursePow', 0.25);
          T.fx(u.x, u.y - 18, Math.round(dmg), col);
          T.damage(u, dmg, 'não resistiu ao ' + label);
        }
      } else if (u[timeKey]) {
        u[timeKey] = 0;
        u[dpsKey] = 0;
      }
    });

    if (u.regenT > G.T && tick && u.alive && u.hp < u.hpM) {
      const before = u.hp;
      u.hp = Math.min(u.hpM, u.hp + (u.regenD || 0) * T.BAL.dotTick);
      if (u.hp > before) T.fx(u.x, u.y - 18, '+' + Math.round(u.hp - before), '#86efac');
    } else if (u.regenT <= G.T && u.regenT) {
      u.regenT = 0;
      u.regenD = 0;
    }

    if (u.shieldT <= G.T) u.shield = 0;
    if (u.rageT <= G.T) u.rageT = 0;
  }

  // ---------------------------------------------------------------------------
  // Caixas de bônus
  // ---------------------------------------------------------------------------

  function clampInside(x, y, G, pad) {
    const r = Math.hypot(x, y);
    const max = Math.max(12, (G.R || G.R0) - (pad || 20));
    if (r > max) {
      x = x / r * max;
      y = y / r * max;
    }
    return { x, y };
  }

  T.spawnBox = (x, y, kind) => {
    const G = T.G;
    if (!G || G.mode === 'classico' && G.phase === 'prep') return;
    if (!G.boxes) G.boxes = [];
    if (G.boxes.length >= T.BAL.boxMax + 3) return;
    const keys = Object.keys(T.BOXES);
    const k = kind && T.BOXES[kind] ? kind : T.choose(keys);
    const p = clampInside(
      x == null ? (Math.random() * 2 - 1) * G.R * 0.65 : x,
      y == null ? (Math.random() * 2 - 1) * G.R * 0.65 : y,
      G, 18
    );
    G.boxes.push({ x: p.x, y: p.y, kind: k, t: T.BAL.boxLife, max: T.BAL.boxLife, born: G.T });
    T.fx(p.x, p.y, '🎁', '#fbbf24');
  };

  function collectBox(u, b) {
    const G = T.G;
    if (!G) return;
    const box = T.BOXES[b.kind] || T.BOXES.heal;
    const pi = T.PI[u.c.p] || {};
    const bonus = pi.boxBonus || 1;
    if (b.kind === 'heal') {
      const amt = u.hpM * 0.22 * bonus;
      const before = u.hp;
      u.hp = Math.min(u.hpM, u.hp + amt);
      T.callout(u, '💚 +' + Math.round(u.hp - before), 'heal');
    } else if (b.kind === 'shield') {
      const amt = u.hpM * 0.25 * bonus;
      u.shield = Math.max(u.shield || 0, amt);
      u.shieldT = G.T + 8;
      T.callout(u, '🛡 escudo', 'buff');
    } else if (b.kind === 'fury') {
      u.rageT = G.T + 8 * bonus;
      T.callout(u, '😤 fúria', 'buff');
    } else if (b.kind === 'bless') {
      u.buffT = G.T + 8 * bonus;
      T.callout(u, '✨ bênção', 'buff');
    } else if (b.kind === 'luck') {
      u.crit = Math.min(90, u.crit + 8 * bonus);
      T.callout(u, '🍀 sorte +crítico', 'buff');
    }
    T.logEvent(box.icon + ' ' + u.c.n + ' pegou ' + box.n + ' (' + box.desc + ')', 'buff', u.team);
  }

  // ---------------------------------------------------------------------------
  // Perigos das arenas
  // ---------------------------------------------------------------------------

  function hazardAt(G, x, y) {
    if (!G.haz) return null;
    return G.haz.find(h => Math.hypot(x - h.x, y - h.y) < h.r) || null;
  }

  function hazardHit(u, h) {
    const G = T.G;
    if (!G || !u.alive) return;
    const pi = T.PI[u.c.p] || {};
    const type = h.type;
    if (type === 'burn') {
      u.burnT = Math.max(u.burnT, G.T + 2.2);
      u.burnD = Math.max(u.burnD, u.atk * 0.12);
      T.callout(u, '🔥 queimando', 'debuff');
    } else if (type === 'slow') {
      u.slowT = Math.max(u.slowT, G.T + 2.4 * (1 - (pi.controlResist || 0)));
      T.callout(u, '❄️ lento', 'debuff');
    } else if (type === 'shock') {
      if (Math.random() < 0.35) {
        u.paraT = Math.max(u.paraT, G.T + 0.8 * (1 - (pi.controlResist || 0)));
        T.callout(u, '⚡ choque', 'debuff');
      } else {
        T.damage(u, u.hpM * 0.02, 'foi eletrocutado');
      }
    } else if (type === 'gust') {
      const d = Math.hypot(u.x, u.y) || 1;
      u.kx += u.x / d * T.BAL.pushBase * 0.55;
      u.ky += u.y / d * T.BAL.pushBase * 0.55;
      u.pushT = Math.max(u.pushT || 0, G.T + 0.18);
      T.callout(u, '🌪️ rajada', 'push');
    } else if (type === 'spike') {
      T.damage(u, u.hpM * 0.025, 'foi perfurado pelos espinhos');
      T.callout(u, '🌵 espinhos', 'atk');
    }
  }

  // ---------------------------------------------------------------------------
  // Sobrevivência: novos inimigos
  // ---------------------------------------------------------------------------

  function edgeSpot(team) {
    const G = T.G;
    const foes = G.us.filter(u => u.alive && u.team !== team);
    let best = { x: 0, y: 0 };
    let bestD = -1;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = G.R0 * (0.5 + Math.random() * 0.3);
      const p = { x: Math.cos(a) * r, y: Math.sin(a) * r };
      const d = foes.length ? Math.min(...foes.map(f => Math.hypot(f.x - p.x, f.y - p.y))) : 999;
      if (d > bestD) { bestD = d; best = p; }
    }
    return best;
  }

  // Intervalo dos reforços: começa em 3s e encurta até 0,7s conforme o tempo.
  T.survivalInterval = t =>
    Math.max(T.SURVIVAL.spawnMin,
      T.SURVIVAL.spawnStart * Math.exp(-Math.max(0, t) / T.SURVIVAL.spawnRamp));

  // Chance de um spawn comum virar campeão forte. Só começa depois do primeiro
  // campeão garantido e cresce com o tempo até o teto.
  T.survivalChampChance = t => t < T.SURVIVAL.champFirst ? 0
    : Math.min(T.SURVIVAL.champChanceMax,
      0.03 + (t - T.SURVIVAL.champFirst) / 220);

  function survivorChamp(kind) {
    const key = Object.hasOwn(T.SURV_MOBS, kind) ? kind : 'zumbi';
    const base = T.clone(T.SURV_MOBS[key]);
    base.lvl = 1;
    base.xp = 0;
    base.up = Object.assign({}, base.up);
    base.sks = T.defaultSkills(base);
    return T.san(T.norm(base)) || base;
  }

  function championChamp(roster) {
    const list = roster && roster.length ? roster : T.BANK;
    const c = T.clone(T.choose(list));
    c.up = T.rollUp(c);
    c.lvl = T.lvlOf(c);
    c.xp = 0;
    return T.san(T.norm(c)) || c;
  }

  function spawnSurvivor(forceChamp) {
    const G = T.G;
    if (!G || G.mode !== 'sobrevivencia') return null;
    const foes = G.us.filter(u => u.alive && u.team !== 0).length;
    if (foes >= T.SURVIVAL.maxFoes) return null;

    const guaranteed = G.T >= (G.nextChampAt || T.SURVIVAL.champFirst);
    const strong = !!forceChamp || guaranteed ||
      Math.random() < T.survivalChampChance(G.T);
    const roster = (T.RO && T.RO.length) ? T.RO : T.BANK;

    let c;
    let scale;
    let label;
    if (strong) {
      c = championChamp(roster);
      scale = 1 + Math.min(1.1, G.T / 100);
      label = 'campeão';
      G.nextChampAt = G.T + T.SURVIVAL.champEvery;
    } else {
      const roll = Math.random();
      const kind = roll < 0.44 ? 'zumbi' : roll < 0.76 ? 'demonio' : 'criatura';
      c = survivorChamp(kind);
      scale = 1 + Math.min(0.65, G.T / 180);
      label = kind === 'demonio' ? 'demônio' : kind === 'criatura' ? 'criatura' : 'zumbi';
    }
    if (!c) return null;

    const u = T.mk(c, 1);
    u.hpM *= scale;
    u.hp = u.hpM;
    u.atk *= scale;
    const p = edgeSpot(1);
    u.x = p.x;
    u.y = p.y;
    u.id = G.us.length;
    G.us.push(u);
    G.spawned = (G.spawned || 0) + 1;
    G.wave = 1 + Math.floor(G.T / 20);
    T.fx(u.x, u.y - 24, strong ? 'campeão!' : 'novo inimigo', strong ? '#fbbf24' : '#fca5a5');
    T.callout(u, strong ? '💀 campeão' : '☠️ novo inimigo', 'enemy');
    T.logEvent(strong ? '💀 Campeão inimigo: ' + c.n : '🧟 ' + label + ': ' + c.n,
      strong ? 'warn' : 'info', 1);
    if (T.buildHud) T.buildHud();
    return u;
  }

  function processSpawns() {
    const G = T.G;
    if (!G) return;
    if (G.spawnQ && G.spawnQ.length) {
      for (let i = G.spawnQ.length - 1; i >= 0; i--) {
        if (G.T >= G.spawnQ[i]) {
          G.spawnQ.splice(i, 1);
          spawnSurvivor();
        }
      }
    }
    if (G.mode !== 'sobrevivencia') return;

    if (G.T >= (G.nextSpawnAt || 0)) {
      spawnSurvivor();
      const jitter = 1 + (Math.random() * 2 - 1) * T.SURVIVAL.jitter;
      G.nextSpawnAt = G.T + Math.max(0.4, T.survivalInterval(G.T) * jitter);
    }
    G.wave = 1 + Math.floor(G.T / 20);
  }

  // ---------------------------------------------------------------------------
  // Passo da simulação
  // ---------------------------------------------------------------------------

  function tickFx(dt) {
    const G = T.G;
    if (!G) return;
    (G.fx || []).forEach(f => { f.l -= dt; });
    G.fx = (G.fx || []).filter(f => f.l > 0);
    if (G.banner) {
      G.banner.t -= dt;
      if (G.banner.t <= 0) G.banner = null;
    }
  }
  T.stepFx = tickFx;

  T.step = dt => {
    const G = T.G;
    if (!G || G.over || G.phase !== 'fight') return;
    G.T += dt;

    // Fechamento da arena (modos com colapso). Sobrevivência nunca encolhe:
    // o desafio vem do tempo e dos inimigos, não do espaço.
    if (G.mode === 'sobrevivencia') {
      G.R = G.R0;
    } else {
      G.R = Math.max(T.BAL.minRadius, G.R0 - T.BAL.shrinkRate * Math.max(0, G.T - G.shrinkStart));
      if (!G.shrinkAnnounced && G.T >= G.shrinkStart) {
        G.shrinkAnnounced = true;
        T.logEvent('⚠️ A arena começou a fechar!', 'warn');
        T.banner('⚠️ A arena está fechando!', 'warn');
      }
      if (!G.collapseAnnounced && G.R <= T.BAL.minRadius + 0.5) {
        G.collapseAnnounced = true;
        T.logEvent('☠️ Colapso! Todos perdem vida.', 'warn');
        T.banner('☠️ Colapso!', 'warn');
      }
    }

    const alive = G.us.filter(u => u.alive);
    const byTeam = [[], [], [], []];
    alive.forEach(u => { if (byTeam[u.team]) byTeam[u.team].push(u); });
    const enemiesFor = byTeam.map((_, team) =>
      byTeam.reduce((acc, arr, i) => (i === team ? acc : acc.concat(arr)), []));

    // Cooldowns correm para todos (inclusive durante o windup).
    alive.forEach(u => {
      const pi = T.PI[u.c.p] || {};
      const slow = u.slowT > G.T;
      const rate = (slow ? Math.max(0.1, 1 - pow(u, 'slowPow', 0.35)) : 1) *
        (u.o && (u.o.k === 'def' || u.o.k === 'ret') ? 0.6 : 1);
      const haste = (pi.atkSpeed || 1) *
        (u.hasteT > G.T ? 1 + pow(u, 'hastePow', 0.35) : 1);
      u.at -= dt * rate * haste;
      u.ss.forEach(s => { if (s.t > 0) s.t = Math.max(0, s.t - dt * rate * haste); });
      if (u.wind) {
        u.wind.t -= dt;
        if (u.wind.t <= 0) fireWind(u);
      }
    });

    alive.forEach(u => { if (u.alive) ai(u, dt, enemiesFor[u.team], byTeam[u.team]); });
    alive.forEach(u => { if (u.alive) tickStatus(u, dt); });

    // Caixas aparecem de tempos em tempos.
    G.boxT -= dt;
    if (G.boxT <= 0) {
      G.boxT = T.BAL.boxEvery * (0.7 + Math.random() * 0.6);
      if (G.boxes.length < T.BAL.boxMax) T.spawnBox();
    }
    G.boxes = (G.boxes || []).filter(b => {
      b.t -= dt;
      if (b.t <= 0) return false;
      const who = G.us.find(u => u.alive && T.dist(u, b) < 18);
      if (who) {
        collectBox(who, b);
        return false;
      }
      return true;
    });

    // Perigos da arena.
    if (G.arena && G.arena.hazard !== 'none') {
      G.hazT -= dt;
      if (G.hazT <= 0) {
        G.hazT = 6 + Math.random() * 4;
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * G.R * 0.7;
        G.haz.push({
          x: Math.cos(a) * r,
          y: Math.sin(a) * r,
          r: 26 + Math.random() * 20,
          type: G.arena.hazard,
          born: G.T,
          life: 16 + Math.random() * 8
        });
        if (G.haz.length > 9) G.haz.shift();
      }
      G.haz = (G.haz || []).filter(h => G.T - h.born < h.life);
      alive.forEach(u => {
        if (!u.alive || (u.hazT || 0) > G.T) return;
        const h = hazardAt(G, u.x, u.y);
        if (h) {
          u.hazT = G.T + 0.9;
          hazardHit(u, h);
        }
      });
    }

    // Movimento, empurrão e separação.
    const decay = Math.exp(-6.2 * dt);
    const separation = Math.min(1, 0.3 * dt * 60);
    alive.forEach(u => {
      if (!u.alive) return;
      u.x += u.kx * dt;
      u.y += u.ky * dt;
      u.kx *= decay;
      u.ky *= decay;
      alive.forEach(v => {
        if (v === u || !v.alive) return;
        const d = T.dist(u, v);
        if (d < 22) {
          const push = (22 - d) * separation;
          u.x += (u.x - v.x) / d * push;
          u.y += (u.y - v.y) / d * push;
        }
      });
      const r = Math.hypot(u.x, u.y);
      const max = Math.max(10, G.R - 13);
      if (r > max) {
        u.x *= max / r;
        u.y *= max / r;
      }
    });

    if (G.R <= T.BAL.minRadius + 0.5) {
      alive.forEach(u => {
        if (!u.alive) return;
        T.damage(u, T.BAL.collapseDps * dt, 'não resistiu ao colapso');
      });
    }

    G.pr = G.pr.filter(p => {
      p.l -= dt;
      if (p.l <= 0) return false;
      p.x += p.vx * p.v * dt;
      p.y += p.vy * p.v * dt;
      const hit = G.us.find(e => e.alive && e.team !== p.a.team && T.dist(p, e) < 12);
      if (hit) {
        if (p.s) T.apply(p.a, p.s, hit);
        else T.hit(p.a, hit, p.m);
        return false;
      }
      return Math.hypot(p.x, p.y) < G.R + 10;
    });

    tickFx(dt);
    T.fixLeader();
    processSpawns();

    if (G.mode === 'sobrevivencia') {
      const mineAlive = G.us.some(u => u.alive && u.team === 0);
      if (!mineAlive) {
        endBattle('☠️ Você caiu na onda ' + (G.wave || 1), false);
      }
      return;
    }

    // Assim que o time do jogador cai, abre o resultado na hora — inclusive
    // com 3 ou 4 times, quando a luta entre os outros ainda continuaria.
    const mineAlive = G.us.some(u => u.alive && u.team === 0);
    if (!mineAlive && !G.over) {
      const left = new Set(G.us.filter(u => u.alive).map(u => u.team));
      const txt = left.size
        ? '☠️ Seu time foi eliminado · ' + left.size + ' time(s) na arena'
        : 'Empate';
      endBattle(txt, false);
      return;
    }

    const teams = new Set(G.us.filter(u => u.alive).map(u => u.team));
    if (teams.size <= 1 && !G.over) {
      const won = teams.size === 1 && teams.has(0);
      const txt = teams.size === 0 ? 'Empate' : (won ? 'Vitória!' : 'Time ' + ([...teams][0] + 1) + ' venceu');
      endBattle(txt, won);
    }
  };

  // ---------------------------------------------------------------------------
  // Começo, fim e loop
  // ---------------------------------------------------------------------------

  function pickArena() {
    if (T.arenaPick === 'random') return T.choose(T.ARENAS);
    return T.ARENAS.find(a => a.id === T.arenaPick) || T.ARENAS[0];
  }

  // Setor angular de cada time: com 2 times são duas metades, com 3 terços,
  // com 4 quartos. O time 0 começa à esquerda, como no spawn padrão.
  T.teamZone = (team, nT) => {
    const n = Math.max(1, nT | 0);
    return {
      base: Math.PI + team * (2 * Math.PI / n),
      half: Math.PI / n
    };
  };

  const wrapPi = a => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

  // Mantém o ponto dentro do setor do time e dentro da arena (com folga para
  // o sprite não vazar pela borda).
  T.clampToZone = (x, y, team, G) => {
    const n = Math.max(1, (G && G.nT) || 1);
    const z = T.teamZone(team, n);
    const max = Math.max(16, ((G && G.R) || T.BAL.arenaMax) * 0.86);
    let r = Math.hypot(x, y);
    if (r <= 1e-6) return { x: 0, y: 0 };
    if (r > max) {
      const k = max / r;
      x *= k; y *= k; r = max;
    }
    const lim = z.half * 0.94;
    const diff = Math.max(-lim, Math.min(lim, wrapPi(Math.atan2(y, x) - z.base)));
    const a = z.base + diff;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  };

  function placeSquad(team, n, nT, G) {
    const base = Math.PI + team * (2 * Math.PI / nT);
    const ca = Math.cos(base);
    const sa = Math.sin(base);
    const tx = -sa;
    const ty = ca;
    const rr = G.R0 * 0.55;
    const out = [];
    for (let i = 0; i < n; i++) {
      // Standees maiores: afasta o esquadrão para os sprites não se cobrirem.
      const off = (i - (n - 1) / 2) * 62;
      let x = ca * rr + tx * off;
      let y = sa * rr + ty * off;
      const len = Math.hypot(x, y);
      const max = G.R0 * 0.78;
      if (len > max) { x = x / len * max; y = y / len * max; }
      out.push(T.clampToZone(x, y, team, G));
    }
    return out;
  }

  T.startBattle = opts => {
    T.stopLoop();
    const run = (opts && opts.run) || { round: 1, wins: 0 };
    const round = Math.max(1, (opts && opts.round) | 0 || run.round || 1);

    let picks = T.pickNames.map(n => T.byName(n)).filter(Boolean);
    if (!picks.length) picks = T.RO.slice(0, 3);
    if (!picks.length) {
      T.toast('Seu elenco está vazio. Importe o banco ou crie um campeão primeiro.', 'warn', 5200);
      T.G = null;
      T.show('menu');
      if (T.renderMenu) T.renderMenu();
      return;
    }

    const roster = (T.RO && T.RO.length) ? T.RO : T.BANK;
    // Inimigos "gerados" sempre recebem uma distribuição própria de atributos,
    // com altos e baixos, sem mexer na build que o jogador montou.
    const makeFoe = () => {
      const c = T.clone(T.choose(roster));
      c.up = T.rollUp(c);
      return c;
    };
    const mode = Object.hasOwn(T.MODES, T.mode) ? T.mode : 'classico';
    const nT = mode === 'sobrevivencia' ? 2 : T.nT;
    const arena = pickArena();
    const us = [];
    const scale = mode === 'infinito' ? Math.min(2.2, 1 + 0.06 * (round - 1)) : 1;

    for (let team = 0; team < nT; team++) {
      const champs = team === 0
        ? picks
        : Array.from({ length: picks.length }, (_, i) =>
          mode === 'sobrevivencia'
            ? survivorChamp(i % 3 === 0 ? 'demonio' : i % 3 === 1 ? 'criatura' : 'zumbi')
            : makeFoe());
      champs.forEach(c => {
        const u = T.mk(c, team);
        if (team !== 0 && scale !== 1) {
          u.hpM *= scale;
          u.hp = u.hpM;
          u.atk *= scale;
        }
        us.push(u);
      });
    }

    const G = {
      us,
      T: 0,
      R0: 0,
      R: 0,
      arena,
      mode,
      aiLevel: T.aiLevel,
      nT,
      round,
      run,
      wave: 1,
      spawned: 0,
      kills: 0,
      nextSpawnAt: 0,
      nextChampAt: 0,
      fx: [],
      pr: [],
      logs: [],
      boxes: [],
      haz: [],
      spawnQ: [],
      phase: 'prep',
      prepLeft: T.BAL.prepTime,
      prepMax: T.BAL.prepTime,
      over: null,
      overAt: 0,
      overMs: 0,
      nextRound: 0,
      nextRun: null,
      hudAcc: 0,
      last: performance.now(),
      boxT: T.BAL.boxEvery * 0.6,
      hazT: 5,
      shrinkStart: T.BAL.shrinkStart,
      shrinkAnnounced: false,
      collapseAnnounced: false,
      banner: null
    };

    G.R0 = T.arenaRadius(us.length);
    G.R = G.R0;
    T.R0 = G.R0;

    // Reposiciona as equipes agora que o raio real é conhecido.
    for (let team = 0; team < nT; team++) {
      const list = us.filter(u => u.team === team);
      const spots = placeSquad(team, list.length, nT, G);
      list.forEach((u, i) => { u.x = spots[i].x; u.y = spots[i].y; });
    }
    us.forEach((u, i) => { u.id = i; });

    // Perigos iniciais da arena temática.
    if (arena.hazard !== 'none') {
      const count = 3 + Math.floor(G.R0 / 130);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * G.R0 * 0.68;
        G.haz.push({
          x: Math.cos(a) * r,
          y: Math.sin(a) * r,
          r: 26 + Math.random() * 18,
          type: arena.hazard,
          born: 0,
          life: 1e9
        });
      }
    }

    T.G = G;
    T.selI = 0;
    const end = T.$('#end');
    if (end) end.style.display = 'none';
    const prep = T.$('#prep');
    if (prep) prep.style.display = 'flex';
    const log = T.$('#log');
    if (log) log.classList.add('off');

    T.show('g');
    if (T.buildHud) T.buildHud();
    if (T.resizeCanvas) T.resizeCanvas();
    T.fixLeader();
    if (T.updateHud) T.updateHud();

    const auto = mode === 'infinito' && round > 1;
    T.banner('Batalha · ' + arena.n + (round > 1 ? ' · Rodada ' + round : ''), 'info');
    T.logEvent('⚔️ ' + (mode === 'sobrevivencia' ? 'Sobrevivência' :
      mode === 'infinito' ? 'Infinito — rodada ' + round : 'Batalha') +
      ' na arena ' + arena.n + ' — seu time: ' + picks.map(c => c.n).join(', '), 'info', 0);
    if (auto) {
      T.beginFight();
    } else {
      T.logEvent('⏳ Posicionamento: arraste seus campeões e comece quando quiser.', 'info', 0);
    }

    T.raf = requestAnimationFrame(T.loop);
  };

  function endBattle(txt, won) {
    const G = T.G;
    if (!G || G.over) return;
    G.over = txt;
    G.overAt = G.T;
    G.overMs = performance.now();
    G.won = !!won;
    T.logEvent(txt + (won ? '' : ' — você perdeu'), 'end');

    if (G.mode === 'infinito' && won) {
      const wins = (G.run.wins || 0) + 1;
      G.nextRound = G.round + 1;
      G.nextRun = { round: G.nextRound, wins };
      T.banner('🏆 Rodada ' + G.round + ' vencida!', 'win');
      T.toast('Rodada ' + G.round + ' vencida! Vitórias: ' + wins, 'ok', 2200);
    }

    const et = T.$('#et');
    if (et) {
      let extra = '';
      if (G.mode === 'infinito') {
        const total = (G.run.wins || 0) + (won ? 1 : 0);
        extra = '<br><small>Você chegou à rodada ' + G.round + ' com ' + total + ' vitória(s).</small>';
      } else if (G.mode === 'sobrevivencia') {
        extra = '<br><small>Sobreviveu ' + G.T.toFixed(0) + 's e derrubou ' + (G.kills || 0) + ' inimigo(s).</small>';
      } else {
        extra = '<br><small>' + (G.arena ? G.arena.n : '') + ' · ' + G.T.toFixed(0) + 's</small>';
      }
      et.innerHTML = T.esc(txt) + (won ? '' : '<br><small>Você perdeu.</small>') + extra;
    }
    const end = T.$('#end');
    if (end) end.style.display = 'flex';
    const bnext = T.$('#bnext');
    if (bnext) bnext.style.display = G.mode === 'infinito' && won ? '' : 'none';
    if (T.updateHud) T.updateHud();
  }

  T.beginFight = () => {
    const G = T.G;
    if (!G || G.phase !== 'prep') return;
    G.phase = 'fight';
    G.prepLeft = 0;
    G.T = 0;
    G.last = performance.now();
    G.boxT = 3;
    G.hazT = 5;
    if (G.mode === 'sobrevivencia') {
      G.nextSpawnAt = G.T + T.SURVIVAL.spawnStart;
      G.nextChampAt = G.T + T.SURVIVAL.champFirst;
    }
    if (T.resizeCanvas) T.resizeCanvas();
    const prep = T.$('#prep');
    if (prep) prep.style.display = 'none';
    T.banner(G.mode === 'infinito' && G.round > 1 ? '⚔️ Rodada ' + G.round + ' — Luta!' : '⚔️ Luta!', 'info');
    T.logEvent('⚔️ A luta começou!', 'info', 0);
    if (T.updateHud) T.updateHud();
  };

  T.loop = t => {
    const G = T.G;
    if (!G) return;
    const dt = Math.min(0.05, Math.max(0, (t - G.last) / 1000));
    G.last = t;

    if (G.phase === 'prep') {
      G.prepLeft -= dt;
      tickFx(dt);
      if (G.prepLeft <= 0) T.beginFight();
    } else if (!G.over) {
      T.step(dt * (T.BAL.pace || 1));
    } else {
      tickFx(dt);
    }

    T.draw();
    G.hudAcc += dt;
    if (G.hudAcc >= 1 / T.BAL.hudHz) {
      G.hudAcc = 0;
      T.updateHud();
    }

    if (G.over) {
      T.raf = 0;
      return;
    }
    T.raf = requestAnimationFrame(T.loop);
  };

  T.stopLoop = () => {
    if (T.raf) cancelAnimationFrame(T.raf);
    T.raf = 0;
  };

  T.backToMenu = () => {
    T.stopLoop();
    T.G = null;
    const end = T.$('#end');
    if (end) end.style.display = 'none';
    const prep = T.$('#prep');
    if (prep) prep.style.display = 'none';
    T.show('menu');
    if (T.renderMenu) T.renderMenu();
  };

  // "Trocar time" volta à sala já com a lista de campeões em foco.
  T.changeTeam = () => {
    T.backToMenu();
    const ro = T.$('#ro');
    if (ro && ro.scrollIntoView) {
      try { ro.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (err) { /* ignore */ }
    }
    if (T.toast) T.toast('Escolha outro time e clique em Lutar.', 'info', 2400);
  };

  // ---------------------------------------------------------------------------
  // Seleção e comandos do jogador
  // ---------------------------------------------------------------------------

  T.fixLeader = () => {
    const m = T.mine();
    if (m[T.selI] && m[T.selI].alive) return;
    let best = -1;
    m.forEach((u, i) => {
      if (!u.alive) return;
      if (best < 0) { best = i; return; }
      const pa = T.pointsFor(u.c);
      const pb = T.pointsFor(m[best].c);
      const better = pa > pb || (pa === pb && u.atk > m[best].atk);
      if (better) best = i;
    });
    if (best >= 0) T.selI = best;
  };

  T.nearestEnemy = () => {
    if (!T.G) return null;
    const lead = T.mine()[T.selI];
    const enemies = T.G.us.filter(e => e.alive && e.team !== 0);
    if (!lead || !enemies.length) return null;
    return enemies.reduce((a, b) => (T.dist(lead, a) < T.dist(lead, b) ? a : b));
  };

  const DURATION = { def: 5, ret: 3.5, atk: 4, fin: 3, foc: 8 };
  const CMDN = { def: 'Defender', ret: 'Recuar', free: 'Livre', atk: 'Atacar', fin: 'Finalizar', foc: 'Focar' };

  // Uma ordem por vez. Enquanto a ordem atual durar, as outras ficam
  // bloqueadas. "Livre" é a única exceção: ela cancela a ordem ativa.
  T.cmd = (kind, target) => {
    const G = T.G;
    if (!G || G.over || G.phase !== 'fight') return false;
    const u = T.mine()[T.selI];
    if (!u || !u.alive) return false;
    if (kind === 'foc' && !target) return false;
    if (u.paraT > G.T) {
      T.logEvent('⚡ ' + u.c.n + ' está paralisado e não pode receber ordens', 'warn', 0);
      return false;
    }

    if (kind === 'free') {
      const had = !!u.o;
      u.o = null;
      u.cmdLock = G.T + 0.8;
      T.callout(u, '📣 livre', 'info');
      if (had) T.logEvent('📣 ' + u.c.n + ': Livre', 'order', 0);
      return true;
    }

    if (u.o) {
      T.callout(u, '⏳ ordem ativa', 'cast');
      return false;
    }
    if (G.T < (u.cmdLock || 0)) return false;

    u.cmdLock = G.T + 0.8;
    const label = (CMDN[kind] || kind) + (target ? ' → ' + target.c.n : '');
    if (Math.random() * 100 < u.obe) {
      u.o = { k: kind, tgt: target || null, t: G.T + (DURATION[kind] || 4) };
      T.callout(u, '✅ ' + (CMDN[kind] || kind), 'buff');
      T.logEvent('📣 ' + u.c.n + ' obedeceu: ' + label, 'order', 0);
      return true;
    }
    u.o = null;
    T.callout(u, '❌ ignorou', 'debuff');
    T.logEvent('📣 ' + u.c.n + ' ignorou: ' + label, 'warn', 0);
    return false;
  };

  // Clique no cenário: apenas o líder selecionado ganha uma intenção de ir
  // até aquele ponto. Os outros campeões continuam com a IA normal.
  T.pointWish = (x, y) => {
    const G = T.G;
    if (!G || G.over || G.phase !== 'fight') return false;
    const u = T.mine()[T.selI];
    if (!u || !u.alive) return false;
    const R = (G.R || G.R0) * 0.92;
    const d = Math.hypot(x, y);
    const k = d > R ? R / d : 1;
    u.wish = { x: x * k, y: y * k, t: G.T + 5 };
    T.callout(u, '👀 direção', 'info');
    return true;
  };

  T.selectUnit = i => {
    const m = T.mine();
    if (m[i] && m[i].alive) {
      T.selI = i;
      if (T.updateHud) T.updateHud();
    }
  };

  T.cycleLeader = dir => {
    const m = T.mine();
    if (!m.length) return;
    for (let i = 1; i <= m.length; i++) {
      const j = (T.selI + dir * i + m.length * 3) % m.length;
      if (m[j].alive) {
        T.selI = j;
        if (T.updateHud) T.updateHud();
        return;
      }
    }
  };
})(window.TBB = window.TBB || {});

