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
  bind('#back', () => T.backToMenu());
  bind('#brm', () => T.startBattle());
  bind('#bq', () => {
    if (T.G && !T.G.over && !confirm('Sair da batalha atual?')) return;
    T.backToMenu();
  });

  const cv = T.$('#cv');
  if (cv) {
    cv.addEventListener('pointerdown', e => {
      if (!T.G) return;
      const u = T.unitAt(e);
      if (!u) return;
      if (u.team === 0) T.selectUnit(T.mine().indexOf(u));
      else T.cmd('foc', u);
    });
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
