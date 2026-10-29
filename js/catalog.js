// Catálogo real (contrato: scratchpad b2b/DATA-CONTRACT.md). El job externo escribe data/manifest.json, los chunks
// data/c/<cat>.<hash>.json (men · women · kids · sun; un unisex vive en men y women) y los sprites assets/frames/<SKU>.webp
// (800 × 800·ph, foto 1 arriba). La web los LEE sin build: nada de UPC ni proveedor llega aquí.
// window.hoeCatalog:
//   manifest()        → Promise<manifest|null>  (data/manifest.json?v=<hora>: salta la caché del CDN; null si no existe)
//   chunk(cat)        → Promise<registro[]>     (con caché; cada registro recibe .size = size(...sz))
//   all(onPartial)    → Promise<registro[]>     (los cuatro chunks EN SECUENCIA, deduplicados; onPartial(lista) tras cada uno)
//   byId(sku)         → Promise<registro|null>  (el chunk sale de la letra del SKU: HOE-W-77 → women)
//   featured()        → Promise<registro[]>     (manifest.featuredItems inline → ningún chunk; si falta, manifest.featured por chunks; sólo con stock)
//   search()          → Promise<[{s,t}]>        (índice del buscador, una sola vez)
//   img(f)            → 'assets/frames/<SKU>.webp'   · sprite(f, k) → estilo inline del sprite en la vista k (0..ph-1)
//   size(l, b, t)     → { lens, bridge, temple, total, band }   (UNA fórmula: total = 2·lente + puente + HINGE; talla.js la usa)
//   price(n)          → "$129" en el idioma activo · colorHex(key) → hex de manifest.colors · name(f) → "Marca Modelo"
//   colorName(f)      → texto del color en el idioma activo · catOf(sku) → 'men' | 'women' | 'kids' | 'sun' | null
// Evento 'hoe:catalog' en document tras cada chunk ({ detail: { cat, list } }) y 'hoe:catalog' con { cat: null, empty: true }
// cuando no hay manifest (catálogo en actualización: las páginas muestran su estado vacío sin errores).
window.hoeCatalog = (() => {
  const S = { manifest: null, m: null, byId: new Map(), chunks: {}, search: null, featured: null, lists: {} };
  const V = Math.floor(Date.now() / 36e5);                       // one value per hour: the CDN keys by full URL
  const LETTER = { M: 'men', W: 'women', K: 'kids', S: 'sun' };
  const HINGE = 8;                                              // mm added by rims and hinges (contract §4)
  const BANDS = [{ key: 'narrow', max: 127 }, { key: 'medium', max: 137 }, { key: 'wide', max: 145 }, { key: 'xwide', max: Infinity }];
  const size = (lens, bridge, temple) => {
    const l = Number(lens) || 0, b = Number(bridge) || 0, t = Number(temple) || 0;
    const total = l * 2 + b + HINGE;
    const band = BANDS.find(x => Math.round(total) <= x.max).key;
    return { lens: l, bridge: b, temple: t, total, band };
  };
  const lang = () => (window.hoeLang ? window.hoeLang() : (document.documentElement.lang || 'en'));
  const fmt = {};
  const price = n => {
    if (n == null || isNaN(Number(n))) return '';
    const L = lang() === 'es' ? 'es-US' : 'en-US';
    fmt[L] = fmt[L] || new Intl.NumberFormat(L, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    return fmt[L].format(Number(n));
  };
  const json = url => fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const emit = detail => document.dispatchEvent(new CustomEvent('hoe:catalog', { detail }));

  const manifest = () => S.manifest || (S.manifest = json(`data/manifest.json?v=${V}`).then(m => {
    S.m = m && m.chunks ? m : null;
    if (!S.m) emit({ cat: null, empty: true });
    return S.m;
  }));
  const prep = (f, cat) => {
    if (!f || !f.id) return null;
    f.size = size(...(Array.isArray(f.sz) ? f.sz : [0, 0, 0]));
    f.cats = Array.isArray(f.cats) && f.cats.length ? f.cats : [cat];
    f.v = Array.isArray(f.v) ? f.v : [];
    f.ph = Math.min(3, Math.max(1, Number(f.ph) || 1));
    if (!S.byId.has(f.id)) S.byId.set(f.id, f);
    return S.byId.get(f.id);                                       // a unisex frame is one object, seen from both chunks
  };
  const chunk = cat => S.chunks[cat] || (S.chunks[cat] = manifest().then(m => {
    if (!m || !m.chunks[cat]) return [];
    return json(m.chunks[cat]).then(list => {
      const out = (Array.isArray(list) ? list : []).map(f => prep(f, cat)).filter(Boolean);
      S.lists[cat] = out;
      emit({ cat, list: out });
      return out;
    });
  }));
  // every chunk, one after the other (a phone never asks for the four at once); onPartial sees the growing list
  const all = onPartial => manifest().then(m => {
    if (!m) return [];
    const cats = Object.keys(m.chunks);
    const seen = new Set(); const acc = [];
    const step = i => {
      if (i >= cats.length) return Promise.resolve(acc);
      return chunk(cats[i]).then(list => {
        list.forEach(f => { if (!seen.has(f.id)) { seen.add(f.id); acc.push(f); } });
        if (typeof onPartial === 'function') onPartial(acc.slice(), cats[i], i === cats.length - 1);
        return step(i + 1);
      });
    };
    return step(0);
  });
  const catOf = sku => { const m = /^HOE-([MWKS])-\d+$/.exec(String(sku || '').trim().toUpperCase()); return m ? LETTER[m[1]] : null; };
  const byId = sku => {
    const id = String(sku || '').trim();
    if (S.byId.has(id)) return Promise.resolve(S.byId.get(id));
    const cat = catOf(id);
    if (!cat) return Promise.resolve(null);
    return chunk(cat).then(() => S.byId.get(id) || null);
  };
  // the home grid: manifest.featuredItems carries the twelve records inline (≈5 KB), so the home never asks for a chunk;
  // without it (an older manifest) the SKUs of manifest.featured are looked up chunk by chunk (grouped by letter)
  const featured = () => S.featured || (S.featured = manifest().then(m => {
    if (!m) return [];
    if (Array.isArray(m.featuredItems) && m.featuredItems.length) return m.featuredItems.map(f => prep(f, catOf(f.id) || 'men')).filter(f => f && Number(f.st) > 0);
    const ids = Array.isArray(m.featured) ? m.featured : [];
    const cats = [...new Set(ids.map(catOf).filter(Boolean))];
    const step = i => (i >= cats.length ? Promise.resolve() : chunk(cats[i]).then(() => step(i + 1)));
    return step(0).then(() => ids.map(id => S.byId.get(id)).filter(f => f && Number(f.st) > 0));
  }));
  const search = () => S.search || (S.search = manifest().then(m => (m && m.search ? json(m.search) : null)).then(l => (Array.isArray(l) ? l : [])));

  const img = f => `assets/frames/${encodeURIComponent(typeof f === 'string' ? f : f.id)}.webp`;
  // inline style for a sprite view: k = 0 (front) … ph-1; ph unknown (a colour sibling) → view 0 with the natural height
  const sprite = (f, k = 0, ph) => {
    const n = ph || (f && f.ph) || 0;
    const y = n > 1 ? (Math.min(k, n - 1) / (n - 1)) * 100 : 0;
    return `background-image:url('${img(f)}');background-size:100% ${n ? n * 100 + '%' : 'auto'};background-position:0 ${y}%;--ph:${n || 1}`;
  };
  const colorHex = key => (S.m && S.m.colors && S.m.colors[key]) || '#8a8a8a';
  const name = f => `${f.b || ''} ${f.n || ''}`.trim();
  const colorName = f => { const r = f && f.colRaw; const L = lang(); return (r && (r[L] || r.en)) || (window.hoeT ? window.hoeT('color.' + (f && f.col)) : (f && f.col)) || ''; };
  const lensName = f => { const r = f && f.lcRaw; const L = lang(); return (r && (r[L] || r.en)) || (window.hoeT ? window.hoeT('lc.' + (f && f.lc)) : (f && f.lc)) || ''; };

  return { manifest, chunk, all, byId, featured, search, img, sprite, size, price, colorHex, name, colorName, lensName, catOf, HINGE, BANDS, get m() { return S.m; }, _s: S };
})();
window.hoeFrameById = id => window.hoeCatalog.byId(id);
window.hoeFrameSize = f => `${f.size.lens} □ ${f.size.bridge} — ${f.size.temple}`;
// ---------------------------------------------------------------------------
// Front-view frame drawings (viewBox 0 0 240 100). The left half is drawn once
// and mirrored; the bridge sits in the middle and is drawn once.
// Materials are in the drawing itself:
//   acetate  — thick rim (.rim), a heavier brow along the top (.brow-line / .brow),
//              chunky bridge and temple, a hinge block at the outer corner
//   metal    — hairline rim (.rim--metal), nose-pad arms and pads, thin temple
//   browline — acetate brow + bridge over a metal lower rim
// Colours come from CSS variables so a parent can restyle them (hover, palettes):
//   --fc (frame), --fc2 (metal parts, defaults to --fc), --lens (lens fill)
// ---------------------------------------------------------------------------
window.HOE_SHAPES = {
  round: {
    kind: 'metal',
    side: '<circle class="rim rim--metal" cx="70" cy="54" r="33"/>'
        + '<path class="pad-arm" d="M100 61c5 2 8 5 9 10"/><ellipse class="pad" cx="110" cy="73" rx="2.4" ry="4.4" transform="rotate(-18 110 73)"/>'
        + '<rect class="hinge hinge--metal" x="28" y="40" width="9" height="5" rx="1"/><path class="temple temple--metal" d="M29 42 10 38"/>',
    mid: '<path class="bridge bridge--metal" d="M103 46c7-9 27-9 34 0"/>',
  },
  oval: {
    kind: 'acetate',
    side: '<ellipse class="rim" cx="70" cy="53" rx="37" ry="25"/><path class="brow-line" d="M44 35c8-6 44-6 52 0"/>'
        + '<rect class="hinge" x="26" y="40" width="10" height="9" rx="1.5"/><path class="temple" d="M28 44 8 40"/>',
    mid: '<path class="bridge" d="M104 46c8-8 24-8 32 0"/>',
  },
  square: {
    kind: 'acetate',
    side: '<rect class="rim rim--thick" x="34" y="23" width="72" height="60" rx="13"/><path class="brow-line brow-line--thick" d="M46 23h48"/>'
        + '<rect class="hinge" x="26" y="35" width="10" height="10" rx="1.5"/><path class="temple" d="M28 40 8 36"/>',
    mid: '<path class="bridge" d="M106 44c7-7 21-7 28 0"/>',
  },
  rect: {
    kind: 'acetate',
    side: '<rect class="rim" x="31" y="31" width="78" height="44" rx="9"/><path class="brow-line" d="M42 31h56"/>'
        + '<rect class="hinge" x="23" y="37" width="10" height="9" rx="1.5"/><path class="temple" d="M25 41 6 37"/>',
    mid: '<path class="bridge" d="M109 46c6-6 16-6 22 0"/>',
  },
  cateye: {
    kind: 'acetate',
    side: '<path class="rim" d="M26 28c26-6 66-3 82 5 3 25-7 47-37 47-30 0-43-20-45-52z"/>'
        + '<path class="brow" d="M18 22c30-9 66-6 92 6l-2 8c-27-10-60-12-84-5-3 1-5 1-6-9z"/>'
        + '<path class="temple" d="M20 26 4 24"/>',
    mid: '<path class="bridge" d="M108 44c6-7 18-7 24 0"/>',
  },
  aviator: {
    kind: 'metal',
    side: '<path class="rim rim--metal" d="M32 30c18-8 60-8 76 0 4 27-8 56-36 56-26 0-42-24-40-56z"/>'
        + '<path class="pad-arm" d="M103 55c4 3 6 7 7 12"/><ellipse class="pad" cx="111" cy="71" rx="2.4" ry="4.4" transform="rotate(-16 111 71)"/>'
        + '<rect class="hinge hinge--metal" x="25" y="29" width="8" height="5" rx="1"/><path class="temple temple--metal" d="M26 31 6 28"/>',
    mid: '<path class="bar" d="M90 24c16-5 44-5 60 0"/><path class="bridge bridge--metal" d="M108 34c6-6 18-6 24 0"/>',
  },
  browline: {
    kind: 'browline',
    side: '<path class="rim rim--metal" d="M36 37c0-5 4-9 11-9h54c6 0 9 4 9 9 0 25-12 43-38 43S36 62 36 37z"/>'
        + '<path class="pad-arm" d="M104 58c4 2 6 5 7 10"/><ellipse class="pad" cx="112" cy="72" rx="2.4" ry="4.4" transform="rotate(-18 112 72)"/>'
        + '<path class="brow" d="M30 42c1-12 8-18 20-18h56c6 0 9 3 9 8v6c-2-3-5-4-9-4H50c-8 0-13 3-14 12z"/>'
        + '<rect class="hinge" x="22" y="32" width="9" height="9" rx="1.5"/><path class="temple" d="M24 36 6 33"/>',
    mid: '<path class="bridge" d="M108 36c6-5 18-5 24 0"/>',
  },
  geo: {
    kind: 'acetate',
    side: '<path class="rim" d="M44 25l50-3 14 27-12 30-52 3-14-29z"/><path class="brow-line" d="M48 25l42-3"/>'
        + '<rect class="hinge" x="24" y="35" width="10" height="9" rx="1.5"/><path class="temple" d="M26 39 7 35"/>',
    mid: '<path class="bridge" d="M108 46c6-6 18-6 24 0"/>',
  },
};
window.HOE_SHAPE_ORDER = ['round', 'square', 'rect', 'cateye', 'aviator', 'browline', 'oval', 'geo'];
window.HOE_SHAPE_LABEL = { round: 'shape.round', square: 'shape.square', rect: 'shape.rect', cateye: 'shape.cateye', aviator: 'shape.aviator', browline: 'shape.browline', oval: 'shape.oval', geo: 'shape.geo' };

// where the light catches each lens: the glare sits in the upper-left quarter of the left lens and, mirrored
// through the bridge, of the right one (one light source for the whole drawing).
window.HOE_SHAPE_GLARE = { round: [57, 40], oval: [56, 41], square: [55, 38], rect: [54, 41], cateye: [52, 42], aviator: [55, 42], browline: [58, 42], geo: [54, 40] };

// the lens as a sheet of glass: the rim's own geometry, filled with --glass (a pale white) and no stroke,
// drawn under the rim so the rim's --lens tint (sun lenses, the darkened hover) sits on top of it
function glassOf(side) {
  const m = side.match(/<(circle|ellipse|rect|path)\s+class="rim[^"]*"[^>]*\/>/);
  return m ? m[0].replace(/class="rim[^"]*"/, 'class="glass"') : '';
}

// color: { c, c2, lens } sets inline colours. Pass nothing (or {}) to inherit --fc/--fc2/--lens from CSS,
// which is what lets a parent's :hover restyle the drawing. A transparent lens is not written inline, so a
// parent can still darken it (.is-sun, the card hover).
window.hoeFrameSVG = function (shape, color) {
  const key = window.HOE_SHAPES[shape] ? shape : 'rect';
  const s = window.HOE_SHAPES[key];
  const vars = [];
  if (color && color.c) vars.push(`--fc:${color.c}`);
  if (color && (color.c2 || color.c)) vars.push(`--fc2:${color.c2 || color.c}`);
  if (color && color.lens && color.lens !== 'transparent') vars.push(`--lens:${color.lens}`);
  const style = vars.length ? ` style="${vars.join(';')}"` : '';
  const glass = glassOf(s.side);
  const [gx, gy] = window.HOE_SHAPE_GLARE[key] || [56, 41];
  const glare = `<ellipse class="glare" cx="${gx}" cy="${gy}" rx="14" ry="4" transform="rotate(-18 ${gx} ${gy})"/>`
    + `<ellipse class="glare" cx="${240 - gx}" cy="${gy}" rx="14" ry="4" transform="rotate(-18 ${240 - gx} ${gy})"/>`;
  return `<svg class="frame frame--${s.kind}" viewBox="0 0 240 100"${style} aria-hidden="true">`
    + `<g>${glass}${s.side}</g><g transform="translate(240 0) scale(-1 1)">${glass}${s.side}</g>${s.mid}${glare}</svg>`;
};

// restyle a drawing in place (the colour swatches of a card, the colour picker of the product page):
// writes --fc / --fc2 / --lens on the svg; the CSS transition on every part does the 300 ms cross-fade.
window.hoeSetFrameColor = function (svgEl, color) {
  if (!svgEl || !color) return;
  svgEl.style.setProperty('--fc', color.c || '');
  svgEl.style.setProperty('--fc2', color.c2 || color.c || '');
  if (color.lens && color.lens !== 'transparent') svgEl.style.setProperty('--lens', color.lens);
  else svgEl.style.removeProperty('--lens');
};

// ---------------------------------------------------------------------------
// A temple arm seen from the inside (viewBox 0 0 640 150): hinge barrel and
// screw, the arm tapering to the bend behind the ear, and the tip.
// nums: the printed size, e.g. "52 □ 18 — 140". id: optional id for the text node
// so a page can update the numbers live.
// ---------------------------------------------------------------------------
// opts.marks: gold marks under the three printed numbers (lens width, bridge, temple length).
window.hoeTempleSVG = function (nums, id, opts) {
  const idAttr = id ? ` id="${id}"` : '';
  const parts = String(nums).split(/\s+/);   // e.g. ["52", "□", "18", "—", "140"]
  const marks = opts && opts.marks && parts.length === 5
    ? `<g class="temple-nums-marks" aria-hidden="true"><path class="temple-mark" d="M164 74h30M240 74h22M298 74h44"/></g>`
    : '';
  const text = parts.length === 5
    ? `<tspan x="179">${parts[0]}</tspan><tspan x="216">${parts[1]}</tspan><tspan x="251">${parts[2]}</tspan><tspan x="283">${parts[3]}</tspan><tspan x="320">${parts[4]}</tspan>`
    : nums;
  return `<svg class="temple-art" viewBox="0 0 640 150" aria-hidden="true">`
    + '<rect class="temple-hinge" x="6" y="33" width="20" height="37" rx="4"/>'
    + '<circle class="temple-screw" cx="16" cy="51.5" r="3.2"/>'
    + '<path class="temple-arm" d="M26 38H468c50 0 84 17 122 54l18 21c5 5 1 12-5 10l-15-12C551 81 519 65 468 65H26z"/>'
    + '<path class="temple-core" d="M40 51.5H150M352 51.5H460"/>'
    + `<text class="temple-nums"${idAttr} x="250" y="58" text-anchor="middle">${text}</text>`
    + marks
    + '</svg>';
};
