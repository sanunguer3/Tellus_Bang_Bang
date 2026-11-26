// Gera sprites pixel art em runtime para campeões/criaturas/habilidades/projéteis
// que não possuem sprite própria. Data URLs PNG, cacheadas em memória.
(function (T) {
  'use strict';

  const cache = new Map();
  const PC = { // paleta por tipo
    fogo: ['#7a2b10', '#d94f1a', '#ff8a3d', '#ffd07a'],
    agua: ['#0b3b66', '#1e78c8', '#58b8ff', '#b8e8ff'],
    planta: ['#1e4a24', '#3f8f3f', '#79c65a', '#c7ef9a'],
    terra: ['#4a3520', '#8a6237', '#c49a6c', '#ecd2a6'],
    ar: ['#4b6078', '#8ba7bf', '#cfe1f2', '#ffffff'],
    luz: ['#7a6518', '#d4b12a', '#ffe06a', '#fff8d0'],
    sombra: ['#241a38', '#5b3f8c', '#9470d6', '#d8c5ff'],
    eletrico: ['#4a4a10', '#b8b020', '#ffe44d', '#fff9b0'],
    gelo: ['#28546a', '#5fa8c8', '#a8dcf0', '#e8faff'],
    metal: ['#3a4048', '#7a8694', '#b8c2cc', '#edf1f4'],
    veneno: ['#294018', '#5d8a2c', '#9bc44f', '#dff0a0'],
    psiquico: ['#5a1f52', '#b04aa0', '#f07ad8', '#ffd0f4'],
    normal: ['#4a4a4a', '#8a8a8a', '#c2c2c2', '#f0f0f0']
  };
  const FC = { // detalhe por facção
    heroi: '#f7e07a', vilao: '#ff6b6b', criatura: '#9ae6b4', neutro: '#d1d5db',
    anjo: '#fff3a3', demonio: '#ff8f8f'
  };

  function hash(s) {
    s = String(s || '');
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; }; }
  function pal(c) { return PC[c && c.t] || PC.normal; }
  function outline(px, w, h, col) {
    const out = new Uint32Array(w * h);
    const src = px;
    const has = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] !== 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (src[i]) { out[i] = src[i]; continue; }
      if (has(x-1,y)||has(x+1,y)||has(x,y-1)||has(x,y+1)) out[i] = col;
    }
    return out;
  }
  function rgba(hex, a) {
    const h = String(hex || '#888').replace('#','');
    const r = parseInt(h.length === 3 ? h[0]+h[0] : h.slice(0,2), 16) || 0;
    const g = parseInt(h.length === 3 ? h[1]+h[1] : h.slice(2,4), 16) || 0;
    const b = parseInt(h.length === 3 ? h[2]+h[2] : h.slice(4,6), 16) || 0;
    return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  function put(px, w, h, x, y, col) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = col; }
  function box(px, w, h, x, y, bw, bh, col) { for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) put(px, w, h, x+i, y+j, col); }
  function mirrorDraw(px, w, h, drawHalf) { drawHalf((x,y,c)=>put(px,w,h,x,y,c), (x,y,c)=>put(px,w,h,w-1-x,y,c), w, h); }

  function toImage(px, w, h, scale) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    const d = new Uint32Array(img.data.buffer);
    d.set(px);
    ctx.putImageData(img, 0, 0);
    const out = document.createElement('canvas'); out.width = w * scale; out.height = h * scale;
    const o = out.getContext('2d'); o.imageSmoothingEnabled = false; o.drawImage(c, 0, 0, out.width, out.height);
    const im = new Image(); im.src = out.toDataURL('image/png'); return im;
  }

  function drawChampion(c, castSkill) {
    const W = 24, H = 28, S = 3; // 72x84 output
    let px = new Uint32Array(W * H);
    const p = pal(c), r = rng(hash((c.n||'')+'|'+(c.t||'')+'|'+(c.f||'')+'|'+(c.r||'')));
    const dark = rgba(p[0],255), mid = rgba(p[1],255), main = rgba(p[2],255), light = rgba(p[3],255);
    const eye = rgba('#f8fafc',255), white = rgba('#ffffff',255);
    const skin = rgba(c.f === 'demonio' ? '#d8a0a0' : c.f === 'criatura' ? '#c9d8b0' : '#f1c9a5',255);
    const isCreature = T.isCreature(c);
    const legY = 22, bodyY = 13, headY = 6;

    // shadow
    for (let i = 8; i < 16; i++) put(px,W,H,i,26,rgba('#000000',60));

    // legs
    box(px,W,H,9,legY,2,4,dark); box(px,W,H,13,legY,2,4,dark);
    box(px,W,H,9,25,3,1,rgba('#3b2a1a',255)); box(px,W,H,12,25,3,1,rgba('#3b2a1a',255));

    // body
    for (let y = bodyY; y < legY; y++) for (let x = 8; x < 16; x++) {
      const edge = x===8||x===15||y===bodyY;
      put(px,W,H,x,y, edge ? dark : (x < 12 ? main : mid));
    }
    // chest detail
    put(px,W,H,11,15,light); put(px,W,H,12,15,light);

    // arms
    box(px,W,H,6,14,2,5,mid); box(px,W,H,16,14,2,5,mid);
    put(px,W,H,6,19,skin); put(px,W,H,7,19,skin); put(px,W,H,16,19,skin); put(px,W,H,17,19,skin);

    // head
    for (let y = headY; y < bodyY; y++) for (let x = 9; x < 15; x++) {
      const edge = x===9||x===14||y===headY;
      put(px,W,H,x,y, edge ? dark : skin);
    }
    // eyes facing right
    put(px,W,H,12,9,rgba('#1f2937',255)); put(px,W,H,13,9,white);

    // class/type accents
    const fac = rgba(FC[c.f] || FC.neutro, 255);
    if (isCreature) {
      // ears/horns
      put(px,W,H,8,5,dark); put(px,W,H,8,4,main); put(px,W,H,15,5,dark); put(px,W,H,15,4,main);
      put(px,W,H,13,10,rgba('#3f6212',255)); // mouth
    } else {
      // helmet/hair band
      for (let x=9;x<15;x++) put(px,W,H,x,5,main);
      put(px,W,H,9,6,mid); put(px,W,H,14,6,mid);
      put(px,W,H,11,4,fac); put(px,W,H,12,4,fac); // crest
    }
    // weapon hint facing right
    if (castSkill) {
      const cat = castSkill.cat || 'dano';
      const wc = cat==='cura'||cat==='buff' ? rgba('#86efac',255) : cat==='debuff' ? rgba('#c084fc',255) : rgba('#fde68a',255);
      box(px,W,H,18,10,2,8,rgba('#6b7280',255)); put(px,W,H,18,9,wc); put(px,W,H,19,9,wc); put(px,W,H,19,10,wc);
      // arm raised
      box(px,W,H,16,12,2,3,mid); box(px,W,H,17,11,2,2,skin);
    } else {
      // small weapon/sheath
      box(px,W,H,17,15,1,5,rgba('#94a3b8',255));
    }

    // rarity glow pixels
    if ((c.r||'comum') !== 'comum') {
      const rc = c.r==='raro'?rgba('#60a5fa',180):c.r==='epico'?rgba('#c084fc',190):rgba('#fbbf24',200);
      [ [7,13],[16,13],[11,3],[12,3] ].forEach(([x,y])=>put(px,W,H,x,y,rc));
    }

    px = outline(px, W, H, rgba('#101418', 220));
    return toImage(px, W, H, S);
  }

  function drawProj(skill, c) {
    const W = 12, H = 12, S = 2;
    let px = new Uint32Array(W * H);
    const p = pal(c);
    const cat = (skill && skill.cat) || 'dano';
    const main = rgba(cat==='cura'? '#86efac': cat==='buff'? '#7dd3fc': cat==='debuff'? '#c084fc': p[2], 255);
    const light = rgba(cat==='cura'? '#dcfce7': cat==='debuff'? '#ede9fe': p[3], 255);
    const dark = rgba(p[0],255);
    // simple projectile facing right
    for (let y=4;y<8;y++) for (let x=2;x<9;x++) put(px,W,H,x,y, x<4?dark:x>6?light:main);
    put(px,W,H,9,5,light); put(px,W,H,9,6,light); put(px,W,H,10,5,white=rgba('#fff',255)); put(px,W,H,10,6,white);
    put(px,W,H,1,5,rgba(p[1],200)); put(px,W,H,1,6,rgba(p[1],200));
    px = outline(px,W,H,rgba('#101418',180));
    return toImage(px,W,H,S);
  }

  function keyChamp(c, cast) { return 'c:' + (c.n||'') + '|' + (c.t||'') + '|' + (c.f||'') + '|' + (c.r||'') + '|' + (T.isCreature(c)?'cr':'ch') + '|' + (cast ? (cast.n||cast.tier||'cast') : 'base'); }
  function keyProj(skill,c) { const s = skill || {}; return 'p:' + (s.n||'') + '|' + (s.cat||'dano') + '|' + (s.mode||'') + '|' + (c&&c.t||''); }

  function getOr(k, fn) { if (cache.has(k)) return cache.get(k); const im = fn(); cache.set(k, im); return im; }

  // Desativado temporariamente: aguardando referências de estilo do usuário.
  T.pixelSprite = () => null;
  T.pixelProj = () => null;
})(window.TBB = window.TBB || {});