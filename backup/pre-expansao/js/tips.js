// Tooltips (mouse e toque), descrição de habilidades e tela de ajuda.
(function (T) {
  'use strict';

  T.skDesc = s => {
    const m = +s.mult || 1;
    const mode = s.mode;
    const ef = s.ef || {};
    const tier = T.TIER[s.tier];
    const parts = [];
    const target = mode === 'contato'
      ? `inimigos a até ${s.rad} de si`
      : mode === 'proj'
        ? `o 1º inimigo atingido pelo projétil (alcance ${s.rng})`
        : `o inimigo mais próximo (até ${s.rng})`;

    if (tier) parts.push(`${tier.icon} ${tier.n}.`);
    if (s.cat === 'dano') parts.push(`Causa ${m}× o ataque em ${target}.`);
    if (s.cat === 'debuff') {
      if (ef.slow) parts.push(`Aplica os efeitos abaixo em ${target}.`);
      else parts.push(`Deixa ${target} lento por ${(3 * m).toFixed(1)}s.`);
    }
    if (s.cat === 'buff') {
      parts.push(`Dá +30% de ataque e velocidade por ${(5 * m).toFixed(1)}s ${ef.area ? `aos aliados a até ${s.rad}` : 'a si mesmo'}.`);
    }
    if (ef.push) parts.push(`Empurra ${target} (força ×${m}).`);
    if (ef.area && mode !== 'contato' && (s.cat === 'dano' || s.cat === 'debuff')) {
      parts.push(`Atinge em área (raio ${s.rad}) ao redor do alvo.`);
    }
    if (ef.burn) parts.push(`🔥 Queima por ${(T.EFX.burn.dur * m).toFixed(1)}s (dano contínuo).`);
    if (ef.poison) parts.push(`☠️ Envenena por ${(T.EFX.poison.dur * m).toFixed(1)}s (dano contínuo).`);
    if (ef.bleed) parts.push(`🩸 Faz sangrar por ${(T.EFX.bleed.dur * m).toFixed(1)}s (dano contínuo).`);
    if (ef.curse) parts.push(`🌑 Maldiz por ${(T.EFX.curse.dur * m).toFixed(1)}s: +25% de dano recebido e −50% de cura.`);
    if (ef.paralyze) parts.push(`⚡ Paralisa por ${(T.EFX.paralyze.dur * m).toFixed(1)}s.`);
    if (ef.slow) parts.push(`🐌 Deixa lento por ${(T.EFX.slow.dur * m).toFixed(1)}s.`);
    if (ef.shield) {
      parts.push(`🛡️ Escudo de ${Math.round(T.EFX.shield.pct * m * 100)}% da vida por ${(T.EFX.shield.dur * m).toFixed(1)}s.`);
    }
    if (ef.heal) {
      parts.push(`💚 Cura ${Math.round(25 * m)}% da vida ${ef.area ? `dos aliados a até ${s.rad}` : 'do aliado mais ferido'} (se estiver abaixo de 65%).`);
    }
    return (parts.join(' ') || 'Sem efeito.') + ` Recarga ${s.cd}s.`;
  };

  T.chTip = c => {
    if (!c) return '';
    const advTypes = [T.BT[c.t], T.FT[c.f]].filter(Boolean).map(t => T.TN[t]).join(', ') || '—';
    const advFuncs = [T.TF[c.t], T.BF[c.f]].filter(Boolean).map(f => T.FN[f]).join(', ') || '—';
    const disTypes = [...T.inv(T.BT, c.t), ...T.inv(T.FT, c.f)].map(t => T.TN[t]).join(', ') || '—';
    const disFuncs = [...T.inv(T.TF, c.t), ...T.inv(T.BF, c.f)].map(f => T.FN[f]).join(', ') || '—';
    return `<b style="color:${T.TY[c.t]}">${T.esc(c.n)}</b> ${T.TN[c.t]} · ${T.FN[c.f]}<br>` +
      `${T.PN[c.p] || T.esc(c.p)}<br>` +
      `<span class="good">▲ Vantagem contra</span><br>Tipos: ${advTypes}<br>Funções: ${advFuncs}<br>` +
      `<span class="bad">▼ Desvantagem contra</span><br>Tipos: ${disTypes}<br>Funções: ${disFuncs}<br>` +
      `<small>Cada vantagem: +25% de dano causado e −25% de dano recebido.</small>`;
  };

  const tip = T.$('#tip');
  T.hideTip = () => { if (tip) tip.style.display = 'none'; };

  const showTip = (html, clientX, clientY) => {
    if (!tip || !html) return;
    tip.innerHTML = html;
    tip.style.display = 'block';
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    tip.style.left = Math.max(4, Math.min(innerWidth - w - 4, clientX + 14)) + 'px';
    tip.style.top = Math.max(4, Math.min(innerHeight - h - 4, clientY + 14)) + 'px';
  };
  T.showTip = showTip;

  T.unitAt = e => {
    if (!T.G) return null;
    const cv = T.$('#cv');
    const b = cv.getBoundingClientRect();
    const x = (e.clientX - b.left - T.cw / 2) / T.sc;
    const y = (e.clientY - b.top - T.ch / 2) / T.sc;
    return T.G.us
      .filter(u => u.alive && Math.hypot(u.x - x, u.y - y) < 22)
      .sort((a, c) => Math.hypot(a.x - x, a.y - y) - Math.hypot(c.x - x, c.y - y))[0] || null;
  };

  function tipFor(el, e) {
    if (el.dataset.si !== undefined && T.G && T.G.us[+el.dataset.u]) {
      const u = T.G.us[+el.dataset.u];
      const s = u.ss[+el.dataset.si];
      if (s) {
        const ti = T.TIER[s.tier] || T.TIER.normal;
        return `<b>${ti.icon} ${T.esc(s.n)}</b> ${ti.n} ${T.SCAT[s.cat]}${s.mode && s.cat !== 'buff' ? ' · ' + T.SMODE[s.mode] : ''}<br>${T.skDesc(s)}`;
      }
    }
    if (el.dataset.u !== undefined && T.G && T.G.us[+el.dataset.u]) {
      return T.chTip(T.G.us[+el.dataset.u].c);
    }
    if (el.dataset.c) return T.chTip(T.byName(el.dataset.c));
    if (el.dataset.e !== undefined && T.RO[+el.dataset.e]) return T.chTip(T.RO[+el.dataset.e]);
    if (el === T.$('#cv')) {
      const u = T.unitAt(e);
      return u ? T.chTip(u.c) : '';
    }
    return '';
  }

  // Desktop: tooltip segue o mouse.
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const t = e.target;
    if (!t.closest) return;
    const el = t.closest('[data-si],[data-u],[data-c],[data-e]') || (t.id === 'cv' ? t : null);
    if (!el) { T.hideTip(); return; }
    const html = tipFor(el, e);
    if (html) showTip(html, e.clientX, e.clientY);
    else T.hideTip();
  });

  document.addEventListener('mouseleave', T.hideTip);
  window.addEventListener('scroll', T.hideTip, true);

  // Toque: pressionar e segurar mostra a dica.
  let pressTimer = 0;
  let pressed = null;

  const cancelPress = () => {
    clearTimeout(pressTimer);
    pressed = null;
  };

  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    const t = e.target;
    if (!t.closest) return;
    const el = t.closest('[data-si],[data-u],[data-c],[data-e]');
    if (!el) return;
    pressed = el;
    pressTimer = setTimeout(() => {
      if (pressed !== el) return;
      const html = tipFor(el, e);
      if (html) showTip(html, e.clientX, e.clientY);
    }, 380);
  });

  document.addEventListener('pointerup', cancelPress);
  document.addEventListener('pointercancel', cancelPress);
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') cancelPress();
  });
  document.addEventListener('scroll', cancelPress, true);

  // ---- Tela de ajuda ----
  T.helpHtml = () => {
    const typeRows = Object.keys(T.TN).map(t =>
      `<tr><td>${T.TN[t]}</td><td>${T.TN[T.BT[t]]}</td><td>${T.FN[T.TF[t]]}</td></tr>`
    ).join('');
    const funcRows = Object.keys(T.FN).map(f =>
      `<tr><td>${T.FN[f]}</td><td>${T.TN[T.FT[f]]}</td><td>${T.FN[T.BF[f]]}</td></tr>`
    ).join('');
    const persRows = Object.keys(T.PD).map(p =>
      `<li>${T.PD[p]}</li>`
    ).join('');
    const efRows = Object.keys(T.EFN).map(ef =>
      `<li><b>${T.EFN[ef]}</b> — ${T.efDesc(ef)}</li>`
    ).join('');

    return `<h1>Como jogar</h1>
      <div class="note"><b>Objetivo:</b> monte um time de até 3 campeões e seja o último time com alguém vivo. Os outros times são controlados pela IA.</div>
      <h2>Controles e ordens</h2>
      <ul>
        <li><b>Líder (★):</b> só ele recebe ordens. Troque com <b>A/D</b>, <b>1–3</b> ou tocando no cartão do time.</li>
        <li><b>J/K/L/U/I/O</b> ou os botões: Defender, Recuar, Livre, Atacar, Finalizar, Focar.</li>
        <li><b>Uma ordem por vez:</b> enquanto a ordem atual durar, os outros comandos ficam bloqueados. <b>Livre</b> é a exceção: ela cancela a ordem ativa.</li>
        <li>Duração das ordens: Defender 5s, Recuar 3,5s, Atacar 4s, Finalizar 3s, Focar 8s.</li>
        <li>Tocar num inimigo na arena dá a ordem <b>Focar</b> nele.</li>
        <li><b>Obediência:</b> cada ordem pode ser ignorada (o valor aparece no editor). Uma ordem ignorada deixa o campeão livre, mas há uma pequena pausa antes da próxima tentativa.</li>
        <li><b>Trocar a etiqueta</b> (tank/dps/suporte) de um campeão: toque no chip dele na sala de batalha.</li>
      </ul>
      <h2>Arena</h2>
      <p>Depois de ${T.BAL.shrinkStart}s o muro começa a fechar. Quando chega ao mínimo, todos perdem ${T.BAL.collapseDps} de vida por segundo: quem ficar por último vence.</p>
      <h2>Vida, raridade e pontos</h2>
      <p>Todo campeão começa com <b>${T.BAL.hpBase} de vida</b> e ${T.BAL.atkBase} de ataque. Comum = 1 ponto, Raro = 5, Épico = 10, Lendário = 15. Cada ponto dá <b>+${T.BAL.hpPer} de vida</b>, <b>+${T.BAL.atkPer} de ataque</b> ou +5% em velocidade/esquiva/crítico/obediência (máx. 76%).</p>
      <h2>Três habilidades</h2>
      <ul>
        <li><b>◆ Normal:</b> a habilidade básica. Recarga de 4–10s e multiplicador até 2,2×.</li>
        <li><b>◆◆ Média:</b> mais forte e/ou com mais efeitos. Recarga de 6–14s e multiplicador até 2,8×.</li>
        <li><b>★ Ultimate:</b> o golpe decisivo. Recarga de 10–22s e multiplicador até 4×.</li>
        <li><b>Dano:</b> causa o multiplicador escolhido.</li>
        <li><b>Debuff:</b> aplica efeitos negativos no alvo (sem dano direto, a menos que marque Chamas/Veneno/Sangramento).</li>
        <li><b>Buff:</b> +30% de ataque e velocidade em si ou nos aliados próximos.</li>
        <li><b>Cura:</b> recupera 25% × multiplicador da vida do aliado mais ferido (ou dos aliados próximos, se marcar Área).</li>
        <li><b>Forma:</b> Contato (raio ao redor de si), Projétil (atinge o primeiro inimigo) ou nenhuma (inimigo mais próximo).</li>
      </ul>
      <h2>Personalidades</h2>
      <ul>${persRows}</ul>
      <h2>Efeitos</h2>
      <ul>${efRows}</ul>
      <h2>Inteligência da IA</h2>
      <p>A IA compara tipo e função de cada alvo, vida restante, distância e ameaça. Ela usa a Ultimate quando vale a pena, aplica efeitos que o alvo ainda não tem e também escolhe ordens táticas: recuar quando está fraca, defender quando cercada, finalizar alvos quase mortos e focar quem tem vantagem contra ela.</p>
      <h2>Vantagens</h2>
      <p>Cada vantagem dá <b>+25%</b> de dano causado e <b>−25%</b> de dano recebido. Um campeão pode ter até 4 vantagens (2 de tipo e 2 de função).</p>
      <div class="tablewrap"><table>
        <thead><tr><th>Tipo</th><th>Tem vantagem sobre o tipo</th><th>e sobre a função</th></tr></thead>
        <tbody>${typeRows}</tbody>
      </table></div>
      <div class="tablewrap"><table>
        <thead><tr><th>Função</th><th>Tem vantagem sobre o tipo</th><th>e sobre a função</th></tr></thead>
        <tbody>${funcRows}</tbody>
      </table></div>
      <div class="row"><button class="go" id="hdone">Entendi</button></div>`;
  };

  T.openHelp = () => {
    const el = T.$('#hcont');
    if (el) el.innerHTML = T.helpHtml();
    T.show('help');
    T.$('#help').scrollTop = 0;
  };
})(window.TBB = window.TBB || {});
