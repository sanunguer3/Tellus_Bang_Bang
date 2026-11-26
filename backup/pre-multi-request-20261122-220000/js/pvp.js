// PvP por salas: criação/entrada por código, times sincronizados no Firestore
// e luta local contra as equipes adversárias. Suporta 1v1 (3 campeões por
// jogador) e 2v2 (dois jogadores por equipe, 1 campeão por jogador).
// Sem nuvem, apenas desativa a tela.
(function (T) {
  'use strict';

  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const $ = sel => T.$(sel);

  let code = '';
  let room = null;
  let unsub = null;
  let rule = 'max';
  let arena = 'random';
  let format = '1v1';
  let picks = [];
  let started = false;
  let startTimer = 0;
  let lastResult = null;

  const me = () => String((window.FBU && window.FBU()) || (T.user && T.user.uid) || '');
  const online = () => !!(window.FB && window.FB.room && me() && navigator.onLine !== false);
  const ref = () => (online() && code ? window.FB.room(code) : null);
  const players = () => (room && Array.isArray(room.jogadores)) ? room.jogadores : [];
  const activeFormat = () => (room && room.format) || format;
  const slotsOf = f => (f || activeFormat()) === '2v2' ? 4 : 2;
  const maxPicks = f => (f || activeFormat()) === '2v2' ? 1 : 3;
  const seatOf = uid => players().indexOf(uid);
  const teamOf = uid => seatOf(uid) < 2 ? 0 : 1;
  const myTeam = () => teamOf(me());
  const isHost = () => !!room && room.host === me();
  const nick = uid => (room && room.nomes && room.nomes[uid]) || String(uid || '').slice(0, 6) || 'Jogador';

  function rivalName() {
    if (activeFormat() !== '2v2') {
      const r = players().find(uid => uid && uid !== me()) || '';
      return nick(r) === 'Jogador' ? 'Adversário' : nick(r);
    }
    return 'Equipe ' + (myTeam() === 0 ? 2 : 1);
  }

  function newCode() {
    let out = '';
    for (let i = 0; i < 4; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return out;
  }

  function notice(txt, kind) {
    if (txt) T.toast(txt, kind || 'info', 4200);
  }

  function fail(err) {
    console.warn('PvP:', err);
    const msg = err && err.code ? err.code.replace(/_/g, ' ') : String(err && err.message || err);
    notice('PvP: ' + msg, 'warn');
    if ($('#pvpstatus')) $('#pvpstatus').textContent = 'Falha na nuvem: ' + msg;
  }

  // "Campeões padrão" = fichas publicadas na nuvem. Nível, XP, melhorias e
  // cores são normalizados em normalizeLevel() conforme a regra da sala.
  // Filtrar aqui os campeões com up/xp deixava a lista vazia na prática, já
  // que quase toda ficha publicada tem alguma melhoria.
  T.pvpStandardPool = () => T.RO.filter(c => c.id && !T.isCreature(c));

  function pool() {
    return (rule === 'colecao' ? T.RO : T.pvpStandardPool()).filter(c => !T.isCreature(c));
  }

  function normalizeLevel(c) {
    const out = T.san(T.norm(T.clone(c)));
    if (!out) return null;
    if (rule === 'max') { out.lvl = T.LVLMAX; out.xp = 0; }
    else if (rule === 'min') { out.lvl = 1; out.xp = 0; }
    if (rule !== 'colecao') {
      out.up = {};
      ['hp', 'atk', 'spd', 'dod', 'crit', 'obe'].forEach(k => { out.up[k] = 0; });
    }
    out.shiny = undefined;
    delete out._hist;
    delete out.histHue;
    delete out.id;
    delete out.dono;
    delete out.usuario;
    return out;
  }

  // Só o necessário para reproduzir a luta: sprites de habilidade não viajam.
  function compact(c) {
    const o = normalizeLevel(c);
    if (!o) return null;
    return {
      n: o.n, t: o.t, f: o.f, r: o.r, lvl: T.lvlOf(o),
      xp: Math.min(99999, Math.max(0, Math.floor(+o.xp || 0))),
      tag: o.tag, kind: o.kind, livre: !!o.livre, p: o.p, up: o.up,
      sks: (o.sks || []).map(s => {
        const k = {};
        ['n', 'tier', 'cat', 'mode', 'ef', 'mult', 'cd', 'rng', 'pspd', 'rad', 'castSprite']
          .forEach(x => { if (s[x] != null) k[x] = s[x]; });
        return k;
      })
    };
  }

  function expand(entry) {
    if (!entry || !entry.n) return null;
    const c = T.san(T.norm(T.clone(entry)));
    if (!c) return null;
    c.lvl = T.lvlOf(c);
    c.xp = Math.min(99999, Math.max(0, Math.floor(+c.xp || 0)));
    if (rule !== 'colecao') {
      c.lvl = rule === 'max' ? T.LVLMAX : 1;
      c.xp = 0;
    }
    c.sprite = undefined;
    c.shiny = undefined;
    delete c.id;
    delete c.dono;
    delete c.usuario;
    return c;
  }

  function myLineup() {
    return picks.map(n => pool().find(c => c.n === n)).filter(Boolean)
      .slice(0, maxPicks()).map(compact).filter(Boolean);
  }

  function lineupOf(uid) {
    const raw = room && room.lineup && room.lineup[uid];
    return Array.isArray(raw) ? raw.map(expand).filter(Boolean) : [];
  }

  // Uma entrada por equipe; o motor de batalha já aceita N times no PvP.
  function battleLineups() {
    const out = [[], []];
    players().forEach(uid => {
      out[teamOf(uid)].push(...lineupOf(uid).slice(0, maxPicks()));
    });
    return out;
  }

  function allReady() {
    const pr = (room && room.ready) || {};
    return players().length === slotsOf() && players().every(uid =>
      !!pr[uid] && (lineupOf(uid).length > 0));
  }

  function status(txt) {
    if ($('#pvpstatus')) $('#pvpstatus').textContent = txt;
  }

  function renderRosterLines() {
    const el = $('#pvpslots');
    if (!el) return;
    if (!code || !players().length) {
      el.innerHTML = '<span class="hint">A sala terá ' + slotsOf() +
        ' jogadores: equipes de ' + (slotsOf() / 2) + '. ' +
        'Cada jogador pilota 1 campeão.</span>';
      if (activeFormat() === '1v1') el.innerHTML = '<span class="hint">A sala terá 2 jogadores, cada um com até 3 campeões.</span>';
      return;
    }
    const teams = [[], []];
    players().forEach(uid => teams[teamOf(uid)].push(uid));
    const labels = ['Equipe 1', 'Equipe 2'];
    el.innerHTML = teams.map((list, i) => {
      const seats = [];
      for (let s = 0; s < slotsOf() / 2; s++) {
        const uid = list[s];
        const mine = uid === me();
        seats.push('<span class="chip' + (uid ? '' : ' off') + '"' +
          (mine ? ' style="border-color:var(--ac)"' : '') + '>' +
          (uid ? T.esc(nick(uid)) + (mine ? ' (você)' : '') : 'vaga') + '</span>');
      }
      return '<span class="chip"><b>' + labels[i] + '</b></span> ' + seats.join(' ');
    }).join('<br>');
  }

  function render() {
    const login = $('#pvplogin');
    const readyBtn = $('#pvpready');
    if (login) login.hidden = online();
    if ($('#pvpcode')) {
      $('#pvpcode').innerHTML = code
        ? 'Código da sala: <b style="font-size:18px;letter-spacing:.18em">' + T.esc(code) + '</b>' +
          ' <small>(envie aos outros jogadores)</small>' : '';
    }
    if (readyBtn) {
      readyBtn.disabled = !online() || !code || !picks.length;
      readyBtn.textContent = room && room.ready && room.ready[me()]
        ? '✅ Pronto — aguardando' : 'Pronto para lutar';
    }
    if ($('#pvpleave')) $('#pvpleave').disabled = !code;

    const f = activeFormat();
    T.$$('#pvpformats button').forEach(b => {
      const on = b.dataset.format === f;
      b.classList.toggle('on-b', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.disabled = !!room && room.phase !== 'waiting';
    });
    const head = $('#pvprosterhead');
    if (head) head.textContent = f === '2v2'
      ? 'Seu campeão PvP (1)' : 'Seu time PvP (até 3)';
    renderRosterLines();

    const activeRule = (room && room.rule) || rule;
    T.$$('#pvprules button').forEach(b => {
      const on = b.dataset.rule === activeRule;
      b.classList.toggle('on-b', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.disabled = !!room && room.phase !== 'waiting';
    });
    T.$$('#pvparenas button').forEach(b => {
      const on = b.dataset.arena === ((room && room.arena) || arena);
      b.classList.toggle('on-b', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.disabled = !!room && (room.phase !== 'waiting' || !isHost());
    });

    const list = pool();
    const roster = $('#pvproster');
    if (roster) {
      roster.innerHTML = list.length ? list.map(c =>
        `<div class="card${picks.includes(c.n) ? ' on' : ''}" tabindex="0" role="button" aria-pressed="${picks.includes(c.n)}" data-pvp="${T.esc(c.n)}">` +
        T.av(c) + `<b style="color:${T.TY[c.t] || ''}">${T.esc(c.n)}</b>` +
        `<small>${T.TN[c.t] || ''} · nível ${T.lvlOf(c)}/${T.LVLMAX}</small></div>`
      ).join('') : '<p class="hint">Nenhum campeão disponível para esta regra. Use outra regra ou importe campeões da nuvem.</p>';
    }
    if ($('#pvpselected')) {
      $('#pvpselected').innerHTML = picks.length
        ? picks.map(n => `<span class="chip">${T.esc(n)}</span>`).join('')
        : '<span class="hint">Escolha ' + (maxPicks() === 1 ? '1 campeão' : 'até 3 campeões') + ' acima.</span>';
    }

    if (room && room.phase === 'fighting') {
      status('Sala ' + code + ' · luta iniciando…');
    } else if (room && room.phase === 'done') {
      status('Sala ' + code + ' · luta encerrada.');
    } else if (room && players().length < slotsOf()) {
      status('Sala ' + code + ' · aguardando ' + (slotsOf() - players().length) +
        ' jogador(es)…');
    } else if (room) {
      const pr = room.ready || {};
      status('Sala ' + code + ' · ' + players().map(uid =>
        nick(uid) + ': ' + (pr[uid] ? 'pronto' : 'escolhendo')
      ).join(' · '));
    } else if (!online()) {
      status('Nuvem indisponível — entre na conta para jogar.');
    } else {
      status('Crie uma sala ou entre com um código.');
    }

    const result = $('#pvpresult');
    if (result) {
      result.hidden = !lastResult;
      if (lastResult) result.innerHTML = '<b>' + T.esc(lastResult) + '</b> · ' +
        T.esc(rivalName()) + ' · sala ' + T.esc(code) + '. Use "Pronto para lutar" para outra luta.';
    }
  }

  function unwatch() {
    if (unsub) {
      try { unsub(); } catch (e) { /* ignore */ }
      unsub = null;
    }
    if (startTimer) { clearTimeout(startTimer); startTimer = 0; }
  }

  function scheduleStart() {
    if (started || !room || room.phase !== 'fighting' || !room.startAt) return;
    if (players().length !== slotsOf() || !allReady()) return;
    const wait = Number(room.startAt) - Date.now();
    if (wait > 0) {
      if (!startTimer) startTimer = setTimeout(() => { startTimer = 0; scheduleStart(); }, Math.min(wait + 40, 2000));
      return;
    }
    started = true;
    lastResult = null;
    const coop = activeFormat() === '2v2';
    T.startBattle({
      pvp: true,
      lineups: battleLineups(),
      pvpCoop: coop,
      pvpSeat: coop ? Math.max(0, seatOf(me())) : -1,
      pvpTeam: myTeam(),
      rule: room.rule || rule,
      arenaId: room.arena || arena,
      rivalName: rivalName(),
      onEnd(won) {
        lastResult = won ? '🏆 Vitória!' : '💀 Derrota.';
        report(won);
      }
    });
  }

  function onRoom() {
    if (!room) { render(); return; }
    if (room.rule && !isHost()) rule = room.rule;
    if (room.arena) arena = room.arena;
    if (room.format) format = room.format;
    // O anfitrião devolve a sala para "waiting" depois da luta: todos os
    // clientes precisam liberar o gatilho e cancelar um timer pendente para
    // que a próxima luta comece (e uma sala reiniciada não inicie sozinha).
    if (room.phase === 'waiting') {
      started = false;
      if (startTimer) { clearTimeout(startTimer); startTimer = 0; }
    }
    // Com o resultado de todos na sala, o anfitrião libera uma nova luta.
    if (room.phase === 'done' && isHost() &&
        players().every(uid => room.result && room.result[uid])) {
      const ready = {};
      players().forEach(uid => { ready[uid] = false; });
      ref().update({ phase: 'waiting', result: {}, ready, lineup: {}, startAt: 0 }).catch(fail);
      return;
    }
    if (room.phase === 'waiting' && players().length === slotsOf() && isHost() && allReady()) {
      ref().update({ phase: 'fighting', startAt: Date.now() + 3500 }).catch(fail);
      return;
    }
    scheduleStart();
    render();
  }

  function watch() {
    unwatch();
    const r = ref();
    if (!r) return;
    unsub = r.onSnapshot(snap => {
      room = snap.exists ? snap.data() : null;
      if (!room) status('A sala não existe mais.');
      onRoom();
    }, fail);
    render();
  }

  async function create() {
    if (!online()) { notice('Entre com e-mail e senha para jogar PvP.', 'warn'); return; }
    code = newCode();
    started = false;
    lastResult = null;
    const uid = me();
    const f = format;
    const n = slotsOf(f);
    const data = {
      code,
      host: uid,
      guest: '',
      jogadores: [uid],
      nomes: { [uid]: String((T.user && T.user.nome) || T.nick || uid).slice(0, 16) },
      rule,
      arena,
      format: f,
      slots: n,
      teams: [[uid], []],
      ready: { [uid]: false },
      lineup: {},
      phase: 'waiting',
      startAt: 0,
      result: {},
      criado: Date.now()
    };
    try {
      await window.FB.room(code).set(data);
      room = data;
      picks = [];
      render();
      notice('Sala ' + code + ' criada. Envie o código aos outros jogadores.', 'ok');
      watch();
    } catch (err) { fail(err); }
  }

  async function join(raw) {
    if (!online()) { notice('Entre com e-mail e senha para jogar PvP.', 'warn'); return; }
    const c = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (c.length !== 4) { notice('Digite um código de 4 caracteres.', 'warn'); return; }
    const r = window.FB.room(c);
    try {
      const snap = await r.get();
      if (!snap.exists) { notice('Sala não encontrada.', 'warn'); return; }
      const data = snap.data();
      const n = slotsOf(data.format || '1v1');
      const current = data.jogadores || [];
      if (current.length >= n && !current.includes(me())) {
        notice('Esta sala já está cheia.', 'warn'); return;
      }
      if (data.phase !== 'waiting') { notice('Esta luta já começou.', 'warn'); return; }
      const uid = me();
      const all = current.concat([uid]);
      const update = {
        jogadores: window.FB.fieldValue.arrayUnion(uid),
        nomes: Object.assign({}, data.nomes, {
          [uid]: String((T.user && T.user.nome) || T.nick || uid).slice(0, 16)
        }),
        ready: Object.assign({}, data.ready, { [uid]: false }),
        teams: [all.slice(0, 2), all.slice(2, 4)]
      };
      if (current.length === 1) update.guest = uid;
      await r.update(update);
      code = c;
      started = false;
      lastResult = null;
      picks = [];
      rule = data.rule || rule;
      arena = data.arena || arena;
      format = data.format || format;
      notice('Você entrou na sala ' + code + ' como ' + nick(uid) + '.', 'ok');
      watch();
    } catch (err) { fail(err); }
  }

  async function toggleReady() {
    const r = ref();
    if (!r || !room || !picks.length) return;
    const uid = me();
    const ready = !(room.ready && room.ready[uid]);
    const lineup = Object.assign({}, room.lineup || {});
    if (ready) lineup[uid] = myLineup();
    else delete lineup[uid];
    try {
      await r.update({ ['ready.' + uid]: ready, lineup });
      if (ready) notice('Time travado! Aguardando os outros jogadores.', 'ok');
    } catch (err) { fail(err); }
  }

  async function report(won) {
    const r = ref();
    if (!r || !room || !me() || (room.result && room.result[me()])) return;
    try {
      await r.update({ ['result.' + me()]: won ? 'win' : 'loss', phase: 'done' });
    } catch (err) { fail(err); }
  }

  function leave() {
    unwatch();
    room = null;
    code = '';
    started = false;
    lastResult = null;
    picks = [];
    render();
  }

  function abandon() {
    if (room && started && !(room.result && room.result[me()])) report(false);
  }

  T.pvp = {
    create, join, leave, toggleReady, report, abandon,
    standardPool: () => T.pvpStandardPool(),
    backToRoom: () => T.go('pvp'),
    get code() { return code; },
    get room() { return room ? T.clone(room) : null; },
    get rule() { return rule; },
    get format() { return activeFormat(); },
    get slots() { return slotsOf(); },
    get seat() { return seatOf(me()); },
    get team() { return myTeam(); },
    get available() { return online(); }
  };

  function bind(sel, fn) {
    const el = $(sel);
    if (el) el.addEventListener('click', fn);
  }

  bind('#hpvp', () => T.go('pvp'));
  bind('#p2h', () => T.goHome());
  bind('#pvphome', () => T.goHome());
  bind('#pvpcreate', () => create());
  bind('#pvpjoin', () => join($('#pvpjoincode') && $('#pvpjoincode').value));
  bind('#pvpready', () => toggleReady());
  bind('#pvpleave', () => leave());
  const input = $('#pvpjoincode');
  if (input) input.addEventListener('keydown', e => {
    if (String(e.key || '').toLowerCase() === 'enter') join(input.value);
  });

  const formats = $('#pvpformats');
  if (formats) formats.addEventListener('click', e => {
    const b = e.target.closest('button[data-format]');
    if (!b || b.disabled) return;
    format = b.dataset.format;
    picks = [];
    render();
  });

  const rules = $('#pvprules');
  if (rules) rules.addEventListener('click', e => {
    const b = e.target.closest('button[data-rule]');
    if (!b || b.disabled) return;
    rule = b.dataset.rule;
    picks = [];
    if (room && room.phase === 'waiting' && isHost()) {
      ref().update({ rule }).catch(fail);
    }
    render();
  });

  const arenas = $('#pvparenas');
  if (arenas) {
    arenas.innerHTML = '<button data-arena="random">🎲 Aleatória</button>' +
      T.ARENAS.map(a => `<button data-arena="${T.esc(a.id)}">${a.icon} ${T.esc(a.n)}</button>`).join('');
    arenas.addEventListener('click', e => {
      const b = e.target.closest('button[data-arena]');
      if (!b || b.disabled) return;
      arena = b.dataset.arena;
      if (room && room.phase === 'waiting' && isHost()) {
        ref().update({ arena }).catch(fail);
      }
      render();
    });
  }

  const roster = $('#pvproster');
  if (roster) roster.addEventListener('click', e => {
    const card = e.target.closest('[data-pvp]');
    if (!card) return;
    const n = card.dataset.pvp;
    const i = picks.indexOf(n);
    if (i >= 0) picks.splice(i, 1);
    else if (picks.length < maxPicks()) picks.push(n);
    else notice(maxPicks() === 1
      ? 'No 2v2 cada jogador usa 1 campeão.'
      : 'No PvP você usa até 3 campeões.', 'info');
    render();
  });

  T.nav.addOnApply(screen => {
    if (screen === 'home' && unsub) leave();
    if (screen === 'pvp') render();
  });
  window.addEventListener('pagehide', unwatch);
  render();
})(window.TBB = window.TBB || {});
