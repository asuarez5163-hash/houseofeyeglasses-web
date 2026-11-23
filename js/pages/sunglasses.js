// Sunglasses storefront: one Central-owned `sun` chunk, four audience views.
// The page never embeds products or counts. Women/Men include unisex; Kids is exact.
(() => {
  'use strict';
  const grid = document.getElementById('sun-grid');
  const count = document.getElementById('sun-count');
  const allLink = document.getElementById('sun-all-link');
  const buttons = Array.from(document.querySelectorAll('[data-sun-filter]'));
  const CAT = window.hoeCatalog;
  if (!grid || !count || !allLink || !buttons.length || !CAT) return;

  const T = key => (window.hoeT ? window.hoeT(key) : key);
  const esc = value => (window.hoeEsc ? window.hoeEsc(value) : String(value));
  const spanishTwin = /\.es\.html$/i.test(location.pathname);
  const catalog = spanishTwin ? 'catalogo.es.html' : 'catalogo.html';
  const links = {
    all: `${catalog}?cat=sun`,
    women: `${catalog}?cat=sun&gender=women,unisex`,
    men: `${catalog}?cat=sun&gender=men,unisex`,
    kids: `${catalog}?cat=sun&gender=kids`,
  };
  let list = null;
  let selected = 'all';

  function unique(records) {
    const seen = new Set();
    return (records || []).filter(frame => {
      if (!frame || !frame.id || Number(frame.st) <= 0 || seen.has(frame.id)) return false;
      seen.add(frame.id);
      return true;
    });
  }

  function ranked(records) {
    return records.map((frame, index) => ({ frame, index, complete: Number(!!String(frame.b || '').trim()) + Number(!!String(frame.n || '').trim()) }))
      .sort((a, b) => (b.complete - a.complete) || (a.index - b.index))
      .map(item => item.frame);
  }

  function balanced(records, limit) {
    const order = ['women', 'men', 'kids', 'unisex'];
    const pools = Object.fromEntries(order.map(group => [group, ranked(records.filter(frame => frame.g === group))]));
    const out = [];
    for (let row = 0; out.length < limit; row += 1) {
      let added = false;
      for (const group of order) {
        if (pools[group][row] && out.length < limit) {
          out.push(pools[group][row]);
          added = true;
        }
      }
      if (!added) break;
    }
    // Unknown/missing gender data must not make a real sunglass disappear from All.
    if (out.length < limit) {
      const used = new Set(out.map(frame => frame.id));
      ranked(records).forEach(frame => { if (out.length < limit && !used.has(frame.id)) out.push(frame); });
    }
    return out;
  }

  function audience() {
    if (!list) return [];
    if (selected === 'all') return list;
    if (selected === 'kids') return ranked(list.filter(frame => frame.g === 'kids'));
    return ranked(list.filter(frame => frame.g === selected)).concat(ranked(list.filter(frame => frame.g === 'unisex')));
  }

  function cards(records) {
    if (selected === 'all') return balanced(records, 12);
    return records.slice(0, 12);
  }

  function paint() {
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sunFilter === selected)));
    allLink.setAttribute('href', links[selected]);
    if (list === null) {
      count.textContent = '';
      grid.innerHTML = `<li class="look-empty">${esc(T('sun.shop.loading'))}</li>`;
      return;
    }
    const records = audience();
    count.textContent = records.length === 1
      ? T('sun.shop.count1')
      : T('sun.shop.count').replace('{n}', records.length);
    if (!records.length) {
      grid.innerHTML = `<li class="look-empty">${esc(T('sun.shop.empty'))}</li>`;
      return;
    }
    grid.innerHTML = cards(records).map(frame => window.hoeFrameCard(frame)).join('');
    if (window.hoeMotion && typeof window.hoeMotion.reveal === 'function') {
      window.hoeMotion.reveal(grid, { stagger: 60 });
    }
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    const next = button.dataset.sunFilter;
    if (!links[next] || next === selected) return;
    selected = next;
    paint();
  }));

  paint();
  CAT.chunk('sun').then(records => {
    list = unique(records);
    paint();
  }).catch(() => {
    list = [];
    paint();
  });
  document.addEventListener('hoe:lang', paint);
})();
