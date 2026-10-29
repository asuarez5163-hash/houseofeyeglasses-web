// Catálogo (catalogo.html): lee HOE_SAMPLE_FRAMES, filtra y pinta las tarjetas (js/main.js hoeFrameCard).
// La categoría (?cat=men|women|kids|sun) viene de la cabecera, el menú, el pie o las pestañas de la barra: titula la
// página, elige la FOTO grande de la cabecera (assets/img/foto-*) y marca la pestaña. Los cuatro filtros del panel
// (forma, material, color, medida) viven en la URL (history.replaceState), nunca en una cuenta; los activos se ven como
// chips junto al botón Filtros (× quita uno). La cifra viva ("16") cuenta de 0 al total al cargar (hoeMotion.count).
// Una opción con 0 resultados se atenúa. Idioma: re-etiqueta en 'hoe:lang'.
// Movimiento: al filtrar, las tarjetas que se van hacen fade 120 ms, la rejilla conserva su alto 300 ms (nada salta) y
// las nuevas entran con el stagger de hoeMotion.reveal (translateY 14 + opacity, la única familia de revelado).
(() => {
  'use strict';
  const main = document.querySelector('main.catp');
  if (!main || !window.HOE_SAMPLE_FRAMES) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  const phone = window.matchMedia('(max-width: 860px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const FR = window.HOE_SAMPLE_FRAMES;
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
  const FACETS = [
    { id: 'cat',      vals: ['men', 'women', 'kids', 'sun'], of: f => f.cats, panel: false },
    { id: 'shape',    key: 'catalogo.f.shape',    vals: window.HOE_SHAPE_ORDER, label: v => T(window.HOE_SHAPE_LABEL[v]), of: f => [f.shape], shape: true },
    { id: 'material', key: 'catalogo.f.material', vals: ['acetate', 'metal', 'titanium', 'tr90'], label: v => T('mat.' + v), of: f => [f.material] },
    { id: 'color',    key: 'catalogo.f.color',    vals: [], label: v => T('color.' + v), of: f => f.colors.map(c => c.id), swatch: true },
    { id: 'size',     key: 'catalogo.f.size',     vals: ['XN', 'N', 'M', 'W', 'XW'], label: v => `${T('band.' + v)} · ${v}`, of: f => [f.size.band] },
  ];
  const colorSw = {};
  FR.forEach(f => f.colors.forEach(c => { if (!colorSw[c.id]) colorSw[c.id] = c.c; }));
  FACETS.find(fa => fa.id === 'color').vals = Object.keys(colorSw);
  const PANEL = FACETS.filter(fa => fa.panel !== false);
  const facet = id => FACETS.find(fa => fa.id === id);

  const state = { sel: {} };
  FACETS.forEach(fa => { state.sel[fa.id] = new Set(); });

  function readURL() {
    const q = new URLSearchParams(location.search);
    FACETS.forEach(fa => {
      state.sel[fa.id] = new Set((q.get(fa.id) || '').split(',').map(v => (fa.id === 'cat' ? CAT_ALIAS[v] || v : v)).filter(v => fa.vals.includes(v)));
    });
  }
  function writeURL() {
    const q = new URLSearchParams();
    FACETS.forEach(fa => { if (state.sel[fa.id].size) q.set(fa.id, [...state.sel[fa.id]].join(',')); });
    const s = q.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
  }
  const matches = (f, skip) => FACETS.every(fa => fa.id === skip || !state.sel[fa.id].size || fa.of(f).some(v => state.sel[fa.id].has(v)));

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
    const src = `assets/img/${ph.src}.jpg`;
    if (photoImg.getAttribute('src') !== src) { photoImg.width = ph.w; photoImg.height = ph.h; photoImg.src = src; }
    hero.style.setProperty('--cat-pos', ph.pos); hero.style.setProperty('--cat-pos-m', ph.posM);
    // the header chip and the bar tab of this category are the current page
    $$('.main-nav a[href^="catalogo.html"]').forEach(a => {
      const qc = new URLSearchParams(a.getAttribute('href').split('?')[1] || '').get('cat');
      if ((CAT_ALIAS[qc] || qc) === c) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $$('#cat-cats a').forEach(a => { if (a.dataset.cat === (c || 'all')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  // the figure: counts from 0 the first time (GSAP), then just lands on each filter
  let counted = false;
  function renderCount(n) {
    const num = $('#cat-n');
    $('#cat-count').textContent = T(n === 1 ? 'catalogo.countLbl1' : 'catalogo.countLbl');
    if (!counted && window.hoeMotion && window.hoeMotion.hasGsap) { counted = true; window.hoeMotion.count(num, n, { duration: 1.1, delay: .25, trigger: hero, start: 'top bottom' }); return; }
    counted = true;
    num.textContent = String(n);
  }
  // the category tabs of the bar switch in place (the grid cross-fades, nothing reloads)
  $('#cat-cats').addEventListener('click', e => {
    const a = e.target.closest('a[data-cat]'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    state.sel.cat = new Set(a.dataset.cat === 'all' ? [] : [a.dataset.cat]);
    writeURL(); renderHead(); renderGrid(); renderPanel();
  });

  // ---------- active chips (one per selected value; × removes it) ----------
  const chips = $('#cat-chips');
  function renderChips() {
    const items = [];
    PANEL.forEach(fa => state.sel[fa.id].forEach(v => items.push({ fa, v })));
    chips.hidden = !items.length;
    chips.innerHTML = items.map(({ fa, v }) => `<li><button type="button" class="catp-chip" data-press data-facet="${fa.id}" data-val="${v}" aria-label="${T('catalogo.chipRemove')}: ${fa.label(v)}">
        <span>${fa.label(v)}</span><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2 2 8 8M10 2l-8 8"/></svg>
      </button></li>`).join('');
  }
  chips.addEventListener('click', e => {
    const b = e.target.closest('.catp-chip'); if (!b) return;
    state.sel[b.dataset.facet].delete(b.dataset.val);
    writeURL(); renderHead(); renderGrid(); renderPanel();
    (chips.querySelector('.catp-chip') || $('#cat-filters-btn')).focus({ preventScroll: true });
  });

  // ---------- cards ----------
  const grid = $('#cat-grid');
  let shown = [], swapTimer = 0, holdTimer = 0;
  // the new cards that are already on screen (motion.js shows those at once) come in with the same stagger as the rest
  function enterVisible() {
    if (reduced.matches || !('animate' in Element.prototype)) return;
    const h = window.innerHeight;
    let i = 0;
    [...grid.children].forEach(li => {
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
  function renderGrid() {
    const list = FR.filter(f => matches(f));
    const same = list.length === shown.length && list.every((f, i) => shown[i] === f);
    shown = list;
    const n = list.length;
    $('#cat-empty').hidden = n > 0;
    const active = PANEL.reduce((a, fa) => a + state.sel[fa.id].size, 0);
    const nEl = $('#cat-filters-n'); nEl.hidden = !active; nEl.textContent = String(active);
    $('#cat-apply-txt').textContent = n === 0 ? T('catalogo.apply0') : n === 1 ? T('catalogo.apply1') : fill(T('catalogo.apply'), { n });
    renderCount(n);
    renderChips();
    if (same && (grid.children.length || n === 0)) return;
    clearTimeout(swapTimer); clearTimeout(holdTimer);
    const had = grid.children.length > 0;
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

  // ---------- panel (rendered only while open: closed, it holds nothing, so the grid's drawings come first) ----------
  const form = $('#cat-form');
  const openGroups = new Set(['shape']);
  let open = false;
  function renderPanel() {
    if (!open) { form.innerHTML = ''; return; }
    form.innerHTML = PANEL.map(fa => {
      const on = state.sel[fa.id].size;
      const opts = fa.vals.map(v => {
        const n = FR.filter(f => matches(f, fa.id) && fa.of(f).includes(v)).length;
        const checked = state.sel[fa.id].has(v);
        const lbl = fa.shape ? `${window.hoeFrameSVG(v)}<span>${fa.label(v)}</span>` : fa.label(v);
        return `<label class="catp-opt${fa.shape ? ' catp-opt-shape' : ''}${n === 0 ? ' is-zero' : ''}${checked ? ' is-on' : ''}">
          <input type="checkbox" name="${fa.id}" value="${v}"${checked ? ' checked' : ''}${n === 0 && !checked ? ' disabled' : ''}>
          ${fa.swatch ? `<span class="sw" style="--c:${colorSw[v]}"></span>` : '<span class="box"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2.5 6.5 2.5 2.5 4.5-5"/></svg></span>'}
          <span class="lbl">${lbl}</span>
        </label>`;
      }).join('');
      return `<details class="catp-group" data-facet="${fa.id}"${openGroups.has(fa.id) || on ? ' open' : ''}>
        <summary><span>${T(fa.key)}${on ? `<span class="on">${on}</span>` : ''}</span><svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></summary>
        <div class="catp-opts">${opts}</div>
      </details>`;
    }).join('');
  }
  form.addEventListener('change', e => {
    const i = e.target;
    if (i.type !== 'checkbox') return;
    i.checked ? state.sel[i.name].add(i.value) : state.sel[i.name].delete(i.value);
    writeURL(); renderHead(); renderGrid();
    const focusTo = `input[name="${i.name}"][value="${i.value}"]`;
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
  const clearAll = () => { PANEL.forEach(fa => state.sel[fa.id].clear()); writeURL(); renderHead(); renderGrid(); renderPanel(); };
  $('#cat-clear').addEventListener('click', clearAll);
  $('#cat-empty [data-act="clear"]').addEventListener('click', clearAll);
  window.addEventListener('resize', () => { if (!phone.matches) { scrim.hidden = true; scrim.classList.remove('is-on'); document.body.classList.remove('is-locked'); } });

  // ---------- language ----------
  function onLang() { renderHead(); shown = []; renderGrid(); renderPanel(); }
  document.addEventListener('hoe:lang', onLang);

  readURL();
  let wantOpen = false; try { wantOpen = localStorage.getItem('hoe-cat-panel') === '1'; } catch (e) { /* closed */ }
  renderHead(); renderGrid(); renderPanel();
  // load choreography (after the title is set): the headline rises line by line out of its mask (GSAP; without it the text is simply there)
  if (window.hoeMotion && window.hoeMotion.hasGsap) {
    const h1 = $('#cat-h1'); const gs = window.gsap; if (gs) gs.set(h1, { opacity: 0 });
    window.hoeMotion.ready(() => window.hoeMotion.lines(h1, { duration: 1, stagger: .09, delay: .1 }));
  }
  if (wantOpen && !phone.matches) { body.style.transition = 'none'; setOpen(true); requestAnimationFrame(() => { body.style.transition = ''; }); }
  window.addEventListener('popstate', () => { readURL(); renderHead(); renderGrid(); renderPanel(); });
  void facet;
})();
