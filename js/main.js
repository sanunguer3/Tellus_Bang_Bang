// Inicialização da interface.
(function (T) {
  'use strict';

  T.applyTheme();
  T.renderMenu();
  T.observeCanvas();
  // A navegação global decide qual tela restaurar (inclusive pelo hash/URL).
  if (T.nav && T.nav.boot) T.nav.boot();
  else T.show('home');
  if (T.histFixBoot) T.histFixBoot();

  // Se a aba voltar do segundo plano, evita um dt gigante no próximo frame.
  document.addEventListener('visibilitychange', () => {
    if (T.G && !document.hidden) T.G.last = performance.now();
  });

  window.addEventListener('online', () => {
    if (T.loadCloud) T.loadCloud();
  });
})(window.TBB = window.TBB || {});
