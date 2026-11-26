// HUD da batalha: cartões maiores, topo com modo/arena e preparo.
(function (T) {
  'use strict';

  T.hudRefs = { own: [], enemy: [], hit: new Map() };

  function shinyMark(u) {
    const s = u.shiny && T.SHINY[u.shiny];
    return s ? `<span title="Shiny: ${s.n}" style="color:${s.col};font-size:11px">✦</span>` : '';
  }

  function nerfMark(u) {
    const n = u.nerf || T.nerf(u.c);
    if (!n.total) return '';
    return `<span title="Nerf negativo: ${T.esc(n.label)}" ` +
      `style="color:#f87171;font-size:11px">⚠${n.total}</span>`;
  }

  function skillsHtml(u) {
    return u.ss.map((s, i) => {
      const ti = T.TIER[s.tier] || T.TIER.normal;
      return `<div class="sk" data-u="${u.id}" data-si="${i}" title="${T.esc(s.n)}">` +
        `<span class="si" style="color:${ti.color}">${ti.icon}</span>` +
        `<span class="sn">${T.esc(s.n)}</span>` +
        `<div class="bar"><i></i></div></div>`;
    }).join('');
  }

  function unitHtml(u, i) {
    const tag = T.TE[u.tag] || '';
    const label = `${u.c.n}, ${u.tag}, ${Math.round(u.hp)} de ${Math.round(u.hpM)} de vida`;
    return `<div class="u" data-i="${i}" data-u="${u.id}" tabindex="0" role="button" aria-label="${T.esc(label)}">` +
      `<div class="uav">${T.av(u.c)}</div>` +
      `<div class="umain">` +
        `<div class="uhead"><b style="color:${T.TY[u.c.t]}">${i + 1}. ${T.esc(u.c.n)} ${shinyMark(u)} ${nerfMark(u)}</b>` +
        `<span class="chip mini">${tag} ${u.tag}</span></div>` +
        `<div class="bar hp"><i></i><span class="hpTx"></span></div>` +
        `<div class="skills">${skillsHtml(u)}</div>` +
        `<div class="st" aria-hidden="true"></div>` +
      `</div>` +
      `</div>`;
  }

  function enemyHtml(u, i) {
    const tag = T.TE[u.tag] || '';
    const teamCol = T.TC[u.team] || '#f87171';
    return `<div class="e" data-i="${i}" data-u="${u.id}" data-team="${u.team}"` +
      ` style="border-color:${teamCol}" tabindex="0" role="button"` +
      ` aria-label="Time ${u.team}: ${T.esc(u.c.n)}">` +
      `<div class="eav">${T.av(u.c)}</div>` +
      `<div class="emain"><b style="color:${T.TY[u.c.t]}">${T.esc(u.c.n)} ${shinyMark(u)} ${nerfMark(u)}</b>` +
      `<small>${tag} ${u.tag}</small>` +
      `<div class="bar hp"><i></i><span class="hpTx"></span></div>` +
      `<div class="st" aria-hidden="true"></div></div>` +
      `</div>`;
  }

  function refs(root) {
    return Array.from(root.children).map(d => ({
      d,
      hp: d.querySelector('.hp i'),
      hpTx: d.querySelector('.hp .hpTx'),
      st: d.querySelector('.st'),
      skills: Array.from(d.querySelectorAll('.sk')).map(el => ({ bar: el.querySelector('i') }))
    }));
  }

  // Barras de dano no topo da arena: só aparecem com mais de um inimigo vivo.
  T.clearHitBars = () => {
    const wrap = T.$('#hitbars');
    if (!wrap) return;
    wrap.innerHTML = '';
    T.hudRefs.hit.clear();
  };

  function hitBarHtml(u) {
    const col = T.TC[u.team] || '#f87171';
    return `<div class="hitbar" data-u="${u.id}" style="--hc:${col}">` +
      `<div class="hbTop"><span class="hbName">${T.esc(u.c.n)}</span>` +
      `<span class="hbHp"></span></div>` +
      `<div class="hbTrack"><i></i></div></div>`;
  }

  function renderHitBars(G) {
    const wrap = T.$('#hitbars');
    if (!wrap) return;
    const alive = G.us.filter(u => u.team !== 0 && u.alive);
    const recent = alive
      .filter(u => u.hurtUntil > G.T)
      .sort((a, b) => (a.hurtSeq || 0) - (b.hurtSeq || 0))
      .slice(-3);
    const keep = new Set(recent.map(u => u.id));

    T.hudRefs.hit.forEach((r, id) => {
      if (keep.has(id)) return;
      r.d.remove();
      T.hudRefs.hit.delete(id);
    });

    if (G.over || alive.length < 2 || !recent.length) return;

    recent.forEach(u => {
      let r = T.hudRefs.hit.get(u.id);
      if (!r) {
        wrap.insertAdjacentHTML('beforeend', hitBarHtml(u));
        const d = wrap.lastElementChild;
        r = { d, bar: d.querySelector('.hbTrack i'), hp: d.querySelector('.hbHp') };
        T.hudRefs.hit.set(u.id, r);
      }
      const pct = Math.max(0, Math.min(100, 100 * u.hp / u.hpM));
      T.setWidth(r.bar, pct);
      r.hp.textContent = Math.ceil(Math.max(0, u.hp)) + '/' + Math.round(u.hpM);
      // O mais recente fica no topo.
      wrap.insertBefore(r.d, wrap.firstChild);
    });
  }

  T.buildHud = () => {
    const hud = T.$('#hud');
    const hudE = T.$('#hudE');
    if (!hud || !hudE || !T.G) return;
    const own = T.mine();
    const enemies = T.G.us.filter(u => u.team !== 0);
    hud.innerHTML = own.map((u, i) => unitHtml(u, i)).join('');
    hudE.innerHTML = enemies.map((u, i) => enemyHtml(u, i)).join('');
    T.hudRefs.own = refs(hud);
    T.hudRefs.enemy = refs(hudE);
    T.clearHitBars();
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

  function statusText(u, G) {
    const icons = T.statusList(u, G).map(k => (T.STAT[k] || [''])[0]).join('');
    const order = u.o ? ' ' + (T.ORD[u.o.k] || '').split(' ')[0] : '';
    const cast = u.wind ? ' ✨' : '';
    return (icons + order + cast).trim();
  }

  function paintUnit(r, u, G) {
    if (!r || !u) return;
    const pct = 100 * Math.max(0, u.hp) / u.hpM;
    T.setWidth(r.hp, pct);
    if (r.hpTx) r.hpTx.textContent = Math.ceil(u.hp) + '/' + Math.round(u.hpM);
    r.d.classList.toggle('d', !u.alive);
    r.d.classList.toggle('low', u.hp / u.hpM < 0.3);
    r.skills.forEach((s, k) => {
      const sk = u.ss[k];
      if (sk) T.setWidth(s.bar, 100 * (1 - Math.max(0, sk.t) / sk.cd));
    });
    if (r.st) {
      r.st.textContent = statusText(u, G);
      r.st.title = T.statusList(u, G).map(k => (T.STAT[k] || ['', ''])[1]).join(', ');
    }
  }

  T.updateHud = () => {
    const G = T.G;
    if (!G) return;
    const own = T.mine();
    const enemies = G.us.filter(u => u.team !== 0);

    T.hudRefs.own.forEach((r, i) => {
      const u = own[i];
      paintUnit(r, u, G);
      if (!u) return;
      const selected = i === T.selI;
      r.d.classList.toggle('s', selected);
      r.d.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });

    T.hudRefs.enemy.forEach((r, i) => paintUnit(r, enemies[i], G));
    renderHitBars(G);

    const prep = G.phase === 'prep';
    const leader = own[T.selI];
    const busy = !!leader && (!!leader.o || leader.paraT > G.T || G.T < (leader.cmdLock || 0));
    COMMANDS.forEach(([id, kind]) => {
      const btn = T.$(id);
      if (!btn) return;
      let blocked = prep || !leader || !leader.alive || !!G.over;
      if (kind === 'free') blocked = blocked || !(leader && leader.o);
      else blocked = blocked || busy;
      btn.classList.toggle('off', !!blocked);
      btn.disabled = !!blocked;
      if (prep) btn.title = 'A luta ainda não começou';
      else if (kind === 'free') btn.title = leader && leader.o ? 'Cancelar a ordem ativa' : 'Nenhuma ordem ativa';
      else btn.title = leader && leader.o
        ? 'Bloqueado: ' + (T.ORD[leader.o.k] || leader.o.k)
        : (blocked ? 'Indisponível' : '');
    });

    // Topo da batalha.
    const modeEl = T.$('#gmode');
    if (modeEl) {
      modeEl.textContent = G.mode === 'historia' ? '📖 História · estágio ' + G.stage
        : G.mode === 'sobrevivencia' ? '🧟 Sobrevivência'
          : G.mode === 'infinito' ? '♾️ Infinito · rodada ' + G.round
            : '⚔️ Clássico';
    }
    const arenaEl = T.$('#garena');
    if (arenaEl && G.arena) {
      arenaEl.textContent = G.arena.icon + ' ' + G.arena.n + (G.arena.hazard !== 'none' ? ' · ' + G.arena.hz : '');
    }
    const aiEl = T.$('#gai');
    if (aiEl) {
      const ai = T.AI_LEVELS[G.aiLevel] || T.AI_LEVELS.normal;
      aiEl.textContent = ai.icon + ' ' + ai.n;
    }
    const timeEl = T.$('#gtime');
    if (timeEl) {
      if (prep) timeEl.textContent = '⏳ ' + Math.max(0, Math.ceil(G.prepLeft)) + 's';
      else if (G.over) timeEl.textContent = G.over;
      else timeEl.textContent = '⏱ ' + Math.floor(G.T) + 's' +
        (G.mode === 'sobrevivencia' ? ' · onda ' + G.wave : '');
    }

    const prepEl = T.$('#prep');
    if (prepEl) prepEl.style.display = prep ? 'flex' : 'none';
    const prepN = T.$('#prepN');
    if (prepN) prepN.textContent = Math.max(0, Math.ceil(G.prepLeft)) + 's';
    const bstart = T.$('#bstart');
    if (bstart) bstart.textContent = '▶ Iniciar agora (' + Math.max(0, Math.ceil(G.prepLeft)) + 's)';
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

  const hudE = T.$('#hudE');
  if (hudE) {
    hudE.addEventListener('click', e => {
      if (e.target.closest('.ib')) return;
      const card = e.target.closest('.e');
      if (!card || !T.G) return;
      const u = T.G.us[+card.dataset.u];
      if (u && u.alive) T.cmd('foc', u);
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

  const startBtn = T.$('#bstart');
  if (startBtn) startBtn.addEventListener('click', () => T.beginFight());
})(window.TBB = window.TBB || {});