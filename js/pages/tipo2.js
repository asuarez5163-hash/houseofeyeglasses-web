// Second batch of lens pages (11/14: high-index-lenses, anti-glare-glasses, polycarbonate-lenses): their price line.
// Those pages keep main[data-tp], so js/pages/tipo.js paints their twelve best sellers and the tab title, but their price line is
// [data-lens-price="<dictionary key>"] and belongs to this file: tipo.js only knows eight holes and hides a line that has any other.
// Here every number of data/manifest.json → lentes is a hole: each pieza by its id, with "_" for "-" ({index_167}, {index_174},
// {anti_reflective}, {scratch}, {single}, {office}…), and the progressive levels ({estandar}, {premium}, {ultimate}). No price is
// written by hand anywhere; a line whose number is missing stays hidden.
// It is a NEW file because tipo.js is already published under its ?v= (the CDN keeps it for 30 days): at the next ASSET_V change
// this painter replaces paintPrice() in tipo.js and every lens page uses [data-lens-price].
(() => {
  'use strict';
  const els = document.querySelectorAll('[data-lens-price]');
  const CAT = window.hoeCatalog;
  if (!els.length || !CAT) return;
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  let prices = null;

  function paint() {
    els.forEach(el => {
      const key = el.dataset.lensPrice, pat = T(key);
      if (!prices || !pat || pat === key) { el.hidden = true; return; }
      const out = String(pat).replace(/\{(\w+)\}/g, (m, k) => (k in prices ? prices[k] : m));
      el.hidden = /\{\w+\}/.test(out);                              // a number is missing: say nothing rather than half a price
      if (!el.hidden) el.innerHTML = out;
    });
  }

  CAT.manifest().then(m => {
    const L = m && m.lentes;
    if (!L) return;
    const raw = Object.assign({}, L.progressive || {});
    const piezas = L.piezas || L.extras || {};
    Object.keys(piezas).forEach(k => { raw[k.replace(/-/g, '_')] = piezas[k]; });
    prices = {};
    Object.keys(raw).forEach(k => { if (Number(raw[k]) > 0) prices[k] = '<b>' + CAT.price(Number(raw[k])) + '</b>'; });
    paint();
  }).catch(() => { /* no manifest: the page reads the same, without the price line */ });
  document.addEventListener('hoe:lang', paint);
})();
