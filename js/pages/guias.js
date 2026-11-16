// Eye care guides (11/16): the price lines of the guide pages (prescription-glasses-cost, contacts-vs-glasses, glasses-for-astigmatism…).
// The same idea as js/pages/tipo2.js, with two more things: the price of the cheapest frame in the catalog and sums.
// · [data-guide-price="<dictionary key>"]: the pattern of that key (js/i18n/guias.js) carries holes filled from data/manifest.json:
//   every number of manifest.lentes (each pieza by its id with "_" for "-": {single}, {index_167}, {anti_reflective}…, and the
//   progressive levels {estandar}, {premium}, {ultimate}) and {frame_min} = manifest.facets.price[0], the lowest frame price the
//   Central published (the catalog's own price filter starts there).
// · a hole can add several numbers: {frame_min+single+index_167} is their total. No price is written by hand anywhere; a line
//   with a missing number stays hidden, so the page reads the same (without prices) if this script or the manifest fails.
// A NEW file because js/pages/tipo2.js is already published under its ?v= (the CDN keeps it for 30 days).
(() => {
  'use strict';
  const els = document.querySelectorAll('[data-guide-price]');
  const CAT = window.hoeCatalog;
  if (!els.length || !CAT) return;
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  let nums = null;

  const value = hole => {
    const parts = hole.split('+');
    if (!parts.every(p => p in nums)) return null;
    return parts.reduce((s, p) => s + nums[p], 0);
  };
  function paint() {
    els.forEach(el => {
      const key = el.dataset.guidePrice, pat = T(key);
      if (!nums || !pat || pat === key) { el.hidden = true; return; }
      let missing = false;
      const out = String(pat).replace(/\{([\w+]+)\}/g, (m, hole) => {
        const v = value(hole);
        if (v == null) { missing = true; return m; }
        return '<b>' + CAT.price(v) + '</b>';
      });
      el.hidden = missing;                                            // a number is missing: say nothing rather than half a price
      if (!missing) el.innerHTML = out;
    });
  }

  CAT.manifest().then(m => {
    const L = m && m.lentes;
    if (!L) return;
    const raw = Object.assign({}, L.progressive || {});
    const piezas = L.piezas || L.extras || {};
    Object.keys(piezas).forEach(k => { raw[k.replace(/-/g, '_')] = piezas[k]; });
    const fp = m.facets && Array.isArray(m.facets.price) ? Number(m.facets.price[0]) : 0;
    if (fp > 0) raw.frame_min = fp;
    nums = {};
    Object.keys(raw).forEach(k => { if (Number(raw[k]) > 0) nums[k] = Number(raw[k]); });
    paint();
  }).catch(() => { /* no manifest: the page reads the same, without the price lines */ });
  document.addEventListener('hoe:lang', paint);
})();
