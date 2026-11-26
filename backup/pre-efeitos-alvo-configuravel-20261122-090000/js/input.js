// Entrada: teclado, toque no canvas, botões de comando e navegação.
(function (T) {
  'use strict';

  const CMD_KEYS = { j: 'def', k: 'ret', l: 'free', u: 'atk', i: 'fin', o: 'foc' };

  document.addEventListener('keydown', e => {
    if (T.modalOpen() || T.isTyping()) return;
    if (!T.G || T.screen !== 'g') return;
    const key = e.key.toLowerCase();
    if (key === 'a' || key === 'd') {
      e.preventDefault();
      T.cycleLeader(key === 'a' ? -1 : 1);
      return;
    }
    if ('123'.includes(key)) {
      e.preventDefault();
      T.selectUnit(+key - 1);
      return;
    }
    if (CMD_KEYS[key]) {
      e.preventDefault();
      T.cmd(CMD_KEYS[key], CMD_KEYS[key] === 'foc' ? T.nearestEnemy() : null);
    }
  });

  const bind = (sel, fn) => {
    const el = T.$(sel);
    if (el) el.addEventListener('click', fn);
  };

  bind('#bd', () => T.cmd('def'));
  bind('#br', () => T.cmd('ret'));
  bind('#bf', () => T.cmd('free'));
  bind('#bu', () => T.cmd('atk'));
  bind('#bi', () => T.cmd('fin'));
  bind('#bo', () => T.cmd('foc', T.nearestEnemy()));
  bind('#bfin', () => T.backToMenu());
  bind('#brm', () => T.startBattle());
  bind('#bteam', () => T.changeTeam());
  bind('#bnext', () => {
    if (!T.G || !T.G.nextRound) return;
    T.startBattle({ round: T.G.nextRound, run: T.G.nextRun });
  });
  bind('#bq', () => {
    if (T.G && !T.G.over && !confirm('Sair da batalha atual?')) return;
    T.backToMenu();
  });

  // Tira de inimigos: roda do mouse rola na horizontal (a barra nativa fica
  // oculta para não roubar altura da arena).
  const hudE = T.$('#hudE');
  if (hudE) {
    hudE.addEventListener('wheel', e => {
      if (hudE.scrollWidth <= hudE.clientWidth + 1) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      hudE.scrollLeft += e.deltaY;
      e.preventDefault();
    }, { passive: false });
  }

  const cv = T.$('#cv');
  if (cv) {
    let drag = null;

    const toArena = e => {
      const b = cv.getBoundingClientRect();
      return {
        x: (e.clientX - b.left - T.cw / 2) / T.sc + (T.camX || 0),
        y: (e.clientY - b.top - T.ch / 2) / T.sc + (T.camY || 0)
      };
    };

    cv.addEventListener('pointerdown', e => {
      if (!T.G) return;
      const p = toArena(e);
      const u = T.unitAt(e);
      if (!u) {
        // Clique no cenário: só o líder selecionado passa a "querer" ir ali.
        if (T.G.phase !== 'prep' && T.pointWish) T.pointWish(p.x, p.y);
        return;
      }
      if (u.team === 0) {
        T.selectUnit(T.mine().indexOf(u));
        if (T.G.phase === 'prep') {
          // Mantém o ponto tocado sob o dedo/cursor (o standee não pula).
          drag = { u, id: e.pointerId, dx: u.x - p.x, dy: u.y - p.y };
          if (cv.setPointerCapture) {
            try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          }
        }
      } else if (T.G.phase === 'fight') {
        T.cmd('foc', u);
      }
    });

    cv.addEventListener('pointermove', e => {
      if (!drag || !T.G || T.G.phase !== 'prep') return;
      const p = toArena(e);
      p.x += drag.dx || 0;
      p.y += drag.dy || 0;
      // O campeão só pode ficar no setor do seu time e dentro da arena.
      const q = T.clampToZone(p.x, p.y, drag.u.team, T.G);
      drag.u.x = q.x;
      drag.u.y = q.y;
      e.preventDefault();
    });

    const endDrag = () => { drag = null; };
    cv.addEventListener('pointerup', endDrag);
    cv.addEventListener('pointercancel', endDrag);
    cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') endDrag(); });
  }

  bind('#thm', () => T.cycleTheme());
  bind('#hb', () => { T.renderMenu(); T.show('menu'); });
  bind('#hc', () => T.openEditor(0));
  bind('#hh', () => T.openHelp());
  bind('#mh', () => T.openHelp());
  bind('#h2h', () => T.show('home'));
  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('#hdone')) T.show('home');
  });
})(window.TBB = window.TBB || {});
