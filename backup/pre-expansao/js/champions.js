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
    const q = (base, key) => Math.min(76, base + 5 * (up[key] || 0));
    const pi = T.PI[c.p] || {};
    const hpM = T.BAL.hpBase + T.BAL.hpPer * (up.hp || 0);
    return {
      c,
      team,
      tag: T.tagOv[c.n] || c.tag,
      hpM,
      hp: hpM,
      atk: T.BAL.atkBase + T.BAL.atkPer * (up.atk || 0),
      spd: q(1, 'spd'),
      dod: q(1, 'dod'),
      crit: Math.min(90, q(1, 'crit') + (pi.crit || 0)),
      obe: Math.min(95, Math.max(0, q(50, 'obe') + (pi.obe || 0))),
      ranged: ['magico', 'genial', 'angelical'].includes(c.f),
      x: 0,
      y: 0,
      kx: 0,
      ky: 0,
      at: Math.random(),
      fl: 0,
      slowT: 0,
      buffT: 0,
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
      castT: 0,
      cmdT: 0,
      cmdLock: 0,
      o: null,
      alive: true,
      ss: (c.sks || []).map(s => ({ ...s, t: 2 + Math.random() * 3 }))
    };
  };

  T.showInfo = name => {
    const c = T.byName(name);
    if (!c) return;

    const stats = T.ST.map(k =>
      `<div>${T.SL[k]}: <b>${T.stv(c, k)}${k === 'hp' || k === 'atk' ? '' : '%'}</b></div>`
    ).join('');

    const tag = T.tagOv[c.n] || c.tag;
    const cloud = c.id ? ' · ☁️ na nuvem' : '';
    const advTypes = [T.BT[c.t], T.FT[c.f]].filter(Boolean).map(t => T.TN[t]).join(', ') || '—';
    const advFuncs = [T.TF[c.t], T.BF[c.f]].filter(Boolean).map(f => T.FN[f]).join(', ') || '—';
    const disTypes = [...T.inv(T.BT, c.t), ...T.inv(T.FT, c.f)].map(t => T.TN[t]).join(', ') || '—';
    const disFuncs = [...T.inv(T.TF, c.t), ...T.inv(T.BF, c.f)].map(f => T.FN[f]).join(', ') || '—';

    const skills = (c.sks || []).map(s => {
      const ti = T.TIER[s.tier] || T.TIER.normal;
      return `<div class="skinfo">` +
        `${s.sprite ? `<img src="${s.sprite}" width="20" height="20" alt="">` : ''}` +
        `<b>${ti.icon} ${T.esc(s.n)}</b> <span class="chip">${ti.n}</span> ` +
        `${T.SCAT[s.cat]}${s.mode && s.cat !== 'buff' ? ' · ' + T.SMODE[s.mode] : ''} · ⏱️ ${s.cd}s · ✖️ ${s.mult}` +
        `<br><small>${T.skDesc(s)}</small></div>`;
    }).join('') || 'Nenhuma';

    T.openModal(
      `<div class="modal-body">` +
      `<h2>${T.esc(c.n)} <span class="chip">${T.TE[tag]} ${tag}</span></h2>` +
      `<div>${T.TN[c.t]} · ${T.FN[c.f]}</div>` +
      `<div>${T.RN[c.r]} · nível ${T.LV[c.r]} · ${T.PN[c.p] || T.esc(c.p)}${cloud}</div>` +
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
