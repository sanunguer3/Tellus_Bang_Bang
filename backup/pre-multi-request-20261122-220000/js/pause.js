// Pausa real da batalha: congela o loop, o relógio da partida e o áudio.
// A interface fica em index.html; este módulo só controla o estado.
(function (T) {
  'use strict';

  const menu = T.$('#pausemenu');
  const btn = T.$('#pausebtn');
  const resumeBtn = T.$('#pauseresume');
  const homeBtn = T.$('#pausehome');
  const sfxSlider = T.$('#sfxvol');
  const musicSlider = T.$('#musicvol');
  const sfxLabel = T.$('#sfxlbl');
  const musicLabel = T.$('#musiclbl');

  let open = false;

  const inBattle = () => !!(T.G && T.screen === 'g' && !T.G.over);

  function syncLabels() {
    const sv = T.audio && T.audio.sfxVolume != null ? T.audio.sfxVolume : T.sfxVol;
    const mv = T.audio && T.audio.musicVolume != null ? T.audio.musicVolume : T.musicVol;
    if (sfxSlider) sfxSlider.value = String(Math.round((+sv || 0) * 100));
    if (musicSlider) musicSlider.value = String(Math.round((+mv || 0) * 100));
    if (sfxLabel) sfxLabel.textContent = Math.round((+sv || 0) * 100) + '%';
    if (musicLabel) musicLabel.textContent = Math.round((+mv || 0) * 100) + '%';
  }

  function setOpen(on, restart) {
    if (on) {
      if (!inBattle() || open) return;
      open = true;
      T.paused = true;
      if (T.stopLoop) T.stopLoop();
      if (T.audio && T.audio.setPaused) T.audio.setPaused(true);
      if (menu) {
        menu.style.display = 'flex';
        menu.setAttribute('aria-hidden', 'false');
      }
      if (btn) btn.hidden = true;
      syncLabels();
      if (resumeBtn && resumeBtn.focus) resumeBtn.focus();
      return;
    }

    if (!open) return;
    open = false;
    T.paused = false;
    if (menu) {
      menu.style.display = 'none';
      menu.setAttribute('aria-hidden', 'true');
    }
    if (T.audio && T.audio.setPaused) T.audio.setPaused(false);
    if (btn) btn.hidden = T.screen !== 'g';

    // Ao voltar ao menu, a navegação encerra a luta e não deve recriar o loop.
    if (restart !== false && T.G && T.screen === 'g') {
      T.G.last = performance.now();
      if (!T.raf && T.loop) T.raf = requestAnimationFrame(T.loop);
    }
  }

  T.pauseBattle = () => setOpen(true);
  T.resumeBattle = () => setOpen(false);
  T.togglePause = () => (open ? setOpen(false) : setOpen(true));

  if (btn) btn.addEventListener('click', () => T.pauseBattle());
  if (resumeBtn) resumeBtn.addEventListener('click', () => T.resumeBattle());
  if (homeBtn) homeBtn.addEventListener('click', () => {
    setOpen(false, false);
    T.goHome();
  });
  if (menu) menu.addEventListener('click', e => {
    if (e.target === menu) T.resumeBattle();
  });
  [sfxSlider, musicSlider].forEach(slider => {
    if (!slider) return;
    slider.addEventListener('input', syncLabels);
    slider.addEventListener('change', syncLabels);
  });

  document.addEventListener('keydown', e => {
    if (T.modalOpen && T.modalOpen()) return;
    const key = String(e.key || '').toLowerCase();
    if (key !== 'escape' && key !== 'p') return;
    if (key === 'p' && T.isTyping && T.isTyping()) return;
    if (!open && !inBattle()) return;
    e.preventDefault();
    T.togglePause();
  });

  // Qualquer saída da tela de batalha (Voltar do navegador, menu, resultado)
  // precisa fechar o overlay e liberar o áudio.
  T.nav.addOnApply(screen => {
    if (screen !== 'g' && open) setOpen(false, false);
    if (btn) btn.hidden = screen !== 'g';
  });
})(window.TBB = window.TBB || {});
