// Motor de batalha: unidades, IA, dano, habilidades, ordens e loop.
(function (T) {
  'use strict';

  T.R0 = 190;
  T.raf = 0;

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
    const kind = k || 't';
    const life = kind === 'ring' ? 0.4 : 0.7;
    T.G.fx.push({ x, y, txt, col, k: kind, x2, y2, l: life, max: life });
  };

  // Aplica dano direto (golpes, status e colapso), respeitando escudo e morte.
  T.damage = (b, amount, cause) => {
    const G = T.G;
    if (!G || !b || !b.alive || amount <= 0) return 0;
    let left = amount;
    if (b.shield > 0) {
      const absorbed = Math.min(b.shield, left);
      b.shield -= absorbed;
      left -= absorbed;
      T.fx(b.x, b.y - 20, '🛡 ' + Math.round(absorbed), '#38bdf8');
    }
    b.hp -= left;
    b.fl = G.T + 0.12;
    if (b.hp <= 0) {
      b.hp = 0;
      b.alive = false;
      b.o = null;
      b.shield = 0;
      T.logEvent('💀 ' + b.c.n + ' ' + (cause || 'foi nocauteado'), 'ko', b.team);
    }
    return left;
  };

  T.hit = (a, b, mult) => {
    const G = T.G;
    if (!G || !a || !b || !b.alive) return null;
    if (Math.random() * 100 < b.dod) {
      T.fx(b.x, b.y - 16, 'esquiva', '#93c5fd');
      return { dmg: 0, dodged: true };
    }

    const pa = T.PI[a.c.p] || {};
    const pb = T.PI[b.c.p] || {};
    let m = (mult || 1) * Math.pow(1.25, T.rel(a.c, b.c)) * Math.pow(0.75, T.rel(b.c, a.c));
    if (a.buffT > G.T) m *= 1.3;
    if (pa.dmg) m *= pa.dmg;
    if (pa.dmgLow) m *= 1 + (pa.dmgLow - 1) * (1 - a.hp / a.hpM);
    if (pa.bonusVsHurt && b.hp / b.hpM < 0.5) m *= pa.bonusVsHurt;
    if (a.rageT > G.T) m *= 1.2;
    if (pb.dr) m *= pb.dr;
    if (b.rageT > G.T) m *= 0.9;
    if (b.curseT > G.T) m *= 1.25;
    const critBonus = a.o ? (a.o.k === 'atk' ? 15 : a.o.k === 'fin' ? 30 : 0) : 0;
    const crit = Math.random() * 100 < a.crit + critBonus;
    if (crit) m *= 1.5;
    if (b.o && b.o.k === 'def') m *= 0.7;
    m = Math.min(m, T.BAL.damageCap);

    const dmg = a.atk * m;
    T.fx(b.x, b.y - 16, Math.round(dmg) + (crit ? '!' : ''), crit ? '#fde047' : '#fff');
    T.damage(b, dmg, 'foi nocauteado');

    // Masoquista: apanhar deixa a unidade furiosa.
    if (pb.rage && b.alive) {
      b.rageT = G.T + 4;
      T.fx(b.x, b.y - 28, 'fúria', '#fb7185');
    }
    return { dmg, crit };
  };

  T.shoot = (a, target, mult, speed, sprite, skill, rng) => {
    const G = T.G;
    if (!G) return;
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

  // Aplica status ofensivos (chamas, veneno, sangramento, maldição, paralisia, lentidão).
  function applyStatus(u, e, s) {
    const G = T.G;
    if (!G || !e.alive) return;
    const ef = s.ef || {};
    const m = s.mult || 1;
    // Efeitos de status escalam de forma atenuada: uma ultimate é mais forte,
    // mas não transforma chamas/veneno em dano praticamente letal.
    const scale = 0.7 + 0.3 * Math.min(m, 2.5);
    const atk = u.atk || 10;
    const keys = [];
    if (ef.burn) {
      e.burnT = Math.max(e.burnT, G.T + T.EFX.burn.dur * scale);
      e.burnD = Math.max(e.burnD, atk * T.EFX.burn.dmg * scale);
      keys.push('burn');
    }
    if (ef.poison) {
      e.poisonT = Math.max(e.poisonT, G.T + T.EFX.poison.dur * scale);
      e.poisonD = Math.max(e.poisonD, atk * T.EFX.poison.dmg * scale);
      keys.push('poison');
    }
    if (ef.bleed) {
      e.bleedT = Math.max(e.bleedT, G.T + T.EFX.bleed.dur * scale);
      e.bleedD = Math.max(e.bleedD, atk * T.EFX.bleed.dmg * scale);
      keys.push('bleed');
    }
    if (ef.curse) {
      e.curseT = Math.max(e.curseT, G.T + T.EFX.curse.dur * scale);
      keys.push('curse');
    }
    if (ef.paralyze) {
      e.paraT = Math.max(e.paraT, G.T + T.EFX.paralyze.dur * scale);
      keys.push('para');
    }
    if (ef.slow) {
      e.slowT = Math.max(e.slowT, G.T + T.EFX.slow.dur * scale);
      keys.push('slow');
    }
    if (!keys.length) return;
    T.fx(e.x, e.y - 16, keys.map(k => T.STAT[k][0]).join(''), '#f0abfc');
    T.logEvent(
      keys.map(k => T.STAT[k][0]).join('') + ' ' + e.c.n + ': ' +
      keys.map(k => T.STAT[k][1].toLowerCase()).join(', '),
      'debuff',
      e.team
    );
  }

  // Efeitos de uma habilidade. `primary` é o alvo do projétil/à distância.
  T.apply = (u, s, primary) => {
    const G = T.G;
    if (!G) return;
    const allies = G.us.filter(x => x.alive && x.team === u.team);
    const enemies = G.us.filter(x => x.alive && x.team !== u.team);
    const ef = s.ef || {};
    const offensive = s.cat === 'dano' || s.cat === 'debuff' || !!ef.push ||
      !!(ef.burn || ef.poison || ef.bleed || ef.curse || ef.paralyze || ef.slow);
    let targets = [];

    if (offensive) {
      if (s.mode === 'proj') {
        targets = primary && primary.alive ? [primary] : [];
      } else if (s.mode === 'contato') {
        targets = enemies.filter(e => T.dist(u, e) < s.rad);
      } else {
        targets = primary && primary.alive ? [primary] : [];
      }
      if (ef.area && targets.length) {
        const center = targets[0];
        targets = enemies.filter(e => T.dist(e, center) < s.rad);
      }
      targets.forEach(e => {
        if (s.cat === 'dano') T.hit(u, e, s.mult);
        if (s.cat === 'debuff' && !ef.slow) {
          e.slowT = Math.max(e.slowT, G.T + 3 * s.mult);
        }
        applyStatus(u, e, s);
        if (ef.push) {
          const d = T.dist(u, e);
          e.kx = (e.x - u.x) / d * 170 * s.mult;
          e.ky = (e.y - u.y) / d * 170 * s.mult;
        }
      });
    }

    const icon = ef.heal ? '💚'
      : s.cat === 'buff' ? '✨'
      : s.cat === 'debuff' ? '💜'
      : ef.push ? '🌬️'
      : (T.SCAT[s.cat] || '✨').split(' ')[0];
    const tierMark = s.tier === 'ultimate' ? '★ ' : '';
    const who = targets.length > 1 ? targets.length + ' inimigos' : (targets[0] ? targets[0].c.n : '');
    T.logEvent(
      icon + ' ' + u.c.n + ' usou ' + tierMark + s.n + (who ? ' em ' + who : ''),
      'skill',
      u.team
    );

    if (ef.heal && allies.length) {
      const low = allies.reduce((a, b) => (a.hp / a.hpM < b.hp / b.hpM ? a : b));
      const healed = ef.area ? allies.filter(a => T.dist(u, a) < s.rad) : [low];
      healed.forEach(a => {
        let amount = a.hpM * 0.25 * s.mult;
        const pa = T.PI[a.c.p] || {};
        if (pa.healBonus) amount *= pa.healBonus;
        if (a.curseT > G.T) amount *= 0.5;
        const before = a.hp;
        a.hp = Math.min(a.hpM, a.hp + amount);
        const gained = Math.round(a.hp - before);
        T.fx(a.x, a.y - 16, '+cura', '#86efac');
        if (gained > 0) T.logEvent('💚 ' + u.c.n + ' curou ' + a.c.n + ' (+' + gained + ')', 'heal', u.team);
      });
    }

    if (ef.shield && allies.length) {
      const shielded = ef.area ? allies.filter(a => T.dist(u, a) < s.rad) : [u];
      shielded.forEach(a => {
        const amount = a.hpM * T.EFX.shield.pct * s.mult;
        a.shield = Math.max(a.shield || 0, amount);
        a.shieldT = G.T + T.EFX.shield.dur * s.mult;
        T.fx(a.x, a.y - 16, '🛡', '#38bdf8');
        T.logEvent('🛡 ' + a.c.n + ' ganhou escudo (' + Math.round(amount) + ')', 'buff', a.team);
      });
    }

    if (s.cat === 'buff' && allies.length) {
      const buffed = ef.area ? allies.filter(a => T.dist(u, a) < s.rad) : [u];
      buffed.forEach(a => {
        a.buffT = G.T + 5 * s.mult;
        T.fx(a.x, a.y - 16, 'buff', '#c4b5fd');
        T.logEvent('✨ ' + a.c.n + ' recebeu buff', 'buff', a.team);
      });
    }

    const ox = targets[0] ? targets[0].x : u.x;
    const oy = targets[0] ? targets[0].y : u.y;
    if (s.mode === 'contato' || ef.area) T.fx(ox, oy, '', T.CC[s.cat], 'r2', s.rad);
    else T.fx(ox, oy, '', T.CC[s.cat], 'ring');
    if (s.sprite) T.fx(ox, oy, s.sprite, '', 'img');
  };

  function skillScore(u, s, target, G) {
    const ef = s.ef || {};
    const low = (G.us.filter(x => x.alive && x.team === u.team))
      .reduce((a, b) => (a.hp / a.hpM < b.hp / b.hpM ? a : b), u);
    if (ef.heal && low && low.hp < low.hpM * 0.65) {
      return 120 + (1 - low.hp / low.hpM) * 60;
    }
    if (s.cat === 'buff') {
      if (u.buffT > G.T) return -1;
      const enemyNear = G.us.some(e => e.alive && e.team !== u.team && T.dist(u, e) < 240);
      return enemyNear ? 55 : (u.hp < u.hpM * 0.6 ? 45 : -1);
    }
    const offensive = s.cat === 'dano' || s.cat === 'debuff' || !!ef.push;
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

  function useSkill(u, enemies, allies, target) {
    const G = T.G;
    if (!G || !allies.length || u.castT > G.T) return;
    if (!target || !target.alive) target = enemies[0] || null;
    let best = null;
    let bestScore = 0;
    u.ss.forEach(s => {
      if (s.t > 0) return;
      const score = skillScore(u, s, target, G);
      if (score > bestScore) { best = s; bestScore = score; }
    });
    if (!best) return;

    if (best.mode === 'proj' && target) {
      T.shoot(u, target, best.mult, best.pspd, best.sprite, best, best.rng);
    } else {
      T.apply(u, best, target);
    }
    best.t = best.cd;
    u.castT = G.T + 1.0;
  }

  function expireOrder(u) {
    if (!u.o || u.o.t > T.G.T) return;
    u.o = null;
  }

  function lowestAlly(allies) {
    return allies.reduce((a, b) => (a.hp / a.hpM < b.hp / b.hpM ? a : b), allies[0]);
  }

  // Escolhe o melhor alvo: vantagem de tipo/função, vida baixa, distância e
  // ameaça. Personalidades mudam o peso de cada fator.
  function pickTarget(u, enemies, allies) {
    const pi = T.PI[u.c.p] || {};
    const lowAlly = foes => allies.length ? lowestAlly(allies) : null;
    const protectedAlly = pi.aggro === 'protect' ? lowAlly() : null;
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
      if (score > bestScore) { bestScore = score; best = e; }
    });
    return best;
  }

  // A IA dos times adversários também usa ordens táticas.
  function aiCommand(u, enemies, allies, target) {
    const G = T.G;
    if (u.team === 0 || !G) return;
    const pi = T.PI[u.c.p] || {};
    if (u.o || u.paraT > G.T || G.T < (u.cmdT || 0)) return;
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
    T.fx(u.x, u.y - 28, T.ORD[pick.k] || pick.k, '#fde68a');
    T.logEvent('🤖 ' + u.c.n + ': ' + (T.ORD[pick.k] || pick.k).split(' ').slice(1).join(' '), 'order', u.team);
  }

  function awayFrom(u, foe, strength) {
    const d = T.dist(u, foe);
    return { x: (u.x - foe.x) / d * strength, y: (u.y - foe.y) / d * strength };
  }

  function ai(u, dt, enemies, allies) {
    const G = T.G;
    if (!enemies.length || !G) return;
    expireOrder(u);

    const pi = T.PI[u.c.p] || {};
    let mode = u.o ? u.o.k : '';
    if (!mode && pi.flee && u.hp < u.hpM * pi.flee) mode = 'ret';
    if (mode === 'stun') return;

    const slow = u.slowT > G.T;
    const paralyzed = u.paraT > G.T;
    const orderRate = (mode === 'def' || mode === 'ret') ? 0.65 : 1;
    const rate = orderRate * (slow ? 0.65 : 1);
    u.at -= dt * rate * (pi.atkSpeed || 1);
    u.ss.forEach(s => { if (s.t > 0) s.t = Math.max(0, s.t - dt * rate); });
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
    } else {
      if (mode === 'fin') {
        target = u.o && u.o.tgt && u.o.tgt.alive
          ? u.o.tgt
          : enemies.reduce((a, b) => (a.hp < b.hp ? a : b));
        boost = 1.35;
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
          const dt2 = T.dist(u, target);
          dx = (target.x - u.x) / dt2;
          dy = (target.y - u.y) / dt2;
        }
      } else if (pi.aggro === 'protect' && low && T.dist(u, low) > 90) {
        const d = T.dist(u, low);
        dx = (low.x - u.x) / d;
        dy = (low.y - u.y) / d;
      } else {
        const d = T.dist(u, target);
        if (d > rng - 3) {
          dx = (target.x - u.x) / d;
          dy = (target.y - u.y) / d;
        }
      }
    }

    const speed = (34 + u.spd * 0.9) * boost * (slow ? 0.6 : 1) * (u.buffT > G.T ? 1.3 : 1);
    const len = Math.hypot(dx, dy) || 1;
    if (dx || dy) {
      u.x += dx / len * speed * dt;
      u.y += dy / len * speed * dt;
    }

    const attackTarget = mode === 'def' ? near : target;
    if (canAttack && u.at <= 0 && T.dist(u, attackTarget) <= rng + 2) {
      u.at = 1;
      if (u.ranged) T.shoot(u, attackTarget, 1, 260, '', null);
      else T.hit(u, attackTarget, 1);
    }

    useSkill(u, enemies, allies, target);
  }

  // Dano contínuo e expiração de status.
  const DOTS = [
    ['burnT', 'burnD', '#fb923c', 'chamas'],
    ['poisonT', 'poisonD', '#a3e635', 'veneno'],
    ['bleedT', 'bleedD', '#f87171', 'sangramento']
  ];

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
          if (u.curseT > G.T) dmg *= 1.25;
          T.fx(u.x, u.y - 16, Math.round(dmg), col);
          T.damage(u, dmg, 'não resistiu ao ' + label);
        }
      } else if (u[timeKey]) {
        u[timeKey] = 0;
        u[dpsKey] = 0;
      }
    });

    if (u.shieldT <= G.T) u.shield = 0;
    if (u.rageT <= G.T) u.rageT = 0;
  }

  T.step = dt => {
    const G = T.G;
    if (!G) return;
    G.T += dt;
    G.R = Math.max(T.BAL.minRadius, T.R0 - T.BAL.shrinkRate * Math.max(0, G.T - T.BAL.shrinkStart));
    if (!G.shrinkAnnounced && G.T >= T.BAL.shrinkStart) {
      G.shrinkAnnounced = true;
      T.logEvent('⚠️ A arena começou a fechar!', 'warn');
    }
    if (!G.collapseAnnounced && G.R <= T.BAL.minRadius + 0.5) {
      G.collapseAnnounced = true;
      T.logEvent('☠️ Colapso! Todos perdem vida.', 'warn');
    }

    const alive = G.us.filter(u => u.alive);
    const byTeam = [[], [], [], []];
    alive.forEach(u => { if (byTeam[u.team]) byTeam[u.team].push(u); });
    const enemiesFor = byTeam.map((_, team) => byTeam.reduce((acc, arr, i) => (i === team ? acc : acc.concat(arr)), []));

    alive.forEach(u => ai(u, dt, enemiesFor[u.team], byTeam[u.team]));
    alive.forEach(u => tickStatus(u, dt));

    const decay = Math.exp(-6.3 * dt);
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
      const max = G.R - 13;
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

    G.fx.forEach(f => { f.l -= dt; });
    G.fx = G.fx.filter(f => f.l > 0);

    T.fixLeader();

    const teams = new Set(G.us.filter(u => u.alive).map(u => u.team));
    if (teams.size <= 1 && !G.over) {
      G.over = teams.size === 0 ? 'Empate' : (teams.has(0) ? 'Vitória!' : 'Time ' + ([...teams][0] + 1) + ' venceu');
      G.overAt = G.T;
      T.$('#et').textContent = G.over + (teams.has(0) ? '' : ' Você perdeu.');
      T.$('#end').style.display = 'flex';
      T.logEvent(G.over + (teams.has(0) ? '' : ' — você perdeu'), 'end');
      T.updateHud();
    }
  };

  function stepFx(dt) {
    const G = T.G;
    if (!G) return;
    G.fx.forEach(f => { f.l -= dt; });
    G.fx = G.fx.filter(f => f.l > 0);
  }
  T.stepFx = stepFx;

  T.loop = t => {
    const G = T.G;
    if (!G) return;
    const dt = Math.min(0.05, Math.max(0, (t - G.last) / 1000));
    G.last = t;
    if (!G.over) T.step(dt * (T.BAL.pace || 1));
    else T.stepFx(dt);
    T.draw();
    G.hudAcc += dt;
    if (G.hudAcc >= 1 / T.BAL.hudHz) {
      G.hudAcc = 0;
      T.updateHud();
    }
    if (G.over && G.T - G.overAt > 1.5) {
      T.raf = 0;
      return;
    }
    T.raf = requestAnimationFrame(T.loop);
  };

  T.stopLoop = () => {
    if (T.raf) cancelAnimationFrame(T.raf);
    T.raf = 0;
  };

  T.startBattle = () => {
    T.stopLoop();

    let picks = T.pickNames.map(n => T.byName(n)).filter(Boolean);
    if (!picks.length) picks = T.RO.slice(0, 3);
    const nT = T.nT;

    const us = [];
    for (let team = 0; team < nT; team++) {
      const champs = team === 0
        ? picks
        : Array.from({ length: 3 }, () => T.choose(T.RO));
      champs.forEach((c, i) => {
        const u = T.mk(c, team);
        const a = team * 2 * Math.PI / nT + (i - (champs.length - 1) / 2) * 0.28;
        u.x = Math.cos(a) * 135;
        u.y = Math.sin(a) * 135;
        us.push(u);
      });
    }
    us.forEach((u, i) => { u.id = i; });

    T.G = {
      us,
      T: 0,
      R: T.R0,
      fx: [],
      pr: [],
      logs: [],
      shrinkAnnounced: false,
      collapseAnnounced: false,
      over: null,
      overAt: 0,
      hudAcc: 0,
      last: performance.now()
    };
    T.selI = 0;
    T.$('#end').style.display = 'none';
    T.show('g');
    if (T.buildHud) T.buildHud();
    if (T.resizeCanvas) T.resizeCanvas();
    T.fixLeader();
    if (T.updateHud) T.updateHud();
    T.logEvent('⚔️ Batalha iniciada — seu time: ' + picks.map(c => c.n).join(', '), 'info', 0);
    T.raf = requestAnimationFrame(T.loop);
  };

  T.backToMenu = () => {
    T.stopLoop();
    T.G = null;
    T.$('#end').style.display = 'none';
    T.show('menu');
    if (T.renderMenu) T.renderMenu();
  };

  T.fixLeader = () => {
    const m = T.mine();
    if (m[T.selI] && m[T.selI].alive) return;
    let best = -1;
    m.forEach((u, i) => {
      if (!u.alive) return;
      if (best < 0) { best = i; return; }
      const better = T.LV[u.c.r] > T.LV[m[best].c.r] ||
        (T.LV[u.c.r] === T.LV[m[best].c.r] && u.atk > m[best].atk);
      if (better) best = i;
    });
    if (best >= 0) T.selI = best;
  };

  T.nearestEnemy = () => {
    const lead = T.mine()[T.selI];
    const enemies = T.G ? T.G.us.filter(e => e.alive && e.team !== 0) : [];
    if (!lead || !enemies.length) return null;
    return enemies.reduce((a, b) => (T.dist(lead, a) < T.dist(lead, b) ? a : b));
  };

  const DURATION = { def: 5, ret: 3.5, atk: 4, fin: 3, foc: 8 };
  const CMDN = { def: 'Defender', ret: 'Recuar', free: 'Livre', atk: 'Atacar', fin: 'Finalizar', foc: 'Focar' };

  // Uma ordem por vez. Enquanto a ordem atual durar, as outras ficam
  // bloqueadas. "Livre" é a única exceção: ela cancela a ordem ativa.
  T.cmd = (kind, target) => {
    const G = T.G;
    if (!G || G.over) return false;
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
      T.fx(u.x, u.y - 28, 'livre', '#e5e7eb');
      if (had) T.logEvent('📣 ' + u.c.n + ': Livre', 'order', 0);
      return true;
    }

    if (u.o) {
      T.fx(u.x, u.y - 28, 'ordem ativa', '#fcd34d');
      return false;
    }
    if (G.T < (u.cmdLock || 0)) return false;

    u.cmdLock = G.T + 0.8;
    const label = (CMDN[kind] || kind) + (target ? ' → ' + target.c.n : '');
    if (Math.random() * 100 < u.obe) {
      u.o = { k: kind, tgt: target || null, t: G.T + (DURATION[kind] || 4) };
      T.fx(u.x, u.y - 28, 'obedeceu', '#86efac');
      T.logEvent('📣 ' + u.c.n + ' obedeceu: ' + label, 'order', 0);
      return true;
    }
    u.o = null;
    T.fx(u.x, u.y - 28, 'ignorou!', '#fca5a5');
    T.logEvent('📣 ' + u.c.n + ' ignorou: ' + label, 'warn', 0);
    return false;
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
        T.updateHud();
        return;
      }
    }
  };
})(window.TBB = window.TBB || {});
