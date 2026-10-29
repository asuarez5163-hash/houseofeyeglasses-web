// Category pages (men, women, kids, sunglasses, contacts).
// Draws the typical shapes of the category with window.hoeFrameSVG (js/catalog.js) and keeps the tab title in the visitor's language.
(() => {
  const main = document.querySelector('.cp[data-cat]');
  if (!main || !window.hoeFrameSVG) return;
  const cat = main.dataset.cat;
  const t = key => (window.hoeT ? window.hoeT(key) : key);

  const row = main.querySelector('.cp-shape-row');
  if (row) {
    const keys = (row.dataset.shapes || '').split(',').map(s => s.trim()).filter(k => window.HOE_SHAPES[k]);
    row.style.setProperty('--n', keys.length);
    row.innerHTML = keys.map(k =>
      `<li><a href="index.html#shop-by-shape">${window.hoeFrameSVG(k)}<span data-i18n="${window.HOE_SHAPE_LABEL[k]}"></span></a></li>`).join('');
  }

  // main.js translated the page before this script ran; the shapes are new, so label them now and on every language change
  const sync = () => {
    row?.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.title = t('catpage.meta.' + cat);
  };
  sync();
  document.addEventListener('hoe:lang', sync);
})();
