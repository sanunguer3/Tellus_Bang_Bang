// Renderização do canvas: arena temática, sprites de verdade, caixas, perigos
// e avisos flutuantes acima dos personagens.
(function (T) {
  'use strict';

  const PAD = 36;             // margem escura em volta da arena
  const TS = 1.5;             // escala interna dos sprites
  const MAX_ARENAS = 2;       // caches de arena mantidos em memória
  const arenas = new Map();   // cache por arena + raio inicial + resolução
  const tokens = new WeakMap(); // cache de sprite por campeão
  const dots = new Map();

  // Sprites dos campeões: fator aplicado sobre a arte 36×44.
  const SPR = 1.95;
  const SPR_W = 36 * SPR;
  const SPR_H = 44 * SPR;

  T.cw = 0;
  T.ch = 0;
  T.sc = 1;
  T.cv = null;
  T.cx = null;
  T.camX = 0;
  T.camY = 0;
  T.camFollow = false;
  T._infoTxt = '';

  function roundRect(g, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + rr, y);
    g.arcTo(x + w, y, x + w, y + h, rr);
    g.arcTo(x + w, y + h, x, y + h, rr);
    g.arcTo(x, y + h, x, y, rr);
    g.arcTo(x, y, x + w, y, rr);
    g.closePath();
  }

  function arenaKey(arena, R0, px) {
    return arena.id + '|' + Math.round(R0) + '|' + px.toFixed(2);
  }

  // Piso e fosso desenhados uma vez por arena/raio, na resolução em que vão
  // aparecer na tela (evita downscales gigantes a cada quadro).
  function buildArena(arena, R0, px) {
    const side = (R0 + PAD) * 2;
    const res = Math.max(64, Math.round(side * px));

    const pit = document.createElement('canvas');
    pit.width = pit.height = res;
    let g = pit.getContext('2d');
    g.scale(res / side, res / side);
    g.translate(R0 + PAD, R0 + PAD);
    const halo = g.createRadialGradient(0, 0, R0 * 0.7, 0, 0, R0 + PAD);
    halo.addColorStop(0, T.rgba(arena.accent, 0.14));
    halo.addColorStop(0.65, '#151b17');
    halo.addColorStop(1, '#0a0f0c');
    g.fillStyle = halo;
    g.beginPath();
    g.arc(0, 0, R0 + PAD, 0, Math.PI * 2);
    g.fill();

    const floor = document.createElement('canvas');
    floor.width = floor.height = res;
    g = floor.getContext('2d');
    g.scale(res / side, res / side);
    g.translate(R0 + PAD, R0 + PAD);
    const grd = g.createRadialGradient(0, -R0 * 0.3, R0 * 0.08, 0, 0, R0);
    grd.addColorStop(0, arena.floor);
    grd.addColorStop(1, arena.floor2);
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, R0, 0, Math.PI * 2);
    g.fill();

    g.save();
    g.beginPath();
    g.arc(0, 0, R0, 0, Math.PI * 2);
    g.clip();

    // Grade circular comum a todas as arenas.
    g.strokeStyle = 'rgba(0,0,0,.16)';
    g.lineWidth = 1.4;
    for (let r = 44; r < R0; r += 44) {
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.stroke();
    }
    for (let a = 0; a < 6.28; a += 0.523) {
      g.beginPath();
      g.moveTo(Math.cos(a) * 44, Math.sin(a) * 44);
      g.lineTo(Math.cos(a) * R0, Math.sin(a) * R0);
      g.stroke();
    }

    // Detalhes por tema.
    const accent = T.rgba(arena.accent, 0.5);
    if (arena.hazard === 'burn') {
      g.fillStyle = 'rgba(251,146,60,.22)';
      for (let i = 0; i < 34; i++) {
        const a = Math.random() * 6.28;
        const r = Math.random() * R0 * 0.94;
        g.beginPath();
        g.arc(Math.cos(a) * r, Math.sin(a) * r, 1 + Math.random() * 2.6, 0, 6.28);
        g.fill();
      }
    } else if (arena.hazard === 'slow') {
      g.strokeStyle = 'rgba(224,242,254,.30)';
      g.lineWidth = 1;
      for (let i = 0; i < 24; i++) {
        const a = Math.random() * 6.28;
        const r = Math.random() * R0 * 0.9;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        g.beginPath();
        for (let k = 0; k < 3; k++) {
          const ang = k * Math.PI / 3;
          g.moveTo(x, y);
          g.lineTo(x + Math.cos(ang) * 6, y + Math.sin(ang) * 6);
        }
        g.stroke();
      }
    } else if (arena.hazard === 'shock') {
      g.strokeStyle = 'rgba(253,224,71,.26)';
      g.lineWidth = 1.4;
      for (let i = 0; i < 14; i++) {
        let x = (Math.random() * 2 - 1) * R0 * 0.85;
        let y = (Math.random() * 2 - 1) * R0 * 0.85;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
          x += (Math.random() * 2 - 1) * 16;
          y += (Math.random() * 2 - 1) * 16;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    } else if (arena.hazard === 'gust') {
      g.strokeStyle = 'rgba(94,234,212,.24)';
      g.lineWidth = 1.6;
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * 6.28;
        const r = Math.random() * R0 * 0.8;
        g.beginPath();
        g.arc(Math.cos(a) * r, Math.sin(a) * r, 10 + Math.random() * 16, a, a + 2.2);
        g.stroke();
      }
    } else if (arena.hazard === 'spike') {
      g.fillStyle = 'rgba(163,230,53,.20)';
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * 6.28;
        const r = Math.random() * R0 * 0.9;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        g.beginPath();
        g.moveTo(x, y - 5);
        g.lineTo(x + 3, y + 3);
        g.lineTo(x - 3, y + 3);
        g.closePath();
        g.fill();
      }
    } else {
      g.strokeStyle = 'rgba(0,0,0,.18)';
      g.lineWidth = 1.2;
      for (let i = 0; i < 16; i++) {
        let x = (Math.random() * 2 - 1) * R0 * 0.85;
        let y = (Math.random() * 2 - 1) * R0 * 0.85;
        g.beginPath();
        g.moveTo(x, y);
        x += (Math.random() * 2 - 1) * 26;
        y += (Math.random() * 2 - 1) * 26;
        g.lineTo(x, y);
        g.stroke();
      }
    }
    g.restore();

    // Borda interna.
    g.lineWidth = 3;
    g.strokeStyle = T.rgba(arena.wall, 0.55);
    g.beginPath();
    g.arc(0, 0, R0 - 2, 0, Math.PI * 2);
    g.stroke();

    return { pit, floor, side };
  }

  T.resizeCanvas = () => {
    const box = T.$('#cvw');
    const cv = T.$('#cv');
    if (!box || !cv) return;
    const w = box.clientWidth;
    const h = box.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(T.BAL.dprMax, window.devicePixelRatio || 1);
    T.cw = w;
    T.ch = h;
    T.cv = cv;
    T.cx = cv.getContext('2d');
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    if (cv.width !== bw || cv.height !== bh) {
      cv.width = bw;
      cv.height = bh;
    }
    T.cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    T.updateScale();
  };

  // Escala da arena na tela: enquadramento + zoom manual + aproximação da
  // câmera que segue o líder/foco da ultimate. É barato e roda a cada quadro,
  // então o zoom responde na hora mesmo sem redimensionar a janela.
  T.updateScale = () => {
    const w = T.cw || 1;
    const h = T.ch || 1;
    const R = (T.G && (T.G.R0 || T.G.R)) || T.BAL.arenaMax;
    // +40 deixa o muro inteiro (até R+17) dentro do canvas sem cortes.
    const fit = Math.min(w, h) / (2 * R + 40);
    T.camFollow = T.camMode === 'seguir' && !!T.G && T.G.phase === 'fight';
    const CZ = T.CAM_ZOOM || { min: 0.75, max: 2.4, focus: 1.16 };
    let z = Number.isFinite(T.zoom) ? T.zoom : 1;
    z = T.clamp(z, CZ.min, CZ.max);
    if (T.camFollow) z *= T.BAL.camZoom;
    if (T.zoomFocus && performance.now() < T.zoomFocus) z *= CZ.focus || 1.16;
    T.sc = fit * z;
  };

  let observer = null;
  T.observeCanvas = () => {
    const box = T.$('#cvw');
    if (!box || !window.ResizeObserver) return;
    if (observer) observer.disconnect();
    observer = new ResizeObserver(T.frameThrottle(() => {
      if (T.G) T.resizeCanvas();
    }));
    observer.observe(box);
  };

  // ---------------------------------------------------------------------------
  // Sprites / standees
  // ---------------------------------------------------------------------------

  function drawStandee(g, c, own, spr, teamCol) {
    // `spr` é a sprite do golpe; se ela ainda não carregou, usa a do campeão.
    const im = (spr && T.img({ sprite: spr })) || T.img(c);
    const w = 36;
    const h = 44;
    g.save();
    g.translate(w * TS / 2, h * TS / 2);
    g.scale(TS, TS);
    g.translate(-w / 2, -h / 2);

    if (im) {
      // Ajusta a imagem inteira (sem cortar em círculo).
      const boxW = 34;
      const boxH = 42;
      const ratio = Math.min(boxW / im.naturalWidth, boxH / im.naturalHeight);
      const dw = im.naturalWidth * ratio;
      const dh = im.naturalHeight * ratio;
      const dx = (w - dw) / 2;
      const dy = h - dh;
      g.save();
      g.shadowColor = 'rgba(0,0,0,.55)';
      g.shadowBlur = 4;
      g.shadowOffsetY = 2;
      g.drawImage(im, dx, dy, dw, dh);
      g.restore();
      // Sem tingimento de time na sprite: a cor do time fica na aura e no anel.
      // O vermelho forte em duplicatas também saiu; o anel extra já destaca isso.
    } else {
      const col = T.TY[c.t] || '#9ca3af';
      roundRect(g, 3, 5, w - 6, h - 7, 7);
      g.fillStyle = own ? col : (teamCol || col);
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(0,0,0,.55)';
      g.stroke();
      g.fillStyle = '#fff';
      g.font = 'bold 20px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = 'rgba(0,0,0,.5)';
      g.shadowBlur = 3;
      g.fillText((c.n || '?')[0], w / 2, h / 2 + 1);
    }
    g.restore();
  }

  function standee(u, spr) {
    // Só troca quando a imagem do golpe já carregou; enquanto isso, mantém a
    // sprite normal para não piscar.
    const use = spr && T.img({ sprite: spr }) ? spr : '';
    const im = use ? T.img({ sprite: use }) : T.img(u.c);
    let cache = tokens.get(u.c);
    if (!cache) {
      cache = {};
      tokens.set(u.c, cache);
    }
    const own = u.team === 0;
    // A chave inclui a sprite e o time: trocar a imagem no editor invalida o
    // cache na hora, e o substituto sem imagem usa a cor do respectivo time.
    const key = (use || u.c.sprite || '') + '|' + (u.team || 0);

    // Sem imagem carregada: desenha o substituto direto, sem congelar no cache.
    if (!im && (use || u.c.sprite)) return null;
    if (cache[key]) return cache[key];

    const cv = document.createElement('canvas');
    cv.width = 36 * TS;
    cv.height = 44 * TS;
    const g = cv.getContext('2d');
    drawStandee(g, u.c, own, use, T.TC[u.team] || '#38bdf8');
    cache[key] = cv;
    return cv;
  }

  function dot(col) {
    let cv = dots.get(col);
    if (cv) return cv;
    cv = document.createElement('canvas');
    cv.width = cv.height = 32;
    const g = cv.getContext('2d');
    g.translate(16, 16);
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, 14);
    grd.addColorStop(0, '#fff');
    grd.addColorStop(0.3, col);
    grd.addColorStop(1, T.rgba(col, 0));
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, 14, 0, Math.PI * 2);
    g.fill();
    dots.set(col, cv);
    return cv;
  }

  // Brilho suave (sem núcleo branco) para auras, caixas e zonas de perigo.
  const glows = new Map();
  function glow(col) {
    let cv = glows.get(col);
    if (cv) return cv;
    cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 31);
    grd.addColorStop(0, T.rgba(col, 0.55));
    grd.addColorStop(0.55, T.rgba(col, 0.20));
    grd.addColorStop(1, T.rgba(col, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    glows.set(col, cv);
    return cv;
  }

  // ---------------------------------------------------------------------------
  // Arena
  // ---------------------------------------------------------------------------

  function getArena(G) {
    const arena = G.arena || T.ARENAS[0];
    const R0 = G.R0 || T.BAL.arenaMax;
    // Resolução do cache casada com a tela: cada pixel do cache vira ~1 pixel
    // do canvas, então o desenho por quadro é um blit barato.
    const dpr = (T.cv && T.cw) ? T.cv.width / T.cw : 1;
    const px = T.clamp((T.sc || 0.5) * dpr, 0.4, 1.6);
    const key = arenaKey(arena, R0, px);
    let entry = arenas.get(key);
    if (!entry) {
      entry = buildArena(arena, R0, px);
      entry.arena = arena;
      entry.R0 = R0;
      arenas.set(key, entry);
      // Evita segurar várias arenas grandes na memória.
      while (arenas.size > MAX_ARENAS) {
        const oldest = arenas.keys().next().value;
        arenas.delete(oldest);
      }
    }
    return entry;
  }

  // Faixas coloridas mostradas só no posicionamento: cada time fica na sua.
  function drawPrepZones(cx, G) {
    if (!G || G.phase !== 'prep') return;
    const n = Math.max(1, G.nT || 1);
    const R = G.R || G.R0;
    for (let t = 0; t < n; t++) {
      const z = T.teamZone(t, n);
      const col = T.TC[t] || '#38bdf8';
      cx.save();
      cx.beginPath();
      cx.moveTo(0, 0);
      cx.arc(0, 0, R, z.base - z.half, z.base + z.half);
      cx.closePath();
      cx.fillStyle = T.rgba(col, t === 0 ? 0.13 : 0.07);
      cx.fill();
      cx.lineWidth = 2.5;
      cx.strokeStyle = T.rgba(col, t === 0 ? 0.6 : 0.34);
      cx.stroke();
      cx.restore();
    }
  }

  function drawArena(cx, G) {
    const entry = getArena(G);
    const arena = G.arena || T.ARENAS[0];
    const half = entry.side / 2;
    const R = G.R;

    cx.drawImage(entry.pit, -half, -half, entry.side, entry.side);

    // Zona de perigo fora do círculo atual.
    if (R < entry.R0 - 1) {
      cx.save();
      cx.fillStyle = 'rgba(190,30,30,' + (0.15 + 0.08 * Math.sin(G.T * 4)) + ')';
      cx.beginPath();
      cx.arc(0, 0, entry.R0 + 10, 0, Math.PI * 2);
      cx.arc(0, 0, R, 0, Math.PI * 2, true);
      cx.fill();
      cx.restore();
    }

    cx.save();
    cx.beginPath();
    cx.arc(0, 0, R, 0, Math.PI * 2);
    cx.clip();
    cx.drawImage(entry.floor, -half, -half, entry.side, entry.side);
    if (R <= T.BAL.minRadius + 0.5) {
      cx.fillStyle = 'rgba(220,38,38,' + (0.18 + 0.06 * Math.sin(G.T * 6)) + ')';
      cx.fillRect(-entry.R0, -entry.R0, entry.R0 * 2, entry.R0 * 2);
    }
    cx.restore();

    // Muro temático.
    cx.lineWidth = 15;
    cx.strokeStyle = arena.wall;
    cx.setLineDash([24, 3]);
    cx.beginPath();
    cx.arc(0, 0, R + 7, 0, Math.PI * 2);
    cx.stroke();
    cx.setLineDash([]);

    cx.lineWidth = 4;
    cx.strokeStyle = arena.accent;
    cx.beginPath();
    cx.arc(0, 0, R, 0, Math.PI * 2);
    cx.stroke();

    cx.lineWidth = 2;
    cx.strokeStyle = 'rgba(0,0,0,.55)';
    cx.beginPath();
    cx.arc(0, 0, R + 16, 0, Math.PI * 2);
    cx.stroke();
  }

  const HAZ_COL = {
    burn: '#f97316', slow: '#7dd3fc', shock: '#facc15',
    gust: '#5eead4', spike: '#a3e635'
  };
  const HAZ_ICON = {
    burn: '🔥', slow: '❄️', shock: '⚡', gust: '🌪️', spike: '🌵'
  };

  function drawHazards(cx, G) {
    if (!G.haz || !G.haz.length) return;
    G.haz.forEach(h => {
      const col = HAZ_COL[h.type] || '#f97316';
      const pulse = 0.72 + 0.28 * Math.sin((G.T + h.x) * 3);
      const rad = h.r * 1.3;
      cx.globalAlpha = 0.75 * pulse;
      cx.drawImage(glow(col), h.x - rad, h.y - rad, rad * 2, rad * 2);
      cx.globalAlpha = 1;
      cx.strokeStyle = T.rgba(col, 0.5);
      cx.lineWidth = 1.5;
      cx.setLineDash([5, 5]);
      cx.beginPath();
      cx.arc(h.x, h.y, h.r, G.T, G.T + Math.PI * 2);
      cx.stroke();
      cx.setLineDash([]);
      cx.globalAlpha = 0.6;
      cx.font = Math.min(11 * (1 / (T.sc || 1)), h.r * 0.8).toFixed(1) + 'px Georgia, serif';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(HAZ_ICON[h.type] || '', h.x, h.y);
      cx.globalAlpha = 1;
    });
  }

  function drawBoxes(cx, G) {
    if (!G.boxes || !G.boxes.length) return;
    const S = 1 / (T.sc || 1);
    const bs = 14 * S;          // lado da caixa ~14px na tela
    const glowR = 17 * S;
    G.boxes.forEach(b => {
      const box = T.BOXES[b.kind] || T.BOXES.heal;
      const bob = Math.sin((G.T + b.x) * 3) * (2.5 * S);
      const fade = Math.min(1, Math.max(0, b.t / 2.5));
      const pulse = 0.55 + 0.45 * Math.sin((G.T + b.y) * 4);
      const rad = glowR * 1.15;
      cx.globalAlpha = fade * (0.6 + 0.4 * pulse);
      cx.drawImage(glow(box.col), b.x - rad, b.y - rad, rad * 2, rad * 2);
      cx.globalAlpha = fade;

      cx.fillStyle = 'rgba(12,17,14,.86)';
      roundRect(cx, b.x - bs / 2, b.y - bs / 2 + bob, bs, bs, bs * 0.22);
      cx.fill();
      cx.lineWidth = Math.max(1.5, 1.3 * S);
      cx.strokeStyle = box.col;
      cx.stroke();
      cx.font = (bs * 0.72).toFixed(1) + 'px Georgia, serif';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(box.icon, b.x, b.y + bob);
      cx.globalAlpha = 1;
    });
  }

  // ---------------------------------------------------------------------------
  // Unidades
  // ---------------------------------------------------------------------------

  // Fator de escala do "pop" ao usar uma habilidade: sobe rápido e volta
  // suavemente, sem alterar a posição dos pés do boneco.
  function popScale(u, now) {
    const end = u.popT || 0;
    if (end <= now) return 1;
    const dur = u.popDur || 0.7;
    const age = Math.max(0, dur - (end - now));
    const up = Math.min(1, age / 0.12);
    const down = Math.max(0, 1 - Math.max(0, age - 0.12) / Math.max(0.01, dur - 0.12));
    return 1 + 0.13 * up * down;
  }

  // Filtro aplicado só ao desenho do boneco. 'rgb' muda com o tempo; 'cor'
  // usa um matiz fixo sorteado quando a unidade foi criada.
  function shinyFilter(u, now) {
    const k = u.shiny;
    if (!k || !T.SHINY[k]) return '';
    if (k === 'rgb') return 'hue-rotate(' + (Math.floor(now * 90) % 360) + 'deg) saturate(2.4) brightness(1.05)';
    if (k === 'cor') return 'hue-rotate(' + (u.shinyHue || 0) + 'deg) saturate(2) brightness(1.08)';
    return T.SHINY[k].filter || '';
  }

  function drawUnits(cx, G, sel) {
    // Nomes repetidos só mudam quando entram/saem unidades: recalcula pouco.
    if (!G._dups || G._dupLen !== G.us.length) {
      const dups = new Set();
      if (G.us.length > 1) {
        const seen = new Map();
        G.us.forEach(u => seen.set(u.c.n, (seen.get(u.c.n) || 0) + 1));
        seen.forEach((n, name) => { if (n > 1) dups.add(name); });
      }
      G._dups = dups;
      G._dupLen = G.us.length;
    }
    const dups = G._dups;

    const sorted = G.us.slice().sort((a, b) => a.y - b.y);
    sorted.forEach(u => {
      if (!u.alive) return;
      const y = u.y + Math.sin(G.T * 5 + u.x * 0.1) * 1.2;
      const isSel = u === sel && u.team === 0;
      const own = u.team === 0;
      const enemy = !own;

      // Sombra no chão.
      cx.fillStyle = 'rgba(0,0,0,.38)';
      cx.beginPath();
      cx.ellipse(u.x, u.y + 13, 17, 5.5, 0, 0, Math.PI * 2);
      cx.fill();

      // Aura dos inimigos: vermelha no time 1, verde no 2, roxa no 3.
      if (enemy && !T.noFx) {
        const col = T.TC[u.team] || '#f87171';
        const glowR = 46;
        cx.save();
        cx.globalAlpha = 0.27 + 0.06 * Math.sin(G.T * 3 + u.x * 0.05);
        cx.drawImage(glow(col), u.x - glowR, y - SPR_H * 0.45 - glowR, glowR * 2, glowR * 2);
        cx.restore();
      }

      // Anel do time.
      cx.lineWidth = enemy ? 3.5 : 3;
      cx.strokeStyle = T.TC[u.team] || (enemy ? '#f87171' : '#38bdf8');
      cx.beginPath();
      cx.ellipse(u.x, u.y + 13, 21, 8, 0, 0, Math.PI * 2);
      cx.stroke();
      if (enemy && dups.has(u.c.n)) {
        cx.lineWidth = 1.5;
        cx.strokeStyle = 'rgba(255,255,255,.55)';
        cx.beginPath();
        cx.ellipse(u.x, u.y + 13, 25, 10, 0, 0, Math.PI * 2);
        cx.stroke();
      }

      if (isSel) {
        cx.strokeStyle = '#fff';
        cx.setLineDash([4, 3]);
        cx.beginPath();
        cx.ellipse(u.x, u.y + 13, 26, 11, 0, 0, Math.PI * 2);
        cx.stroke();
        cx.setLineDash([]);

        // Ponto tocado pelo jogador: mostra para onde o líder "quer" ir.
        if (u.wish && u.wish.t > G.T) {
          const a = Math.min(1, (u.wish.t - G.T) / 1.2);
          cx.save();
          cx.globalAlpha = 0.35 + 0.35 * a;
          cx.strokeStyle = '#fde68a';
          cx.lineWidth = 2;
          cx.setLineDash([5, 4]);
          cx.beginPath();
          cx.moveTo(u.x, u.y);
          cx.lineTo(u.wish.x, u.wish.y);
          cx.stroke();
          cx.beginPath();
          cx.arc(u.wish.x, u.wish.y, 10, 0, Math.PI * 2);
          cx.stroke();
          cx.restore();
        }
      }

      // Aura de time/estado (sprite de brilho em cache, sem gradiente novo).
      if (!T.noFx && (u.buffT > G.T || u.rageT > G.T)) {
        const col = u.buffT > G.T ? '#7dd3fc' : '#fb7185';
        const glowR = 52;
        cx.globalAlpha = 0.55;
        cx.drawImage(glow(col), u.x - glowR, y - SPR_H * 0.45 - glowR, glowR * 2, glowR * 2);
        cx.globalAlpha = 1;
      }

      // Sprite do campeão, com o leve "pop" de escala ao usar habilidade.
      // A transformação gira em torno dos pés para o boneco não parecer flutuar.
      const ps = popScale(u, G.T);
      cx.save();
      if (ps !== 1) {
        cx.translate(u.x, y + 12);
        cx.scale(ps, ps);
        cx.translate(-u.x, -(y + 12));
      }
      const spr = (u.castT || 0) > G.T ? u.castImg : '';
      const cv = standee(u, spr);
      const shine = shinyFilter(u, G.T);
      if (shine) cx.filter = shine;
      if (cv) {
        cx.drawImage(cv, u.x - SPR_W / 2, y + 12 - SPR_H, SPR_W, SPR_H);
      } else {
        // Substituto temporário enquanto a imagem carrega.
        const col = T.TY[u.c.t] || '#9ca3af';
        cx.fillStyle = enemy ? T.rgba(T.TC[u.team] || '#f87171', 0.62) : col;
        roundRect(cx, u.x - 23, y + 12 - SPR_H * 0.78, 46, SPR_H * 0.78, 9);
        cx.fill();
        cx.lineWidth = 2;
        cx.strokeStyle = 'rgba(0,0,0,.55)';
        cx.stroke();
        cx.fillStyle = '#fff';
        cx.font = 'bold ' + (24).toFixed(0) + 'px Georgia, serif';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText((u.c.n || '?')[0], u.x, y + 12 - SPR_H * 0.39);
      }
      cx.restore();

      // Selo do nerf por atributos negativos, ao lado da sprite.
      const nf = u.nerf || T.nerf(u.c);
      if (nf.total) {
        const bx = u.x + SPR_W * 0.34;
        const by = y + 12 - SPR_H + 9;
        cx.save();
        cx.fillStyle = 'rgba(90,15,25,.92)';
        cx.strokeStyle = '#f87171';
        cx.lineWidth = 1.5;
        cx.beginPath();
        cx.arc(bx, by, 9, 0, Math.PI * 2);
        cx.fill();
        cx.stroke();
        cx.fillStyle = '#fff';
        cx.font = 'bold 12px sans-serif';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText('!', bx, by + 0.5);
        cx.restore();
      }

      if (!T.noFx && G.T < u.fl) {
        cx.globalAlpha = 0.55;
        cx.fillStyle = '#fff';
        cx.beginPath();
        cx.arc(u.x, y - SPR_H * 0.5, 22, 0, Math.PI * 2);
        cx.fill();
        cx.globalAlpha = 1;
      }

      // Texto e indicadores são medidos em pixels de tela (S = 1 / escala
      // do mundo) para continuarem legíveis em qualquer tamanho de janela.
      const S = 1 / (T.sc || 1);
      const topEdge = (T.camY || 0) - T.ch / (2 * T.sc) + 4;

      // Vida. A barra fica acima do standee e presa à borda visível para não
      // sair da tela quando o campeão está colado no topo da arena.
      const bh = Math.max(5, 4 * S);
      const hpY = Math.max(topEdge, y + 12 - SPR_H - 4 - bh);
      const hpf = Math.max(0, u.hp / u.hpM);
      cx.fillStyle = 'rgba(0,0,0,.66)';
      roundRect(cx, u.x - 31, hpY, 62, bh, bh / 2);
      cx.fill();
      cx.fillStyle = hpf > 0.35 ? (own ? '#6ee7a0' : '#fb7185') : '#fbbf24';
      if (hpf > 0) {
        roundRect(cx, u.x - 29.5, hpY + 1, 59 * hpf, bh - 2, (bh - 2) / 2);
        cx.fill();
      }

      // Recarga do ataque básico.
      cx.fillStyle = 'rgba(0,0,0,.55)';
      cx.fillRect(u.x - 21, y + 24, 42, 3);
      cx.fillStyle = 'rgba(255,255,255,.85)';
      cx.fillRect(u.x - 21, y + 24, 42 * Math.min(1, Math.max(0, 1 - u.at)), 3);

      if (u.shield > 0) {
        cx.strokeStyle = 'rgba(56,189,248,.9)';
        cx.lineWidth = Math.max(2, 1.6 * S);
        cx.beginPath();
        cx.arc(u.x, y - SPR_H * 0.42, 44, 0, Math.PI * 2);
        cx.stroke();
      }

      // Windup da habilidade.
      if (!T.noFx && u.wind) {
        const p = 1 - Math.max(0, u.wind.t) / u.wind.max;
        cx.strokeStyle = '#fcd34d';
        cx.lineWidth = Math.max(3, 2.6 * S);
        cx.beginPath();
        cx.arc(u.x, y - SPR_H * 0.42, 39, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
        cx.stroke();
      }

      const statuses = T.statusList(u, G);
      if (statuses.length) {
        const sf = 11 * S;
        cx.font = sf.toFixed(1) + 'px Georgia, serif';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        const row = statuses.slice(0, 5);
        const start = u.x - (row.length - 1) * sf * 0.55;
        row.forEach((k, i) => {
          cx.fillText((T.STAT[k] || [''])[0], start + i * sf * 1.1, hpY - sf * 0.6);
        });
      }

      if (u.o) {
        const lf = 10 * S;
        const label = (T.ORD[u.o.k] || '').split(' ')[0];
        cx.font = 'bold ' + lf.toFixed(1) + 'px Georgia, serif';
        const w = cx.measureText(label).width + lf * 0.9;
        const hh = lf * 1.35;
        cx.fillStyle = 'rgba(0,0,0,.66)';
        roundRect(cx, u.x - w / 2, y + 30, w, hh, hh / 2);
        cx.fill();
        cx.fillStyle = '#fde68a';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText(label, u.x, y + 30 + hh / 2);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Efeitos, avisos e projéteis
  // ---------------------------------------------------------------------------

  function drawFxBelow(cx, fx) {
    fx.forEach(f => {
      const a = Math.max(0, Math.min(1, f.l / f.max));
      if (f.k === 'ring') {
        cx.globalAlpha = Math.min(1, a * 1.5);
        cx.strokeStyle = f.col;
        cx.lineWidth = 3;
        cx.beginPath();
        cx.arc(f.x, f.y, 65 * (1.2 - a), 0, Math.PI * 2);
        cx.stroke();
      } else if (f.k === 'line') {
        cx.globalAlpha = Math.min(1, a * 1.5);
        cx.strokeStyle = f.col;
        cx.lineWidth = 2;
        cx.beginPath();
        cx.moveTo(f.x, f.y);
        cx.lineTo(f.x2, f.y2);
        cx.stroke();
      } else if (f.k === 'r2') {
        cx.globalAlpha = Math.min(1, a * 1.5);
        cx.strokeStyle = f.col;
        cx.lineWidth = 3;
        cx.beginPath();
        cx.arc(f.x, f.y, f.x2 * (1.2 - a), 0, Math.PI * 2);
        cx.stroke();
      }
    });
    cx.globalAlpha = 1;
  }

  function drawCallouts(cx, G) {
    const calls = (G.fx || []).filter(f => f.k === 'call' && f.ref && f.ref.alive);
    if (!calls.length) return;
    // Avisos são dimensionados em pixels de tela: 12px de texto legível,
    // empilhados 18px acima um do outro.
    const S = 1 / (T.sc || 1);
    const fs = 12 * S;
    const hh = fs * 1.55;
    const gap = 18 * S;
    const topEdge = (T.camY || 0) - T.ch / (2 * T.sc) + hh / 2 + 2;
    const bh = Math.max(5, 4 * S);
    const base = 12 - SPR_H - 4 - bh - 4 - hh / 2;
    calls.forEach(f => {
      const u = f.ref;
      const a = Math.max(0, Math.min(1, f.l / f.max));
      const rise = (1 - a) * (7 * S);
      const y = Math.max(topEdge, u.y + base - (f.off || 0) * gap - rise);
      cx.font = 'bold ' + fs.toFixed(1) + 'px Georgia, serif';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      // Largura medida uma vez por escala (measureText por quadro é caro).
      if (f._w == null || f._sc !== T.sc) {
        f._sc = T.sc;
        f._w = cx.measureText(f.txt).width;
      }
      const w = f._w + fs * 0.9;
      cx.globalAlpha = Math.min(1, a * 1.7);
      cx.fillStyle = 'rgba(8,12,10,.84)';
      roundRect(cx, u.x - w / 2, y - hh / 2, w, hh, hh / 2);
      cx.fill();
      cx.lineWidth = Math.max(1, 1.3 * S);
      cx.strokeStyle = f.col;
      cx.stroke();
      cx.fillStyle = f.col;
      cx.fillText(f.txt, u.x, y);
      cx.globalAlpha = 1;
    });
  }

  function drawFxTop(cx, G) {
    G.pr.forEach(p => {
      if (p.sp) {
        const im = T.img({ sprite: p.sp });
        if (im) {
          cx.drawImage(im, p.x - 9, p.y - 9, 18, 18);
          return;
        }
      }
      cx.drawImage(dot(p.col), p.x - 8, p.y - 8, 16, 16);
    });

    G.fx.forEach(f => {
      if (f.k === 'call') return;
      const a = Math.max(0, Math.min(1, f.l / f.max));
      if (f.k === 'img') {
        const im = T.img({ sprite: f.txt });
        if (im) {
          cx.globalAlpha = Math.min(1, a * 2);
          cx.drawImage(im, f.x - 32, f.y - 32, 64, 64);
        }
      } else if (f.k === 't') {
        const S = 1 / (T.sc || 1);
        cx.globalAlpha = Math.min(1, a * 2);
        cx.font = 'bold ' + (13 * S).toFixed(1) + 'px Georgia, serif';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.lineWidth = Math.max(2, 3 * S);
        cx.strokeStyle = 'rgba(0,0,0,.7)';
        const ty = f.y - (0.7 - f.l) * 14 * S;
        cx.strokeText(f.txt, f.x, ty);
        cx.fillStyle = f.col;
        cx.fillText(f.txt, f.x, ty);
      }
    });
    cx.globalAlpha = 1;
  }

  function drawBanner(cx, G) {
    const b = G.banner;
    if (!b) return;
    const a = Math.min(1, Math.min(b.t, b.max - b.t + 0.2) * 1.8);
    if (a <= 0) return;
    const col = b.kind === 'warn' ? '#fbbf24' : b.kind === 'win' ? '#86efac' : '#e5e7eb';
    const S = 1 / (T.sc || 1);
    const fs = 14 * S;
    const hh = fs * 1.9;
    cx.save();
    cx.globalAlpha = Math.max(0, Math.min(1, a));
    cx.font = 'bold ' + fs.toFixed(1) + 'px Georgia, serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    const w = Math.min(cx.measureText(b.txt).width + fs * 1.6, T.cw / (T.sc || 1) - 12);
    const y = (T.camY || 0) - T.ch / (2 * T.sc) + hh * 0.8;
    cx.fillStyle = 'rgba(8,12,10,.72)';
    roundRect(cx, -w / 2, y - hh / 2, w, hh, hh / 2);
    cx.fill();
    cx.lineWidth = Math.max(1.5, 1.4 * S);
    cx.strokeStyle = T.rgba(col, 0.7);
    cx.stroke();
    cx.fillStyle = col;
    cx.fillText(b.txt, 0, y + 1);
    cx.restore();
  }

  T.draw = () => {
    const G = T.G;
    if (!G || !T.cx) return;
    const cx = T.cx;
    T.updateScale();
    cx.clearRect(0, 0, T.cw, T.ch);

    // Câmera: fixa no centro, seguindo o líder ou deslocada pelo arraste fora
    // da arena. O zoom manual (e o foco da ultimate) é aplicado em updateScale.
    T.camFollow = T.camMode === 'seguir' && G.phase === 'fight';
    let camX = 0;
    let camY = 0;
    const focus = T.zoomFocus && performance.now() < T.zoomFocus;
    if (T.camFollow || focus) {
      const lead = T.mine()[T.selI] || T.mine().find(u => u.alive);
      if (lead) {
        const R = G.R || G.R0;
        const halfW = T.cw / (2 * T.sc);
        const halfH = T.ch / (2 * T.sc);
        const limX = Math.max(0, R + 18 - halfW);
        const limY = Math.max(0, R + 18 - halfH);
        camX = T.clamp(lead.x, -limX, limX);
        camY = T.clamp(lead.y, -limY, limY);
      }
    }
    // O arraste do jogador soma ao enquadramento e é limitado para a arena não
    // desaparecer. Durante o foco da ultimate ele é ignorado temporariamente.
    if (!focus) {
      const R = (G.R || G.R0 || T.BAL.arenaMax) + 24;
      const halfW = T.cw / (2 * T.sc);
      const halfH = T.ch / (2 * T.sc);
      const slack = (T.CAM_ZOOM && T.CAM_ZOOM.panSlack) || 0;
      const limX = Math.max(slack, R - halfW);
      const limY = Math.max(slack, R - halfH);
      camX = T.clamp(camX + (T.panX || 0), -limX, limX);
      camY = T.clamp(camY + (T.panY || 0), -limY, limY);
    }
    T.camX = camX;
    T.camY = camY;

    cx.save();
    cx.translate(T.cw / 2 - camX * T.sc, T.ch / 2 - camY * T.sc);
    cx.scale(T.sc, T.sc);

    drawArena(cx, G);
    if (!T.noFx) drawPrepZones(cx, G);
    if (!T.noFx) drawHazards(cx, G);
    if (!T.noFx) drawFxBelow(cx, G.fx);
    const sel = T.mine()[T.selI];
    drawUnits(cx, G, sel);
    if (!T.noFx) drawBoxes(cx, G);
    if (!T.noFx) drawFxTop(cx, G);
    if (!T.noFx) drawCallouts(cx, G);
    if (!T.noFx) drawBanner(cx, G);

    cx.restore();
    cx.globalAlpha = 1;

    let info = '';
    if (G.phase === 'prep') {
      info = '';   // o painel de posicionamento já mostra a contagem
    } else if (G.over) {
      info = G.over;
    } else if (G.mode === 'sobrevivencia') {
      info = '🧟 Onda ' + G.wave;
    } else if (G.T < G.shrinkStart) {
      info = '';   // o tempo já aparece na barra do topo
    } else if (G.R <= T.BAL.minRadius + 0.5) {
      info = '☠️ Colapso!';
    } else {
      info = '⚠️ Arena fechando';
    }
    if (info !== T._infoTxt) {
      T._infoTxt = info;
      const el = T.$('#info');
      if (el) el.textContent = info;
    }
  };

  T.observeCanvas();
})(window.TBB = window.TBB || {});