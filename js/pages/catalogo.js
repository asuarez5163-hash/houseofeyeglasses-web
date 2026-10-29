// Catálogo (catalogo.html): lee el catálogo REAL (js/catalog.js hoeCatalog: un chunk por categoría; "All" carga los cuatro en
// secuencia y pinta el primero en cuanto llega), filtra por marca · género · forma · material · color · lente · precio · talla
// (multi-select por faceta: OR dentro, AND entre facetas), ordena (relevancia · precio ↑ · precio ↓ · marca A-Z) y pagina de a
// 36 con "Ver más". La URL ES el estado (?cat=men&brand=…&shape=round,square&sort=price-asc&page=2; history.replaceState).
// La categoría (?cat=men|women|kids|sun) titula la página, elige la FOTO grande de la cabecera (assets/img/foto-*) y marca la
// pestaña. Los conteos del panel salen de UNA pasada sobre la lista (nunca un filtro por opción). Una opción con 0 se atenúa.
// Panel: columna de 280 px en escritorio, hoja completa en móvil. Idioma: re-etiqueta en 'hoe:lang'.
// Movimiento: al filtrar, las tarjetas que se van hacen fade 120 ms, la rejilla conserva su alto 300 ms (nada salta) y las
// nuevas entran con el stagger de hoeMotion.reveal. Sin manifest (catálogo en actualización) el estado vacío lo dice, sin errores.
(() => {
  'use strict';
  const main = document.querySelector('main.catp');
  if (!main || !window.hoeCatalog) return;
  const CAT = window.hoeCatalog;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const esc = s => (window.hoeEsc ? window.hoeEsc(s) : String(s));
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  const phone = window.matchMedia('(max-width: 860px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const PAGE = 36;
  const CAT_ALIAS = { sunglasses: 'sun', sun: 'sun', men: 'men', women: 'women', kids: 'kids' };
  // the big photo of the page head per category (object-position for the 21:9 crop and for the tall phone crop)
  const CAT_PHOTO = {
    all:   { src: 'foto-hombre-grande', w: 1800, h: 1200, pos: '50% 28%', posM: '50% 22%' },
    men:   { src: 'foto-hombre-grande', w: 1800, h: 1200, pos: '50% 28%', posM: '50% 22%' },
    women: { src: 'foto-mujer-grande',  w: 1800, h: 1200, pos: '50% 36%', posM: '50% 30%' },
    kids:  { src: 'foto-ninos-retrato', w: 1200, h: 1800, pos: '50% 30%', posM: '50% 26%' },
    sun:   { src: 'foto-sol-retrato',   w: 1200, h: 1800, pos: '50% 34%', posM: '50% 30%' },
  };

  // ---------- filter model (multi-select per facet; "cat" titles the page and is not in the panel) ----------
  const bucket = p => (p < 100 ? 'p1' : p < 200 ? 'p2' : p < 300 ? 'p3' : 'p4');
  const FACETS = [
    { id: 'cat',      vals: ['men', 'women', 'kids', 'sun'], of: f => f.cats, panel: false },
    { id: 'brand',    key: 'catalogo.f.brand',     vals: [], label: v => v, of: f => [f.b] },
    { id: 'gender',   key: 'catalogo.f.gender',    vals: ['men', 'women', 'kids', 'unisex'], label: v => T('gender.' + v), of: f => [f.g] },
    { id: 'shape',    key: 'catalogo.f.shape',     vals: window.HOE_SHAPE_ORDER, label: v => T(window.HOE_SHAPE_LABEL[v]), of: f => [f.sh], shape: true },
    { id: 'material', key: 'catalogo.f.material',  vals: ['acetate', 'metal', 'titanium', 'tr90', 'mixed', 'other'], label: v => T('mat.' + v), of: f => [f.mat] },
    { id: 'color',    key: 'catalogo.f.color',     vals: [], label: v => T('color.' + v), of: f => [f.col], swatch: true },
    { id: 'lens',     key: 'catalogo.f.lensColor', vals: ['clear', 'blue-light', 'tinted', 'polarized', 'mirror', 'photochromic', 'other'], label: v => T('lc.' + v), of: f => [f.lc] },
    { id: 'price',    key: 'catalogo.f.price',     vals: ['p1', 'p2', 'p3', 'p4'], label: v => T('catalogo.price.' + v), of: f => [bucket(Number(f.p) || 0)] },
    { id: 'size',     key: 'catalogo.f.size',      vals: ['narrow', 'medium', 'wide', 'xwide'], label: v => T('band.' + v), of: f => [f.size.band] },
  ];
  const PANEL = FACETS.filter(fa => fa.panel !== false);
  const facet = id => FACETS.find(fa => fa.id === id);
  const SORTS = ['rel', 'price-asc', 'price-desc', 'brand'];
  const state = { sel: {}, sort: 'rel', page: 1 };
  FACETS.forEach(fa => { state.sel[fa.id] = new Set(); });
  let FR = [], src = '', ready = false, loading = false;

  // the manifest fixes the option lists (brands, colours, materials and lens colours the job actually exported)
  function applyManifest(m) {
    ready = !!m;
    if (!m) return;
    const fx = m.facets || {};
    const given = (k, fallback) => (Array.isArray(fx[k]) && fx[k].length ? fx[k].slice() : fallback);
    facet('brand').vals = given('brand', []).sort((a, b) => String(a).localeCompare(String(b)));
    facet('material').vals = given('material', facet('material').vals);
    facet('lens').vals = given('lensColor', facet('lens').vals);
    facet('color').vals = given('color', Object.keys(m.colors || {}));
    facet('shape').vals = given('shape', facet('shape').vals).filter(v => window.HOE_SHAPES[v]);
  }

  function readURL() {
    const q = new URLSearchParams(location.search);
    FACETS.forEach(fa => {
      state.sel[fa.id] = new Set((q.get(fa.id) || '').split(',').map(v => (fa.id === 'cat' ? CAT_ALIAS[v] || v : v)).filter(v => fa.vals.includes(v)));
    });
    state.sort = SORTS.includes(q.get('sort')) ? q.get('sort') : 'rel';
    state.page = Math.max(1, Math.min(200, parseInt(q.get('page'), 10) || 1));
  }
  function writeURL() {
    const q = new URLSearchParams();
    FACETS.forEach(fa => { if (state.sel[fa.id].size) q.set(fa.id, [...state.sel[fa.id]].join(',')); });
    if (state.sort !== 'rel') q.set('sort', state.sort);
    if (state.page > 1) q.set('page', String(state.page));
    const s = q.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
  }
  const matches = (f, skip) => FACETS.every(fa => fa.id === skip || !state.sel[fa.id].size || fa.of(f).some(v => state.sel[fa.id].has(v)));
  const byBrand = (a, b) => String(a.b).localeCompare(String(b.b)) || String(a.n).localeCompare(String(b.n)) || String(a.cc).localeCompare(String(b.cc));
  function sorted(list) {
    if (state.sort === 'price-asc') return list.slice().sort((a, b) => (a.p - b.p) || byBrand(a, b));
    if (state.sort === 'price-desc') return list.slice().sort((a, b) => (b.p - a.p) || byBrand(a, b));
    if (state.sort === 'brand') return list.slice().sort(byBrand);
    return list;                                                   // relevance = the order the job wrote
  }

  // ---------- head: kicker, title, the big photo and the live figure ----------
  const singleCat = () => (state.sel.cat.size === 1 ? [...state.sel.cat][0] : null);
  const hero = $('#cat-head'), photoImg = $('#cat-photo-img');
  function renderHead() {
    const c = singleCat();
    main.dataset.cat = c || 'all';
    $('#cat-kicker').textContent = T(c ? 'catalogo.kicker.' + c : 'catalogo.kicker');
    const h1 = $('#cat-h1'), title = T(c ? 'catalogo.h1.' + c : 'catalogo.h1');
    const cur = [...h1.querySelectorAll('.line-in')].map(l => l.textContent).join(' ') || h1.textContent.trim();
    if (cur !== title) h1.textContent = title;   // untouched when equal: the line split of the load choreography stays
    document.title = T(c ? 'catalogo.meta.' + c : 'catalogo.meta');
    const ph = CAT_PHOTO[c || 'all'];
    const srcImg = `assets/img/${ph.src}.jpg`;
    if (photoImg.getAttribute('src') !== srcImg) { photoImg.width = ph.w; photoImg.height = ph.h; photoImg.src = srcImg; }
    hero.style.setProperty('--cat-pos', ph.pos); hero.style.setProperty('--cat-pos-m', ph.posM);
    // the header chip and the bar tab of this category are the current page
    $$('.main-nav a[href^="catalogo.html"]').forEach(a => {
      const qc = new URLSearchParams(a.getAttribute('href').split('?')[1] || '').get('cat');
      if ((CAT_ALIAS[qc] || qc) === c) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $$('#cat-cats a').forEach(a => { if (a.dataset.cat === (c || 'all')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  // the figure: counts from 0 the first time (GSAP, 1.1 s), then just lands on each filter. While "All" keeps arriving
  // chunk by chunk, a value that lands mid-count carries the running count on to the new total (nothing overwrites it).
  let countTween = null, counted = false;
  function renderCount(n) {
    const num = $('#cat-n');
    $('#cat-count').textContent = T(n === 1 ? 'catalogo.countLbl1' : 'catalogo.countLbl');
    const gs = window.hoeMotion && window.hoeMotion.hasGsap ? window.gsap : null;
    if (!gs || (counted && !countTween) || n === 0) { if (countTween) { countTween.kill(); countTween = null; } num.textContent = String(n); if (n > 0) counted = true; return; }
    const o = { v: counted ? Number(num.textContent) || 0 : 0 };
    if (countTween) countTween.kill();
    num.textContent = String(Math.round(o.v));
    countTween = gs.to(o, { v: n, duration: counted ? .6 : 1.1, delay: counted ? 0 : .25, ease: 'power2.out', onUpdate: () => { num.textContent = String(Math.round(o.v)); }, onComplete: () => { num.textContent = String(n); countTween = null; } });
    counted = true;
  }
  // the category tabs of the bar switch in place (the grid cross-fades, nothing reloads)
  $('#cat-cats').addEventListener('click', e => {
    const a = e.target.closest('a[data-cat]'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    state.sel.cat = new Set(a.dataset.cat === 'all' ? [] : [a.dataset.cat]);
    state.page = 1;
    writeURL(); renderHead(); load();
  });

  // ---------- active chips (one per selected value; × removes it) ----------
  const chips = $('#cat-chips');
  function renderChips() {
    const items = [];
    PANEL.forEach(fa => state.sel[fa.id].forEach(v => items.push({ fa, v })));
    chips.hidden = !items.length;
    chips.innerHTML = items.map(({ fa, v }) => `<li><button type="button" class="catp-chip" data-press data-facet="${fa.id}" data-val="${esc(v)}" aria-label="${esc(T('catalogo.chipRemove'))}: ${esc(fa.label(v))}">
        <span>${esc(fa.label(v))}</span><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2 2 8 8M10 2l-8 8"/></svg>
      </button></li>`).join('');
  }
  chips.addEventListener('click', e => {
    const b = e.target.closest('.catp-chip'); if (!b) return;
    state.sel[b.dataset.facet].delete(b.dataset.val);
    state.page = 1;
    writeURL(); renderHead(); renderGrid(); renderPanel();
    (chips.querySelector('.catp-chip') || $('#cat-filters-btn')).focus({ preventScroll: true });
  });

  // ---------- sort ----------
  const sortEl = $('#cat-sort');
  sortEl.addEventListener('change', () => { state.sort = SORTS.includes(sortEl.value) ? sortEl.value : 'rel'; state.page = 1; writeURL(); renderGrid(); });

  // ---------- cards ----------
  const grid = $('#cat-grid');
  let shown = [], swapTimer = 0, holdTimer = 0;
  // the new cards that are already on screen (motion.js shows those at once) come in with the same stagger as the rest
  function enterVisible(from = 0) {
    if (reduced.matches || !('animate' in Element.prototype)) return;
    const h = window.innerHeight;
    let i = 0;
    [...grid.children].slice(from).forEach(li => {
      const r = li.getBoundingClientRect();
      if (r.top >= h || r.bottom <= 0) return;
      li.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
        { duration: 520, delay: i++ * 40, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' });
    });
  }
  function paintGrid(list, animate) {
    grid.innerHTML = list.map(f => window.hoeFrameCard(f)).join('');
    delete grid.dataset.revealed;
    if (window.hoeMotion) window.hoeMotion.reveal(grid);
    if (animate) enterVisible();
  }
  function appendCards(list) {
    const from = grid.children.length;
    grid.insertAdjacentHTML('beforeend', list.map(f => window.hoeFrameCard(f)).join(''));
    delete grid.dataset.revealed;
    if (window.hoeMotion) window.hoeMotion.reveal(grid);
    enterVisible(from);
  }
  const moreBox = $('#cat-more'), moreBtn = $('#cat-more-btn');
  function renderMore(n, limit) {
    moreBox.hidden = n <= limit;
    $('#cat-shown').textContent = fill(T('catalogo.shown'), { a: limit, n });
  }
  moreBtn.addEventListener('click', () => { state.page += 1; writeURL(); renderGrid(); });
  function renderGrid() {
    const all = sorted(FR.filter(f => matches(f)));
    const n = all.length;
    const limit = Math.min(n, state.page * PAGE);
    const list = all.slice(0, limit);
    const empty = $('#cat-empty'), emptyP = $('#cat-empty-p'), emptyBtn = $('#cat-empty-cta');
    empty.hidden = !(ready ? n === 0 && !loading : true) && ready;
    if (!ready) { emptyP.dataset.i18n = 'cat.updating'; emptyP.textContent = T('cat.updating'); emptyBtn.hidden = true; empty.hidden = false; }
    else { emptyP.dataset.i18n = 'catalogo.empty'; emptyP.textContent = T('catalogo.empty'); emptyBtn.hidden = false; }
    const active = PANEL.reduce((a, fa) => a + state.sel[fa.id].size, 0);
    const nEl = $('#cat-filters-n'); nEl.hidden = !active; nEl.textContent = String(active);
    $('#cat-apply-txt').textContent = n === 0 ? T('catalogo.apply0') : n === 1 ? T('catalogo.apply1') : fill(T('catalogo.apply'), { n });
    renderCount(n);
    renderChips();
    renderMore(n, limit);
    sortEl.value = state.sort;
    const had = grid.children.length;
    const prefix = had && list.length >= had && shown.length === had && shown.every((f, i) => list[i] === f);
    const same = list.length === shown.length && list.every((f, i) => shown[i] === f);
    shown = list;
    if (same && (had || n === 0)) return;
    clearTimeout(swapTimer); clearTimeout(holdTimer);
    if (prefix) { appendCards(list.slice(had)); return; }        // "show more" and the chunks that keep arriving: only the new cards enter
    if (!had || reduced.matches) { grid.classList.remove('is-fading'); grid.style.minHeight = ''; paintGrid(list, false); return; }
    // keep the grid's height while the cards change hands, so the page never jumps under the pointer
    const h = grid.getBoundingClientRect().height;
    grid.style.minHeight = h + 'px';
    grid.classList.add('is-fading');
    swapTimer = setTimeout(() => {
      grid.classList.remove('is-fading');
      paintGrid(list, true);
      holdTimer = setTimeout(() => { grid.style.minHeight = ''; }, 300);
    }, 120);
  }

  // ---------- panel (rendered only while open: closed, it holds nothing, so the grid's photos come first) ----------
  // the counts of every option in ONE pass: an item counts for a facet's values when it passes every other facet
  function countAll() {
    const counts = {}; PANEL.forEach(fa => { counts[fa.id] = Object.create(null); });
    for (const f of FR) {
      let fails = 0, failId = null;
      for (const fa of FACETS) {
        if (state.sel[fa.id].size && !fa.of(f).some(v => state.sel[fa.id].has(v))) { fails++; failId = fa.id; if (fails > 1) break; }
      }
      if (fails > 1) continue;
      for (const fa of PANEL) {
        if (fails === 1 && failId !== fa.id) continue;
        const c = counts[fa.id];
        for (const v of fa.of(f)) c[v] = (c[v] || 0) + 1;
      }
    }
    return counts;
  }
  const form = $('#cat-form');
  const openGroups = new Set(['brand', 'shape']);
  let open = false;
  function renderPanel() {
    if (!open) { form.innerHTML = ''; return; }
    const counts = countAll();
    form.innerHTML = PANEL.map(fa => {
      const on = state.sel[fa.id].size;
      const opts = fa.vals.map(v => {
        const n = counts[fa.id][v] || 0;
        const checked = state.sel[fa.id].has(v);
        const lbl = fa.shape ? `${window.hoeFrameSVG(v)}<span>${esc(fa.label(v))}</span>` : esc(fa.label(v));
        return `<label class="catp-opt${fa.shape ? ' catp-opt-shape' : ''}${n === 0 ? ' is-zero' : ''}${checked ? ' is-on' : ''}">
          <input type="checkbox" name="${fa.id}" value="${esc(v)}"${checked ? ' checked' : ''}${n === 0 && !checked ? ' disabled' : ''}>
          ${fa.swatch ? `<span class="sw" style="--c:${CAT.colorHex(v)}"></span>` : '<span class="box"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2.5 6.5 2.5 2.5 4.5-5"/></svg></span>'}
          <span class="lbl">${lbl}</span>
        </label>`;
      }).join('');
      return `<details class="catp-group" data-facet="${fa.id}"${openGroups.has(fa.id) || on ? ' open' : ''}>
        <summary><span>${esc(T(fa.key))}${on ? `<span class="on">${on}</span>` : ''}</span><svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></summary>
        <div class="catp-opts">${opts}</div>
      </details>`;
    }).join('');
  }
  form.addEventListener('change', e => {
    const i = e.target;
    if (i.type !== 'checkbox') return;
    i.checked ? state.sel[i.name].add(i.value) : state.sel[i.name].delete(i.value);
    state.page = 1;
    writeURL(); renderHead(); renderGrid();
    const focusTo = `input[name="${i.name}"][value="${CSS.escape(i.value)}"]`;
    renderPanel();
    form.querySelector(focusTo)?.focus({ preventScroll: true });
  });
  form.addEventListener('toggle', e => { const d = e.target; if (d.matches('.catp-group')) { d.open ? openGroups.add(d.dataset.facet) : openGroups.delete(d.dataset.facet); } }, true);

  const body = $('.catp-body'), panel = $('#cat-panel'), btn = $('#cat-filters-btn'), scrim = $('#cat-scrim');
  let lastFocus = null;
  function setOpen(on) {
    open = on;
    if (on) renderPanel();
    btn.setAttribute('aria-expanded', String(on));
    body.classList.toggle('is-open', on);
    panel.classList.toggle('is-open', on);
    if (phone.matches) {
      if (on) { scrim.hidden = false; requestAnimationFrame(() => scrim.classList.add('is-on')); document.body.classList.add('is-locked'); lastFocus = document.activeElement; setTimeout(() => $('#cat-panel-close').focus({ preventScroll: true }), 80); }
      else { scrim.classList.remove('is-on'); setTimeout(() => { if (!open) scrim.hidden = true; }, 260); document.body.classList.remove('is-locked'); lastFocus?.focus({ preventScroll: true }); }
    } else if (on) { setTimeout(() => form.querySelector('input:not(:disabled)')?.focus({ preventScroll: true }), 120); }
    if (!on) setTimeout(() => { if (!open) renderPanel(); }, phone.matches ? 380 : 300);   // after the slide: the closed panel holds nothing
    try { localStorage.setItem('hoe-cat-panel', on ? '1' : '0'); } catch (e) { /* per-visit */ }
  }
  btn.addEventListener('click', () => setOpen(!open));
  $('#cat-panel-close').addEventListener('click', () => setOpen(false));
  $('#cat-apply').addEventListener('click', () => setOpen(false));
  scrim.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open && phone.matches) setOpen(false); });
  const clearAll = () => { PANEL.forEach(fa => state.sel[fa.id].clear()); state.page = 1; writeURL(); renderHead(); renderGrid(); renderPanel(); };
  $('#cat-clear').addEventListener('click', clearAll);
  $('#cat-empty-cta').addEventListener('click', clearAll);
  window.addEventListener('resize', () => { if (!phone.matches) { scrim.hidden = true; scrim.classList.remove('is-on'); document.body.classList.remove('is-locked'); } });

  // ---------- data: one chunk for a category; every chunk, one after the other, for "All" (the first paints at once) ----------
  function load() {
    const c = singleCat();
    const key = c || 'all';
    if (src === key) { renderGrid(); renderPanel(); return; }
    src = key; FR = []; shown = []; loading = true;
    if (!ready) { loading = false; renderGrid(); renderPanel(); return; }
    if (c) {
      CAT.chunk(c).then(list => { if (src !== key) return; FR = list; loading = false; renderGrid(); renderPanel(); });
    } else {
      CAT.all((acc, cat, last) => { if (src !== key) return; FR = acc; if (last) loading = false; renderGrid(); renderPanel(); });
    }
  }

  // ---------- language ----------
  function onLang() { renderHead(); shown = []; renderGrid(); renderPanel(); }
  document.addEventListener('hoe:lang', onLang);

  CAT.manifest().then(m => {
    applyManifest(m);
    readURL();
    let wantOpen = false; try { wantOpen = localStorage.getItem('hoe-cat-panel') === '1'; } catch (e) { /* closed */ }
    renderHead(); load();
    if (wantOpen && !phone.matches) { body.style.transition = 'none'; setOpen(true); requestAnimationFrame(() => { body.style.transition = ''; }); }
    window.addEventListener('popstate', () => { readURL(); renderHead(); load(); });
  });
  // load choreography (after the title is set): the headline rises line by line out of its mask (GSAP; without it the text is simply there)
  if (window.hoeMotion && window.hoeMotion.hasGsap) {
    const h1 = $('#cat-h1'); const gs = window.gsap; if (gs) gs.set(h1, { opacity: 0 });
    window.hoeMotion.ready(() => window.hoeMotion.lines(h1, { duration: 1, stagger: .09, delay: .1 }));
  }
})();
