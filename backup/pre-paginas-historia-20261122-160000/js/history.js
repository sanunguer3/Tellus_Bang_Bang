// Modo história: aventura em estágios, loja e coleção com progresso próprio.
(function (T) {
  'use strict';

  const PRICE = { comum: 40, raro: 70, epico: 110, lendario: 160 };
  const $ = sel => T.$(sel);

  const esc = v => T.esc(v == null ? '' : v);
  const coins = () => T.hist.coins | 0;
  const ownCount = () => Object.keys(T.hist.owned).length;

  function histPrice(c) {
    return PRICE[c && c.r] || PRICE.comum;
  }

  // Os comuns disponíveis vêm da nuvem (já mesclados no elenco), nunca do código.
  function starterPool() {
    return T.RO.filter(c => c.r === 'comum' && !T.isCreature(c));
  }

  function setTab(tab) {
    if (ownCount() === 0 || !Object.hasOwn({ loja: 1, aventura: 1, colecao: 1 }, tab)) return;
    T.hist.tab = tab;
    T.saveHist();
    T.renderHistory();
  }

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
    const stats = T.HIST_STATS.map(([k, label]) =>
      `<div class="hstat"><span>${label}</span>` +
      `<button class="sm" data-histup="${esc(c.n)}" data-stat="${k}" data-d="-1" aria-label="Reduzir ${label}">−</button>` +
      `<b>${(rec.up[k] || 0) > 0 ? '+' : ''}${rec.up[k] || 0}</b>` +
      `<button class="sm" data-histup="${esc(c.n)}" data-stat="${k}" data-d="1" aria-label="Aumentar ${label}" ${free <= 0 ? 'disabled' : ''}>+</button>` +
      `</div>`
    ).join('');
    const filter = Object.keys(T.HIST_SHINY).map(k =>
      `<button class="${rec.shiny === k ? 'on-b' : ''}" data-histshiny="${esc(c.n)}" data-k="${esc(k)}" aria-pressed="${rec.shiny === k}">${T.HIST_SHINY[k]}</button>`
    ).join('');
    return `<div class="card hcollect">` +
      T.av(c) +
      `<b style="color:${T.TY[c.t]}">${esc(c.n)}</b>` +
      `<small>${T.RN[c.r]} · nível ${li.lvl}/${T.LVLMAX} · ${li.max ? 'MÁX' : li.xp + '/' + li.need + ' XP'}</small>` +
      `<div class="hbar"><i style="width:${pct}%"></i></div>` +
      `<small>${free} ponto(s) livre(s) · ${used}/${li.points} distribuídos</small>` +
      `<div class="hstats">${stats}</div>` +
      `<div class="setup-h">Cor fixa</div><div class="row tight hfilters">${filter}</div>` +
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

  function renderAdventure() {
    const stage = T.hist.stage;
    const owned = ownedChampions();
    const picks = T.pickNames.filter(n => T.hist.owned[n]);
    const foes = Math.min(4, 2 + Math.floor((stage - 1) / 5));
    const reward = 25 + stage * 8;
    const xp = 25 + stage * 5;
    const ai = stage >= 12 ? 'brutal' : stage >= 7 ? 'dificil' : stage >= 3 ? 'normal' : 'facil';
    return `<div class="setup">` +
      `<div class="setup-box">` +
      `<div class="setup-h">Próxima luta</div>` +
      `<h2>⚔️ Estágio ${stage}</h2>` +
      `<p>${foes} time(s) inimigo(s) · IA ${T.AI_LEVELS[ai].icon} ${T.AI_LEVELS[ai].n}</p>` +
      `<p class="hint">Vitória: 🪙 ${reward} · ${xp} XP para todo o time usado. A dificuldade sobe a cada luta.</p>` +
      `<button class="go" id="hfight" ${owned.length ? '' : 'disabled'}>${owned.length ? '⚔️ Lutar estágio ' + stage : 'Escolha um campeão'}</button>` +
      `</div>` +
      `<div class="setup-box wide">` +
      `<div class="setup-h">Seu time da história (até 3)</div>` +
      `<div class="grid" id="hteam">` +
      (owned.length ? owned.map(c => teamCard(c, T.histRec(c.n))).join('') : '<div class="note warn">Você ainda não tem campeões. Escolha seu primeiro campeão comum.</div>') +
      `</div>` +
      `<p class="hint">${picks.length}/3 escolhidos. Toque para escolher. O nível aqui é fixo: só muda com XP suficiente.</p>` +
      `</div></div>`;
  }

  function renderShop() {
    const bank = T.RO.filter(c => !T.isCreature(c) && !T.hist.owned[c.n]);
    const boxes = Object.keys(T.HIST_SHOP).map(k => chestCard(k, T.HIST_SHOP[k])).join('');
    return `<div class="setup">` +
      `<div class="setup-box"><div class="setup-h">Baús (mais baratos, conteúdo aleatório)</div>` +
      `<div class="grid hchests">${boxes}</div>` +
      `<p class="hint">Um baú pode dar um campeão novo, moedas ou XP para um campeão da coleção. Se você já tiver todos, o baú devolve moedas e XP.</p>` +
      `</div>` +
      `<div class="setup-box wide"><div class="setup-h">Campeões soltos · 🪙 ${coins()}</div>` +
      `<div class="grid" id="hbuy">` +
      (bank.length ? bank.map(shopCard).join('') : '<div class="note">Você já tem todos os campeões disponíveis na coleção.</div>') +
      `</div></div></div>`;
  }

  function renderCollection() {
    const owned = ownedChampions();
    return `<h2>📚 Coleção</h2>` +
      `<p class="hint">Suba o nível ganhando XP na aventura e distribua os pontos aqui. A cor escolhida fica travada: nunca mais muda.</p>` +
      `<div class="grid">` +
      (owned.length ? owned.map(collectionCard).join('') : '<div class="note warn">Escolha seu primeiro campeão comum para começar a coleção.</div>') +
      `</div>`;
  }

  T.renderHistory = () => {
    const panel = $('#hpanel');
    if (!panel) return;
    const coinEl = $('#hcoins');
    if (coinEl) coinEl.textContent = '🪙 ' + coins();
    const stageEl = $('#hstage');
    if (stageEl) stageEl.textContent = '⚔️ Estágio ' + T.hist.stage;
    const winsEl = $('#hwins');
    if (winsEl) winsEl.textContent = '🏆 ' + T.hist.wins + ' vitórias';
    const starting = ownCount() === 0;
    const tabs = $('#htabs');
    if (tabs) tabs.querySelectorAll('button[data-tab]').forEach(btn => {
      btn.disabled = starting;
      const on = !starting && btn.dataset.tab === T.hist.tab;
      btn.classList.toggle('on-b', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    panel.innerHTML = starting
      ? renderStarter()
      : T.hist.tab === 'loja'
        ? renderShop()
        : T.hist.tab === 'colecao' ? renderCollection() : renderAdventure();
  };

  T.openHistory = () => {
    if (T.G && T.backToMenu) T.backToMenu();
    T.saveHist();
    T.setMode('historia');
    T.show('hist');
    T.renderHistory();
    const el = $('#hist');
    if (el) el.scrollTop = 0;
    // Se a nuvem ainda não terminou de carregar, atualiza a tela quando chegar.
    if (!T.RO.length && T.loadCloud) {
      Promise.resolve(T.loadCloud()).then(() => {
        if (T.screen === 'hist') T.renderHistory();
      }).catch(() => { /* silencioso */ });
    }
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
      T.hist.coins += 40;
      return '40 moedas (sem campeões para receber XP)';
    }
    const target = T.choose(owned);
    const info = T.histGrantXp(target.n, value);
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
      reward = rollChampion() || { kind: 'coins', value: 80 };
    } else {
      const chance = key === 'medium' ? 0.6 : 0.45;
      const r = Math.random();
      reward = r < chance
        ? (rollChampion() || { kind: 'coins', value: 50 })
        : r < chance + 0.3 ? { kind: 'xp', value: key === 'medium' ? 80 : 50 }
          : { kind: 'coins', value: key === 'medium' ? 60 : 40 };
    }
    const text = reward.kind === 'champ'
      ? (addChampion(reward.value) ? 'campeão ' + reward.value.n : '120 moedas')
      : grantReward(reward.kind, reward.value);
    if (reward.kind === 'champ' && !T.hist.owned[reward.value.n]) T.histOwn(reward.value);
    T.saveHist();
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

  function selectPick(name) {
    if (!T.hist.owned[name]) return;
    T.addPick(name);
    T.renderHistory();
  }

  T.histStartBattle = () => {
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
    T.setMode('historia');
    T.startBattle({ history: true, stage: T.hist.stage });
  };

  const panel = $('#hpanel');
  if (panel) {
    panel.addEventListener('click', e => {
      const starterBtn = e.target.closest('[data-histstarter]');
      if (starterBtn) { chooseStarter(starterBtn.dataset.histstarter); return; }
      const pickBtn = e.target.closest('[data-histpick]');
      if (pickBtn) { selectPick(pickBtn.dataset.histpick); return; }
      const buyBtn = e.target.closest('[data-histbuy]');
      if (buyBtn) { buyChampion(buyBtn.dataset.histbuy, false); return; }
      const chestBtn = e.target.closest('[data-histchest]');
      if (chestBtn) { buyChest(chestBtn.dataset.histchest); return; }
      const upBtn = e.target.closest('[data-histup]');
      if (upBtn) { changeStat(upBtn.dataset.histup, upBtn.dataset.stat, +upBtn.dataset.d); return; }
      const shinyBtn = e.target.closest('[data-histshiny]');
      if (shinyBtn) { setShiny(shinyBtn.dataset.histshiny, shinyBtn.dataset.k); return; }
      if (e.target.closest('#hfight')) T.histStartBattle();
    });
    panel.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target.closest('[data-histstarter], [data-histpick], [data-histbuy], [data-histchest]');
      if (!el) return;
      e.preventDefault();
      el.click();
    });
  }

  // #htabs é irmão de #hpanel, então precisa do próprio listener.
  const tabs = $('#htabs');
  if (tabs) {
    tabs.addEventListener('click', e => {
      const tabBtn = e.target.closest('button[data-tab]');
      if (tabBtn && !tabBtn.disabled) setTab(tabBtn.dataset.tab);
    });
  }

  const back = $('#x2h');
  if (back) back.addEventListener('click', () => T.show('home'));
})(window.TBB = window.TBB || {});
