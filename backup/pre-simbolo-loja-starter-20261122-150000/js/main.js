// Inicialização da interface.
(function (T) {
  'use strict';

  T.show('home');
  T.applyTheme();
  T.renderMenu();
  T.observeCanvas();

  // Se a aba voltar do segundo plano, evita um dt gigante no próximo frame.
  document.addEventListener('visibilitychange', () => {
    if (T.G && !document.hidden) T.G.last = performance.now();
  });

  window.addEventListener('online', () => {
    if (T.loadCloud) T.loadCloud();
  });
})(window.TBB = window.TBB || {});
