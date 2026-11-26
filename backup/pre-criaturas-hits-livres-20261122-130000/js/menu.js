// Sala de batalha: modo, dificuldade, arena, time e início.
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
      `<small>${T.RN[c.r]} · nível ${T.lvlOf(c)}/${T.LVLMAX}</small>` +
      `<small>${T.PN[c.p] || T.esc(c.p)} · ${skillIcons}</small>` +
      `${cloud}<span class="chip tag" data-tag="${T.esc(c.n)}" role="button" tabindex="0" aria-label="Trocar etiqueta de ${T.esc(c.n)}">${T.TE[tag]} ${T.TAGN[tag] || tag}</span>` +
      `</div>`;
  }

  const MODE_DESC = {
    classico: 'Uma batalha por vez. O último time com alguém vivo vence.',
    infinito: 'Ao vencer, você escolhe se quer continuar; a IA fica mais forte a cada rodada.',
    sobrevivencia: 'Zumbis, demônios e criaturas fracas chegam sem parar. Campeões fortes aparecem de vez em quando, com mais frequência conforme o tempo passa. A arena não fecha.'
  };

  T.renderMenu = () => {
    if (!T.$('#ro')) return;

    T.$('#nt').innerHTML = [2, 3, 4].map(n =>
      `<button class="${n === T.nT ? 'on-b' : ''}" data-n="${n}" aria-pressed="${n === T.nT}">${n}</button>`
    ).join('');

    const cams = T.$('#cams');
    if (cams) {
      cams.innerHTML = [
        ['fixa', '🎯 Fixa'],
        ['seguir', '👣 Seguir líder']
      ].map(([id, label]) =>
        `<button class="${id === T.camMode ? 'on-b' : ''}" data-cam="${id}" aria-pressed="${id === T.camMode}">${label}</button>`
      ).join('');
    }

    T.$('#modes').innerHTML = Object.keys(T.MODES).map(k =>
      `<button class="${k === T.mode ? 'on-b' : ''}" data-mode="${k}" aria-pressed="${k === T.mode}" title="${T.esc(MODE_DESC[k] || '')}">${T.MODES[k]}</button>`
    ).join('');

    T.$('#ais').innerHTML = Object.keys(T.AI_LEVELS).map(k => {
      const ai = T.AI_LEVELS[k];
      return `<button class="${k === T.aiLevel ? 'on-b' : ''}" data-ai="${k}" aria-pressed="${k === T.aiLevel}" title="${T.esc(ai.n)}: vida ${Math.round(ai.hp * 100)}%, ataque ${Math.round(ai.atk * 100)}%, reação ${ai.reaction.toFixed(2)}×">${ai.icon} ${ai.n}</button>`;
    }).join('');

    T.$('#arenas').innerHTML =
      `<button class="${T.arenaPick === 'random' ? 'on-b' : ''}" data-arena="random" aria-pressed="${T.arenaPick === 'random'}">🎲 Aleatória</button>` +
      T.ARENAS.map(a =>
        `<button class="${T.arenaPick === a.id ? 'on-b' : ''}" data-arena="${a.id}" aria-pressed="${T.arenaPick === a.id}" title="${T.esc(a.n)}${a.hazard !== 'none' ? ' · perigo: ' + a.hz : ''}">${a.icon} ${a.n}</button>`
      ).join('');

    T.$('#modedesc').textContent = MODE_DESC[T.mode] || '';
    T.$('#cnt').textContent = T.pickNames.length + '/3 escolhidos · ' + T.RO.length + ' no elenco';

    const empty = !T.RO.length;
    const hint = T.$('#empty');
    if (hint) hint.hidden = !empty;
    const play = T.$('#play');
    if (play) {
      play.disabled = empty;
      play.textContent = empty ? 'Elenco vazio' : 'Lutar';
      play.title = empty ? 'Importe o banco ou crie um campeão' : '';
    }

    T.$('#ro').innerHTML = T.RO.map(card).join('') || '<div class="note warn">Seu elenco está vazio. Importe o banco de campeões ou crie um novo no editor.</div>';
    T.$('#pn').innerHTML = Object.values(T.PD).join('<br>');
  };

  const bind = (sel, fn) => {
    const el = T.$(sel);
    if (el) el.addEventListener('click', fn);
  };

  bind('#bankimport', () => {
    const n = T.importBank();
    T.toast(n ? n + ' campeão(ões) importados do banco.' : 'Todos os campeões do banco já estão no elenco.', n ? 'ok' : 'info');
    T.renderMenu();
  });

  bind('#createchamp', () => { if (T.openEditor) T.openEditor(-1); });

  const nt = T.$('#nt');
  if (nt) {
    nt.addEventListener('click', e => {
      const btn = e.target.closest('button[data-n]');
      if (!btn) return;
      T.setTeamCount(+btn.dataset.n);
      T.renderMenu();
    });
  }

  const cams = T.$('#cams');
  if (cams) {
    cams.addEventListener('click', e => {
      const btn = e.target.closest('button[data-cam]');
      if (!btn) return;
      T.setCamMode(btn.dataset.cam);
      T.renderMenu();
    });
  }

  const modes = T.$('#modes');
  if (modes) {
    modes.addEventListener('click', e => {
      const btn = e.target.closest('button[data-mode]');
      if (!btn) return;
      T.setMode(btn.dataset.mode);
      T.renderMenu();
    });
  }

  const ais = T.$('#ais');
  if (ais) {
    ais.addEventListener('click', e => {
      const btn = e.target.closest('button[data-ai]');
      if (!btn) return;
      T.setAI(btn.dataset.ai);
      T.renderMenu();
    });
  }

  const arenas = T.$('#arenas');
  if (arenas) {
    arenas.addEventListener('click', e => {
      const btn = e.target.closest('button[data-arena]');
      if (!btn) return;
      T.setArena(btn.dataset.arena);
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
      if (!T.RO.length) {
        T.toast('Seu elenco está vazio. Importe o banco ou crie um campeão.', 'warn', 5000);
        return;
      }
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