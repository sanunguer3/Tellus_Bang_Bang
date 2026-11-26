// Editor de campeões: criar, editar, duplicar, publicar e excluir.
(function (T) {
  'use strict';

  T.editor = { idx: 0, champ: null, dirty: false, query: '', pick: null, kindFilter: 'all' };

  const msg = text => {
    const el = T.$('#em');
    if (el) el.textContent = text || '';
  };

  const markDirty = () => {
    T.editor.dirty = true;
  };

  const blank = () => {
    const c = { n: '', t: 'neutro', f: 'outro', r: 'comum', tag: 'dps', p: 'corajosa', lvl: 1, xp: 0 };
    c.up = T.rollUp(c);
    c.sks = T.defaultSkills(c);
    return c;
  };

  const opts = (obj, selected) => Object.keys(obj).map(key =>
    `<option value="${T.esc(key)}"${key === selected ? ' selected' : ''}>${T.esc(obj[key])}</option>`
  ).join('');

  const fmtNum = n => String(Math.round((+n || 0) * 10) / 10);

  function addEffect(s, key) {
    const meta = T.EFMETA[key];
    if (!meta || !s || s.ef[key]) return false;
    s.ef[key] = 1;
    if (meta.d != null || meta.p != null) {
      const def = T.efDefault(key);
      s.efv = s.efv || {};
      s.efv[key] = { d: def.d, p: def.p };
    }
    return true;
  }

  function removeEffect(s, key) {
    if (!s || !s.ef[key]) return;
    delete s.ef[key];
    if (s.efv) {
      delete s.efv[key];
      if (!Object.keys(s.efv).length) delete s.efv;
    }
  }

  function uniqueName(base) {
    const stem = String(base || 'Cópia').slice(0, 8);
    let i = 2;
    let name = (stem + ' ' + i).slice(0, 12);
    while (T.RO.some(c => c.n.toLowerCase() === name.toLowerCase())) {
      i++;
      name = (stem + ' ' + i).slice(0, 12);
    }
    return name;
  }

  function loadSprite(file, size, cb) {
    if (!file) return;
    if (!/^image\//.test(file.type || '') || file.size > 8 * 1024 * 1024) {
      T.toast('Escolha uma imagem de até 8 MB.', 'warn');
      return;
    }
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const g = canvas.getContext('2d');
      // Mantém a imagem inteira (sem cortar em círculo/quadrado).
      const ratio = Math.min(size / im.width, size / im.height);
      const dw = Math.max(1, im.width * ratio);
      const dh = Math.max(1, im.height * ratio);
      g.drawImage(im, (size - dw) / 2, (size - dh) / 2, dw, dh);
      let data = canvas.toDataURL('image/png');
      if (data.length > T.MAXIMG) {
        const smaller = document.createElement('canvas');
        smaller.width = smaller.height = Math.min(48, size);
        smaller.getContext('2d').drawImage(canvas, 0, 0, smaller.width, smaller.height);
        data = smaller.toDataURL('image/png');
      }
      if (data.length > T.MAXIMG) {
        T.toast('Imagem grande demais. Use uma imagem menor.', 'warn');
        return;
      }
      cb(data);
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      T.toast('Não foi possível ler essa imagem.', 'err');
    };
    im.src = url;
  }

  function renderList() {
    const host = T.$('#el');
    if (!host || !T.editor.champ) return;
    const q = T.editor.query.trim().toLowerCase();
    const kf = T.editor.kindFilter;
    const items = T.RO.map((c, i) => ({ c, i })).filter(({ c }) =>
      (!q || c.n.toLowerCase().includes(q)) &&
      (kf === 'all' || (kf === 'criatura') === T.isCreature(c)));
    const filters = [['all', 'Todos'], ['campeao', '🏆 Campeões'], ['criatura', '👾 Criaturas']]
      .map(([k, label]) =>
        `<button class="sm${kf === k ? ' go' : ''}" data-kindfilter="${k}" aria-pressed="${kf === k}">${label}</button>`
      ).join('');
    host.innerHTML = `<div class="ed-kind-filter row tight">${filters}</div>` +
      items.map(({ c, i }) =>
      `<div class="card${i === T.editor.idx ? ' on' : ''}" tabindex="0" role="button" data-e="${i}" aria-pressed="${i === T.editor.idx}">` +
      `${T.av(c)}<b style="color:${T.TY[c.t]}">${T.esc(c.n)}</b>` +
      `<small>${T.TN[c.t]} · ${T.FN[c.f]}</small>` +
      `<small>${T.KINDS[T.isCreature(c) ? 'criatura' : 'campeao']}</small>` +
      `${c.id ? '<span class="chip cloud" title="Na nuvem">☁️</span>' : ''}` +
      `</div>`
    ).join('') +
      `<div class="card${T.editor.idx < 0 ? ' on' : ''}" tabindex="0" role="button" data-e="-1" aria-pressed="${T.editor.idx < 0}">` +
      `<b>+ Novo</b><small>Criar campeão</small></div>`;
  }

  function previewAvatar(c) {
    const face = c.sprite && T.OKIMG.test(c.sprite)
      ? `<img src="${c.sprite}" alt="">`
      : T.esc((c.n || '?')[0] || '?');
    return `<span class="av lg" style="background:${T.TY[c.t] || '#9ca3af'}">${face}</span>`;
  }

  const xpText = c => {
    const li = T.levelInfo(c);
    return li.max
      ? `Nível ${li.lvl}/${T.LVLMAX} · MÁX`
      : `Nível ${li.lvl}/${T.LVLMAX} · ${li.xp}/${li.need} XP`;
  };

  function renderForm() {
    const host = T.$('#ef');
    const ed = T.editor;
    const c = ed.champ;
    if (!host || !c) return;
    const scroll = T.$('#ed').scrollTop;
    const tag = c.tag;
    const owner = T.isOwner(c);
    const local = !c.id;
    const shinyOpts = { '': 'Nenhum (sortear)' };
    Object.keys(T.SHINY).forEach(k => { shinyOpts[k] = T.SHINY[k].icon + ' ' + T.SHINY[k].n; });
    const tagOpts = {};
    T.TAGS.forEach(k => { tagOpts[k] = T.TE[k] + ' ' + (T.TAGN[k] || k); });

    const advTypes = [T.BT[c.t], T.FT[c.f]].filter(Boolean).map(t => T.TN[t]).join(', ') || '—';
    const advFuncs = [T.TF[c.t], T.BF[c.f]].filter(Boolean).map(f => T.FN[f]).join(', ') || '—';
    const disTypes = [...T.inv(T.BT, c.t), ...T.inv(T.FT, c.f)].map(t => T.TN[t]).join(', ') || '—';
    const disFuncs = [...T.inv(T.TF, c.t), ...T.inv(T.BF, c.f)].map(f => T.FN[f]).join(', ') || '—';

    const statText = k => T.stv(c, k) + ((k === 'hp' || k === 'atk') ? '' : '%');
    const baseText = k => k === 'hp' ? String(T.BAL.hpBase) : k === 'atk' ? String(T.BAL.atkBase) : k === 'obe' ? '50%' : '1%';
    const incText = k => k === 'hp' ? '+' + T.BAL.hpPer : k === 'atk' ? '+' + T.BAL.atkPer : '+5%';
    const previewStats = T.ST.map(k =>
      `<span><b>${T.SL[k]}</b> <span data-pvstat="${k}">${statText(k)}</span></span>`
    ).join('');

    const calc = T.calc(c);
    const calcHtml =
      `<div class="calc-grid" aria-label="Cálculos em tempo real">` +
        `<div><span>Vida efetiva</span><b data-calc="hpEff">${calc.hpEff}</b></div>` +
        `<div><span>Dano básico</span><b data-calc="dmgBase">${calc.dmgBase}</b></div>` +
        `<div><span>Movimento</span><b data-calc="move">${calc.move}</b></div>` +
        `<div><span>Vel. de ataque</span><b data-calc="atkRate">${calc.atkRate}×</b></div>` +
        `<div><span>Esquiva final</span><b data-calc="dod">${calc.dod}%</b></div>` +
        `<div><span>Crítico final</span><b data-calc="crit">${calc.crit}%</b></div>` +
        `<div><span>Obediência final</span><b data-calc="obe">${calc.obe}%</b></div>` +
        `<div><span>Nerf negativo</span><b data-calc="nerf">${calc.nerf.label || '—'}</b></div>` +
        `<div><span>Pontos livres</span><b data-calc="free">${c.livre ? 'livre' : calc.free}</b></div>` +
      `</div>`;

    const pointsList = Object.keys(T.LV).map(r =>
      `${T.RN[r].split(' ')[1]} ${T.LV[r]}→${T.pointsFor({ r, lvl: T.LVLMAX })}`
    ).join(' · ');

    const stats = T.ST.map(k => {
      const n = c.up[k] || 0;
      return `<div class="card stat">` +
        `<div class="stat-h"><b>${T.SL[k]}</b><span class="stat-val" data-val="${k}">${statText(k)}</span></div>` +
        `<div class="stat-meta"><small>base ${baseText(k)} · ${incText(k)}/ponto</small>` +
        `<span class="stat-pts${n < 0 ? ' neg' : ''}" data-pts="${k}"` +
          ` title="${n < 0 ? 'Atributo negativo: ' + n + ' · nerf ativo' : ''}">` +
          `${n ? (n > 0 ? '+' : '') + n : '—'}</span></div>` +
        `<div class="row tight"><input class="upin" type="number" data-up="${k}" min="${T.UPMIN}" max="${T.UPMAX}" step="1" value="${n}" aria-label="Pontos em ${T.SL[k]}">` +
        `<button data-p="-${k}" aria-label="Diminuir ${k}">−</button>` +
        `<button data-p="+${k}" aria-label="Aumentar ${k}">+</button></div></div>`;
    }).join('');

    const effectRows = (s, i) => {
      const keys = Object.keys(T.EFN).filter(k => s.ef[k]);
      if (!keys.length) return `<p class="hint">Nenhum efeito adicionado. Use <b>+ Adicionar efeito</b> para escolher.</p>`;
      return keys.map(k => {
        const meta = T.EFMETA[k];
        const cfg = T.efCfg(s, k);
        const hasD = meta.d != null;
        const hasP = meta.p != null;
        const pValue = meta.step < 1 ? fmtNum(cfg.p) : String(Math.round(cfg.p));
        return `<div class="ef-row" data-efrow="${k}">` +
          `<div class="ef-row-h"><b>${T.EFN[k]}</b>` +
            `<span class="chip">${T.EFGROUPS[meta.g] || 'Efeito'}</span>` +
            `<button type="button" class="sm danger" data-fxdel="${i}" data-ef="${k}" ` +
              `title="Remover ${T.EFN[k]}">Remover</button></div>` +
          `<div class="ef-row-desc">${T.esc(T.efText(k, cfg))}</div>` +
          `<div class="ef-row-basis"><b>Base:</b> ${T.esc(meta.basis)}</div>` +
          `<div class="ef-row-cfg">` +
            (hasD
              ? `<label title="Duração em segundos.">⏳ Duração (s)` +
                `<input type="number" min="0" max="60" step="0.1" value="${fmtNum(cfg.d)}" ` +
                `data-s="${i}" data-f="efd.${k}"></label>`
              : `<span class="mut">⚡ Efeito imediato</span>`) +
            (hasP
              ? `<label title="${T.esc(meta.basis)}">💪 Força (${T.esc(meta.unit)})` +
                `<input type="number" min="${meta.min}" max="${meta.max}" step="${meta.step}" ` +
                `value="${pValue}" data-s="${i}" data-f="efp.${k}"></label>`
              : '') +
          `</div></div>`;
      }).join('');
    };

    const effectPicker = (i, s) => {
      const groups = {};
      Object.keys(T.EFGROUPS).forEach(g => { groups[g] = []; });
      Object.keys(T.EFN).forEach(k => {
        if (!s.ef[k]) groups[T.EFMETA[k].g].push(k);
      });
      const body = Object.keys(T.EFGROUPS).map(g =>
        `<div class="ef-pick-group"><b>${T.EFGROUPS[g]}</b>` +
        (groups[g].length
          ? `<div class="ef-picks">` + groups[g].map(k =>
              `<label class="ef" title="${T.esc(T.efDesc(k) + ' Base: ' + T.efBasis(k))}">` +
              `<input type="checkbox" data-pick="${k}"> ${T.EFN[k]}</label>`
            ).join('') + `</div>`
          : `<small class="mut">Todos já adicionados.</small>`) +
        `</div>`
      ).join('');
      return `<div class="ef-picker" data-fxpanel="${i}">` +
        `<div class="ef-picker-h"><b>Escolha os efeitos</b>` +
        `<button type="button" class="sm" data-fxcancel="${i}">Fechar</button></div>` +
        `<div class="ef-pick-grid">${body}</div>` +
        `<div class="row tight"><button type="button" class="go sm" data-fxconfirm="${i}">` +
        `Adicionar selecionados</button>` +
        `<small class="mut">Você pode ajustar duração e força depois.</small></div>` +
        `</div>`;
    };

    const skills = c.sks.map((s, i) => {
      const tier = T.TIERS[i];
      const ti = T.TIER[tier];
      const direct = s.cat === 'buff' || s.cat === 'debuff';
      const attack = s.cat === 'dano';
      const hits = attack ? Math.max(1, Math.round(s.hits || 1)) : 1;
      const showMode = !direct;
      return `<div class="card skill tier-${tier}" data-sk="${i}">` +
        `<div class="sk-head"><span class="tier" style="--tc:${ti.color}">${ti.icon} ${ti.n}</span>` +
        `<span class="chip">${T.SCAT[s.cat]}</span>` +
        (attack
          ? `<span class="chip" data-hit="${i}">~${Math.round(calc.atk * T.num(s.mult, 0) * hits)} dano${hits > 1 ? ' ×' + hits : ''}</span>`
          : `<span class="chip">sem dano</span>`) +
        `<button data-sr="${i}" class="sm" title="Voltar esta habilidade ao padrão">↺ Padrão</button></div>` +
        `<div class="fm sk-fields">` +
        `<label>Nome<input data-s="${i}" data-f="n" value="${T.esc(s.n)}" maxlength="12"></label>` +
        `<label>Tipo<select data-s="${i}" data-f="cat">${opts(T.SCAT, s.cat)}</select></label>` +
        `<label title="Onde a habilidade funciona. Buff/debuff não usam alcance nem projétil.">🎯 Alvo` +
          `<select data-s="${i}" data-f="alvo">${opts(T.SALVO, s.alvo || T.inferAlvo(s))}</select></label>` +
        (showMode ? `<label>Forma<select data-s="${i}" data-f="mode">${opts(T.SMODE, s.mode)}</select></label>` : '') +
        (attack
          ? `<label title="Força de cada golpe. 0 = sem dano; 1 = normal; até ${T.SKILL_RANGE.multMax}×.">✖️ Multiplicador<input type="number" min="${T.SKILL_RANGE.multMin}" max="${T.SKILL_RANGE.multMax}" step="0.1" data-s="${i}" data-f="mult" value="${s.mult}"></label>` +
            `<label title="Quantos golpes a habilidade desfere antes de recarregar. Sem limite: use qualquer número inteiro.">🔁 Hits<input type="number" min="${T.SKILL_RANGE.hitsMin}"${Number.isFinite(T.SKILL_RANGE.hitsMax) ? ' max="' + T.SKILL_RANGE.hitsMax + '"' : ''} step="1" data-s="${i}" data-f="hits" value="${hits}"></label>` +
            `<label title="Tempo entre golpes. A recarga só começa depois do último.">⏱️ Intervalo (s)<input type="number" min="${T.SKILL_RANGE.gapMin}" max="${T.SKILL_RANGE.gapMax}" step="0.1" data-s="${i}" data-f="gap" value="${s.gap}"></label>`
          : `<label title="Buffs, debuffs e cura usam a força de cada efeito, não o multiplicador da habilidade.">🎚️ Força dos efeitos<input value="configurada em cada efeito" disabled></label>`) +
        (showMode && s.mode !== 'contato' ? `<label title="Distância máxima para usar a habilidade.">📏 Alcance<input type="number" min="${T.SKILL_RANGE.rngMin}" max="${T.SKILL_RANGE.rngMax}" step="10" data-s="${i}" data-f="rng" value="${s.rng}"></label>` : '') +
        (showMode && s.mode === 'proj' ? `<label title="Quanto mais rápido, mais difícil de esquivar.">🚀 Vel. do projétil<input type="number" min="${T.SKILL_RANGE.pspdMin}" max="${T.SKILL_RANGE.pspdMax}" step="10" data-s="${i}" data-f="pspd" value="${s.pspd}"></label>` : '') +
        (s.mode === 'contato' || s.ef.area ? `<label title="Raio do efeito ao redor do alvo.">⭕ Área (raio)<input type="number" min="${T.SKILL_RANGE.radMin}" max="${T.SKILL_RANGE.radMax}" step="5" data-s="${i}" data-f="rad" value="${s.rad}"></label>` : '') +
        `<label title="Tempo até poder usar de novo (${T.SKILL_RANGE.cdMin}s a ${T.SKILL_RANGE.cdMax}s).">⏱️ Recarga (s)<input type="number" min="${T.SKILL_RANGE.cdMin}" max="${T.SKILL_RANGE.cdMax}" step="0.1" data-s="${i}" data-f="cd" value="${s.cd}"></label>` +
        `<label title="Substitui o boneco enquanto a habilidade é preparada e desferida.">🗡️ Sprite do golpe${s.castSprite ? `<img src="${s.castSprite}" width="20" height="20" alt="">` : ''}` +
        `<input type="file" accept="image/*" data-s="${i}" data-f="cs"></label>` +
        (showMode && s.mode === 'proj'
          ? `<label title="Imagem do disparo.">🚀 Sprite do projétil${s.sprite ? `<img src="${s.sprite}" width="20" height="20" alt="">` : ''}` +
            `<input type="file" accept="image/*" data-s="${i}" data-f="sp"></label>`
          : '') +
        `</div>` +
        `<div class="ef-head"><b>Efeitos</b><small>adicionados sob demanda</small>` +
          `<button type="button" class="sm" data-fxadd="${i}">+ Adicionar efeito</button></div>` +
        `<div class="ef-rows" data-efrows="${i}">${effectRows(s, i)}</div>` +
        (T.editor.pick === i ? effectPicker(i, s) : '') +
        `<div class="sk-desc" data-pv="${i}">${T.skDesc(s)}</div>` +
        `</div>`;
    }).join('');

    host.innerHTML =
      `<div class="ed-top">` +
        `<div class="card ed-prev" aria-label="Prévia do campeão">` +
          `<div class="prev-head">` +
            `${previewAvatar(c)}` +
            `<div class="prev-id">` +
              `<b id="pvname" style="color:${T.TY[c.t]}">${T.esc(c.n) || 'Sem nome'}</b>` +
              `<small>${T.TN[c.t]} · ${T.FN[c.f]}</small>` +
              `<small id="pvlv">${T.RN[c.r]} · nível ${T.lvlOf(c)}/${T.LVLMAX} · ${T.pointsFor(c)} pts</small>` +
              `<div class="row tight"><span class="chip">${T.KINDS[T.isCreature(c) ? 'criatura' : 'campeao']}</span>` +
              `<span class="chip">${T.TE[tag]} ${T.TAGN[tag] || tag}</span>` +
              `<span class="chip">${T.PN[c.p] || T.esc(c.p)}</span></div>` +
            `</div>` +
          `</div>` +
          `<div class="prev-stats">${previewStats}</div>` +
          calcHtml +
          `<div class="prev-adv">` +
            `<div class="advantage">▲ <b>Vantagem:</b> ${advTypes}; ${advFuncs}</div>` +
            `<div class="disadvantage">▼ <b>Desvantagem:</b> ${disTypes}; ${disFuncs}</div>` +
          `</div>` +
          `<div class="note">${local ? '💾 Ainda só neste navegador.' : '☁️ Na nuvem: salvar atualiza a versão publicada.'}</div>` +
        `</div>` +
        `<section class="ed-sec" aria-labelledby="ed-id-h">` +
          `<div class="sec-h"><h2 id="ed-id-h">1 · Identidade</h2><span class="hint">Quem é o campeão</span></div>` +
          `<div class="fm identity">` +
            `<label class="wide"><span class="lbl">Nome <span class="counter" id="fnc">${(c.n || '').length}/12</span></span>` +
            `<input id="fn" value="${T.esc(c.n)}" maxlength="12" placeholder="Ex.: Brasa"></label>` +
            `<label>Tipo<select id="ft">${opts(T.TN, c.t)}</select></label>` +
            `<label>Função<select id="ff">${opts(T.FN, c.f)}</select></label>` +
            `<label>Raridade<select id="fr">${opts(T.RN, c.r)}</select></label>` +
            `<label title="Criaturas não entram no elenco jogável e não sofrem nerf por pontos.">Classe<select id="fcl">${opts(T.KINDS, T.isCreature(c) ? 'criatura' : 'campeao')}</select></label>` +
            `<label>Etiqueta<select id="fg">${opts(tagOpts, c.tag)}</select></label>` +
            `<label>Personalidade<select id="fp">${opts(T.PN, c.p)}</select></label>` +
            `<label class="wide modo-livre" title="Ignora o orçamento de pontos e permite atributos acima de 76%. Ainda vale o nerf de valores negativos.">` +
            `<input type="checkbox" id="flivre"${c.livre ? ' checked' : ''}> 🔓 Modo livre (sem limite de pontos)` +
            `</label>` +
            `<label title="Se escolhido, o campeão sempre aparece com esta cor.">Shiny<select id="fsh">${opts(shinyOpts, c.shiny || '')}</select></label>` +
            `<label title="Imagem normal do campeão na arena.">Sprite do boneco (opcional)<input type="file" id="fs" accept="image/*"></label>` +
          `</div>` +
          `<div class="note">${T.PD[c.p]}</div>` +
          (T.isCreature(c)
            ? `<div class="note warn">👾 Criatura: não entra no elenco jogável, não recebe nerf por pontos e tem no máximo ${Math.round(T.BAL.creaturePower * 100)}% da força de um campeão comum. Só criaturas podem ser geradas por habilidades.</div>`
            : '') +
          (owner ? '' : `<div class="note warn">Somente o criador pode editar ou excluir este campeão. Você pode duplicá-lo.</div>`) +
        `</section>` +
      `</div>` +

      `<section class="ed-sec" aria-labelledby="ed-at-h">` +
        `<div class="sec-h"><h2 id="ed-at-h">2 · Atributos</h2>` +
        `<span class="chip" data-xp>${xpText(c)}</span>` +
        `<button id="addxp" class="sm" data-xp="50"${T.lvlOf(c) >= T.LVLMAX ? ' disabled' : ''}>+50 XP</button>` +
        `<span class="pts">Pontos livres: <b data-points>${c.livre ? 'livre' : T.free(c)}</b></span>` +
        `<span class="chip nerf" data-nerf>${calc.nerf.total ? '⚠ ' + T.esc(calc.nerf.label) : ''}</span>` +
        `<button id="sreset" class="sm"${Object.keys(c.up).some(k => c.up[k]) ? '' : ' disabled'}>Zerar pontos</button></div>` +
        `<p class="hint">Pontos iniciais por raridade: ${pointsList}. O nível concede mais pontos; no ${T.LVLMAX}º todas chegam a ${T.pointsFor({ r: 'comum', lvl: T.LVLMAX })}. ` +
        `Valores negativos devolvem pontos, mas aplicam um nerf global: ` +
        `${Math.round(T.BAL.nerfFixed * 100)}% fixo + ` +
        `${Math.round(T.BAL.nerfPer * 1000) / 10}% por ponto negativo. ` +
        `Cada ponto vale ${incText('hp')} de vida, ${incText('atk')} de ataque ou ${incText('spd')} nos demais atributos.</p>` +
        `<div class="fm stats">${stats}</div>` +
      `</section>` +

      `<section class="ed-sec" aria-labelledby="ed-sk-h">` +
        `<div class="sec-h"><h2 id="ed-sk-h">3 · Habilidades</h2><span class="hint">3 níveis fixos</span></div>` +
        `<p class="hint">Todo campeão tem exatamente três habilidades: <b>Normal</b>, <b>Média</b> e <b>Ultimate</b>. ` +
        `Escolha o <b>Alvo</b> (você, aliados ou inimigo atual) e use <b>+ Adicionar efeito</b> para montar cada habilidade. ` +
        `Buffs, debuffs e cura não usam multiplicador da habilidade: a força é configurada em cada efeito. ` +
        `Em ataques, <b>Hits</b> não tem máximo e <b>Intervalo</b> faz o golpe se repetir; a recarga só começa depois do último. ` +
        `Multiplicador vazio/zero dá 0 de dano. Efeitos negativos e de cenário sempre caem em inimigos; cura e buffs, só em aliados. ` +
        `🐣 gera criaturas (nunca campeões) e 🌍 cria zonas de fogo/gelo/choque/vento/espinhos no local do alvo.</p>` +
        `<div class="fm skills">${skills}</div>` +
        `<div class="row"><small class="mut">Limites: recarga ${T.SKILL_RANGE.cdMin}–${T.SKILL_RANGE.cdMax}s, ` +
        `multiplicador de ataque ${T.SKILL_RANGE.multMin}×–${T.SKILL_RANGE.multMax}×, ` +
        `hits a partir de ${T.SKILL_RANGE.hitsMin} (sem máximo) com ${T.SKILL_RANGE.gapMin}–${T.SKILL_RANGE.gapMax}s entre eles.</small></div>` +
      `</section>` +

      `<div class="row actions">` +
        `<button class="go" id="esv"${owner ? '' : ' disabled'}>💾 Salvar campeão</button>` +
        (local ? `<button id="epub"${owner ? '' : ' disabled'}>☁️ Publicar na nuvem</button>` : '') +
        `<button id="edup">Duplicar</button>` +
        (ed.idx >= 0 ? `<button id="edl" class="danger"${owner ? '' : ' disabled'}>Excluir</button>` : '') +
        `<span class="hint">Salvar guarda neste navegador; publicar compartilha na nuvem.</span>` +
      `</div>`;

    updateStats();
    T.$('#ed').scrollTop = scroll;
  }

  function updateStats() {
    const c = T.editor.champ;
    if (!c) return;
    const calc = T.calc(c);
    const finalVal = k => k === 'hp' ? calc.hp
      : k === 'atk' ? calc.atk
      : k === 'spd' ? calc.spd
      : k === 'dod' ? calc.dod
      : k === 'crit' ? calc.crit
      : calc.obe;
    T.ST.forEach(k => {
      const suffix = (k === 'hp' || k === 'atk') ? '' : '%';
      const el = T.$(`[data-val="${k}"]`);
      if (el) el.textContent = T.stv(c, k) + suffix;
      const pv = T.$(`[data-pvstat="${k}"]`);
      if (pv) pv.textContent = finalVal(k) + suffix;
      const pts = T.$(`[data-pts="${k}"]`);
      if (pts) {
        const n = c.up[k] || 0;
        pts.textContent = n ? (n > 0 ? '+' : '') + n : '—';
        pts.classList.toggle('neg', n < 0);
        pts.title = n < 0 ? 'Atributo negativo: ' + n + ' · nerf ativo' : '';
      }
    });
    T.$$('[data-up]').forEach(inp => {
      const k = inp.dataset.up;
      if (k && document.activeElement !== inp) inp.value = c.up[k] || 0;
    });
    const calcMap = {
      hpEff: calc.hpEff,
      dmgBase: calc.dmgBase,
      move: calc.move,
      atkRate: calc.atkRate + '×',
      dod: calc.dod + '%',
      crit: calc.crit + '%',
      obe: calc.obe + '%',
      nerf: calc.nerf.label || '—',
      free: c.livre ? 'livre' : calc.free
    };
    Object.keys(calcMap).forEach(key => {
      const el = T.$(`[data-calc="${key}"]`);
      if (el) el.textContent = calcMap[key];
    });
    T.$$('[data-hit]').forEach(el => {
      const s = c.sks[+el.dataset.hit];
      if (!s) return;
      const hits = Math.max(1, Math.round(T.num(s.hits, 1)));
      el.textContent = '~' + Math.round(calc.atk * T.num(s.mult, 0) * hits) + ' dano' +
        (hits > 1 ? ' ×' + hits : '');
    });
    const points = T.$('[data-points]');
    if (points) {
      points.textContent = c.livre ? 'livre' : T.free(c);
      points.classList.toggle('zero', !c.livre && T.free(c) <= 0);
    }
    const xpChip = T.$('[data-xp]');
    if (xpChip) xpChip.textContent = xpText(c);
    const addXpBtn = T.$('#addxp');
    if (addXpBtn) addXpBtn.disabled = T.lvlOf(c) >= T.LVLMAX;
    const pvLv = T.$('#pvlv');
    if (pvLv) pvLv.textContent = `${T.RN[c.r]} · nível ${T.lvlOf(c)}/${T.LVLMAX} · ${T.pointsFor(c)} pts`;
    const nerfChip = T.$('[data-nerf]');
    if (nerfChip) nerfChip.textContent = calc.nerf.total ? '⚠ ' + calc.nerf.label : '';
    const resetPts = T.$('#sreset');
    if (resetPts) resetPts.disabled = !T.ST.some(k => c.up[k]);
    T.$$('[data-p]').forEach(btn => {
      const dir = btn.dataset.p;
      const key = dir.slice(1);
      const plus = dir[0] === '+';
      if (plus) {
        const capped = (c.up[key] || 0) >= T.UPMAX ||
          (key !== 'hp' && key !== 'atk' && T.stv(c, key) >= T.statCap(c));
        btn.disabled = (!c.livre && T.free(c) <= 0) || capped;
      } else {
        btn.disabled = !(c.up[key] > T.UPMIN);
      }
    });
  }

  T.renderEditor = () => {
    if (!T.editor.champ) return;
    renderList();
    renderForm();
  };

  T.openEditor = idx => {
    const ed = T.editor;
    if (ed.dirty && !confirm('Descartar as alterações não salvas?')) return;
    ed.idx = idx;
    ed.champ = idx >= 0 && T.RO[idx] ? T.clone(T.RO[idx]) : blank();
    ed.dirty = false;
    ed.pick = null;
    msg('');
    T.show('ed');
    T.renderEditor();
  };

  function save() {
    const ed = T.editor;
    const c = ed.champ;
    if (!c) return;
    const name = c.n.trim().replace(/[<>"&]/g, '');
    if (!name) { msg('Dê um nome ao campeão.'); return; }
    if (T.RO.some((other, i) => i !== ed.idx && other.n.toLowerCase() === name.toLowerCase())) {
      msg('Já existe um campeão com esse nome.');
      return;
    }
    c.n = name.slice(0, 12);

    const clean = T.san(T.norm(T.clone(c)));
    if (!clean) { msg('Dados inválidos.'); return; }
    if (!T.isOwner(clean)) {
      msg(T.user.admin ? 'O dono pode editar qualquer campeão.' : 'Só o criador pode editar este campeão.');
      return;
    }

    const isNew = ed.idx < 0 || !T.RO[ed.idx];
    const oldName = isNew ? null : T.RO[ed.idx].n;

    if (isNew) {
      T.RO.push(clean);
      ed.idx = T.RO.length - 1;
    } else {
      T.RO[ed.idx] = clean;
    }
    if (oldName && oldName !== clean.n) {
      T.pickNames = T.pickNames.map(n => (n === oldName ? clean.n : n));
      T.savePick();
    }
    T.saveRoster();
    ed.champ = T.clone(clean);
    ed.dirty = false;
    msg(T.user.admin && clean.dono && clean.dono !== T.user.uid
      ? 'Ficha de outro jogador atualizada pelo dono e salva neste navegador.'
      : 'Salvo neste navegador.');
    T.renderEditor();
    T.renderMenu();

    // Campeões já publicados continuam sincronizados; novos ficam locais até
    // o jogador usar o botão "Publicar na nuvem".
    if (!isNew && clean.id) publish(true);
  }

  async function publish(auto) {
    const ed = T.editor;
    if (!auto && ed.dirty) { msg('Salve as alterações antes de publicar.'); return; }
    // O botão aparece para campeões ainda só locais: salva primeiro para que
    // exista um índice em T.RO e então publica, em vez de não fazer nada.
    if (!auto && ed.idx < 0) {
      save();
      if (ed.idx < 0) return;
    }
    const c = ed.idx >= 0 ? T.RO[ed.idx] : null;
    if (!c) return;
    if (!window.FB) {
      if (!auto) T.toast('Nuvem indisponível. O campeão está salvo neste navegador.', 'warn');
      return;
    }
    // FB.ready guarda o estado inicial da sessão; depois do login ele continua
    // null. Usa o UID atual para não chamar um campeão publicado de "somente leitura".
    const uid = (window.FBU && window.FBU()) || (T.user && T.user.uid) || '';
    if (!uid) {
      T.cloudStatus('entre para publicar', 'warn');
      if (!auto) {
        msg('Entre com e-mail e senha para publicar na nuvem.');
        T.toast('Entre na conta para publicar o campeão na nuvem.', 'warn', 6000);
      }
      return;
    }
    T.publish(c).then(() => {
      if (ed.champ && ed.champ.n === c.n) {
        ed.champ.id = c.id;
        ed.champ.dono = c.dono;
      }
      msg('Publicado na nuvem ✔');
      T.renderEditor();
      T.renderMenu();
    }).catch(err => {
      console.warn('Publicação falhou:', err);
      const code = String((err && (err.code || err.message)) || '');
      if (/permission-denied|insufficient/i.test(code)) {
        msg('Salvo só neste navegador. Publique firestore.rules no Firebase Console.');
      } else if (/unauthenticated|not signed in|sem autentica/i.test(code)) {
        msg('Salvo só neste navegador. Entre com e-mail e senha para publicar.');
      } else {
        msg('Salvo só neste navegador (' + (err && err.message ? err.message : 'nuvem indisponível') + ').');
      }
    });
  }

  function remove() {
    const ed = T.editor;
    const idx = ed.idx;
    if (idx < 0) return;
    const c = T.RO[idx];
    if (!c) return;
    if (!T.isOwner(c)) { msg('Você não tem permissão para excluir este campeão.'); return; }
    if (!confirm(`Excluir "${c.n}"?`)) return;
    if (c.id) T.cloudDelete(c).catch(err => console.warn('Falha ao excluir na nuvem:', err));
    T.RO.splice(idx, 1);
    T.removePick(c.n);
    T.saveRoster();
    T.openEditor(T.RO.length ? Math.min(idx, T.RO.length - 1) : -1);
    T.renderMenu();
    T.toast('Campeão excluído.', 'ok');
  }

  function duplicate() {
    const ed = T.editor;
    if (!ed.champ) return;
    const copy = T.san(T.norm(T.clone(ed.champ)));
    if (!copy) return;
    copy.id = '';
    copy.dono = '';
    copy.n = uniqueName(ed.champ.n);
    T.RO.push(copy);
    T.saveRoster();
    T.editor.dirty = false;
    T.openEditor(T.RO.length - 1);
    T.renderMenu();
    msg('Cópia criada: ' + copy.n + '. Publique se quiser compartilhar.');
  }

  function importBank() {
    const n = T.importBank();
    T.editor.dirty = false;
    T.openEditor(T.RO.length ? 0 : -1);
    T.renderMenu();
    msg(n ? n + ' campeão(ões) importados do banco.' : 'Todos os campeões do banco já estão no elenco.');
    T.toast(n ? n + ' campeão(ões) importados do banco.' : 'Nada novo no banco.', n ? 'ok' : 'info');
  }

  function leave() {
    if (T.editor.dirty && !confirm('Descartar as alterações não salvas?')) return;
    T.editor.dirty = false;
    T.show('home');
  }

  const edRoot = T.$('#ed');
  if (edRoot) {
    edRoot.addEventListener('click', e => {
      if (e.target.closest('.ib')) return;
      const btn = e.target.closest('button');
      if (!btn) {
        const card = e.target.closest('#el .card');
        if (card) T.openEditor(+card.dataset.e);
        return;
      }
      if (btn.dataset.kindfilter) {
        T.editor.kindFilter = btn.dataset.kindfilter;
        renderList();
        return;
      }
      if (btn.dataset.fxadd !== undefined) {
        T.editor.pick = +btn.dataset.fxadd;
        markDirty();
        renderForm();
        return;
      }
      if (btn.dataset.fxcancel !== undefined) {
        T.editor.pick = null;
        renderForm();
        return;
      }
      if (btn.dataset.fxconfirm !== undefined) {
        const i = +btn.dataset.fxconfirm;
        const s = T.editor.champ && T.editor.champ.sks[i];
        if (s) {
          let added = 0;
          T.$$('[data-pick]:checked').forEach(input => {
            if (addEffect(s, input.dataset.pick)) added++;
          });
          if (added) markDirty();
        }
        T.editor.pick = null;
        renderForm();
        return;
      }
      if (btn.dataset.fxdel !== undefined) {
        const i = +btn.dataset.fxdel;
        const s = T.editor.champ && T.editor.champ.sks[i];
        if (s) {
          removeEffect(s, btn.dataset.ef);
          markDirty();
          renderForm();
        }
        return;
      }
      if (btn.dataset.sr !== undefined) {
        const i = +btn.dataset.sr;
        const tier = T.TIERS[i];
        if (tier) {
          T.editor.champ.sks[i] = T.mkSkill(tier, T.editor.champ);
          markDirty();
          renderForm();
        }
        return;
      }
      if (btn.dataset.p) {
        const dir = btn.dataset.p;
        const key = dir.slice(1);
        const up = T.editor.champ.up;
        if (dir[0] === '+') {
          const c = T.editor.champ;
          const capped = (up[key] || 0) >= T.UPMAX ||
            (key !== 'hp' && key !== 'atk' && T.stv(c, key) >= T.statCap(c));
          if ((c.livre || T.free(c) > 0) && !capped) up[key] = (up[key] || 0) + 1;
        } else if (up[key] > T.UPMIN) {
          up[key]--;
        }
        markDirty();
        updateStats();
        return;
      }
      switch (btn.id) {
        case 'esv': save(); break;
        case 'epub': publish(false); break;
        case 'edup': duplicate(); break;
        case 'edl': remove(); break;
        case 'addxp': {
          const c = T.editor.champ;
          const step = +btn.dataset.xp || 50;
          const info = T.addXp(c, step);
          markDirty();
          renderForm();
          T.toast(info.levels
            ? `Subiu ${info.levels} nível(s)! Nível ${info.lvl} · ${info.points} pontos.`
            : `+${step} XP · ${info.xp}/${info.need}.`,
          info.levels ? 'ok' : 'info', 1800);
          break;
        }
        case 'sreset':
          T.editor.champ.up = {};
          markDirty();
          renderForm();
          break;
        case 'ers': importBank(); break;
        case 'e2h': leave(); break;
        default: break;
      }
    });

    edRoot.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('#el .card');
      if (!card) return;
      e.preventDefault();
      T.openEditor(+card.dataset.e);
    });

    edRoot.addEventListener('input', e => {
      const t = e.target;
      if (t.id === 'fsh') {
        T.editor.champ.shiny = t.value;
        markDirty();
        return;
      }
      if (t.id === 'fn') {
        T.editor.champ.n = t.value.replace(/[<>"&]/g, '').slice(0, 12);
        markDirty();
        const pv = T.$('#pvname');
        if (pv) pv.textContent = T.editor.champ.n || 'Sem nome';
        const counter = T.$('#fnc');
        if (counter) counter.textContent = T.editor.champ.n.length + '/12';
      } else if (t.dataset.s !== undefined && t.dataset.f === 'n') {
        const s = T.editor.champ.sks[+t.dataset.s];
        if (s) {
          s.n = t.value.replace(/[<>"&]/g, '').slice(0, 12);
          markDirty();
          const pv = T.$(`[data-pv="${t.dataset.s}"]`);
          if (pv) pv.textContent = T.skDesc(s);
        }
      }
    });

    edRoot.addEventListener('change', e => {
      const t = e.target;
      const ed = T.editor;
      const c = ed.champ;
      if (!c) return;

      if (t.id === 'fs') {
        loadSprite(t.files[0], 96, data => {
          c.sprite = data;
          markDirty();
          T.renderEditor();
        });
        return;
      }

      if (t.dataset.up) {
        const key = t.dataset.up;
        let v = Math.round(+t.value || 0);
        v = T.clamp(v, T.UPMIN, T.UPMAX);
        if (!c.livre) v = Math.min(v, (c.up[key] || 0) + T.free(c));
        c.up[key] = v;
        markDirty();
        renderForm();
        return;
      }

      if (t.id === 'flivre') {
        c.livre = t.checked;
        if (!c.livre && T.free(c) < 0) c.up = {};
        markDirty();
        renderForm();
        return;
      }

      if (t.dataset.s !== undefined) {
        const i = +t.dataset.s;
        const s = c.sks[i];
        if (!s) return;
        const f = t.dataset.f;
        if (f === 'cs' || f === 'sp') {
          const size = f === 'cs' ? 96 : 64;
          loadSprite(t.files[0], size, data => {
            if (f === 'cs') s.castSprite = data;
            else s.sprite = data;
            markDirty();
            renderForm();
          });
          return;
        }
        if (f.startsWith('ef.')) {
          const key = f.slice(3);
          if (t.checked) addEffect(s, key);
          else removeEffect(s, key);
        } else if (f.startsWith('efd.') || f.startsWith('efp.')) {
          const key = f.slice(4);
          const meta = T.EFMETA[key];
          if (meta) {
            const cfg = T.efCfg(s, key);
            const isD = f.startsWith('efd.');
            const min = isD ? 0 : meta.min;
            const max = isD ? 60 : meta.max;
            const v = T.clamp(+t.value || 0, min, max);
            s.efv = s.efv || {};
            s.efv[key] = {
              d: isD ? v : cfg.d,
              p: isD ? cfg.p : v
            };
          }
        } else if (['mult', 'hits', 'gap', 'rng', 'pspd', 'rad', 'cd'].includes(f)) {
          const max = t.max === '' ? Infinity : +t.max;
          s[f] = T.clamp(t.value, +t.min, max);
        } else s[f] = t.value;
        if (f === 'cat' && s.cat === 'buff') addEffect(s, 'power');
        s.tier = T.TIERS[i];
        T.clampSkill(s);
        if (['mult', 'hits', 'gap', 'rng', 'pspd', 'rad', 'cd'].includes(f)) t.value = s[f];
        markDirty();
        if (f === 'mode' || f === 'cat' || f === 'alvo' || f === 'ef.area' ||
            f.startsWith('efd.') || f.startsWith('efp.')) renderForm();
        else {
          const pv = T.$(`[data-pv="${i}"]`);
          if (pv) pv.textContent = T.skDesc(s);
        }
        return;
      }

      const map = { ft: 't', ff: 'f', fg: 'tag', fp: 'p' };
      if (map[t.id]) {
        c[map[t.id]] = t.value;
        markDirty();
        renderForm();
        return;
      }
      if (t.id === 'fcl') {
        c.kind = t.value === 'criatura' ? 'criatura' : 'campeao';
        delete c.tipo;
        markDirty();
        renderForm();
        return;
      }
      if (t.id === 'fr') {
        c.r = t.value;
        if (!c.livre && T.free(c) < 0) c.up = {};
        markDirty();
        renderForm();
        return;
      }
    });
  }

  const search = T.$('#eq');
  if (search) {
    search.addEventListener('input', e => {
      T.editor.query = e.target.value;
      renderList();
    });
  }

  const newBtn = T.$('#enw');
  if (newBtn) newBtn.addEventListener('click', () => T.openEditor(-1));
})(window.TBB = window.TBB || {});
