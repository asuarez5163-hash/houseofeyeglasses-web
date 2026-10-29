// Catálogo: se lee de data/catalog.json cuando exista el catálogo real de armazones.
// Mientras no exista, la sección "Más vendidos" queda oculta (no se inventan productos).
window.HOE_CATALOG = [];
window.HOE_LENSES = [];
fetch('data/catalog.json', { cache: 'no-store' })
  .then(r => (r.ok ? r.json() : null))
  .then(d => {
    if (!d) return;
    window.HOE_CATALOG = d.products || [];
    window.HOE_LENSES = d.lenses || [];
    document.dispatchEvent(new Event('hoe:catalog'));
  })
  .catch(() => { /* sin catálogo publicado: la sección de más vendidos queda oculta */ });

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
