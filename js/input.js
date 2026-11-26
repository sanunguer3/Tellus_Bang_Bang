// Entrada: teclado, toque no canvas, botões de comando e navegação.
(function (T) {
  'use strict';

  document.addEventListener('keydown', e => {
    if (T.modalOpen() || T.isTyping() || T.paused) return;
    if (!T.G || T.screen !== 'g') return;
    const key = String(e.key || '').toLowerCase();
    const keys = T.keys || T.DEFAULT_KEYS;
    if (key === keys.prevLeader || key === keys.nextLeader) {
      e.preventDefault();
      T.cycleLeader(key === keys.prevLeader ? -1 : 1);
      return;
    }
    const slot = ['slot1', 'slot2', 'slot3', 'slot4'].findIndex(a => keys[a] === key);
    if (slot >= 0) {
      e.preventDefault();
      T.selectUnit(slot);
      return;
    }
    const command = ['def', 'ret', 'free', 'atk', 'fin', 'foc'].find(a => keys[a] === key);
    if (command) {
      e.preventDefault();
      T.cmd(command, command === 'foc' ? T.nearestEnemy() : null);
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
  bind('#bfin', () => {
    if (T.G && T.G.pvp) { if (T.pvp) T.pvp.backToRoom(); else T.go('pvp'); return; }
    if (T.G && T.G.history) T.openHistory();
    else T.backToMenu();
  });
  bind('#brm', () => {
    if (T.G && T.G.history) T.histStartBattle();
    else T.startBattle();
  });
  bind('#bteam', () => T.changeTeam());
  bind('#bnext', () => {
    if (!T.G) return;
    if (T.G.history) {
      T.histStartBattle({ round: T.G.nextRound, run: T.G.nextRun });
      return;
    }
    if (!T.G.nextRound) return;
    T.startBattle({ round: T.G.nextRound, run: T.G.nextRun });
  });
  bind('#bhist', () => T.openHistory());
  bind('#bstats', () => { if (T.openBattleReport) T.openBattleReport(); });
  bind('#bq', () => {
    if (T.G && !T.G.over && !confirm('Sair da batalha atual?')) return;
    const pvp = !!(T.G && T.G.pvp);
    if (pvp && T.pvp) T.pvp.abandon();
    if (pvp) { if (T.pvp) T.pvp.backToRoom(); else T.go('pvp'); return; }
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

    // Roda do mouse aproxima/afasta a arena durante a batalha.
    cv.addEventListener('wheel', e => {
      if (!T.G) return;
      e.preventDefault();
      const CZ = T.CAM_ZOOM || { step: 0.12 };
      T.setZoom(e.deltaY < 0 ? CZ.step : -CZ.step, true);
      if (T.updateHud) T.updateHud();
    }, { passive: false });

    const toArena = e => {
      const b = cv.getBoundingClientRect();
      return {
        x: (e.clientX - b.left - T.cw / 2) / T.sc + (T.camX || 0),
        y: (e.clientY - b.top - T.ch / 2) / T.sc + (T.camY || 0)
      };
    };

    cv.addEventListener('pointerdown', e => {
      if (!T.G || T.paused) return;
      const p = toArena(e);
      const u = T.unitAt(e);
      if (!u) {
        const R = T.G.R || T.G.R0 || T.BAL.arenaMax;
        // Fora do círculo da arena: arrasta a câmera. Dentro: só o líder
        // selecionado passa a "querer" ir naquela direção.
        if (Math.hypot(p.x, p.y) > R + 10) {
          drag = { mode: 'pan', id: e.pointerId, lx: e.clientX, ly: e.clientY };
          if (cv.setPointerCapture) {
            try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          }
          e.preventDefault();
          return;
        }
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
      if (!drag || !T.G) return;
      if (drag.mode === 'pan') {
        if (drag.id != null && e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.lx;
        const dy = e.clientY - drag.ly;
        drag.lx = e.clientX;
        drag.ly = e.clientY;
        // O cenário acompanha o cursor: arrastar para a direita move a câmera
        // para a esquerda.
        T.panCamera(-dx, -dy);
        e.preventDefault();
        return;
      }
      if (T.G.phase !== 'prep') return;
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

  const zoomStep = dir => {
    const CZ = T.CAM_ZOOM || { step: 0.12 };
    T.setZoom(CZ.step * dir, true);
    if (T.updateHud) T.updateHud();
  };
  bind('#bzp', () => zoomStep(1));
  bind('#bzm', () => zoomStep(-1));
  bind('#bzc', () => {
    T.resetCamera();
    if (T.updateHud) T.updateHud();
  });
  bind('#bfx', () => {
    T.toggleNoFx();
    T.updateCamButtons();
    T.toast(T.noFx ? 'Efeitos visuais desligados: só sprites.' : 'Efeitos visuais ligados.', 'info');
  });

  // Mantém os botões de câmera/efeitos sempre de acordo com o estado salvo.
  T.updateCamButtons = () => {
    const fx = T.$('#bfx');
    if (fx) {
      fx.textContent = T.noFx ? '✨ Sem efeitos' : '✨ Efeitos';
      fx.setAttribute('aria-pressed', T.noFx ? 'true' : 'false');
      fx.classList.toggle('on-b', T.noFx);
    }
    const z = T.$('#zlbl');
    if (z) z.textContent = Math.round((T.zoom || 1) * 100) + '%';
  };
  T.updateCamButtons();

  bind('#thm', () => T.cycleTheme());
  bind('#hb', () => T.go('menu'));
  bind('#hstory', () => T.openHistory());
  bind('#hc', () => T.openEditor(0));
  bind('#hh', () => T.openHelp());
  bind('#mh', () => T.openHelp());
  bind('#h2h', () => T.goHome());
  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('#hdone')) T.goHome();
  });
})(window.TBB = window.TBB || {});
