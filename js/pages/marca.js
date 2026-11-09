// Brand page (<brand>-eyeglasses.html) and brands index (brands.html). The frames and the brand list are already in the
// HTML (the Central writes them: lib/optica/paginas.py); this only keeps the headline, the lead and the title in the
// visitor's language (EN | ES translates the page in place) and points "Filter and sort" at the catalog with the brand on.
(() => {
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  let d = null;
  try { const el = document.getElementById('brand-data'); d = el ? JSON.parse(el.textContent) : null; } catch (e) { d = null; }
  const h1 = document.getElementById('brand-h1'), lead = document.getElementById('brand-lead'), more = document.getElementById('brand-filter');
  if (d && d.brand && more) more.href = 'catalogo.html?brand=' + encodeURIComponent(d.brand);
  function paint() {
    if (!d || !d.brand) { if (document.body.dataset.page === 'marcas') document.title = T('marcas.meta'); return; }
    const price = window.hoeCatalog ? window.hoeCatalog.price(d.min) : '$' + d.min;
    const map = { brand: d.brand, n: d.n, min: price };
    if (h1) h1.textContent = fill(T('marca.h1'), map);
    if (lead) lead.textContent = d.n ? fill(T(d.n === 1 ? 'marca.lead1' : 'marca.lead'), map) : fill(T('marca.none'), map);
    document.title = fill(T('marca.meta'), map);
  }
  paint();
  document.addEventListener('hoe:lang', paint);
})();
