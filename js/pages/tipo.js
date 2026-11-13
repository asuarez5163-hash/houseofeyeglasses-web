// Lens-type pages (main[data-tp]: prescription-glasses, progressive-glasses, single-vision-glasses, sunglasses,
// blue-light-glasses, computer-glasses, photochromic-glasses) and about.html.
// · the price line: the patterns tp.price.<page> of js/i18n/tipo.js carry holes ({single}, {estandar}, {tint}…) that are filled
//   here with data/manifest.json → lentes (what the Central publishes and the payment Worker charges): no price is written by
//   hand anywhere. Without those numbers the line stays hidden.
// · twelve best sellers in #tp-grid (hoeCatalog.featured → window.hoeFrameCard, js/main.js), as on the home page.
// · the tab title follows the language (tp.<page>.meta / about.meta).
(() => {
  'use strict';
  const main = document.querySelector('main[data-tp]');
  if (!main) return;
  const id = main.dataset.tp;
  const CAT = window.hoeCatalog;
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  let prices = null, frames = null;

  function paintPrice() {
    document.querySelectorAll('[data-tp-price]').forEach(el => {
      const key = 'tp.price.' + el.dataset.tpPrice, pat = T(key);
      if (!prices || !pat || pat === key) { el.hidden = true; return; }
      const out = fill(pat, prices);
      el.hidden = /\{\w+\}/.test(out);                              // a number is missing: say nothing rather than half a price
      if (!el.hidden) el.innerHTML = out;
    });
  }
  function paintFrames() {
    const grid = document.getElementById('tp-grid');
    if (!grid || !frames || !frames.length || !window.hoeFrameCard) return;
    grid.innerHTML = frames.slice(0, 12).map(f => window.hoeFrameCard(f)).join('');
    if (window.hoeMotion && typeof window.hoeMotion.reveal === 'function') window.hoeMotion.reveal(grid, { stagger: 60 });
  }
  function title() {
    const key = id === 'about' ? 'about.meta' : 'tp.' + id + '.meta', t = T(key);
    if (t && t !== key) document.title = t;
  }

  if (CAT) {
    CAT.manifest().then(m => {
      const L = m && m.lentes;
      if (!L) return;
      const p = L.piezas || {}, g = L.progressive || {};
      const raw = { single: p.single, office: p.office, tint: p.tint, blue: p['blue-light'], photo: p['light-responsive'], estandar: g.estandar, premium: g.premium, ultimate: g.ultimate };
      prices = {};
      Object.keys(raw).forEach(k => { if (Number(raw[k]) > 0) prices[k] = '<b>' + CAT.price(Number(raw[k])) + '</b>'; });
      paintPrice();
    }).catch(() => { /* no manifest: the page reads the same, without the price line */ });
    if (document.getElementById('tp-grid')) CAT.featured().then(l => { frames = l || []; paintFrames(); }).catch(() => { /* the grid stays empty */ });
  }
  title();
  document.addEventListener('hoe:lang', () => { paintPrice(); paintFrames(); title(); });
})();
