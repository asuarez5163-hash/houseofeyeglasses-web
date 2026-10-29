// Category pages (men, women, kids, sunglasses, contacts) and the 404.
// Paints twelve frames of the category's chunk (js/catalog.js hoeCatalog.chunk → window.hoeFrameCard, js/main.js), keeps the
// total count and the tab title in the visitor's language, links the filtered catalog, and draws the 404's round frame with
// window.hoeFrameSVG. Without a manifest (catalog being updated) the grid says so, without errors.
(() => {
  const t = key => (window.hoeT ? window.hoeT(key) : key);
  const esc = s => (window.hoeEsc ? window.hoeEsc(s) : String(s));

  // 404: a round frame with only the left lens darkened (the optical wink). --lens on the first <g> = left side.
  const nf = document.getElementById('nf-art');
  if (nf && window.hoeFrameSVG) {
    nf.innerHTML = window.hoeFrameSVG('round');
    const left = nf.querySelector('svg.frame > g');
    if (left) left.classList.add('is-sun');
    // the frame draws itself on arrival (GSAP); without it the drawing is simply there
    if (window.hoeMotion && window.hoeMotion.hasGsap) window.hoeMotion.ready(() => window.hoeMotion.draw(nf.querySelector('svg'), { duration: 1.1, stagger: .06, delay: .2 }));
  }

  if (nf) { const title = () => { document.title = t('nf.meta'); }; title(); document.addEventListener('hoe:lang', title); }

  const main = document.querySelector('.cp[data-cat]');
  if (!main) return;
  const cat = main.dataset.cat;
  const key = cat === 'sunglasses' ? 'sun' : cat;
  const grid = document.getElementById('cp-grid');
  const count = document.getElementById('cp-count');
  const CAT = window.hoeCatalog;
  let list = null;                                               // the category's chunk, once

  const paint = () => {
    if (!grid || !window.hoeFrameCard || !list) return;
    if (!list.length) { grid.innerHTML = `<li class="look-empty">${esc(t('cat.updating'))}</li>`; if (count) count.textContent = ''; return; }
    grid.innerHTML = list.slice(0, 12).map(f => window.hoeFrameCard(f)).join('');
    if (count) count.textContent = list.length === 1 ? t('catpage.count1') : t('catpage.count').replace('{n}', list.length);
    // the cards are new nodes: hand them to the shared reveal-on-scroll (no-op when motion.js is not loaded)
    if (window.hoeMotion && typeof window.hoeMotion.reveal === 'function') window.hoeMotion.reveal(grid, { stagger: 60 });
  };
  const render = () => { paint(); document.title = t('catpage.meta.' + cat); };
  render();
  if (grid && CAT && ['men', 'women', 'kids', 'sun'].includes(key)) CAT.chunk(key).then(l => { list = l; paint(); });
  document.addEventListener('hoe:lang', render);
})();
