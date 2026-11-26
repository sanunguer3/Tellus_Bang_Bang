// Núcleo: utilitários, DOM, armazenamento, modais, avisos.
(function (T) {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  T.$ = $;
  T.$$ = $$;

  T.clamp = (v, min, max) => Math.max(min, Math.min(max, +v || 0));
  T.num = (v, fallback) => (Number.isFinite(+v) ? +v : fallback);
  T.rnd = n => Math.floor(Math.random() * n);
  T.choose = arr => arr[T.rnd(arr.length)];
  T.clone = obj => JSON.parse(JSON.stringify(obj));
  T.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) || 0.01;
  T.esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  T.isTyping = () => {
    const el = document.activeElement;
    if (!el) return false;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
    if (el.tagName !== 'INPUT') return false;
    // Sliders, checkboxes e botões não são digitação: os atalhos do jogo
    // continuam funcionando mesmo depois de mexer no volume.
    const type = String(el.type || 'text').toLowerCase();
    return !['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color'].includes(type);
  };

  T.rgba = (hex, alpha) => {
    let h = String(hex || '#9ca3af').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    if (!Number.isFinite(n)) return `rgba(156,163,175,${alpha})`;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  };

  // Armazenamento tolerante a modo privado / cota cheia.
  T.store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }
  };

  T.toast = (message, kind, ms) => {
    const host = $('#toasts');
    if (!host) return;
    const note = document.createElement('div');
    note.className = 'toast ' + (kind || 'info');
    note.textContent = message;
    host.appendChild(note);
    setTimeout(() => {
      note.classList.add('out');
      setTimeout(() => note.remove(), 260);
    }, ms || 3600);
  };

  T.cloudStatus = (text, kind) => {
    ['#cloud', '#ecloud'].forEach(sel => {
      const el = $(sel);
      if (!el) return;
      el.textContent = text || '';
      el.dataset.kind = kind || '';
      el.hidden = !text;
    });
  };

  // Modal acessível: Esc fecha, foco volta ao elemento anterior.
  T._focusBefore = null;
  T._modalIsOpen = false;
  T.modalOpen = () => T._modalIsOpen === true;

  T.openModal = html => {
    const md = $('#md');
    T._modalIsOpen = true;
    T._focusBefore = document.activeElement;
    md.innerHTML = html;
    md.style.display = 'flex';
    md.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const focusable = md.querySelector('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus({ preventScroll: true });
  };

  T.closeModal = () => {
    const md = $('#md');
    if (!T._modalIsOpen && md.style.display === 'none') return;
    T._modalIsOpen = false;
    md.style.display = 'none';
    md.innerHTML = '';
    md.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (T._focusBefore && typeof T._focusBefore.focus === 'function') {
      T._focusBefore.focus({ preventScroll: true });
    }
  };

  document.addEventListener('click', e => {
    if (e.target.id === 'md' || (e.target.closest && e.target.closest('[data-close]'))) {
      T.closeModal();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && T.modalOpen()) {
      e.preventDefault();
      T.closeModal();
    }
  });

  // Throttle simples baseado em requestAnimationFrame.
  T.frameThrottle = fn => {
    let queued = false;
    return (...args) => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        fn(...args);
      });
    };
  };

  T.changeText = (el, text) => {
    if (el && el.textContent !== text) el.textContent = text;
  };

  T.setWidth = (el, percent) => {
    if (!el) return;
    const value = Math.max(0, Math.min(100, percent)).toFixed(1) + '%';
    if (el.dataset.w !== value) {
      el.dataset.w = value;
      el.style.width = value;
    }
  };
})(window.TBB = window.TBB || {});
