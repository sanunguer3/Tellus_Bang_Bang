// Tooltips (mouse e toque), descrição de habilidades e tela de ajuda.
(function (T) {
  'use strict';

  T.skDesc = s => {
    const m = +s.mult || 1;
    const ef = s.ef || {};
    const tier = T.TIER[s.tier];
    const alvo = Object.hasOwn(T.SALVO, s.alvo) ? s.alvo : T.inferAlvo(s);
    const direct = s.cat === 'buff' || s.cat === 'debuff';
    const parts = [];
    const target = direct
      ? (alvo === 'self' ? 'em si mesmo'
        : alvo === 'ally' ? (ef.area ? `nos aliados a até ${s.rad}` : 'no aliado mais ferido')
          : 'no inimigo atual')
      : s.mode === 'contato'
        ? `nos inimigos a até ${s.rad} de si`
        : s.mode === 'proj'
          ? `no 1º inimigo atingido (alcance ${s.rng})`
          : `no inimigo mais próximo (até ${s.rng})`;

    if (tier) parts.push(`${tier.icon} ${tier.n}.`);
    if (direct) {
      parts.push(`Aplica os efeitos escolhidos ${target}, sem alcance nem projétil.`);
    } else {
      if (s.cat === 'dano') {
        const hits = Math.max(1, Math.round(T.num(s.hits, 1)));
        const gap = Math.max(T.SKILL_RANGE.gapMin, +(s.gap) || T.SKILL_RANGE.gapMin);
        const dmg = T.num(s.mult, 0);
        parts.push(dmg <= 0
          ? `Sem valor de dano definido: causa 0 de dano${target}.`
          : hits > 1
            ? `Causa ${dmg}× o ataque ${target} em ${hits} golpes, a cada ${gap.toFixed(1)}s. ` +
              `A recarga só começa depois do último golpe.`
            : `Causa ${dmg}× o ataque ${target}.`);
      }
      if (ef.area) parts.push(`Atinge em área (raio ${s.rad}) ao redor do alvo.`);
      parts.push('Efeitos ofensivos só funcionam se o golpe acertar.');
    }
    if (s.cat === 'buff' && !ef.power && !s.efv) {
      const c = T.efCfg({ ef: { power: 1 }, mult: m }, 'power');
      parts.push(`Buff legado: +${Math.round(c.p)}% de ataque por ${c.d.toFixed(1)}s (sem velocidade).`);
    }
    Object.keys(T.EFN).forEach(k => {
      if (!ef[k]) return;
      let text = T.efText(k, T.efCfg(s, k));
      if ((k === 'heal' || k === 'shield') && ef.area && !direct) text += ' nos aliados da área';
      parts.push(text + '.');
    });

    return (parts.join(' ') || 'Sem efeito.') +
      ` Prepara ${T.BAL.skillWindup.toFixed(2)}s antes de usar. Recarga ${s.cd}s.`;
  };

  T.chTip = c => {
    if (!c) return '';
    const advTypes = [T.BT[c.t], T.FT[c.f]].filter(Boolean).map(t => T.TN[t]).join(', ') || '—';
    const advFuncs = [T.TF[c.t], T.BF[c.f]].filter(Boolean).map(f => T.FN[f]).join(', ') || '—';
    const disTypes = [...T.inv(T.BT, c.t), ...T.inv(T.FT, c.f)].map(t => T.TN[t]).join(', ') || '—';
    const disFuncs = [...T.inv(T.TF, c.t), ...T.inv(T.BF, c.f)].map(f => T.FN[f]).join(', ') || '—';
    return `<b style="color:${T.TY[c.t]}">${T.esc(c.n)}</b> ${T.TN[c.t]} · ${T.FN[c.f]}<br>` +
      `<small>${T.KINDS[T.isCreature(c) ? 'criatura' : 'campeao']}</small><br>` +
      `${T.PN[c.p] || T.esc(c.p)}<br>` +
      `<span class="good">▲ Vantagem contra</span><br>Tipos: ${advTypes}<br>Funções: ${advFuncs}<br>` +
      `<span class="bad">▼ Desvantagem contra</span><br>Tipos: ${disTypes}<br>Funções: ${disFuncs}<br>` +
      `<small>Cada vantagem: +25% de dano causado e −25% de dano recebido.</small><br>` +
      `<small>${T.PD[c.p] || ''}</small>`;
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

  // Área de toque do standee (72×86 no mundo, desenhado de y+12 para cima).
  // Precisa acompanhar o tamanho do sprite, senão a cabeça e as laterais ficam
  // fora do alvo — e, com campeões empilhados, o toque pega o de trás.
  const HIT_W = 38;       // metade da largura + folga
  const HIT_UP = 80;      // acima dos pés (cabeça e chapéu)
  const HIT_DOWN = 18;    // chão em volta dos pés

  T.unitAt = e => {
    if (!T.G) return null;
    const cv = T.$('#cv');
    const b = cv.getBoundingClientRect();
    const x = (e.clientX - b.left - T.cw / 2) / T.sc + (T.camX || 0);
    const y = (e.clientY - b.top - T.ch / 2) / T.sc + (T.camY || 0);
    // Quem está mais à frente (y maior) é desenhado por cima e vence o toque;
    // a distância só desempata unidades praticamente na mesma linha.
    let best = null;
    let bestScore = -Infinity;
    T.G.us.forEach(u => {
      if (!u.alive) return;
      const dx = x - u.x;
      const dy = y - u.y;
      if (Math.abs(dx) > HIT_W || dy > HIT_DOWN || dy < -HIT_UP) return;
      const score = u.y * 1000 - Math.hypot(dx, dy);
      if (score > bestScore) { bestScore = score; best = u; }
    });
    return best;
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
      `<li><b>${T.EFN[ef]}</b> — ${T.esc(T.efDesc(ef))} <small>Base: ${T.esc(T.efBasis(ef))}</small></li>`
    ).join('');
    const modeHelp = {
      historia: 'aventura em estágios: você escolhe 1 campeão comum vindo da nuvem para começar; os demais são comprados na loja com moedas ganhas nas vitórias. A coleção distribui pontos; a cor é comprada na loja e fica travada. Só aqui as vitórias dão XP e moedas; a dificuldade sobe a cada luta.',
      classico: 'uma batalha por vez. O último time com alguém vivo vence.',
      infinito: 'ao vencer, você escolhe se quer ir para a próxima rodada. A IA fica mais forte a cada uma.',
      sobrevivencia: 'criaturas fracas (no máximo metade de um campeão comum) chegam por tempo; campeões fortes aparecem de vez em quando e ficam mais comuns com o tempo. A arena não fecha.'
    };
    const modeRows = Object.keys(T.MODES).map(k =>
      `<li><b>${T.MODES[k]}</b> — ${modeHelp[k] || ''}</li>`
    ).join('');
    const aiRows = Object.keys(T.AI_LEVELS).map(k => {
      const ai = T.AI_LEVELS[k];
      return `<li><b>${ai.icon} ${ai.n}</b> — vida ${Math.round(ai.hp * 100)}%, ataque ${Math.round(ai.atk * 100)}%, ` +
        `crítico ${ai.crit >= 0 ? '+' : ''}${ai.crit}%, esquiva ${ai.dodge >= 0 ? '+' : ''}${ai.dodge}%, ` +
        `reação ${ai.reaction.toFixed(2)}× e ${Math.round(ai.orderChance * 100)}% de chance de usar ordens.</li>`;
    }).join('');
    const boxRows = Object.keys(T.BOXES).map(k => {
      const b = T.BOXES[k];
      return `<li><b>${b.icon} ${b.n}</b> — ${b.desc}.</li>`;
    }).join('');
    const arenaRows = T.ARENAS.map(a =>
      `<li><b>${a.icon} ${a.n}</b> — ${a.hazard === 'none' ? 'sem perigo próprio' : 'perigo: ' + a.hz}.</li>`
    ).join('');

    return `<h1>Como jogar</h1>
      <div class="note"><b>Objetivo:</b> monte um time de até 3 campeões e vença a IA. A IA sempre usa a mesma quantidade de campeões que você.</div>
      <h2>Conta e nuvem</h2>
      <p>Use <b>🔑 Entrar</b> na tela inicial para criar uma conta ou entrar com e-mail e senha. Sua conta salva no navegador <b>e na nuvem</b>: elenco, time escolhido, modo, dificuldade, arena, tema e câmera. Sem login o jogo continua funcionando só neste navegador.</p>
      <p>A conta <b>${T.esc(T.OWNER_EMAILS[0] || '')}</b> é a do dono. Ela vê o botão <b>🛡️ Painel do dono</b> (também no editor), pode <b>alterar fichas publicadas por outros jogadores</b> e também apagá-las. Nenhum outro jogador vê esse botão. Para a permissão valer de verdade, publique as regras em <code>firestore.rules</code> no Firebase.</p>
      <h2>Elenco e banco</h2>
      <p>O jogo começa com o <b>elenco vazio</b>. Os campeões prontos ficam no <b>Banco</b>: na Sala de batalha ou no editor, use <b>📥 Importar banco</b> para trazê-los. Você também pode criar campeões no editor. Sem nenhum campeão no elenco não dá para entrar numa batalha.</p>
      <h2>Modos de jogo</h2>
      <ul>${modeRows}</ul>
      <h2>Modo história</h2>
      <p>Abra <b>📖 Modo história</b> na tela inicial. Ele usa <b>os mesmos campeões</b> do elenco normal, mas com nível, XP, pontos e filtro de cor próprios. Na <b>Aventura</b> você enfrenta estágios cada vez mais difíceis; cada vitória dá moedas e um pouco de XP para <b>todo o time usado</b>. Na <b>Loja</b> você compra campeões soltos, baús com conteúdo aleatório (campeão, moedas ou XP) e <b>cores</b> (sem filtro, prata, dourado ou cor fixa). Na <b>Coleção</b> você distribui os pontos ganhos ao subir de nível e vê a cor já comprada; a cor <b>não</b> pode ser escolhida na criação de campeões nem na coleção. Depois de comprada, ela nunca mais muda nas lutas da história. Novas seções aparecerão no futuro.</p>
      <p>Na sobrevivência os inimigos comuns são <b>criaturas</b> (zumbis, demônios e criaturas): classes separadas dos campeões, sem nerf por pontos e com no máximo <b>${Math.round(T.BAL.creaturePower * 100)}% da força de um campeão comum</b>. Reforços surgem por tempo: o intervalo começa em ${T.SURVIVAL.spawnStart}s e cai até ${T.SURVIVAL.spawnMin}s. De tempos em tempos um <b>campeão forte</b> entra na arena (a partir de ${T.SURVIVAL.champFirst}s, depois a cada ${T.SURVIVAL.champEvery}s); campeões nunca são gerados por habilidades — só criaturas.</p>
      <h2>Controles e ordens</h2>
      <ul>
        <li><b>Posicionamento:</b> antes da luta você tem <b>${T.BAL.prepTime}s</b> para arrastar seus campeões pela arena. Use <b>▶ Iniciar agora</b> para começar antes.</li>
        <li><b>Líder (★):</b> só ele recebe ordens. Troque com <b>A/D</b>, <b>1–3</b> ou tocando no cartão do time.</li>
        <li><b>J/K/L/U/I/O</b> ou os botões: Defender, Recuar, Livre, Atacar, Finalizar, Focar.</li>
        <li><b>Uma ordem por vez:</b> enquanto a ordem atual durar, os outros comandos ficam bloqueados. <b>Livre</b> é a exceção: ela cancela a ordem ativa.</li>
        <li>Duração das ordens: Defender 5s, Recuar 3,5s, Atacar 4s, Finalizar 3s, Focar 8s.</li>
        <li>Tocar num inimigo na arena (ou no cartão dele) dá a ordem <b>Focar</b> nele.</li>
        <li><b>Obediência:</b> cada ordem pode ser ignorada (o valor aparece no editor). Uma ordem ignorada deixa o campeão livre, mas há uma pequena pausa antes da próxima tentativa.</li>
        <li><b>Trocar a etiqueta</b> (tank/dps/suporte) de um campeão: toque no chip dele na sala de batalha.</li>
        <li><b>Clique dentro da arena:</b> tocar num ponto vazio faz só o <b>líder selecionado</b> querer ir naquela direção. É uma intenção fraca (5s), não uma perseguição; o ponto aparece tracejado.</li>
        <li><b>Arraste fora da arena:</b> clicar no cenário fora do círculo e arrastar move a câmera. Para voltar ao centro, use <b>⌖</b> no canto da arena.</li>
        <li><b>Zoom:</b> use a roda do mouse sobre a arena ou os botões <b>−</b> / <b>+</b> no canto. O valor aparece entre eles e fica salvo nas configurações.</li>
        <li><b>Pop das habilidades:</b> ao usar qualquer habilidade a sprite do campeão dá uma leve aumentada e volta ao normal, para o golpe ficar bem evidente. A ultimate do líder selecionado ainda dá uma leve aproximação da câmera nele.</li>
        <li><b>Só sprites:</b> o botão <b>✨ Efeitos</b> (também na Sala de batalha) desliga brasões, avisos, números, perigos e caixas. Continuam visíveis as sprites, a arena, as barras de vida e as informações de comando.</li>
        <li><b>Times no topo:</b> a borda de cada cartão mostra a cor do time — 🔴 time 1, 🟢 time 2, 🟣 time 3 — igual à aura e ao anel na arena.</li>
        <li><b>Fim de luta:</b> se o seu time cair, o resultado abre na hora, mesmo com 3 ou 4 times. Você pode <b>Finalizar</b>, <b>Recomeçar</b> ou <b>Trocar time</b>; ao vencer aparecem as mesmas opções (e <b>Próxima rodada</b> no infinito ou <b>Próxima luta</b> na história). No modo história o botão <b>📖 História</b> volta para a loja, aventura e coleção.</li>
      </ul>
      <h2>Arena</h2>
      <p>O raio da arena cresce com o total de campeões (${T.BAL.arenaBase} + ${T.BAL.arenaPer} por campeão, até ${T.BAL.arenaMax}) e depois recebe o multiplicador de cenário de <b>${Math.round(T.BAL.arenaScale * 100)}%</b>, ficando 35% maior em todos os modos. Depois de ${T.BAL.shrinkStart}s o muro começa a fechar. Quando chega ao mínimo, todos perdem ${T.BAL.collapseDps} de vida por segundo: quem ficar por último vence. No modo <b>Sobrevivência a arena nunca diminui</b>.</p>
      <h2>Câmera</h2>
      <p>Na Sala de batalha escolha <b>🎯 Fixa</b> (sempre o centro da arena) ou <b>👣 Seguir líder</b>. Seguir líder dá um leve zoom e mantém o campeão selecionado no centro; os cartões e comandos continuam iguais. Durante a luta você pode aproximar/afastar com a roda do mouse ou com os botões <b>+</b>/<b>−</b>, arrastar fora da arena para deslocar a visão e <b>⌖</b> para recentralizar. Tudo isso é salvo junto com seu perfil. Quando o <b>líder selecionado</b> usa a ultimate, a câmera dá uma leve aproximada nele por alguns instantes e depois volta ao enquadramento normal.</p>
      <h2>Dificuldade da IA</h2>
      <ul>${aiRows}</ul>
      <p>A IA compara tipo e função de cada alvo, vida, distância e ameaça, e usa as habilidades com uma pequena pausa de preparação. Nas dificuldades maiores ela reage mais rápido, usa ordens táticas e escolhe habilidades melhores. Os campeões não correm direto para o inimigo: eles vagueiam pela arena e só se aproximam de verdade quando vão atacar.</p>
      <h2>Caixas de bônus</h2>
      <p>Caixas aparecem pela arena a cada poucos segundos. Qualquer campeão pode pegá-las. Um <b>crítico</b> (de qualquer time) também deixa uma caixa perto de quem criticou. Campeões <b>mesquinhos</b> enxergam caixas de longe e são atraídos por elas.</p>
      <ul>${boxRows}</ul>
      <h2>Arenas temáticas</h2>
      <ul>${arenaRows}</ul>
      <p>Além dos perigos próprios, habilidades com efeitos de cenário criam zonas no chão que afetam <b>todos</b> — inclusive quem criou. Quando uma habilidade tem mais de um efeito de cenário, <b>todas as zonas existem ao mesmo tempo</b>. Além de fogo, gelo, choque, vento e espinhos, existem <b>🌑 maldição local</b> (presa naquele espaço, aumenta o dano recebido), <b>☠️ veneno</b>, <b>🕳️ atoleiro</b> (prende e deixa lento) e <b>🩸 dreno de vida</b> (suga vida para o criador da zona). A vida dos inimigos atingidos aparece no canto direito da arena.</p>
      <h2>Vida, raridade e pontos</h2>
      <p>Todo campeão começa com <b>${T.BAL.hpBase} de vida</b> e ${T.BAL.atkBase} de ataque. Pontos iniciais: <b>Comum ${T.LV.comum}</b>, <b>Raro ${T.LV.raro}</b>, <b>Épico ${T.LV.epico}</b> e <b>Lendário ${T.LV.lendario}</b>. O nível concede mais pontos e, no <b>${T.LVLMAX}º</b>, todas as raridades chegam a <b>${T.pointsFor({ r: 'comum', lvl: T.LVLMAX })} pontos</b> — um comum no máximo tem a mesma somatória de um lendário no máximo. Cada ponto dá <b>+${T.BAL.hpPer} de vida</b>, <b>+${T.BAL.atkPer} de ataque</b> ou +5% em velocidade/esquiva/crítico/obediência (máx. 76%). Valores negativos devolvem pontos, mas aplicam <b>${Math.round(T.BAL.nerfFixed * 100)}% de nerf fixo</b> mais <b>${Math.round(T.BAL.nerfPer * 1000) / 10}% por ponto negativo</b> em vida, ataque, esquiva, crítico, obediência e movimento. O sinal ⚠ aparece no cartão, na ficha e sobre o boneco.</p>
      <h2>Nível e XP</h2>
      <p>O nível vai de <b>1</b> a <b>${T.LVLMAX}</b>. Para subir do nível N para N+1 são necessários <b>50 × N XP</b> (${T.xpNeed(1)} XP para o nível 2, ${T.xpNeed(2)} para o 3, e assim por diante). A XP acumulada converte em nível automaticamente. Em cada subida de nível você ganha mais pontos para distribuir. O sistema já existe no editor — use o botão <b>+50 XP</b> na aba de atributos para testar. Em batalha, <b>somente o modo história concede XP</b>; os outros modos continuam sem XP.</p>
      <h2>Três habilidades</h2>
      <ul>
        <li><b>◆ Normal / ◆◆ Média / ★ Ultimate:</b> três níveis fixos. Recarga de ${T.SKILL_RANGE.cdMin}–${T.SKILL_RANGE.cdMax}s; em ataques o multiplicador vai de ${T.SKILL_RANGE.multMin}× a ${T.SKILL_RANGE.multMax}×. Em buffs, debuffs e cura não há multiplicador da habilidade: cada efeito tem sua própria força.</li>
        <li><b>Alvo:</b> escolha <b>👤 Você</b>, <b>🤝 Aliados</b> ou <b>👾 Inimigo atual</b>. Buffs e debuffs funcionam direto nesse alvo, sem alcance nem projétil.</li>
        <li><b>Dano:</b> causa o multiplicador escolhido; se ele ficar vazio/zero, o dano é <b>0</b> (não vira ataque normal). Use <b>🔁 Hits</b> (a partir de ${T.SKILL_RANGE.hitsMin}, <b>sem máximo</b>) e <b>⏱️ Intervalo</b> (${T.SKILL_RANGE.gapMin}–${T.SKILL_RANGE.gapMax}s) para bater em sequência: a recarga só começa depois do último golpe. Forma, alcance e velocidade do projétil continuam valendo; efeitos ofensivos só funcionam se o golpe acertar.</li>
        <li><b>Efeitos sob demanda:</b> use <b>+ Adicionar efeito</b> no editor, selecione os desejados e ajuste duração e força de cada um. A descrição diz o que faz e em que se baseia. Força e duração são individuais — mexer num efeito não altera os outros.</li>
        <li><b>Debuff:</b> aplica os efeitos escolhidos no inimigo atual, sem exigir acerto.</li>
        <li><b>Buff:</b> aplica os efeitos escolhidos em você ou nos aliados. 💥 <b>Impulso</b> aumenta só o dano; para velocidade use ⚡ Vel. ataque.</li>
        <li><b>Empurrão:</b> habilidades com 🌬️ jogam o alvo para trás e o deixam sem andar por um instante.</li>
        <li><b>Campo e criaturas:</b> 🐣 gera criaturas no local do alvo (nunca campeões). 🌍 Fogo, gelo, choque, vento e espinhos criam zonas iguais aos perigos das arenas, no ponto escolhido, afetando todos que entrarem — inclusive você.</li>
        <li><b>Sem inversão:</b> efeitos negativos nunca curam o inimigo: dano contínuo e maldições caem sempre no inimigo; cura, escudo e buffs ficam só nos aliados.</li>
      </ul>
      <h2>Personalidades</h2>
      <ul>${persRows}</ul>
      <h2>Efeitos</h2>
      <ul>${efRows}</ul>
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
    T.go('help');
    T.$('#help').scrollTop = 0;
  };
})(window.TBB = window.TBB || {});
