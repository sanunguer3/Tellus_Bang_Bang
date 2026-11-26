// HUD da batalha: monta uma vez e atualiza no máximo 10x por segundo.
(function (T) {
  'use strict';

  T.hudRefs = { own: [], enemy: [] };

  function skillsHtml(u) {
    return u.ss.map((s, i) =>
      `<div class="sk" data-u="${u.id}" data-si="${i}" title="${T.esc(s.n)}">` +
      `<span class="d" style="background:${T.CC[s.cat]}"></span>${T.esc(s.n)}` +
      `<div class="bar"><i></i></div></div>`
    ).join('');
  }

  function unitHtml(u, i, enemy) {
    const tag = T.TE[u.tag] || '';
    const label = `${u.c.n}, ${u.tag}, ${Math.round(u.hp)} de ${u.hpM} de vida`;
    return `<div class="u" data-i="${i}" data-u="${u.id}" tabindex="0" role="button" aria-label="${T.esc(label)}">` +
      `${T.av(u.c)}` +
      `<b style="color:${T.TY[u.c.t]}">${enemy ? '' : (i + 1) + '. '}${T.esc(u.c.n)}</b> ` +
      `<small>${tag} ${u.tag}</small>` +
      `<div class="bar hp"><i></i></div>` +
      `${skillsHtml(u)}` +
      `<div class="st" aria-hidden="true"></div>` +
      `</div>`;
  }

  function refs(root) {
    return Array.from(root.children).map(d => ({
      d,
      hp: d.querySelector('.hp i'),
      st: d.querySelector('.st'),
      skills: Array.from(d.querySelectorAll('.sk')).map(el => ({ bar: el.querySelector('i') }))
    }));
  }

  T.buildHud = () => {
    const hud = T.$('#hud');
    const hudE = T.$('#hudE');
    if (!hud || !hudE || !T.G) return;
    const own = T.mine();
    const enemies = T.G.us.filter(u => u.team !== 0);
    hud.innerHTML = own.map((u, i) => unitHtml(u, i, false)).join('');
    hudE.innerHTML = enemies.map((u, i) => unitHtml(u, i, true)).join('');
    T.hudRefs.own = refs(hud);
    T.hudRefs.enemy = refs(hudE);
    T.updateHud();
  };

  const COMMANDS = [
    ['#bd', 'def'], ['#br', 'ret'], ['#bf', 'free'],
    ['#bu', 'atk'], ['#bi', 'fin'], ['#bo', 'foc']
  ];

  function fmtTime(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  T.renderLog = () => {
    const list = T.$('#logl');
    const G = T.G;
    if (!list || !G) return;
    const logs = (G.logs || []).slice(-8);
    if (!logs.length) {
      list.innerHTML = '<li class="empty">A batalha vai começar…</li>';
      return;
    }
    list.innerHTML = logs.map(l => {
      const team = l.team >= 0 ? ' t' + l.team : '';
      return `<li class="${T.esc(l.kind || 'info')}${team}">` +
        `<span class="lt">${fmtTime(l.t)}</span>${T.esc(l.txt)}</li>`;
    }).join('');
    list.scrollTop = list.scrollHeight;
  };

  T.updateHud = () => {
    const G = T.G;
    if (!G) return;
    const own = T.mine();

    T.hudRefs.own.forEach((r, i) => {
      const u = own[i];
      if (!u) return;
      const selected = i === T.selI;
      T.setWidth(r.hp, 100 * Math.max(0, u.hp) / u.hpM);
      r.d.classList.toggle('d', !u.alive);
      r.d.classList.toggle('s', selected);
      r.d.setAttribute('aria-pressed', selected ? 'true' : 'false');
      r.skills.forEach((s, k) => {
        const sk = u.ss[k];
        if (sk) T.setWidth(s.bar, 100 * (1 - Math.max(0, sk.t) / sk.cd));
      });
      if (r.st) {
        const icons = T.statusList(u, G).map(k => T.STAT[k][0]).join('');
        const order = u.o ? ' ' + (T.ORD[u.o.k] || '').split(' ')[0] : '';
        r.st.textContent = (icons + order).trim();
        r.st.title = T.statusList(u, G).map(k => T.STAT[k][1]).join(', ');
      }
    });

    const enemies = G.us.filter(u => u.team !== 0);
    T.hudRefs.enemy.forEach((r, i) => {
      const u = enemies[i];
      if (!u) return;
      T.setWidth(r.hp, 100 * Math.max(0, u.hp) / u.hpM);
      r.d.classList.toggle('d', !u.alive);
      r.skills.forEach((s, k) => {
        const sk = u.ss[k];
        if (sk) T.setWidth(s.bar, 100 * (1 - Math.max(0, sk.t) / sk.cd));
      });
      if (r.st) {
        const icons = T.statusList(u, G).map(k => T.STAT[k][0]).join('');
        const order = u.o ? ' ' + (T.ORD[u.o.k] || '').split(' ')[0] : '';
        r.st.textContent = (icons + order).trim();
      }
    });

    const leader = own[T.selI];
    const busy = !!leader && (!!leader.o || leader.paraT > G.T || G.T < (leader.cmdLock || 0));
    COMMANDS.forEach(([id, kind]) => {
      const btn = T.$(id);
      if (!btn) return;
      let blocked = !leader || !leader.alive || G.over;
      if (kind === 'free') blocked = blocked || !leader.o;
      else blocked = blocked || busy;
      btn.classList.toggle('off', !!blocked);
      btn.disabled = !!blocked;
      if (kind === 'free') btn.title = leader && leader.o ? 'Cancelar a ordem ativa' : 'Nenhuma ordem ativa';
      else btn.title = leader && leader.o
        ? 'Bloqueado: ' + (T.ORD[leader.o.k] || leader.o.k)
        : (blocked ? 'Indisponível' : '');
    });
  };

  const hud = T.$('#hud');
  if (hud) {
    hud.addEventListener('click', e => {
      if (e.target.closest('.ib')) return;
      const card = e.target.closest('.u');
      if (card) T.selectUnit(+card.dataset.i);
    });
    hud.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.u');
      if (!card) return;
      e.preventDefault();
      T.selectUnit(+card.dataset.i);
    });
  }

  const logBtn = T.$('#blog');
  if (logBtn) {
    logBtn.addEventListener('click', () => {
      const panel = T.$('#log');
      if (!panel) return;
      const hidden = panel.classList.toggle('off');
      logBtn.classList.toggle('on-b', !hidden);
      logBtn.setAttribute('aria-pressed', hidden ? 'false' : 'true');
    });
  }
})(window.TBB = window.TBB || {});
