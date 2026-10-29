// Category pages (men, women, kids, sunglasses, contacts) and the 404.
// Paints the sample frames of the category (js/data/frames.js) with window.hoeFrameCard (js/main.js), keeps the count and the
// tab title in the visitor's language, and draws the 404's round frame with window.hoeFrameSVG (js/catalog.js).
(() => {
  const t = key => (window.hoeT ? window.hoeT(key) : key);

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

  const render = () => {
    if (grid && window.HOE_SAMPLE_FRAMES && window.hoeFrameCard) {
      const list = window.HOE_SAMPLE_FRAMES.filter(f => f.cats.includes(key));
      grid.innerHTML = list.map(f => window.hoeFrameCard(f)).join('');
      if (count) count.textContent = list.length === 1 ? t('catpage.count1') : t('catpage.count').replace('{n}', list.length);
      // the cards are new nodes: hand them to the shared reveal-on-scroll (no-op when motion.js is not loaded)
      if (window.hoeMotion && typeof window.hoeMotion.reveal === 'function') window.hoeMotion.reveal(grid, { stagger: 60 });
    }
    document.title = t('catpage.meta.' + cat);
  };
  render();
  document.addEventListener('hoe:lang', render);
})();
