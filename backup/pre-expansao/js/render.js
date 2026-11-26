// Renderização do canvas: arena em cache, sprites de unidade e efeitos.
(function (T) {
  'use strict';

  const PAD = 34;
  const SIDE = (T.R0 + PAD) * 2;
  let pit = null;
  let floor = null;
  const tokens = new WeakMap();
  const dots = new Map();

  T.cw = 0;
  T.ch = 0;
  T.sc = 1;
  T.cv = null;
  T.cx = null;
  T._infoTxt = '';

  function buildArena() {
    const scale = 2;
    pit = document.createElement('canvas');
    pit.width = pit.height = SIDE * scale;
    let g = pit.getContext('2d');
    g.scale(scale, scale);
    g.translate(T.R0 + PAD, T.R0 + PAD);
    let grd = g.createRadialGradient(0, 0, T.R0 * 0.2, 0, 0, T.R0 + 30);
    grd.addColorStop(0, '#2b332d');
    grd.addColorStop(1, '#101411');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, T.R0 + 16, 0, Math.PI * 2);
    g.fill();

    floor = document.createElement('canvas');
    floor.width = floor.height = SIDE * scale;
    g = floor.getContext('2d');
    g.scale(scale, scale);
    g.translate(T.R0 + PAD, T.R0 + PAD);
    grd = g.createRadialGradient(0, -T.R0 * 0.3, T.R0 * 0.1, 0, 0, T.R0);
    grd.addColorStop(0, '#7f8a79');
    grd.addColorStop(1, '#4a5448');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, T.R0, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.beginPath();
    g.arc(0, 0, T.R0, 0, Math.PI * 2);
    g.clip();
    g.strokeStyle = 'rgba(0,0,0,.14)';
    g.lineWidth = 1.5;
    for (let r = 40; r < T.R0; r += 40) {
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.stroke();
    }
    for (let a = 0; a < 6.28; a += 0.52) {
      g.beginPath();
      g.moveTo(Math.cos(a) * 40, Math.sin(a) * 40);
      g.lineTo(Math.cos(a) * T.R0, Math.sin(a) * T.R0);
      g.stroke();
    }
    g.restore();
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
    T.sc = Math.min(w, h) / (2 * T.R0 + 24);
    if (!pit) buildArena();
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

  function token(u) {
    const col = T.TY[u.c.t] || '#9ca3af';
    let cv = tokens.get(u.c);
    if (cv) return cv;

    const size = 64;
    cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    g.translate(size / 2, size / 2);

    const glow = g.createRadialGradient(0, 0, 10, 0, 0, 30);
    glow.addColorStop(0, T.rgba(col, 0.55));
    glow.addColorStop(1, T.rgba(col, 0));
    g.fillStyle = glow;
    g.beginPath();
    g.arc(0, 0, 30, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = col;
    g.beginPath();
    g.arc(0, 0, 26, 0, Math.PI * 2);
    g.fill();

    g.save();
    g.beginPath();
    g.arc(0, 0, 26, 0, Math.PI * 2);
    g.clip();
    const im = T.img(u.c);
    if (im) {
      g.drawImage(im, -26, -26, 52, 52);
    } else {
      g.fillStyle = '#111';
      g.font = 'bold 26px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText((u.c.n || '?')[0], 0, 1);
    }
    const shade = g.createRadialGradient(-8, -10, 2, 0, 0, 30);
    shade.addColorStop(0, 'rgba(255,255,255,.5)');
    shade.addColorStop(1, 'rgba(0,0,0,.38)');
    g.fillStyle = shade;
    g.fillRect(-26, -26, 52, 52);
    g.restore();

    g.lineWidth = 4;
    g.strokeStyle = 'rgba(0,0,0,.65)';
    g.beginPath();
    g.arc(0, 0, 26, 0, Math.PI * 2);
    g.stroke();

    tokens.set(u.c, cv);
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

  const ORDERS = T.ORD;

  function drawArena(cx, R, time) {
    const half = SIDE / 2;
    cx.drawImage(pit, -half, -half, SIDE, SIDE);
    if (R < T.R0 - 1) {
      cx.fillStyle = 'rgba(190,30,30,' + (0.16 + 0.1 * Math.sin(time * 4)) + ')';
      cx.beginPath();
      cx.arc(0, 0, T.R0 + 16, 0, Math.PI * 2);
      cx.fill();
    }
    cx.save();
    cx.beginPath();
    cx.arc(0, 0, R, 0, Math.PI * 2);
    cx.clip();
    cx.drawImage(floor, -half, -half, SIDE, SIDE);
    if (R <= T.BAL.minRadius + 0.5) {
      cx.fillStyle = 'rgba(220,38,38,.2)';
      cx.fillRect(-T.R0, -T.R0, T.R0 * 2, T.R0 * 2);
    }
    cx.restore();

    cx.lineWidth = 16;
    cx.strokeStyle = '#a39b8b';
    cx.setLineDash([22, 2.5]);
    cx.beginPath();
    cx.arc(0, 0, R + 8, 0, Math.PI * 2);
    cx.stroke();
    cx.setLineDash([]);

    cx.lineWidth = 3;
    cx.strokeStyle = '#d6cfbf';
    cx.beginPath();
    cx.arc(0, 0, R, 0, Math.PI * 2);
    cx.stroke();

    cx.strokeStyle = '#4f4a3f';
    cx.beginPath();
    cx.arc(0, 0, R + 17, 0, Math.PI * 2);
    cx.stroke();
  }

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

  function drawUnits(cx, G, sel) {
    const sorted = G.us.slice().sort((a, b) => a.y - b.y);
    sorted.forEach(u => {
      if (!u.alive) return;
      const y = u.y + Math.sin(G.T * 7 + u.x) * 1.3;
      const isSel = u === sel;

      cx.fillStyle = 'rgba(0,0,0,.35)';
      cx.beginPath();
      cx.ellipse(u.x, u.y + 12, 12, 4.5, 0, 0, Math.PI * 2);
      cx.fill();

      cx.lineWidth = 3;
      cx.strokeStyle = T.TC[u.team] || '#fff';
      cx.beginPath();
      cx.ellipse(u.x, u.y + 12, 16, 6.5, 0, 0, Math.PI * 2);
      cx.stroke();

      if (isSel) {
        cx.strokeStyle = '#fff';
        cx.setLineDash([4, 3]);
        cx.beginPath();
        cx.ellipse(u.x, u.y + 12, 21, 9, 0, 0, Math.PI * 2);
        cx.stroke();
        cx.setLineDash([]);
      }

      cx.drawImage(token(u), u.x - 16, y - 16, 32, 32);
      if (G.T < u.fl) {
        cx.globalAlpha = 0.55;
        cx.fillStyle = '#fff';
        cx.beginPath();
        cx.arc(u.x, y, 13, 0, Math.PI * 2);
        cx.fill();
        cx.globalAlpha = 1;
      }

      cx.fillStyle = 'rgba(0,0,0,.55)';
      cx.fillRect(u.x - 15, y - 26, 30, 5);
      cx.fillStyle = u.hp / u.hpM > 0.35 ? '#6ee7a0' : '#f87171';
      cx.fillRect(u.x - 14, y - 25, 28 * Math.max(0, u.hp / u.hpM), 3);

      cx.fillStyle = 'rgba(0,0,0,.6)';
      cx.fillRect(u.x - 15, y + 20, 30, 5);
      cx.fillStyle = '#fff';
      cx.fillRect(u.x - 14, y + 21, 28 * Math.min(1, 1 - Math.max(0, u.at)), 3);

      if (u.shield > 0) {
        cx.strokeStyle = 'rgba(56,189,248,.9)';
        cx.lineWidth = 2;
        cx.beginPath();
        cx.arc(u.x, y, 20, 0, Math.PI * 2);
        cx.stroke();
      }

      const statuses = T.statusList(u, G);
      if (statuses.length) {
        cx.font = '10px Georgia, serif';
        cx.textAlign = 'center';
        cx.fillStyle = '#fff';
        const start = u.x - Math.min(statuses.length, 6) * 5;
        statuses.slice(0, 6).forEach((k, i) => {
          cx.fillText((T.STAT[k] || [''])[0], start + i * 10, y - 30);
        });
      }

      if (u.o) {
        cx.fillStyle = '#fff';
        cx.font = '11px Georgia, serif';
        cx.textAlign = 'center';
        cx.fillText((ORDERS[u.o.k] || '').split(' ')[0], u.x, y + 36);
      }
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
      const a = Math.max(0, Math.min(1, f.l / f.max));
      if (f.k === 'img') {
        const im = T.img({ sprite: f.txt });
        if (im) {
          cx.globalAlpha = Math.min(1, a * 2);
          cx.drawImage(im, f.x - 32, f.y - 32, 64, 64);
        }
      } else if (f.k === 't') {
        cx.globalAlpha = Math.min(1, a * 2);
        cx.font = 'bold 13px Georgia, serif';
        cx.textAlign = 'center';
        cx.lineWidth = 3;
        cx.strokeStyle = 'rgba(0,0,0,.65)';
        const ty = f.y - (0.7 - f.l) * 20;
        cx.strokeText(f.txt, f.x, ty);
        cx.fillStyle = f.col;
        cx.fillText(f.txt, f.x, ty);
      }
    });
    cx.globalAlpha = 1;
  }

  T.draw = () => {
    const G = T.G;
    if (!G || !T.cx) return;
    const cx = T.cx;
    cx.clearRect(0, 0, T.cw, T.ch);
    cx.save();
    cx.translate(T.cw / 2, T.ch / 2);
    cx.scale(T.sc, T.sc);

    drawArena(cx, G.R, G.T);
    drawFxBelow(cx, G.fx);
    const sel = T.mine()[T.selI];
    drawUnits(cx, G, sel);
    drawFxTop(cx, G);

    cx.restore();
    cx.globalAlpha = 1;

    let info = 'Tempo ' + G.T.toFixed(0) + 's';
    if (G.T < T.BAL.shrinkStart) info += ' · muro fecha em ' + Math.ceil(T.BAL.shrinkStart - G.T) + 's';
    else if (G.R <= T.BAL.minRadius + 0.5) info += ' · colapso: todos perdem vida';
    if (info !== T._infoTxt) {
      T._infoTxt = info;
      T.$('#info').textContent = info;
    }
  };

  T.observeCanvas();
})(window.TBB = window.TBB || {});
