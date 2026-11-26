// Navegação global: uma pilha só para todas as telas, com URL e Voltar do
// navegador sincronizados. T.show continua sendo a função que só liga/desliga
// as seções; esta camada decide QUAL seção mostrar.
(function (T) {
  'use strict';

  const SCREENS = ['home', 'help', 'menu', 'ed', 'g', 'hist', 'hloja', 'hcolecao'];
  const ROUTE = {
    home: 'home', help: 'help', menu: 'menu', ed: 'ed', g: 'g',
    hist: 'aventura', hloja: 'loja', hcolecao: 'colecao'
  };
  const SCREEN = {
    home: 'home', help: 'help', menu: 'menu', ed: 'ed', g: 'g',
    aventura: 'hist', hist: 'hist', loja: 'hloja', colecao: 'hcolecao'
  };

  let stack = ['home'];
  let expected = [];
  // Vários módulos podem reagir à troca de tela (história e áudio, por exemplo).
  const onApply = [];

  const norm = h => String(h || '').replace(/^#\/?/, '');
  const hashFor = screen => '#/' + (ROUTE[screen] || screen);
  const screenFromHash = h => SCREEN[norm(h)] || null;
  const currentHash = () => location.hash || '';

  // file:// pode recusar pushState/replaceState; nesse caso a URL cai no hash
  // e o evento resultante é marcado como "nosso" para não navegar de novo.
  function writeUrl(hash, replace) {
    if (currentHash() === hash) return;
    const url = location.pathname + location.search + hash;
    try {
      if (replace && history.replaceState) history.replaceState(null, '', url);
      else if (history.pushState) history.pushState(null, '', url);
      else throw new Error('histórico indisponível');
    } catch (err) {
      expected.push(hash);
      try {
        if (replace) history.replaceState(null, '', url);
        else location.hash = hash;
      } catch (err2) {
        location.hash = hash;
      }
    }
  }

  function updateBackButton() {
    const btn = T.$('#navback');
    if (!btn) return;
    const show = stack.length > 1 && T.screen !== 'home' && T.screen !== 'g';
    btn.hidden = !show;
    btn.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function apply(screen, opts) {
    opts = opts || {};
    const prev = T.screen;
    if (prev === 'g' && screen !== 'g') {
      // Voltar do navegador no meio da luta também precisa encerrá-la.
      if (T.stopLoop) T.stopLoop();
      if (T.clearHitBars) T.clearHitBars();
      T.G = null;
      const end = T.$('#end');
      if (end) end.style.display = 'none';
      const prep = T.$('#prep');
      if (prep) prep.style.display = 'none';
    }
    T.show(screen);
    if (screen === 'menu' && T.renderMenu && !opts.noRender) T.renderMenu();
    updateBackButton();
    onApply.slice().forEach(fn => {
      try { fn(screen, prev, opts); } catch (err) { /* um hook não derruba os outros */ }
    });
  }

  function go(screen, opts) {
    opts = opts || {};
    if (SCREENS.indexOf(screen) < 0) return;
    if (screen === T.screen && !opts.force) return;

    // A luta é efêmera: volta exatamente para a tela que a abriu.
    if (opts.ephemeral) {
      apply(screen, opts);
      return;
    }

    if (opts.replace) stack[stack.length - 1] = screen;
    else stack.push(screen);
    apply(screen, opts);
    if (!opts.noUrl) writeUrl(hashFor(screen), !!opts.replace);
  }

  function reset(screen) {
    const target = SCREENS.indexOf(screen) >= 0 ? screen : 'home';
    stack = [target];
    apply(target, { replace: true });
    writeUrl(hashFor(target), true);
  }

  function back() {
    const at = stack.length > 1 ? stack.length - 2 : 0;
    const prev = stack[at] || 'home';
    stack.length = at + 1;
    apply(prev, { fromBack: true });
    const hash = hashFor(prev);

    // Harnesses headless definem histSyncBack para não sair do documento.
    if (T.histSyncBack) {
      writeUrl(hash, true);
      return;
    }
    if (currentHash() === hash) return;
    expected.push(hash);
    try { history.back(); } catch (err) { writeUrl(hash, true); }
  }

  function syncFromHash() {
    const hash = currentHash();
    const i = expected.indexOf(hash);
    if (i >= 0) {
      expected.splice(i, 1);
      return;
    }
    const screen = screenFromHash(hash);
    if (!screen || screen === T.screen) return;
    const k = stack.lastIndexOf(screen);
    stack = k >= 0 ? stack.slice(0, k + 1) : [screen];
    apply(screen, { fromHash: true });
  }

  function boot() {
    const screen = screenFromHash(currentHash()) || 'home';
    stack = [screen];
    apply(screen, { fromBoot: true });
  }

  window.addEventListener('hashchange', syncFromHash);
  window.addEventListener('popstate', syncFromHash);

  const addOnApply = fn => {
    if (typeof fn === 'function' && onApply.indexOf(fn) < 0) onApply.push(fn);
  };

  T.nav = {
    go, back, reset, boot, addOnApply,
    get stack() { return stack.slice(); },
    set onApply(fn) { addOnApply(fn); },
    get onApply() { return onApply.slice(); }
  };
  T.go = go;
  T.back = back;
  T.goHome = () => reset('home');
  T.histBoot = boot;

  const navBack = T.$('#navback');
  if (navBack) navBack.addEventListener('click', () => back());
})(window.TBB = window.TBB || {});
