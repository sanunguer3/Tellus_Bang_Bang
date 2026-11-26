// Sanitização de campeões vindos da nuvem ou do localStorage.
(function (T) {
  'use strict';

  const OKIMG = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
  const MAXIMG = 60000; // ~60 KB por sprite
  const cl = value => String(value == null ? '' : value).replace(/[<>"&'`\\]/g, '');

  function sanSkill(raw, tier) {
    const ti = T.TIER[tier];
    let base;
    if (raw) {
      const copy = T.clone(raw);
      copy.tier = tier;
      base = T.normSkill(copy);
    } else {
      base = T.mkSkill(tier);
    }
    const num = (v, min, max, def) => {
      const n = +v;
      return Math.min(max, Math.max(min, Number.isFinite(n) ? n : def));
    };
    const cat = Object.hasOwn(T.SCAT, base.cat) ? base.cat : 'dano';
    const mode = (cat === 'buff' || cat === 'debuff') ? '' :
      (Object.hasOwn(T.SMODE, base.mode) ? base.mode : '');
    const o = {
      n: cl(base.n).slice(0, 12) || ti.n,
      cat,
      mode,
      alvo: Object.hasOwn(T.SALVO, base.alvo) ? base.alvo : T.inferAlvo(base),
      ef: {},
      efv: {},
      mult: num(base.mult, T.SKILL_RANGE.multMin, T.SKILL_RANGE.multMax, ti.mult),
      hits: cat === 'dano'
        ? Math.round(num(base.hits, T.SKILL_RANGE.hitsMin, T.SKILL_RANGE.hitsMax, 1))
        : 1,
      gap: cat === 'dano'
        ? num(base.gap, T.SKILL_RANGE.gapMin, T.SKILL_RANGE.gapMax, 0.4)
        : 0.4,
      rng: num(base.rng, T.SKILL_RANGE.rngMin, T.SKILL_RANGE.rngMax, 150),
      pspd: num(base.pspd, T.SKILL_RANGE.pspdMin, T.SKILL_RANGE.pspdMax, 230),
      rad: num(base.rad, T.SKILL_RANGE.radMin, T.SKILL_RANGE.radMax, 60),
      cd: num(base.cd, T.SKILL_RANGE.cdMin, T.SKILL_RANGE.cdMax, ti.cd),
      castSprite: '',
      sprite: '',
      tier
    };
    Object.keys(T.EFN).forEach(ef => {
      if (!base.ef || !base.ef[ef]) return;
      o.ef[ef] = 1;
      const given = base.efv && base.efv[ef];
      if (!given || typeof given !== 'object' ||
          (!Object.hasOwn(given, 'd') && !Object.hasOwn(given, 'p'))) return;
      const meta = T.EFMETA[ef];
      const cfg = T.efCfg(base, ef);
      o.efv[ef] = {
        d: meta.d == null ? 0 : num(cfg.d, 0, 60, meta.d || 0),
        p: meta.p == null ? 0 : num(cfg.p, meta.min, meta.max, meta.p || 0)
      };
    });
    if (!Object.keys(o.efv).length) delete o.efv;
    if (typeof base.castSprite === 'string' && base.castSprite.length <= MAXIMG && OKIMG.test(base.castSprite)) {
      o.castSprite = base.castSprite;
    }
    // Compatibilidade: campeões antigos guardavam a sprite do projétil em
    // `sprite`. Ela continua com o mesmo significado.
    if (typeof base.sprite === 'string' && base.sprite.length <= MAXIMG && OKIMG.test(base.sprite)) {
      o.sprite = base.sprite;
    }
    return o;
  }

  function san(x) {
    try {
      if (!x || typeof x !== 'object') return null;
      const k = (obj, val, def) => (Object.hasOwn(obj, val) ? val : def);
      const num = (v, min, max, def) => {
        const n = +v;
        return Math.min(max, Math.max(min, Number.isFinite(n) ? n : def));
      };

      const c = {
        n: cl(x.n).trim().slice(0, 12),
        t: k(T.TN, x.t, 'neutro'),
        f: k(T.FN, x.f, 'outro'),
        r: k(T.RN, x.r, 'comum'),
        lvl: T.lvlOf({ lvl: x.lvl }),
        xp: Math.max(0, Math.floor(+x.xp || 0)),
        tag: T.TAGS.includes(x.tag) ? x.tag : 'dps',
        livre: !!x.livre,
        p: k(T.PD, x.p, 'corajosa'),
        id: String(x.id || ''),
        dono: String(x.dono || ''),
        up: {},
        sks: []
      };
      if (!c.n) return null;

      const rawUp = x.up && typeof x.up === 'object' ? x.up : {};
      T.ST.forEach(stat => {
        c.up[stat] = Math.min(T.UPMAX, Math.max(T.UPMIN, Math.floor(+rawUp[stat] || 0)));
      });
      // XP importada acima do necessário já converte em níveis.
      if (c.lvl < T.LVLMAX && c.xp >= T.xpNeed(c.lvl)) T.addXp(c, 0);
      if (!c.livre && T.free(c) < 0) c.up = {};

      if (typeof x.sprite === 'string' && x.sprite.length <= MAXIMG && OKIMG.test(x.sprite)) {
        c.sprite = x.sprite;
      }
      // Shiny "possuído" pelo jogador: prevalece sobre o sorteio na luta.
      if (Object.hasOwn(T.SHINY, x.shiny)) c.shiny = x.shiny;

      // Campeões antigos podem ter 0–3 habilidades e sem tier. A regra atual
      // é sempre ter exatamente 3: normal, média e ultimate.
      let raw = Array.isArray(x.sks)
        ? x.sks.filter(s => s && typeof s === 'object').slice(0, 3)
        : [];
      if (!raw.length && x.sk) raw = [{ k: x.sk }];

      c.sks = T.TIERS.map(tier => {
        const idx = raw.findIndex(s => s.tier === tier);
        const found = idx >= 0 ? raw.splice(idx, 1)[0] : raw.shift();
        return sanSkill(found, tier);
      });

      return c;
    } catch (err) {
      console.warn('Campeão inválido ignorado:', err);
      return null;
    }
  }

  T.san = san;
  T.cl = cl;
  T.OKIMG = OKIMG;
  T.MAXIMG = MAXIMG;
})(window.TBB = window.TBB || {});
