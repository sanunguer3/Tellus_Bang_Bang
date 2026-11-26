// Unidades de batalha, avatares e ficha detalhada do campeão.
(function (T) {
  'use strict';

  const IMG = new Map();

  T.img = c => {
    if (!c || !c.sprite || !T.OKIMG.test(c.sprite)) return null;
    let im = IMG.get(c.sprite);
    if (!im) {
      im = new Image();
      im.src = c.sprite;
      IMG.set(c.sprite, im);
    }
    return im.complete && im.naturalWidth ? im : null;
  };

  T.av = c => {
    const initial = T.esc((c.n || '?')[0]);
    const face = c.sprite && T.OKIMG.test(c.sprite)
      ? `<img src="${c.sprite}" alt="">`
      : initial;
    return `<span class="avw"><span class="ib" data-n="${T.esc(c.n)}" role="button" tabindex="0" aria-label="Ficha de ${T.esc(c.n)}">i</span>` +
      `<span class="av" style="background:${T.TY[c.t] || '#9ca3af'}">${face}</span></span>`;
  };

  // Cria a unidade de batalha a partir do campeão (com tag sobrescrita pelo jogador).
  T.mk = (c, team) => {
    const up = c.up || {};
    const cap = T.statCap(c);
    const q = (base, key) => Math.max(0, Math.min(cap, base + 5 * (up[key] || 0)));
    const pi = T.PI[c.p] || {};
    const ai = team !== 0 ? (T.AI_LEVELS[T.aiLevel] || T.AI_LEVELS.normal) : null;
    const nerf = T.nerf(c);
    const m = nerf.mult;
    const hpM = T.stv(c, 'hp') * (ai ? ai.hp : 1) * m;
    const sh = T.rollShiny ? T.rollShiny(c) : null;
    return {
      c,
      team,
      shiny: sh ? sh.k : '',
      shinyHue: sh ? sh.hue : 0,
      nerf,
      tag: T.tagOv[c.n] || c.tag,
      hpM,
      hp: hpM,
      atk: T.stv(c, 'atk') * (ai ? ai.atk : 1) * m,
      spd: q(1, 'spd') * m,
      dod: Math.min(95, (q(1, 'dod') + (pi.dod || 0) + (ai ? ai.dodge : 0)) * m),
      crit: Math.min(cap, (q(1, 'crit') + (pi.crit || 0) + (ai ? ai.crit : 0)) * m),
      obe: Math.min(95, Math.max(0, (q(50, 'obe') + (pi.obe || 0)) * m)),
      ranged: ['magico', 'genial', 'angelical'].includes(c.f),
      x: 0,
      y: 0,
      kx: 0,
      ky: 0,
      at: Math.random(),
      fl: 0,
      slowT: 0,
      slowPow: 0,
      buffT: 0,
      buffPow: 0,
      critT: 0,
      critPow: 0,
      hasteT: 0,
      hastePow: 0,
      moveT: 0,
      movePow: 0,
      dodgeT: 0,
      dodgePow: 0,
      stealT: 0,
      stealPow: 0,
      drT: 0,
      drPow: 0,
      ragePow: 0,
      cursePow: 0,
      regenT: 0,
      regenD: 0,
      burnT: 0,
      burnD: 0,
      poisonT: 0,
      poisonD: 0,
      bleedT: 0,
      bleedD: 0,
      curseT: 0,
      paraT: 0,
      shield: 0,
      shieldT: 0,
      rageT: 0,
      dotAcc: 0,
      castT: 0,      // enquanto > G.T, desenha a sprite do golpe
      castImg: '',
      cmdT: 0,
      cmdLock: 0,
      pushT: 0,
      hazT: 0,
      lastHit: null,
      wind: null,
      hitSeq: null, // sequência de golpes em andamento (recarga travada)
      o: null,
      alive: true,
      ss: (c.sks || []).map(s => ({ ...s, t: 2 + Math.random() * 3 }))
    };
  };

  T.showInfo = name => {
    const c = T.byName(name);
    if (!c) return;
    const nf = T.nerf(c);

    const stats = T.ST.map(k =>
      `<div>${T.SL[k]}: <b>${T.stv(c, k)}${k === 'hp' || k === 'atk' ? '' : '%'}</b></div>`
    ).join('') + (nf.total
      ? `<div style="color:#f87171">⚠ Nerf: <b>${T.esc(nf.label)}</b></div>` : '');

    const tag = T.tagOv[c.n] || c.tag;
    const cloud = c.id ? ' · ☁️ na nuvem' : '';
    const advTypes = [T.BT[c.t], T.FT[c.f]].filter(Boolean).map(t => T.TN[t]).join(', ') || '—';
    const advFuncs = [T.TF[c.t], T.BF[c.f]].filter(Boolean).map(f => T.FN[f]).join(', ') || '—';
    const disTypes = [...T.inv(T.BT, c.t), ...T.inv(T.FT, c.f)].map(t => T.TN[t]).join(', ') || '—';
    const disFuncs = [...T.inv(T.TF, c.t), ...T.inv(T.BF, c.f)].map(f => T.FN[f]).join(', ') || '—';

    const li = T.levelInfo(c);

    const skills = (c.sks || []).map(s => {
      const ti = T.TIER[s.tier] || T.TIER.normal;
      return `<div class="skinfo">` +
        `${s.castSprite ? `<img src="${s.castSprite}" width="20" height="20" alt="" title="Sprite do golpe">` : ''}` +
        `${s.sprite ? `<img src="${s.sprite}" width="20" height="20" alt="" title="Sprite do projétil">` : ''}` +
        `<b>${ti.icon} ${T.esc(s.n)}</b> <span class="chip">${ti.n}</span> ` +
        `${T.SCAT[s.cat]}${s.mode && s.cat !== 'buff' ? ' · ' + T.SMODE[s.mode] : ''} · ⏱️ ${s.cd}s · ✖️ ${s.mult}` +
        `<br><small>${T.skDesc(s)}</small></div>`;
    }).join('') || 'Nenhuma';

    T.openModal(
      `<div class="modal-body">` +
      `<h2>${T.esc(c.n)} ` +
      (c.shiny && T.SHINY[c.shiny]
        ? `<span class="chip" style="color:${T.SHINY[c.shiny].col}" title="Campeão shiny">${T.SHINY[c.shiny].icon} ${T.SHINY[c.shiny].n}</span>` : '') +
      (nf.total
        ? `<span class="chip nerf" title="Nerf por atributos negativos">⚠ ${T.esc(nf.label)}</span>` : '') +
      `<span class="chip">${T.TE[tag]} ${T.TAGN[tag] || tag}</span></h2>` +
      `<div>${T.TN[c.t]} · ${T.FN[c.f]}</div>` +
      `<div>${T.RN[c.r]} · nível ${li.lvl}/${T.LVLMAX} · ${li.points} pts · ` +
      `${li.max ? 'MÁX' : li.xp + '/' + li.need + ' XP'} · ${T.PN[c.p] || T.esc(c.p)}${cloud}</div>` +
      `<div class="note">${T.PD[c.p]}</div>` +
      `<div class="fm stats">${stats}</div>` +
      `<div class="advantage"><b>▲ Vantagem sobre</b> — tipos: ${advTypes}; funções: ${advFuncs}</div>` +
      `<div class="disadvantage"><b>▼ Desvantagem contra</b> — tipos: ${disTypes}; funções: ${disFuncs}</div>` +
      `<h3>✨ Habilidades</h3>${skills}` +
      `<div class="row"><button data-close>Fechar</button></div>` +
      `</div>`
    );
  };

  // Abre a ficha ao clicar (ou teclar Enter/Espaço) no "i" do avatar.
  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('.ib');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    T.showInfo(btn.dataset.n);
  }, true);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const btn = e.target.closest && e.target.closest('.ib');
    if (!btn) return;
    e.preventDefault();
    T.showInfo(btn.dataset.n);
  });
})(window.TBB = window.TBB || {});
