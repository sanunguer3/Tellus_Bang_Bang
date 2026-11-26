// Sala de batalha: montar time, trocar etiquetas e iniciar.
(function (T) {
  'use strict';

  function card(c) {
    const on = T.pickNames.includes(c.n);
    const tag = T.tagOv[c.n] || c.tag;
    const skillIcons = (c.sks || []).map(s => (T.TIER[s.tier] || T.TIER.normal).icon).join('') || '—';
    const cloud = c.id ? '<span class="chip cloud" title="Na nuvem">☁️</span>' : '';
    return `<div class="card${on ? ' on' : ''}" tabindex="0" role="button" aria-pressed="${on}" data-c="${T.esc(c.n)}">` +
      `${T.av(c)}` +
      `<b style="color:${T.TY[c.t]}">${T.esc(c.n)}</b><small>${T.TN[c.t]} · ${T.FN[c.f]}</small>` +
      `<small>${T.RN[c.r]} · nível ${T.LV[c.r]}</small>` +
      `<small>${T.PN[c.p] || T.esc(c.p)} · ${skillIcons}</small>` +
      `${cloud}<span class="chip tag" data-tag="${T.esc(c.n)}" role="button" tabindex="0" aria-label="Trocar etiqueta de ${T.esc(c.n)}">${T.TE[tag]} ${tag}</span>` +
      `</div>`;
  }

  T.renderMenu = () => {
    if (!T.$('#ro')) return;
    T.$('#nt').innerHTML = [2, 3, 4].map(n =>
      `<button class="${n === T.nT ? 'on-b' : ''}" data-n="${n}" aria-pressed="${n === T.nT}">${n}</button>`
    ).join('');
    T.$('#cnt').textContent = T.pickNames.length + '/3 escolhidos';
    T.$('#ro').innerHTML = T.RO.map(card).join('');
    T.$('#pn').innerHTML = Object.values(T.PD).join('<br>');
  };

  const nt = T.$('#nt');
  if (nt) {
    nt.addEventListener('click', e => {
      const btn = e.target.closest('button[data-n]');
      if (!btn) return;
      T.setTeamCount(+btn.dataset.n);
      T.renderMenu();
    });
  }

  const ro = T.$('#ro');
  if (ro) {
    ro.addEventListener('click', e => {
      const tagChip = e.target.closest('[data-tag]');
      if (tagChip) {
        const name = tagChip.dataset.tag;
        const current = T.tagOv[name] || (T.byName(name) || {}).tag || 'dps';
        T.tagOv[name] = T.TAGS[(T.TAGS.indexOf(current) + 1) % T.TAGS.length];
        T.renderMenu();
        return;
      }
      const pick = e.target.closest('.card');
      if (!pick || !pick.dataset.c) return;
      T.addPick(pick.dataset.c);
      T.renderMenu();
    });

    ro.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const chip = e.target.closest('[data-tag]');
      if (chip) {
        e.preventDefault();
        chip.click();
        return;
      }
      const pick = e.target.closest('.card');
      if (!pick) return;
      e.preventDefault();
      pick.click();
    });
  }

  const play = T.$('#play');
  if (play) {
    play.addEventListener('click', () => {
      if (!T.pickNames.length) {
        T.pickNames = T.RO.slice(0, 3).map(c => c.n);
        T.savePick();
      }
      T.startBattle();
    });
  }

  const backHome = T.$('#m2h');
  if (backHome) backHome.addEventListener('click', () => T.show('home'));
})(window.TBB = window.TBB || {});
