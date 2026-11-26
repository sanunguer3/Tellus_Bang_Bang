// Modo história: aventura em estágios, loja e coleção com progresso próprio.
(function (T) {
  'use strict';

  const PRICE = { comum: 80, raro: 140, epico: 220, lendario: 320 };
  const $ = sel => T.$(sel);

  const esc = v => T.esc(v == null ? '' : v);
  const coins = () => T.hist.coins | 0;
  const ownCount = () => Object.keys(T.hist.owned).length;
  let skinChamp = null;

  function histPrice(c) {
    return PRICE[c && c.r] || PRICE.comum;
  }

  // Os comuns disponíveis vêm da nuvem (já mesclados no elenco), nunca do código.
  function starterPool() {
    return T.RO.filter(c => c.r === 'comum' && !T.isCreature(c));
  }

  // Aventura, Loja e Coleção são páginas separadas, mas agora vivem dentro da
  // navegação global (js/nav.js). O Voltar do jogo e do navegador usa a mesma
  // pilha e restaura página, scroll e progresso.
  const PAGES = ['aventura', 'loja', 'colecao'];
  const screenOf = page => page === 'loja' ? 'hloja' : page === 'colecao' ? 'hcolecao' : 'hist';
  const pageOfScreen = s => s === 'hist' ? 'aventura' : s === 'hloja' ? 'loja' : s === 'hcolecao' ? 'colecao' : null;
  const histScroll = { aventura: 0, loja: 0, colecao: 0 };

  function go(page, opts) {
    opts = opts || {};
    if (PAGES.indexOf(page) < 0) return;
    if (page !== 'aventura' && ownCount() === 0) return;
    const current = pageOfScreen(T.screen);
    if (current && current !== page) {
      const el = $('#' + T.screen);
      if (el) histScroll[current] = el.scrollTop || 0;
    }
    T.hist.tab = page;
    T.saveHist();
    T.renderHistory();
    T.nav.go(screenOf(page), {
      force: true,
      replace: !!opts.replace,
      noUrl: !!opts.noUrl
    });
    const el = $('#' + screenOf(page));
    if (el) el.scrollTop = histScroll[page] || 0;
  }

  const setTab = tab => go(tab);
  T.histGo = go;
  T.histBack = () => T.nav.back();

  // Sempre que uma tela da história entra (clique, Voltar ou URL), mantém
  // aba, render e modo em sincronia.
  T.nav.onApply = (screen, prev, opts) => {
    const page = pageOfScreen(screen);
    if (!page) return;
    const from = pageOfScreen(prev);
    if (from && from !== page) {
      const old = $('#' + prev);
      if (old) histScroll[from] = old.scrollTop || 0;
    }
    if (T.hist.tab !== page) {
      T.hist.tab = page;
      T.saveHist();
      T.renderHistory();
    } else if (opts.fromHash || opts.fromBoot) {
      T.renderHistory();
    }
    const el = $('#' + screen);
    if (el) el.scrollTop = histScroll[page] || 0;
    if (T.setMode && T.mode !== 'historia') T.setMode('historia');
  };

  // Ao abrir direto numa rota de loja/coleção sem campeões, volta para a
  // aventura, que é a única página permitida no início.
  T.histFixBoot = () => {
    if ((T.screen === 'hloja' || T.screen === 'hcolecao') && ownCount() === 0) {
      T.hist.tab = 'aventura';
      T.saveHist();
      T.nav.reset('hist');
    }
  };

  function teamCard(c, rec) {
    const on = T.pickNames.includes(c.n);
    const li = T.levelInfo(rec);
    const pct = li.max ? 100 : Math.min(100, Math.round(li.xp / Math.max(1, li.need) * 100));
    return `<div class="card${on ? ' on' : ''}" data-histpick="${esc(c.n)}" tabindex="0" role="button" aria-pressed="${on}">` +
      T.av(c) +
      `<b style="color:${T.TY[c.t]}">${esc(c.n)}</b>` +
      `<small>${T.RN[c.r]} · nível ${li.lvl}/${T.LVLMAX}</small>` +
      `<small>${li.max ? 'Nível máximo' : li.xp + '/' + li.need + ' XP'}</small>` +
      `<div class="hbar"><i style="width:${pct}%"></i></div>` +
      `</div>`;
  }

  function ownedChampions() {
    return T.RO.filter(c => !T.isCreature(c) && T.hist.owned[c.n]);
  }

  function shopCard(c) {
    const price = histPrice(c);
    const can = coins() >= price;
    return `<div class="card hshop" data-histbuy="${esc(c.n)}" tabindex="0" role="button">` +
      T.av(c) +
      `<b style="color:${T.TY[c.t]}">${esc(c.n)}</b>` +
      `<small>${T.TN[c.t]} · ${T.FN[c.f]}</small>` +
      `<small>${T.RN[c.r]}</small>` +
      `<span class="chip">🪙 ${price}${can ? '' : ' · faltam ' + (price - coins())}</span>` +
      `</div>`;
  }

  function chestCard(key, box) {
    const can = coins() >= box.price;
    return `<div class="card hchest${can ? '' : ' off'}" data-histchest="${key}" tabindex="0" role="button">` +
      `<b>${box.icon} ${box.n}</b>` +
      `<small>${box.desc}</small>` +
      `<span class="chip">🪙 ${box.price}${can ? '' : ' · faltam ' + (box.price - coins())}</span>` +
      `</div>`;
  }

  function collectionCard(c) {
    const rec = T.histRec(c.n);
    if (!rec) return '';
    const li = T.levelInfo(rec);
    const used = T.ST.reduce((s, k) => s + (rec.up[k] || 0), 0);
    const free = li.points - used;
    const pct = li.max ? 100 : Math.min(100, Math.round(li.xp / Math.max(1, li.need) * 100));
    const stats = T.HIST_STATS.map(([k, label]) => {
      const v = rec.up[k] || 0;
      const sig = v > 0 ? '+' : '';
      const tone = v > 0 ? ' pos' : '';
      return `<div class="hstat">` +
        `<span class="hlbl" title="${esc(label)}">${label}</span>` +
        `<span class="hstep">` +
        `<button class="sm" data-histup="${esc(c.n)}" data-stat="${k}" data-d="-1" aria-label="Reduzir ${esc(label)}" ${v <= T.UPMIN ? 'disabled' : ''}>−</button>` +
        `<b class="hval${tone}">${sig}${v}</b>` +
        `<button class="sm" data-histup="${esc(c.n)}" data-stat="${k}" data-d="1" aria-label="Aumentar ${esc(label)}" ${free <= 0 ? 'disabled' : ''}>+</button>` +
        `</span></div>`;
    }).join('');
    const skin = T.HIST_SHINY[rec.shiny] || T.HIST_SHINY[''];
    return `<div class="card hcollect">` +
      T.av(c) +
      `<b style="color:${T.TY[c.t]}">${esc(c.n)}</b>` +
      `<small>${T.RN[c.r]} · nível ${li.lvl}/${T.LVLMAX} · ${li.max ? 'MÁX' : li.xp + '/' + li.need + ' XP'}</small>` +
      `<div class="hbar"><i style="width:${pct}%"></i></div>` +
      `<div class="hpts"><span>Pontos de status</span>` +
      `<span class="chip${free ? '' : ' off'}">${free} livre(s) · ${used}/${li.points}</span></div>` +
      `<div class="hstats">${stats}</div>` +
      `<div class="setup-h">Cor fixa</div>` +
      `<div class="row tight hfilters"><span class="chip" title="Compre outra cor na Loja">${skin}</span></div>` +
      `</div>`;
  }

  function starterCard(c) {
    return `<div class="card hstarter" data-histstarter="${esc(c.n)}" tabindex="0" role="button">` +
      T.av(c) +
      `<b style="color:${T.TY[c.t]}">${esc(c.n)}</b>` +
      `<small>${T.TN[c.t]} · ${T.FN[c.f]}</small>` +
      `<small>${T.RN[c.r]}</small>` +
      `<span class="chip">Escolher</span>` +
      `</div>`;
  }

  function renderStarter() {
    const pool = starterPool();
    return `<div class="setup">` +
      `<div class="setup-box wide">` +
      `<div class="setup-h">💀 Escolha seu primeiro campeão</div>` +
      `<h2>Comece com um campeão comum</h2>` +
      `<p class="hint">Ele é seu e já entra no seu time. Para ter os outros, vença lutas e compre na loja com as moedas ganhas.</p>` +
      `<div class="grid" id="hstarters">` +
      (pool.length ? pool.map(starterCard).join('') : '<div class="note warn">Nenhum campeão comum disponível. Entre para carregar os campeões da nuvem ou crie um no editor.</div>') +
      `</div></div></div>`;
  }

  const HIST_MODES = [
    { id: 'aventura', icon: '📖', label: 'Aventura', desc: 'Estágios com times cada vez mais fortes.' },
    { id: 'infinito', icon: '♾️', label: 'Infinito', desc: 'Rodadas sem fim: mais difícil, recompensa maior e escala mais rápido.' },
    { id: 'sobrevivencia', icon: '🧟', label: 'Sobrevivência', desc: 'Criaturas fracas e minibosses: ganhe pouco por segundo e por inimigo.' }
  ];

  function modeInfo(mode) {
    const stage = T.hist.stage;
    const cfg = (T.HIST_REWARD || {});
    if (mode === 'infinito') {
      const c = cfg.infinito || {};
      return {
        title: '♾️ Infinito',
        desc: 'Dificuldade sobe a cada rodada. Vitória rende 🪙 ' +
          ((c.coinBase || 18) + (c.coinRound || 10) + 2) + ' e ' +
          ((c.xpBase || 10) + (c.xpRound || 5)) + ' XP na rodada 1, e cresce mais depressa.',
        button: '♾️ Começar sequência',
        record: 'Melhor rodada ' + ((T.hist.modes.infinito || {}).bestRound || 0) +
          ' · ' + ((T.hist.modes.infinito || {}).bestWins || 0) + ' vitórias'
      };
    }
    if (mode === 'sobrevivencia') {
      const c = cfg.sobrevivencia || {};
      return {
        title: '🧟 Sobrevivência',
        desc: '🪙 1 a cada ' + (c.coinSec || 8) + 's e +' + (c.coinKill || 1) +
          ' por inimigo · +1 XP a cada ' + (c.xpSec || 10) + 's e +' + (c.xpKill || 1) +
          ' por inimigo. Morrer também paga o que você conseguiu.',
        button: '🧟 Começar sobrevivência',
        record: 'Melhor tempo ' + ((T.hist.modes.sobrevivencia || {}).bestTime || 0) +
          's · ' + ((T.hist.modes.sobrevivencia || {}).bestKills || 0) + ' mortes'
      };
    }
    const foes = Math.min(4, 2 + Math.floor((stage - 1) / 5));
    const ai = stage >= 12 ? 'brutal' : stage >= 7 ? 'dificil' : stage >= 3 ? 'normal' : 'facil';
    return {
      title: '⚔️ Estágio ' + stage,
      desc: foes + ' time(s) inimigo(s) · IA ' + T.AI_LEVELS[ai].icon + ' ' + T.AI_LEVELS[ai].n +
        '. Vitória: 🪙 ' + (25 + stage * 8) + ' · ' + (10 + stage * 2) +
        ' XP para todo o time usado.',
      button: '⚔️ Lutar estágio ' + stage,
      record: '🏆 ' + T.hist.wins + ' vitórias'
    };
  }

  function renderAdventure() {
    const owned = ownedChampions();
    const mode = T.hist.mode || 'aventura';
    const info = modeInfo(mode);
    const chips = HIST_MODES.map(m =>
      `<button class="sm ${m.id === mode ? 'on-b' : ''}" data-histmode="${m.id}" ` +
      `aria-pressed="${m.id === mode ? 'true' : 'false'}" title="${esc(m.desc)}">${m.icon} ${m.label}</button>`
    ).join('');
    return `<div class="setup">` +
      `<div class="setup-box">` +
      `<div class="setup-h">Modo da história</div>` +
      `<div class="row tight hmodes">${chips}</div>` +
      `<h2>${info.title}</h2>` +
      `<p class="hint">${esc(info.desc)}</p>` +
      `<p class="hint mut">${esc(info.record)}</p>` +
      `<button class="go" id="hfight" ${owned.length ? '' : 'disabled'}>${owned.length ? info.button : 'Escolha um campeão'}</button>` +
      `</div>` +
      `<div class="setup-box wide">` +
      `<div class="setup-h">Seu time da história (até 3)</div>` +
      `<div class="grid" id="hteam">` +
      (owned.length ? owned.map(c => teamCard(c, T.histRec(c.n))).join('') : '<div class="note warn">Você ainda não tem campeões. Escolha seu primeiro campeão comum.</div>') +
      `</div>` +
      `<p class="hint">${T.pickNames.filter(n => T.hist.owned[n]).length}/3 escolhidos. Toque para escolher. O nível aqui é fixo: só muda com XP suficiente.</p>` +
      `</div></div>`;
  }

  function renderShop() {
    const bank = T.RO.filter(c => !T.isCreature(c) && !T.hist.owned[c.n]);
    const boxes = Object.keys(T.HIST_SHOP).map(k => chestCard(k, T.HIST_SHOP[k])).join('');
    const owned = ownedChampions();
    if (!owned.some(c => c.n === skinChamp)) skinChamp = owned.length ? owned[0].n : null;
    const champs = owned.length
      ? owned.map(c => `<button class="${c.n === skinChamp ? 'on-b' : ''}" data-histskin-champ="${esc(c.n)}">${esc(c.n)}</button>`).join('')
      : '<span class="note">Sem campeões para pintar.</span>';
    const skins = skinChamp
      ? Object.keys(T.HIST_SKINS).map(k => {
          const item = T.HIST_SKINS[k];
          const cur = (T.histRec(skinChamp) || {}).shiny === k;
          return `<button class="${cur ? 'on-b' : ''}" data-histskin="${esc(k)}" data-k="${esc(k)}" data-champ="${esc(skinChamp)}" aria-pressed="${cur}">${item.n} · 🪙 ${item.price}</button>`;
        }).join('')
      : '<span class="note">Compre um campeão para escolher a cor.</span>';
    return `<div class="setup">` +
      `<div class="setup-box"><div class="setup-h">Baús (conteúdo aleatório)</div>` +
      `<div class="grid hchests">${boxes}</div>` +
      `<p class="hint">Um baú pode dar um campeão novo, moedas ou XP para um campeão da coleção. Se você já tiver todos, o baú devolve moedas e XP.</p>` +
      `</div>` +
      `<div class="setup-box wide"><div class="setup-h">Campeões soltos · 🪙 ${coins()}</div>` +
      `<div class="grid" id="hbuy">` +
      (bank.length ? bank.map(shopCard).join('') : '<div class="note">Você já tem todos os campeões disponíveis na coleção.</div>') +
      `</div></div>` +
      `<div class="setup-box wide"><div class="setup-h">Cores · 🪙 ${coins()}</div>` +
      `<p class="hint">Escolha um campeão e compre a cor. Ela fica travada para sempre; na Coleção você só a vê.</p>` +
      `<div class="row tight hfilters" id="hskinchamps">${champs}</div>` +
      `<div class="row tight hfilters" id="hskins">${skins}</div>` +
      `</div></div>`;
  }

  function renderCollection() {
    const owned = ownedChampions();
    return `<p class="hint">Suba o nível ganhando XP na aventura e distribua os pontos aqui. A cor comprada na Loja fica travada: nunca mais muda.</p>` +
      `<div class="grid hgrid">` +
      (owned.length ? owned.map(collectionCard).join('') : '<div class="note warn">Escolha seu primeiro campeão comum para começar a coleção.</div>') +
      `</div>`;
  }

  const setText = (sel, text) => {
    document.querySelectorAll(sel).forEach(el => { el.textContent = text; });
  };

  const refreshWhenCloudArrives = () => {
    if (!T.RO.length && T.loadCloud) {
      Promise.resolve(T.loadCloud()).then(() => {
        if (pageOfScreen(T.screen)) T.renderHistory();
      }).catch(() => { /* silencioso */ });
    }
  };

  T.renderHistory = () => {
    const starting = ownCount() === 0;
    setText('.hcoin', '🪙 ' + coins());
    setText('.hstage', '⚔️ Estágio ' + T.hist.stage);
    setText('.hwins', '🏆 ' + T.hist.wins + ' vitórias');
    const tabs = $('#htabs');
    if (tabs) tabs.querySelectorAll('button[data-tab]').forEach(btn => {
      btn.disabled = starting;
      const on = !starting && btn.dataset.tab === T.hist.tab;
      btn.classList.toggle('on-b', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const locked = '<div class="note warn">Escolha seu primeiro campeão comum para liberar esta página.</div>';
    const panel = $('#hpanel');
    if (panel) panel.innerHTML = starting ? renderStarter() : renderAdventure();
    const shop = $('#hlpanel');
    if (shop) shop.innerHTML = starting ? locked : renderShop();
    const collection = $('#hcpainel');
    if (collection) collection.innerHTML = starting ? locked : renderCollection();
  };

  T.openHistory = () => {
    if (T.G && T.backToMenu) T.backToMenu();
    T.setMode('historia');
    // Sempre abre na Aventura: Loja/Coleção são páginas separadas acessíveis pelos botões.
    const page = 'aventura';
    T.hist.tab = page;
    T.saveHist();
    histScroll[page] = 0;
    go(page);
    refreshWhenCloudArrives();
  };

  function addChampion(c) {
    if (!c) return false;
    const clean = T.san(T.norm(T.clone(c)));
    if (!clean || T.hist.owned[clean.n]) return false;
    if (!T.RO.some(x => x.n === clean.n)) {
      T.RO.push(clean);
      T.saveRoster();
    }
    T.histOwn(clean);
    return true;
  }

  function chooseStarter(name) {
    if (ownCount() !== 0) return;
    const c = starterPool().find(x => x.n === name);
    if (!c || !addChampion(c)) return;
    T.hist.tab = 'aventura';
    T.pickNames = [name];
    T.savePick();
    T.saveHist();
    T.renderHistory();
    T.toast(c.n + ' é seu! Vença lutas para comprar outros campeões.', 'ok', 4000);
    if (T.renderMenu) T.renderMenu();
  }

  function grantReward(kind, value) {
    if (kind === 'champ') return 'campeão ' + value;
    if (kind === 'coins') {
      T.hist.coins += value;
      return value + ' moedas';
    }
    const owned = ownedChampions();
    if (!owned.length) {
      T.hist.coins += 60;
      return '60 moedas (sem campeões para receber XP)';
    }
    const target = T.choose(owned);
    const info = T.histGrantXp(target.n, value);
    if (info && info.levels && T.audio) T.audio.sfx('level');
    return value + ' XP para ' + target.n + (info && info.levels ? ' (subiu ' + info.levels + ' nível(eis))' : '');
  }

  function buyChampion(name, free) {
    const c = T.RO.find(x => x.n === name);
    if (!c) return;
    const price = histPrice(c);
    if (!free && coins() < price) {
      T.toast('Moedas insuficientes.', 'warn');
      return;
    }
    if (!free) T.hist.coins -= price;
    if (!addChampion(c)) {
      if (!free) T.hist.coins += price;
      T.toast('Esse campeão já está no seu elenco.', 'info');
      return;
    }
    T.saveHist();
    if (T.audio) T.audio.sfx('buy');
    T.toast((free ? 'Conquistou ' : 'Comprou ') + c.n + ' por ' + price + ' moedas!', 'ok');
    T.renderHistory();
    if (T.renderMenu) T.renderMenu();
  }

  function buyChest(key) {
    const box = T.HIST_SHOP[key];
    if (!box || coins() < box.price) {
      T.toast('Moedas insuficientes.', 'warn');
      return;
    }
    T.hist.coins -= box.price;
    let reward;
    if (key === 'large') {
      reward = rollChampion() || { kind: 'coins', value: 150 };
    } else {
      const chance = key === 'medium' ? 0.6 : 0.45;
      const r = Math.random();
      reward = r < chance
        ? (rollChampion() || { kind: 'coins', value: key === 'medium' ? 100 : 60 })
        : r < chance + 0.3 ? { kind: 'xp', value: key === 'medium' ? 35 : 20 }
          : { kind: 'coins', value: key === 'medium' ? 100 : 60 };
    }
    let text;
    if (reward.kind === 'champ') {
      if (addChampion(reward.value)) text = 'campeão ' + reward.value.n;
      else { T.hist.coins += 150; text = '150 moedas'; }
    } else {
      text = grantReward(reward.kind, reward.value);
    }
    if (reward.kind === 'champ' && !T.hist.owned[reward.value.n]) T.histOwn(reward.value);
    T.saveHist();
    if (T.audio) T.audio.sfx('buy');
    T.toast(box.icon + ' ' + box.n + ': ' + text + '!', 'ok', 4000);
    T.renderHistory();
    if (T.renderMenu) T.renderMenu();
  }

  function rollChampion() {
    const pool = T.RO.filter(c => !T.isCreature(c) && !T.hist.owned[c.n]);
    if (!pool.length) return null;
    const weights = { comum: 5, raro: 3, epico: 2, lendario: 1 };
    const total = pool.reduce((s, c) => s + (weights[c.r] || 1), 0);
    let roll = Math.random() * total;
    for (const c of pool) {
      roll -= weights[c.r] || 1;
      if (roll <= 0) return c;
    }
    return pool[pool.length - 1];
  }

  function changeStat(name, stat, delta) {
    const rec = T.histRec(name);
    const champion = T.byName(name);
    if (!rec || !champion) return;
    if (!Object.hasOwn(T.ST, stat) && !T.ST.includes(stat)) return;
    const before = rec.up[stat] || 0;
    const after = T.clamp(before + delta, T.UPMIN, T.UPMAX);
    if (after === before) return;
    const fake = { lvl: rec.lvl, xp: rec.xp, r: champion.r, up: Object.assign({}, rec.up) };
    fake.up[stat] = after;
    const sum = T.ST.reduce((s, k) => s + (fake.up[k] || 0), 0);
    if (sum > T.pointsFor(fake)) {
      T.toast('Não há pontos livres suficientes.', 'warn');
      return;
    }
    rec.up[stat] = after;
    T.saveHist();
    T.renderHistory();
  }

  function setShiny(name, key) {
    const rec = T.histRec(name);
    if (!rec || !Object.hasOwn(T.HIST_SHINY, key)) return;
    rec.shiny = key;
    if (key === 'cor' && !rec.hue) rec.hue = Math.floor(Math.random() * 360);
    T.saveHist();
    T.renderHistory();
  }

  function buySkin(name, key) {
    if (!name || !T.hist.owned[name] || !Object.hasOwn(T.HIST_SKINS, key)) return;
    const rec = T.histRec(name);
    const item = T.HIST_SKINS[key];
    if (!rec || !item) return;
    if ((rec.shiny || '') === key) {
      T.toast('Esse campeão já está com essa cor.', 'info');
      return;
    }
    if (coins() < item.price) {
      T.toast('Moedas insuficientes.', 'warn');
      return;
    }
    T.hist.coins -= item.price;
    setShiny(name, key);
    if (T.audio) T.audio.sfx('buy');
    T.toast('Cor de ' + name + ' comprada: ' + item.n + '!', 'ok');
  }

  function selectPick(name) {
    if (!T.hist.owned[name]) return;
    T.addPick(name);
    T.renderHistory();
  }

  T.histStartBattle = opts => {
    opts = opts || {};
    const owned = ownedChampions();
    if (!owned.length) {
      T.toast('Escolha um campeão comum para começar.', 'warn');
      T.openHistory();
      return;
    }
    const valid = T.pickNames.filter(n => T.hist.owned[n]);
    if (!valid.length) {
      T.pickNames = owned.slice(0, 3).map(c => c.n);
      T.savePick();
    }
    const histMode = T.hist.mode || 'aventura';
    T.setMode('historia');
    // `opts.round`/`opts.run` já vêm prontos quando a chamada é do botão
    // "Próxima rodada" do infinito; aqui só garantimos a identidade da história.
    opts.history = true;
    opts.histMode = histMode;
    if (histMode === 'aventura') opts.stage = T.hist.stage;
    T.startBattle(opts);
  };

  ['#hpanel', '#hlpanel', '#hcpainel'].forEach(sel => {
    const panel = $(sel);
    if (!panel) return;
    panel.addEventListener('click', e => {
      const starterBtn = e.target.closest('[data-histstarter]');
      if (starterBtn) { chooseStarter(starterBtn.dataset.histstarter); return; }
      const modeBtn = e.target.closest('[data-histmode]');
      if (modeBtn) { T.histSetMode(modeBtn.dataset.histmode); return; }
      const pickBtn = e.target.closest('[data-histpick]');
      if (pickBtn) { selectPick(pickBtn.dataset.histpick); return; }
      const buyBtn = e.target.closest('[data-histbuy]');
      if (buyBtn) { buyChampion(buyBtn.dataset.histbuy, false); return; }
      const chestBtn = e.target.closest('[data-histchest]');
      if (chestBtn) { buyChest(chestBtn.dataset.histchest); return; }
      const upBtn = e.target.closest('[data-histup]');
      if (upBtn) { changeStat(upBtn.dataset.histup, upBtn.dataset.stat, +upBtn.dataset.d); return; }
      const skinPick = e.target.closest('[data-histskin-champ]');
      if (skinPick) { skinChamp = skinPick.dataset.histskinChamp; T.renderHistory(); return; }
      const skinBtn = e.target.closest('[data-histskin]');
      if (skinBtn) { buySkin(skinBtn.dataset.champ || skinChamp, skinBtn.dataset.histskin); return; }
      if (e.target.closest('#hfight')) T.histStartBattle();
    });
    panel.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target.closest('[data-histstarter], [data-histmode], [data-histpick], [data-histbuy], [data-histchest], [data-histskin-champ], [data-histskin]');
      if (!el) return;
      e.preventDefault();
      el.click();
    });
  });

  // #htabs é irmão de #hpanel, então precisa do próprio listener.
  const tabs = $('#htabs');
  if (tabs) {
    tabs.addEventListener('click', e => {
      const tabBtn = e.target.closest('button[data-tab]');
      if (tabBtn && !tabBtn.disabled) setTab(tabBtn.dataset.tab);
    });
  }

  const backHome = $('#x2h');
  if (backHome) backHome.addEventListener('click', () => T.goHome());

  ['#hlback', '#hcvback'].forEach(sel => {
    const btn = $(sel);
    if (btn) btn.addEventListener('click', () => T.histBack());
  });
})(window.TBB = window.TBB || {});
