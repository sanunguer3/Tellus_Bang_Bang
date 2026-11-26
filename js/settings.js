// Configurações da tela inicial: volumes e atalhos de teclado.
// Tudo fica no fluxo do #home; não há nova rota nem empilhamento de navegação.
(function (T) {
  'use strict';

  const panel = T.$('#homeSettings');
  const toggle = T.$('#hsettings');
  let capturing = null;

  const esc = s => T.esc ? T.esc(String(s == null ? '' : s)) : String(s == null ? '' : s);
  const keyLabel = k => {
    const s = String(k || '');
    if (!s) return '—';
    return s === ' ' ? 'Espaço' : s.charAt(0).toUpperCase() + s.slice(1);
  };

  function render() {
    if (!panel) return;
    const audio = T.audio || {};
    const rows = (T.KEY_ACTIONS || []).map(a =>
      `<div class="keyrow"><span>${esc(a.label)}</span>` +
      `<button type="button" class="sm keycap" data-key="${esc(a.id)}" ` +
      `aria-label="Alterar tecla de ${esc(a.label)}">${keyLabel(T.keys[a.id])}</button></div>`
    ).join('');
    panel.innerHTML =
      '<div class="settings-card">' +
        '<h2>⚙️ Configurações</h2>' +
        '<p class="hint mut">Os ajustes são salvos neste aparelho e na sua nuvem quando você entra.</p>' +
        '<div class="settings-cols">' +
          '<div class="settings-col">' +
            '<h3>🔊 Áudio</h3>' +
            '<div class="row tight"><button type="button" class="sm" id="setmute">' +
              (audio.muted ? '🔇 Silenciado' : '🔊 Ligado') + '</button></div>' +
            '<label class="pause-slider"><span>Voltar som <b id="setvollbl"></b></span>' +
              '<input id="setvol" type="range" min="0" max="100" aria-label="Volume geral"></label>' +
            '<label class="pause-slider"><span>Música <b id="setmusiclbl"></b></span>' +
              '<input id="setmusic" type="range" min="0" max="100" aria-label="Volume da música"></label>' +
            '<label class="pause-slider"><span>Efeitos <b id="setsfxlbl"></b></span>' +
              '<input id="setsfx" type="range" min="0" max="100" aria-label="Volume dos efeitos"></label>' +
          '</div>' +
          '<div class="settings-col">' +
            '<h3>⌨️ Atalhos</h3>' +
            '<p class="hint mut">Clique numa tecla e pressione a nova. Enter, Esc e espaço ficam reservados.</p>' +
            '<div class="keys-grid">' + rows + '</div>' +
            '<div class="row tight"><button type="button" class="sm" id="setkeysreset">Redefinir padrões</button></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    bind();
    syncVolumes();
  }

  function syncVolumes() {
    if (!panel) return;
    const audio = T.audio || {};
    const vals = [
      ['#setvol', '#setvollbl', audio.volume != null ? audio.volume : T.audioVol],
      ['#setmusic', '#setmusiclbl', audio.musicVolume != null ? audio.musicVolume : T.musicVol],
      ['#setsfx', '#setsfxlbl', audio.sfxVolume != null ? audio.sfxVolume : T.sfxVol]
    ];
    vals.forEach(([sel, lbl, value]) => {
      const el = T.$(sel);
      const label = T.$(lbl);
      const pct = Math.round((Number(value) || 0) * 100);
      if (el) el.value = String(pct);
      if (label) label.textContent = pct + '%';
    });
    const mute = T.$('#setmute');
    if (mute) mute.textContent = audio.muted ? '🔇 Silenciado' : '🔊 Ligado';
  }

  function bind() {
    const connect = (sel, fn) => {
      const el = T.$(sel);
      if (!el) return;
      const apply = () => { fn(Number(el.value) / 100); syncVolumes(); };
      el.addEventListener('input', apply);
      el.addEventListener('change', apply);
    };
    const mute = T.$('#setmute');
    if (mute) mute.addEventListener('click', () => {
      if (T.audio) T.audio.toggleMute();
      syncVolumes();
    });
    connect('#setvol', v => T.audio && T.audio.setVolume(v));
    connect('#setmusic', v => T.audio && T.audio.setMusicVolume(v));
    connect('#setsfx', v => T.audio && T.audio.setSfxVolume(v));

    panel.querySelectorAll('[data-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('[data-key]').forEach(b => b.classList.remove('capturing'));
        capturing = btn.getAttribute('data-key');
        btn.classList.add('capturing');
        btn.textContent = '…';
      });
    });
    const reset = T.$('#setkeysreset');
    if (reset) reset.addEventListener('click', () => { T.resetKeys(); render(); });
  }

  // Atualiza também os rótulos dos botões de comando da batalha.
  T.updateKeyLabels = () => {
    if (panel && !panel.hidden) render();
    const labels = {
      def: '#bd', ret: '#br', free: '#bf', atk: '#bu', fin: '#bi', foc: '#bo'
    };
    const names = {
      def: 'Defender', ret: 'Recuar', free: 'Livre',
      atk: 'Atacar', fin: 'Finalizar', foc: 'Focar'
    };
    Object.keys(labels).forEach(id => {
      const el = T.$(labels[id]);
      if (el && T.keys) el.textContent = names[id] + ' (' + keyLabel(T.keys[id]).toUpperCase() + ')';
    });
    const pause = T.$('#pausebtn');
    if (pause && T.keys) {
      pause.setAttribute('aria-label', 'Pausar a batalha (' + keyLabel(T.keys.pause).toUpperCase() + ')');
    }
    if (T.tipsRefresh) T.tipsRefresh();
  };

  // Captura na fase de captura: os handlers de batalha não recebem a tecla.
  document.addEventListener('keydown', e => {
    if (!capturing) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const key = String(e.key || '').toLowerCase();
    if (key !== 'escape') T.setKey(capturing, key);
    capturing = null;
    render();
  }, true);

  if (toggle) toggle.addEventListener('click', () => {
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) render();
  });

  T.openSettings = () => {
    if (!panel) return;
    panel.hidden = false;
    render();
    if (panel.scrollIntoView) panel.scrollIntoView({ block: 'nearest' });
  };

  T.updateKeyLabels();
})(window.TBB = window.TBB || {});
