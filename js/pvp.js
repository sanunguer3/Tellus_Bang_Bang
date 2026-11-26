// PvP por salas: criação/entrada por código, times sincronizados via PeerJS
// (WebRTC DataChannel, sinalização no broker público do PeerJS) e luta local
// contra as equipes adversárias. Suporta 1v1 (3 campeões por jogador) e 2v2
// (dois jogadores por equipe, 1 campeão por jogador). Sem Firebase para salas.
(function (T) {
  'use strict';

  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const PEER_PREFIX = 'tbb-pvp-';
  const $ = sel => T.$(sel);

  let code = '';
  let room = null;
  let peer = null;
  let hostConn = null;       // conexão do guest com o host
  let guestConns = {};       // host: uid -> DataConnection
  let connByPeer = {};       // host: peerId -> uid
  let rule = 'max';
  let arena = 'random';
  let format = '1v1';
  let picks = [];
  let started = false;
  let startTimer = 0;
  let lastResult = null;
  let localId = '';
  let syncTimer = 0;
  let lastSnapSeq = 0;

  function ensureId() {
    const uid = String((window.FBU && window.FBU()) || (T.user && T.user.uid) || '');
    if (uid) { localId = uid; return localId; }
    if (localId) return localId;
    try {
      localId = sessionStorage.getItem('tbb-pvp-id') || '';
      if (!localId) {
        localId = 'g-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
        sessionStorage.setItem('tbb-pvp-id', localId);
      }
    } catch (e) {
      localId = 'g-' + Math.random().toString(36).slice(2, 10);
    }
    return localId;
  }

  const me = () => ensureId();
  const online = () => !!(window.Peer) && navigator.onLine !== false;
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
    const detail = err && err.type ? String(err.type) : (err && err.code ? String(err.code) : '');
    const msg = err && err.message ? String(err.message) : String(err || 'erro');
    const out = (detail && detail !== msg ? detail + ' — ' + msg : msg).slice(0, 260);
    notice('PvP: ' + out, 'warn');
    if ($('#pvpstatus')) $('#pvpstatus').textContent = 'Falha na conexão: ' + out;
  }

  // "Campeões padrão" = fichas publicadas na nuvem. Nível, XP, melhorias e
  // cores são normalizados em normalizeLevel() conforme a regra da sala.
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

  function aiFill() {
    const pool = (rule === 'colecao' ? T.RO : T.pvpStandardPool()).filter(c => !T.isCreature(c));
    const c = T.choose(pool.length ? pool : T.RO.filter(x => !T.isCreature(x)));
    return c ? [expand(normalizeLevel(c))].filter(Boolean) : [];
  }

  // Uma entrada por equipe; o motor de batalha já aceita N times no PvP.
  // Assentos vazios em 2v2 são preenchidos por IA.
  function battleLineups() {
    const out = [[], []];
    const total = slotsOf();
    for (let i = 0; i < total; i++) {
      const uid = players()[i];
      const team = i < 2 ? 0 : 1;
      if (uid) out[team].push(...lineupOf(uid).slice(0, maxPicks()));
      else out[team].push(...aiFill().slice(0, maxPicks()));
    }
    return out;
  }

  function allReady() {
    const pr = (room && room.ready) || {};
    const present = players();
    const minPlayers = activeFormat() === '2v2' ? 2 : slotsOf();
    return present.length >= minPlayers && present.every(uid =>
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
        const empty = activeFormat() === '2v2' ? 'IA' : 'vaga';
        seats.push('<span class="chip' + (uid ? '' : ' off') + '"' +
          (mine ? ' style="border-color:var(--ac)"' : '') + '>' +
          (uid ? T.esc(nick(uid)) + (mine ? ' (você)' : '') : empty) + '</span>');
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
      const falta = slotsOf() - players().length;
      const aiFill = activeFormat() === '2v2' ? ' · vagas vazias entram como IA' : '';
      status('Sala ' + code + ' · aguardando ' + falta + ' jogador(es)' + aiFill + '…');
    } else if (room) {
      const pr = room.ready || {};
      status('Sala ' + code + ' · ' + players().map(uid =>
        nick(uid) + ': ' + (pr[uid] ? 'pronto' : 'escolhendo')
      ).join(' · '));
    } else if (!online()) {
      status('PeerJS indisponível — verifique a conexão com a internet.');
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

  function clearTimer() {
    if (startTimer) { clearTimeout(startTimer); startTimer = 0; }
  }

  function destroyPeer() {
    clearTimer();
    stopSync();
    Object.values(guestConns).forEach(c => { try { c.close(); } catch (e) {} });
    guestConns = {};
    connByPeer = {};
    if (hostConn) { try { hostConn.close(); } catch (e) {} hostConn = null; }
    if (peer) {
      try { peer.destroy(); } catch (e) {}
      peer = null;
    }
  }

  function send(conn, msg) {
    try { if (conn && conn.open) conn.send(msg); } catch (e) { console.warn('PvP send:', e); }
  }

  function broadcast(msg) {
    Object.values(guestConns).forEach(c => send(c, msg));
  }

  function broadcastState() {
    if (isHost()) broadcast({ type: 'state', room });
  }

  function applyRoom(next) {
    room = next;
    onRoom();
  }

  function stopSync() {
    if (syncTimer) { clearInterval(syncTimer); syncTimer = 0; }
  }

  function unitSnap(u) {
    return {
      id: u.id, x: +u.x.toFixed(1), y: +u.y.toFixed(1),
      hp: +u.hp.toFixed(1), hpM: +u.hpM.toFixed(1),
      alive: !!u.alive, dead: !!u.dead,
      cmd: u.o ? { k: u.o.k, t: u.o.t, tid: u.o.tgt ? u.o.tgt.id : null } : null,
      wish: u.wish ? { x: +u.wish.x.toFixed(1), y: +u.wish.y.toFixed(1), t: u.wish.t } : null,
      face: u.aimFace || 0, stun: +(u.paraT > (T.G ? T.G.T : 0) ? (u.paraT - T.G.T).toFixed(2) : 0),
      respawn: u.respawnAt || 0
    };
  }

  function sendSnap() {
    const G = T.G;
    if (!G || !room || !isHost()) return;
    const snap = {
      type: 'snap',
      seq: ++lastSnapSeq,
      T: G.T,
      over: !!G.over,
      overTxt: G.over || '',
      winner: G.winner == null ? -1 : G.winner,
      us: G.us.map(unitSnap),
      haz: (G.haz || []).map(h => ({ uid: h.uid, ownerId: h.ownerId, x: +h.x.toFixed(1), y: +h.y.toFixed(1), r: +h.r.toFixed(1), type: h.type, born: +h.born.toFixed(2), life: +h.life.toFixed(2), made: !!h.made, team: h.team == null ? -1 : h.team })),
      objs: (G.objs || []).map(o => ({ uid: o.uid, ownerId: o.ownerId, team: o.team, type: o.type, x: +o.x.toFixed(1), y: +o.y.toFixed(1), r: +o.r.toFixed(1), hp: +o.hp.toFixed(1), hpM: +o.hpM.toFixed(1), born: +o.born.toFixed(2), life: +o.life.toFixed(2), armed: !!o.armed, sCat: o.sCat || 'outro', alvo: o.alvo || 'self', ownerAtk: +(o.ownerAtk || 10).toFixed(1) }))
    };
    broadcast(snap);
  }

  function applySnap(msg) {
    const G = T.G;
    if (!G || !msg || !Array.isArray(msg.us)) return;
    const byId = {};
    G.us.forEach(u => { byId[u.id] = u; });
    msg.us.forEach(s => {
      const u = byId[s.id];
      if (!u) return;
      u.x = s.x; u.y = s.y;
      u.hp = s.hp; u.hpM = s.hpM;
      if (s.alive && u.dead) { u.dead = false; u.alive = true; }
      if (!s.alive && u.alive) { u.alive = false; u.dead = true; }
      if (s.wish) u.wish = { x: s.wish.x, y: s.wish.y, t: s.wish.t, strength: 0.34, arrive: 28 };
      else if (!s.wish) u.wish = null;
      if (s.cmd) {
        const tgt = s.cmd.tid != null ? byId[s.cmd.tid] : null;
        u.o = { k: s.cmd.k, tgt: tgt || null, t: s.cmd.t };
      } else u.o = null;
      if (s.stun > 0 && G) u.paraT = Math.max(u.paraT || 0, G.T + s.stun);
      if (s.respawn) u.respawnAt = s.respawn;
      u.aimFace = s.face || u.aimFace;
    });
    if (Array.isArray(msg.haz)) G.haz = msg.haz.map(h => ({ uid: h.uid, ownerId: h.ownerId, x: h.x, y: h.y, r: h.r, type: h.type, born: h.born, life: h.life, made: !!h.made, team: h.team }));
    if (Array.isArray(msg.objs)) G.objs = msg.objs.map(o => ({ uid: o.uid, ownerId: o.ownerId, team: o.team, type: o.type, x: o.x, y: o.y, r: o.r, hp: o.hp, hpM: o.hpM, born: o.born, life: o.life, made: true, tickCd: 0, armed: !!o.armed, sCat: o.sCat || 'outro', alvo: o.alvo || 'self', ownerAtk: o.ownerAtk || 10 }));
    if (msg.over && !G.over) {
      G.over = msg.overTxt || 'Fim de jogo';
      G.overAt = G.T;
      G.overMs = performance.now();
      G.winner = msg.winner == null ? -1 : msg.winner;
      const decided = Number.isInteger(G.winner) && G.winner >= 0;
      G.won = decided ? G.winner === G.pvpTeam : false;
      if (T.audio) T.audio.sfx(G.won ? 'win' : 'lose');
      const et = T.$('#et');
      if (et) {
        const extra = '<br><small>' + T.esc(G.pvpRival || 'Adversário') + ' · ' +
          (G.pvpRule === 'max' ? 'nível máximo' : G.pvpRule === 'min' ? 'nível mínimo' : 'coleção') +
          ' · ' + (G.T || 0).toFixed(0) + 's</small>';
        et.innerHTML = T.esc(G.over) + (G.won ? '' : '<br><small>Você perdeu.</small>') + extra;
      }
      const bestEl = T.$('#bbest');
      if (bestEl && T.battleLeadersHtml) bestEl.innerHTML = T.battleLeadersHtml();
      const end = T.$('#end');
      if (end) end.style.display = 'flex';
      const bnext = T.$('#bnext'); if (bnext) bnext.style.display = 'none';
      const bhist = T.$('#bhist'); if (bhist) bhist.style.display = 'none';
      const bfin = T.$('#bfin'); if (bfin) bfin.textContent = 'Voltar à sala';
      ['#brm', '#bteam'].forEach(sel => { const el = T.$(sel); if (el) el.style.display = 'none'; });
      if (T.updateHud) T.updateHud();
    }
  }

  function startSync() {
    stopSync();
    lastSnapSeq = 0;
    if (!room) return;
    if (isHost()) {
      syncTimer = setInterval(sendSnap, 120);
    }
  }

  function scheduleStart() {
    if (started || !room || room.phase !== 'fighting' || !room.startAt) return;
    if (players().length < 2 || !allReady()) return;
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
    startSync();
  }

  function hostMaybeAdvance() {
    if (!isHost() || !room) return false;
    if (room.phase === 'done' && players().every(uid => room.result && room.result[uid])) {
      const ready = {};
      players().forEach(uid => { ready[uid] = false; });
      room.phase = 'waiting';
      room.result = {};
      room.ready = ready;
      room.lineup = {};
      room.startAt = 0;
      return true;
    }
    if (room.phase === 'waiting' && players().length >= 2 && allReady()) {
      room.phase = 'fighting';
      room.startAt = Date.now() + 3500;
      return true;
    }
    return false;
  }

  function onRoom() {
    if (!room) { render(); return; }
    if (room.rule && !isHost()) rule = room.rule;
    if (room.arena) arena = room.arena;
    if (room.format) format = room.format;
    if (room.phase === 'waiting') {
      started = false;
      clearTimer();
    }
    hostMaybeAdvance();
    if (isHost()) broadcastState();
    scheduleStart();
    render();
  }

  function removePlayer(uid) {
    if (!room || !uid) return;
    room.jogadores = players().filter(x => x !== uid);
    if (room.nomes) delete room.nomes[uid];
    if (room.ready) delete room.ready[uid];
    if (room.lineup) delete room.lineup[uid];
    if (room.result) delete room.result[uid];
    if (room.guest === uid) room.guest = room.jogadores[1] || '';
    room.teams = { '0': room.jogadores.slice(0, 2), '1': room.jogadores.slice(2, 4) };
    if (room.phase === 'fighting') {
      room.phase = 'done';
      if (!room.result) room.result = {};
      room.result[uid] = 'loss';
    }
    if (!room.jogadores.length) { room = null; }
  }

  function handleHostMessage(fromPeerId, msg) {
    if (!isHost() || !room || !msg || !msg.type) return;
    const uid = connByPeer[fromPeerId];
    if (msg.type === 'join') {
      const joinUid = String(msg.uid || '').slice(0, 64);
      const nome = String(msg.nome || joinUid).slice(0, 16);
      const conn = Object.values(guestConns).find(c => c.peer === fromPeerId) || guestConns[fromPeerId];
      if (!joinUid) return;
      if (!players().includes(joinUid) && players().length >= slotsOf()) {
        send(conn, { type: 'error', msg: 'Esta sala já está cheia.' });
        return;
      }
      if (room.phase !== 'waiting' && !players().includes(joinUid)) {
        send(conn, { type: 'error', msg: 'Esta luta já começou.' });
        return;
      }
      connByPeer[fromPeerId] = joinUid;
      if (conn) {
        guestConns[joinUid] = conn;
        Object.keys(guestConns).forEach(k => { if (k !== joinUid && guestConns[k] === conn) delete guestConns[k]; });
      }
      if (!players().includes(joinUid)) {
        room.jogadores.push(joinUid);
        if (room.jogadores.length === 2) room.guest = joinUid;
      }
      room.nomes = Object.assign({}, room.nomes, { [joinUid]: nome });
      room.ready = Object.assign({}, room.ready, { [joinUid]: !!(room.ready && room.ready[joinUid]) });
      room.teams = { '0': room.jogadores.slice(0, 2), '1': room.jogadores.slice(2, 4) };
      onRoom();
      return;
    }
    if (!uid || !players().includes(uid)) return;
    if (msg.type === 'cmd') { applyRemoteCmd(msg); return; }
    if (msg.type === 'wish') { applyRemoteWish(msg); return; }
    if (msg.type === 'ready') {
      room.ready = Object.assign({}, room.ready, { [uid]: !!msg.ready });
      room.lineup = Object.assign({}, room.lineup);
      if (msg.ready) room.lineup[uid] = Array.isArray(msg.lineup) ? msg.lineup.slice(0, maxPicks()) : [];
      else delete room.lineup[uid];
      onRoom();
      return;
    }
    if (msg.type === 'result') {
      room.result = Object.assign({}, room.result, { [uid]: msg.result === 'win' ? 'win' : 'loss' });
      room.phase = 'done';
      onRoom();
      return;
    }
    if (msg.type === 'leave') {
      const c = guestConns[uid];
      removePlayer(uid);
      delete guestConns[uid];
      delete connByPeer[fromPeerId];
      try { if (c) c.close(); } catch (e) {}
      onRoom();
    }
  }

  function handleGuestMessage(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'state') {
      applyRoom(msg.room || null);
      return;
    }
    if (msg.type === 'snap') {
      applySnap(msg);
      return;
    }
    if (msg.type === 'error') {
      notice(msg.msg || 'Erro na sala PvP.', 'warn');
      if (msg.msg && /cheia|começou|não encontrada/i.test(msg.msg)) {
        leave(false);
      }
      return;
    }
    if (msg.type === 'closed') {
      notice('O anfitrião fechou a sala.', 'warn');
      leave(false);
    }
  }

  function wireConn(conn, isGuestSide) {
    conn.on('data', msg => {
      if (isGuestSide) handleGuestMessage(msg);
      else handleHostMessage(conn.peer, msg);
    });
    conn.on('close', () => {
      if (isGuestSide) {
        if (hostConn === conn) {
          hostConn = null;
          if (room) { notice('Conexão com o anfitrião perdida.', 'warn'); leave(false); }
        }
        return;
      }
      const uid = connByPeer[conn.peer];
      if (uid) {
        delete guestConns[uid];
        delete connByPeer[conn.peer];
        removePlayer(uid);
        onRoom();
      }
    });
    conn.on('error', err => { console.warn('PvP conn:', err); });
  }

  function makePeer(id, onOpen, onFail) {
    if (!window.Peer) { onFail(new Error('PeerJS não carregou.')); return; }
    const p = new Peer(id, { debug: 0 });
    const timer = setTimeout(() => {
      try { p.destroy(); } catch (e) {}
      onFail(new Error('Tempo esgotado ao conectar ao servidor PeerJS.'));
    }, 15000);
    p.on('open', pid => { clearTimeout(timer); onOpen(p, pid); });
    p.on('error', err => {
      clearTimeout(timer);
      if (err && err.type === 'unavailable-id') onFail(err);
      else if (!peer || peer === p) onFail(err);
    });
    return p;
  }

  function create() {
    if (!online()) { notice('PeerJS indisponível. Verifique sua conexão.', 'warn'); return Promise.resolve(); }
    leave(false);
    const uid = me();
    const f = format;
    const n = slotsOf(f);
    let tries = 0;
    return new Promise((resolve, reject) => {
      const attempt = () => {
        const c = newCode();
        status('Criando sala ' + c + '…');
        makePeer(PEER_PREFIX + c, (p) => {
          peer = p;
          code = c;
          started = false;
          lastResult = null;
          picks = [];
          room = {
            code: c,
            host: uid,
            guest: '',
            jogadores: [uid],
            nomes: { [uid]: String((T.user && T.user.nome) || T.nick || uid).slice(0, 16) },
            rule,
            arena,
            format: f,
            slots: n,
            teams: { '0': [uid], '1': [] },
            ready: { [uid]: false },
            lineup: {},
            phase: 'waiting',
            startAt: 0,
            result: {},
            criado: Date.now()
          };
          peer.on('connection', conn => {
            guestConns[conn.peer] = conn; // temporário até join enviar uid
            conn.on('open', () => {
              wireConn(conn, false);
              send(conn, { type: 'state', room });
            });
          });
          peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
          render();
          notice('Sala ' + c + ' criada. Envie o código aos outros jogadores.', 'ok');
          resolve(c);
        }, (err) => {
          if (err && err.type === 'unavailable-id' && tries < 5) { tries++; attempt(); return; }
          fail(err);
          reject(err);
        });
      };
      attempt();
    });
  }

  function join(raw) {
    if (!online()) { notice('PeerJS indisponível. Verifique sua conexão.', 'warn'); return Promise.resolve(); }
    const c = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (c.length !== 4) { notice('Digite um código de 4 caracteres.', 'warn'); return Promise.resolve(); }
    leave(false);
    code = c;
    status('Conectando à sala ' + c + '…');
    return new Promise((resolve, reject) => {
      makePeer(undefined, (p) => {
        peer = p;
        const conn = peer.connect(PEER_PREFIX + c, { reliable: true });
        hostConn = conn;
        let opened = false;
        const timeout = setTimeout(() => {
          if (!opened) {
            const err = new Error('Sala não encontrada ou host offline.');
            notice(err.message, 'warn');
            leave(false);
            reject(err);
          }
        }, 12000);
        conn.on('open', () => {
          opened = true;
          clearTimeout(timeout);
          wireConn(conn, true);
          const onState = msg => {
            if (msg && msg.type === 'state' && msg.room && Array.isArray(msg.room.jogadores) && msg.room.jogadores.includes(me())) {
              if (conn.off) conn.off('data', onState);
              resolve(c);
            }
          };
          conn.on('data', onState);
          send(conn, {
            type: 'join',
            uid: me(),
            nome: String((T.user && T.user.nome) || T.nick || me()).slice(0, 16)
          });
        });
        conn.on('error', err => { clearTimeout(timeout); fail(err); reject(err); });
        peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
      }, (err) => { fail(err); reject(err); });
    });
  }

  async function toggleReady() {
    if (!room || !picks.length) return;
    const uid = me();
    const ready = !(room.ready && room.ready[uid]);
    const lineup = ready ? myLineup() : [];
    if (isHost()) {
      room.ready = Object.assign({}, room.ready, { [uid]: ready });
      room.lineup = Object.assign({}, room.lineup);
      if (ready) room.lineup[uid] = lineup;
      else delete room.lineup[uid];
      onRoom();
      if (ready) notice('Time travado! Aguardando os outros jogadores.', 'ok');
    } else {
      send(hostConn, { type: 'ready', uid, ready, lineup });
      if (ready) notice('Time travado! Aguardando os outros jogadores.', 'ok');
    }
  }

  async function report(won) {
    const uid = me();
    if (!room || !uid || (room.result && room.result[uid])) return;
    const result = won ? 'win' : 'loss';
    if (isHost()) {
      room.result = Object.assign({}, room.result, { [uid]: result });
      room.phase = 'done';
      onRoom();
    } else {
      send(hostConn, { type: 'result', uid, result });
    }
  }

  function leave(notifyHost = true) {
    clearTimer();
    if (!isHost() && notifyHost && hostConn) send(hostConn, { type: 'leave', uid: me() });
    if (isHost() && room) broadcast({ type: 'closed' });
    destroyPeer();
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

  function sendCmd(kind, unitId, targetId) {
    const G = T.G;
    if (!G || !G.pvp) return false;
    if (isHost()) { applyRemoteCmd({ kind, unitId, targetId }); return true; }
    send(hostConn, { type: 'cmd', uid: me(), kind, unitId, targetId });
    return true;
  }

  function sendWish(unitId, x, y) {
    const G = T.G;
    if (!G || !G.pvp) return false;
    if (isHost()) { applyRemoteWish({ unitId, x, y }); return true; }
    send(hostConn, { type: 'wish', uid: me(), unitId, x, y });
    return true;
  }

  function applyRemoteCmd(msg) {
    const G = T.G;
    if (!G || !msg) return;
    const u = G.us.find(x => x.id === msg.unitId);
    if (!u || !u.alive) return;
    const target = msg.targetId != null ? G.us.find(x => x.id === msg.targetId) : null;
    applyCmdDirect(u, msg.kind, target);
  }

  function applyRemoteWish(msg) {
    const G = T.G;
    if (!G || !msg) return;
    const u = G.us.find(x => x.id === msg.unitId);
    if (!u || !u.alive) return;
    applyWishDirect(u, msg.x, msg.y);
  }

  function applyCmdDirect(u, kind, target) {
    const G = T.G;
    if (!G || G.over || G.phase !== 'fight') return false;
    if (kind === 'foc' && !target) return false;
    if (u.paraT > G.T) return false;
    if (kind === 'free') {
      u.o = null; u.wish = null; u.cmdLock = G.T + 0.8;
      return true;
    }
    if (u.o) return false;
    if (G.T < (u.cmdLock || 0)) return false;
    u.cmdLock = G.T + 0.8;
    if (Math.random() * 100 < u.obe) u.o = { k: kind, tgt: target || null, t: G.T + ({ def: 8, ret: 8, free: 0, atk: 5, fin: 5, foc: 6 }[kind] || 4) };
    else u.o = null;
    return true;
  }

  function applyWishDirect(u, x, y) {
    const G = T.G;
    if (!G || G.over || G.phase !== 'fight') return false;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const R = (G.R || G.R0) * 0.92;
    const d = Math.hypot(x, y);
    const k = d > R ? R / d : 1;
    u.wish = { x: x * k, y: y * k, t: G.T + 5, strength: 0.34, arrive: 28 };
    return true;
  }

  T.pvp = {
    create, join, leave, toggleReady, report, abandon,
    standardPool: () => T.pvpStandardPool(),
    backToRoom: () => T.go('pvp'),
    sendCmd, sendWish,
    get code() { return code; },
    get room() { return room ? T.clone(room) : null; },
    get rule() { return rule; },
    get format() { return activeFormat(); },
    get slots() { return slotsOf(); },
    get seat() { return seatOf(me()); },
    get team() { return myTeam(); },
    get available() { return online(); },
    get isHost() { return isHost(); },
    get active() { return !!(room && T.G && T.G.pvp); },
    isHumanSeat(id) { const pl = players(); return id >= 0 && id < pl.length && !!pl[id]; }
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
      room.rule = rule;
      onRoom();
      return;
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
        room.arena = arena;
        onRoom();
        return;
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
    if (screen === 'home' && peer) leave(false);
    if (screen === 'pvp') render();
  });
  window.addEventListener('pagehide', () => leave(false));
  render();
})(window.TBB = window.TBB || {});
