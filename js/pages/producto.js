// Ficha de armazón (producto.html): la FOTO real del sprite (assets/frames/<SKU>.webp: hasta 3 vistas, pestañas 1 · 2 · 3)
// sobre la loseta --paper 1:1 y la pestaña "Medida" con la patilla dibujada (hoeTempleSVG); al cargar, la primera foto entra
// en foco (GSAP fade + scale; sin GSAP está desde el primer pintado). Variantes = hermanos de color (f.v): cada punto enlaza a
// producto.html?id=<hermano> (su propia URL canónica) y, bajo el puntero, muestra su foto en la vista 1. Precio real + "lentes
// incluidos", stock (st<=0 → agotado, botón deshabilitado, noindex), Details con marca · modelo · código · color · lente ·
// material · forma · aro · medida, JSON-LD Product, y el configurador de lentes en CUATRO pasos (código postal → uso → receta → lentes) con barra
// pegajosa (nombre + precio) y "Agregar al carrito" (el botón dice "Añadido ✓" 1.2 s y se abre el cajón). En el paso 4 la lente
// de muestra (partial lens_demo, .cfg-demo) reacciona a la opción marcada o bajo el puntero.
// Debajo, "También te pueden gustar": el mismo modelo en otros colores y luego la misma forma (window.hoeFrameCard).
// Datos: js/catalog.js (hoeCatalog.byId: el chunk sale de la letra del SKU), js/data/lenses.js (opciones), js/cart.js (carrito).
// La receta nunca se "manda después de pagar": se escribe aquí y la revisa el óptico antes de que el laboratorio empiece.
// El código postal (paso 1) fija el estado: en los estados de js/data/rx-states.js (STRICT) el paso 3 pide además el doctor para verificar la receta.
// El DP se pide por ojo (derecho / izquierdo); "solo tengo un número" deja el DP total. El "?" del DP abre una guía con dibujo sin salir de la página.
(() => {
  'use strict';
  const main = document.querySelector('main.pdp');
  if (!main || !window.hoeCatalog) return;
  const CAT = window.hoeCatalog;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const L = () => (window.hoeLang ? window.hoeLang() : 'en');
  const esc = s => (window.hoeEsc ? window.hoeEsc(s) : String(s));
  const loc = o => (o && (o[L()] || o.en)) || { name: '', text: '' };
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const MINUS = '−';
  const OPTS = window.HOE_LENS_OPTIONS;
  const q = new URLSearchParams(location.search);
  const id = (q.get('id') || '').trim();
  const SITE = 'https://houseofeyeglasses.com/';

  // SEO: each frame is its own URL (canonical + og:url carry ?id=…); an unknown SKU, a sold-out one and a catalog being
  // updated are soft 404s and must not be indexed
  const setHead = (sel, attr, val) => { const el = document.head.querySelector(sel); if (el) el.setAttribute(attr, val); };
  const noindex = () => { if (document.head.querySelector('meta[name="robots"]')) return; const nf = document.createElement('meta'); nf.name = 'robots'; nf.content = 'noindex,nofollow'; document.head.appendChild(nf); };
  function notFound(updating) {
    noindex();
    $('#pdp-top').hidden = true; const box = $('#pdp-404'); box.hidden = false;
    const p = box.querySelector('p'); const key = updating ? 'cat.updating' : 'prod.notFound';
    p.dataset.i18n = key; p.textContent = T(key);
    const title = () => { document.title = `${T(key)} — House of Eyeglasses`; };
    title(); document.addEventListener('hoe:lang', title);
  }
  CAT.manifest().then(m => (m ? CAT.byId(id).then(f => ({ f })) : { updating: true })).then(r => {
    if (r.updating) { notFound(true); return; }
    if (!r.f) { notFound(false); return; }
    init(r.f);
  });

  function init(frame) {
  const name = CAT.name(frame);
  const inStock = Number(frame.st) > 0;
  const url = SITE + 'producto.html?id=' + encodeURIComponent(frame.id);
  setHead('link[rel="canonical"]', 'href', url);
  setHead('meta[property="og:url"]', 'content', url);
  setHead('meta[property="og:image"]', 'content', SITE + CAT.img(frame));
  if (!inStock) noindex();
  try { localStorage.setItem('hoe-view-' + frame.id, String(Number(localStorage.getItem('hoe-view-' + frame.id) || 0) + 1)); } catch (e) { /* per visit */ }

  const isKids = frame.g === 'kids' || frame.cats.includes('kids');
  const isSun = frame.cats.includes('sun');
  const editId = q.get('edit');
  const editing = editId && window.hoeCart ? window.hoeCart.get().items.find(i => i.id === editId && i.sku === frame.id) : null;
  const LOCKED = ['anti-reflective', 'scratch'];   // always included, never shown as a choice

  const freshRx = () => ({ path: 'now', od: { sph: '0.00', cyl: '0.00', axis: '' }, os: { sph: '0.00', cyl: '0.00', axis: '' }, add: '', pd: { mode: 'own', kind: 'two', od: '', os: '', total: '' }, doc: { name: '', phone: '' }, file: null, confirm: false, readers: '' });
  const loadRx = src => {   // a saved package (maybe from an older shape of the form) → today's shape
    const rx = freshRx();
    if (!src || typeof src !== 'object') return rx;
    ['od', 'os'].forEach(e => { if (src[e]) { rx[e].sph = src[e].sph || '0.00'; rx[e].cyl = src[e].cyl || '0.00'; rx[e].axis = src[e].axis || ''; } });
    rx.add = src.add || (src.od && src.od.add) || '';
    if (src.pd) {
      rx.pd.od = src.pd.od || ''; rx.pd.os = src.pd.os || ''; rx.pd.total = src.pd.total || '';
      rx.pd.kind = src.pd.kind === 'one' || (!src.pd.kind && src.pd.total && !(src.pd.od && src.pd.os)) ? 'one' : 'two';   // older carts only have the single number
    }
    if (src.doc && typeof src.doc === 'object') { rx.doc.name = src.doc.name || ''; rx.doc.phone = src.doc.phone || ''; }
    if (src.path === 'upload' && src.file && src.file.id) { rx.path = 'upload'; rx.file = { id: src.file.id, name: src.file.name || '', type: src.file.type || '', size: src.file.size || 0 }; }
    rx.confirm = !!src.confirm;
    rx.readers = src.readers || '';
    return rx;
  };
  const ship0 = window.hoeCart && window.hoeCart.ship ? window.hoeCart.ship() : null;   // the ZIP the visitor already gave (one per cart)
  const state = {
    zip: ship0 ? ship0.zip : '', st: ship0 ? ship0.state : '',
    use: editing ? editing.use : 'single',
    material: editing ? editing.material : null,
    extras: new Set(editing ? (editing.coatings || []).filter(id => !LOCKED.includes(id)) : []),
    rx: loadRx(editing && editing.rx),
    done: { 1: !!(editing && ship0), 2: !!editing, 3: !!editing, 4: !!editing },
  };

  /* =========================================================
     Gallery: the sprite's views (1 · 2 · 3) and the temple drawing ("Size")
     ========================================================= */
  const mm = () => `${frame.size.lens} □ ${frame.size.bridge} ${frame.size.temple}`;
  const tabs = $$('.pdp-thumbs [role="tab"]');
  const liveTabs = () => tabs.filter(b => !b.hidden);
  let focused = false;
  function renderViews() {
    ['1', '2', '3'].forEach((k, i) => {
      const fig = $('#pdp-view-' + k), tab = tabs.find(b => b.dataset.view === k);
      const on = i < frame.ph;
      if (tab) tab.hidden = !on;
      if (!on) { fig.hidden = true; return; }
      $('.pdp-art', fig).innerHTML = `<div class="pdp-img" role="img" aria-label="${esc(name)} · ${esc(fill(T('prod.photo'), { k: i + 1, n: frame.ph }))}" style="${CAT.sprite(frame, i)}"></div>`;
      $('.pdp-plate-l', fig).textContent = `${CAT.colorName(frame)} · ${frame.cc}`;
      $('.pdp-plate-r', fig).textContent = `${mm()} · ${frame.size.total} mm`;
    });
    $('#pdp-art-side').innerHTML = window.hoeTempleSVG(window.hoeFrameSize(frame), null, { marks: true });
    $('#pdp-plate-mm2').textContent = window.hoeFrameSize(frame);
    // the signature moment of the page, once: the first photo comes into focus on the paper (fade + a touch of scale)
    if (!focused && window.hoeMotion && window.hoeMotion.hasGsap) {
      focused = true;
      const img = $('#pdp-view-1 .pdp-img');
      window.gsap.set(img, { autoAlpha: 0 });
      window.hoeMotion.ready(() => window.gsap.fromTo(img, { autoAlpha: 0, scale: .97 }, { autoAlpha: 1, scale: 1, duration: .9, ease: 'expo.out', clearProps: 'opacity,visibility,transform' }));
    }
  }
  function setView(v) {
    $$('.pdp-view').forEach(f => { const on = f.dataset.view === v; f.hidden = !on; f.classList.toggle('is-on', on); });
    tabs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === v)));
    const img = $(`.pdp-view[data-view="${v}"] .pdp-img, .pdp-view[data-view="${v}"] .temple-art`);
    if (img && window.hoeMotion && window.hoeMotion.hasGsap && !reduced.matches) window.gsap.fromTo(img, { autoAlpha: 0, scale: .985 }, { autoAlpha: 1, scale: 1, duration: .5, ease: 'expo.out', clearProps: 'opacity,visibility,transform' });
  }
  tabs.forEach(b => {
    b.addEventListener('click', () => setView(b.dataset.view));
    b.addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      e.preventDefault();
      const live = liveTabs(), i = live.indexOf(b);
      const n = live[(i + (e.key === 'ArrowRight' ? 1 : -1) + live.length) % live.length];
      n.focus(); setView(n.dataset.view);
    });
  });
  // a colour sibling under the pointer shows its front photo in view 1; leaving brings this frame's back
  const pre = new Set();
  const preload = src => { if (pre.has(src)) return; pre.add(src); const i = new Image(); i.decoding = 'async'; i.src = src; };
  function previewSibling(sku) {
    const img = $('#pdp-view-1 .pdp-img'); if (!img) return;
    if (!sku || sku === frame.id) { img.classList.remove('is-alt'); img.style.cssText = CAT.sprite(frame, 0); return; }
    preload(CAT.img(sku));
    img.classList.add('is-alt'); img.style.cssText = CAT.sprite(sku, 0, 0);
  }

  /* =========================================================
     Buy column: name · price · colour (siblings) · size · stock · CTA · trust · details · JSON-LD
     ========================================================= */
  const sizeLine = () => `${T('band.' + frame.size.band)} · ${mm()}`;
  const sibs = () => [{ id: frame.id, col: frame.col, cc: frame.cc, self: true }, ...(frame.v || [])];
  const sibName = s => (s.self ? CAT.colorName(frame) : T('color.' + s.col)) + (s.cc ? ` · ${s.cc}` : '');
  function renderBuy() {
    $('#pdp-name').textContent = name;
    document.title = fill(T('prod.meta'), { name });
    setHead('meta[property="og:title"]', 'content', document.title);
    setHead('meta[name="description"]', 'content', fill(T('prod.desc'), { name, color: CAT.colorName(frame), price: CAT.price(frame.p) }));
    setHead('meta[property="og:description"]', 'content', fill(T('prod.desc'), { name, color: CAT.colorName(frame), price: CAT.price(frame.p) }));
    // kicker: who it is for and the material ("Women · Acetate", "Sunglasses · Metal")
    const who = isSun ? T('prod.kickerSun') : T('gender.' + (['men', 'women', 'kids', 'unisex'].includes(frame.g) ? frame.g : 'unisex'));
    $('#pdp-kicker').textContent = [who, T('mat.' + frame.mat)].join(' · ');
    $('#pdp-price-v').textContent = CAT.price(frame.p);
    $('#pdp-color-name').textContent = `${CAT.colorName(frame)} · ${frame.cc}`;
    $('#pdp-swatches').innerHTML = sibs().map((s, i) =>
      `<a role="radio" aria-checked="${s.self}" tabindex="${i === 0 ? 0 : -1}" href="producto.html?id=${encodeURIComponent(s.id)}" style="--c:${CAT.colorHex(s.col)}" aria-label="${esc(sibName(s))}" data-sku="${esc(s.id)}"${s.self ? ' aria-current="page"' : ''}></a>`).join('');
    $('#pdp-size').innerHTML = `<span class="pdp-size-band">${esc(T('band.' + frame.size.band))}</span><span aria-hidden="true">·</span><b class="pdp-size-mm">${mm()}</b>`;
    const stock = $('#pdp-stock');
    stock.textContent = T(inStock ? 'prod.stock' : 'prod.soo');
    stock.classList.toggle('is-out', !inStock);
    cta.disabled = !inStock; $('#cfg-add').disabled = !inStock;
    $('#pdp-details').innerHTML = [
      ['prod.d.brand', frame.b], ['prod.d.model', frame.n], ['prod.d.colorCode', frame.cc], ['prod.d.color', CAT.colorName(frame)], ['prod.d.lens', CAT.lensName(frame)],
      ['prod.d.material', T('mat.' + frame.mat)], ['prod.d.shape', T(window.HOE_SHAPE_LABEL[frame.sh] || 'shape.rect')], ['prod.d.rim', T('rim.' + frame.rim)],
      ['prod.d.size', `${sizeLine()} · ${frame.size.total} mm`], ['prod.d.incl', T('prod.d.inclText')],
    ].map(([k, v]) => `<dt>${esc(T(k))}</dt><dd>${esc(v)}</dd>`).join('');
    renderJsonLd();
  }
  function renderJsonLd() {
    let el = document.getElementById('pdp-jsonld');
    if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'pdp-jsonld'; document.head.appendChild(el); }
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product', name, sku: frame.id, brand: { '@type': 'Brand', name: frame.b },
      color: (frame.colRaw && frame.colRaw.en) || frame.col, image: [SITE + CAT.img(frame)], url,
      offers: { '@type': 'Offer', url, priceCurrency: 'USD', price: Number(frame.p) || 0, availability: 'https://schema.org/' + (inStock ? 'InStock' : 'OutOfStock'), itemCondition: 'https://schema.org/NewCondition' },
    });
  }
  const swatches = $('#pdp-swatches');
  swatches.addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    e.preventDefault();
    const all = $$('a', swatches), i = all.indexOf(document.activeElement);
    const n = all[(Math.max(0, i) + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length];
    n.focus();
  });
  // hover previews the sibling's photo; leaving brings the chosen frame back
  swatches.addEventListener('pointerover', e => { const a = e.target.closest('a'); if (a && fine.matches) previewSibling(a.dataset.sku); });
  swatches.addEventListener('pointerleave', () => { if (fine.matches) previewSibling(null); });
  swatches.addEventListener('focusin', e => { const a = e.target.closest('a'); if (a && a.matches(':focus-visible')) previewSibling(a.dataset.sku); });
  swatches.addEventListener('focusout', e => { if (!swatches.contains(e.relatedTarget)) previewSibling(null); });
  // the siblings' sprites are fetched once the pointer reaches the swatches (one Image each)
  swatches.addEventListener('pointerenter', () => (frame.v || []).forEach(s => preload(CAT.img(s.id))), { once: true });

  // accordions: closing waits for the rows to shrink (css grid-template-rows)
  function accordion(selector, exclusive) {
    const pending = new Map();
    const stop = d => { const c = pending.get(d); if (c) { c(); pending.delete(d); } };
    document.addEventListener('click', e => {
      const sum = e.target.closest(`${selector} > summary`); if (!sum) return;
      const d = sum.parentElement;
      if (d.classList.contains('is-closing')) {   // re-opened mid-close: keep it, and still close the siblings
        e.preventDefault(); stop(d); d.classList.remove('is-closing');
        if (exclusive) $$(selector + '[open]').forEach(o => { if (o !== d) closeDet(o); });
        return;
      }
      if (!d.open) {   // opening: close the siblings
        if (exclusive) $$(selector + '[open]').forEach(o => { if (o !== d) closeDet(o); });
        return;        // the browser opens it
      }
      if (reduced.matches) return;
      e.preventDefault(); closeDet(d);
    });
    function closeDet(d) {
      if (!d.open) return;
      if (reduced.matches) { d.open = false; return; }
      stop(d);
      const finish = () => { stop(d); d.open = false; d.classList.remove('is-closing'); };
      const onEnd = ev => { if (ev.target === d && ev.propertyName === 'grid-template-rows') finish(); };
      const t = setTimeout(finish, 320);
      pending.set(d, () => { clearTimeout(t); d.removeEventListener('transitionend', onEnd); });
      d.classList.add('is-closing');
      d.addEventListener('transitionend', onEnd);
    }
    return { close: closeDet };
  }
  accordion('details.pdp-det', false);
  const steps = accordion('details.cfg-step', true);

  /* =========================================================
     Configurator: 3 steps
     ========================================================= */
  const cfg = $('#cfg');
  const cta = $('#pdp-cta');
  const STEPS = [1, 2, 3, 4];   // 1 ZIP · 2 use · 3 prescription · 4 lenses
  const stepEl = n => $('#cfg-s' + n);
  const bodyEl = n => $('#cfg-body' + n);
  const price = o => (o && o.price != null ? `<span class="price">+ ${CAT.price(o.price)}</span>` : '');   // lens options carry no surcharge today (js/data/lenses.js price: null): the frame price includes them
  const opt = (type, name, o, checked, rec, demo) => `<label class="cfg-opt${type === 'checkbox' ? ' is-check' : ''}" data-press${demo ? ` data-demo="${demo}"` : ''}>
      <input type="${type}" name="${name}" value="${o.id}"${checked ? ' checked' : ''}>
      <span class="dot"></span>
      <span class="txt"><b>${loc(o).name}</b>${rec ? `<span class="rec">${T('cfg.rec')}</span>` : ''}</span>
      ${price(o)}
    </label>`;
  const nextBtn = n => `<button type="button" class="btn btn-gold cfg-next" data-next="${n}"><span>${T('cfg.next')}</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13M11.5 5.5 16 10l-4.5 4.5"/></svg></button>`;
  const errBox = n => `<div class="rxf-errs" id="cfg-errs${n}" hidden></div>`;

  // ---- step 1: ZIP code. The state it belongs to decides whether step 3 also asks for the eye doctor (table: js/data/rx-states.js) ----
  const RXS = window.hoeRxStates || { stateOf: () => null, nameOf: c => String(c), strict: () => true, codes: () => [], has: () => false };
  const stName = c => RXS.nameOf(c, L());
  const needsDoctor = () => !!state.st && RXS.strict(state.st) && (state.use === 'single' || state.use === 'progressive');
  const zipNote = () => (state.st ? fill(T(RXS.strict(state.st) ? 'cfg.zipStrict' : 'cfg.zipOpen'), { state: stName(state.st) }) : '');
  const NO_PICK = ['AA', 'AE', 'AP', 'FM', 'MH', 'PW'];   // found by ZIP, never listed in the "choose your state" fallback
  function stateOptions() {
    const codes = RXS.codes().filter(c => !NO_PICK.includes(c)).sort((a, b) => stName(a).localeCompare(stName(b), L()));
    return `<option value="">—</option>` + codes.map(c => `<option value="${c}"${c === state.st ? ' selected' : ''}>${esc(stName(c))}</option>`).join('');
  }
  function renderZip() {
    const five = /^\d{5}$/.test(state.zip);
    bodyEl(1).innerHTML = `<div class="cfg-body-in">
      <div class="rx-field rxf-one rxf-zip"><label for="cfg-zip">${T('cfg.zipLabel')}</label>
        <input class="rx-input" id="cfg-zip" type="text" inputmode="numeric" autocomplete="postal-code" maxlength="5" placeholder="33606" value="${esc(state.zip)}"></div>
      <div class="rx-field rxf-one rxf-zip-pick" id="cfg-zip-pick"${five && !RXS.stateOf(state.zip) ? '' : ' hidden'}><label for="cfg-zip-state">${T('cfg.zipPick')}</label><select class="rx-select" id="cfg-zip-state">${stateOptions()}</select></div>
      <p class="rxf-zipnote" id="cfg-zipnote" aria-live="polite">${esc(zipNote())}</p>
      <p class="rxf-help">${T('cfg.zipWhy')}</p>
      ${errBox(1)}${nextBtn(1)}</div>`;
  }
  function validateZip() {
    if (!/^\d{5}$/.test(state.zip)) return [T('cfg.errZip')];
    if (!state.st || !RXS.has(state.st)) return [T('cfg.errZipState')];
    return [];
  }
  bodyEl(1).addEventListener('input', e => {
    if (e.target.id !== 'cfg-zip') return;
    const clean = e.target.value.replace(/\D/g, '').slice(0, 5);
    if (clean !== e.target.value) e.target.value = clean;
    state.zip = clean;
    state.st = clean.length === 5 ? (RXS.stateOf(clean) || '') : '';
    $('#cfg-zip-pick').hidden = !(clean.length === 5 && !state.st);
    $('#cfg-zipnote').textContent = zipNote();
    if (clean.length === 5 && !state.st) { const sel = $('#cfg-zip-state'); if (sel) sel.value = ''; }
  });
  bodyEl(1).addEventListener('change', e => {
    if (e.target.id === 'cfg-zip-state') { state.st = e.target.value; $('#cfg-zipnote').textContent = zipNote(); }
  });
  bodyEl(1).addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'cfg-zip') { e.preventDefault(); const b = bodyEl(1).querySelector('[data-next="1"]'); if (b) b.click(); } });
  function commitZip() {   // the ZIP is one per cart: the cart keeps it for every frame, the cart page and the payment
    if (window.hoeCart && window.hoeCart.setShip) window.hoeCart.setShip({ zip: state.zip, state: state.st });
    renderRx(); renderLens();
  }

  // ---- step 2: use (picking one moves on to the prescription) ----
  const USES = () => OPTS.uses.filter(u => !(isSun && u.id === 'readers'));
  function renderUse() {
    bodyEl(2).innerHTML = `<div class="cfg-body-in"><div class="cfg-opts">${USES().map(u => opt('radio', 'use', u, u.id === state.use)).join('')}</div></div>`;
  }
  bodyEl(2).addEventListener('click', e => {
    const r = e.target.closest('input[name="use"]'); if (!r) return;
    if (state.use !== r.value) { state.use = r.value; state.material = null; renderRx(); renderLens(); }
    state.done[2] = true;
    renderBar();
    openStep(3);
  });

  // ---- step 3: prescription ----
  const selOpt = (v, label, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${label}</option>`;
  function powerOptions(max, cur) {
    let plus = '', minus = '';
    for (let n = max * 4; n >= 1; n--) { const v = (n / 4).toFixed(2); plus += selOpt(v, '+' + v, cur === v); }
    for (let n = 1; n <= max * 4; n++) { const v = (-n / 4).toFixed(2); minus += selOpt(v, MINUS + (n / 4).toFixed(2), cur === v); }
    return `<optgroup label="+">${plus}</optgroup>${selOpt('0.00', '0.00', cur === '0.00' || !cur)}<optgroup label="${MINUS}">${minus}</optgroup>`;
  }
  function addOptions(cur) {
    let h = selOpt('', '—', !cur);
    for (let v = 0.25; v <= 3.5 + 1e-9; v += 0.25) { const s = v.toFixed(2); h += selOpt(s, '+' + s, cur === s); }
    return h;
  }
  const eyeRow = e => {
    const r = state.rx[e];
    const axisOn = Number(r.cyl) !== 0;
    return `<div class="rxf-eye">
      <p class="rxf-eye-h">${T('rx.' + e)}</p>
      <div class="rxf-fields">
        <div class="rx-field"><label for="rx-${e}-sph">${T('rx.sph')}</label><select class="rx-select" id="rx-${e}-sph" data-eye="${e}" data-f="sph">${powerOptions(20, r.sph)}</select></div>
        <div class="rx-field"><label for="rx-${e}-cyl">${T('rx.cyl')}</label><select class="rx-select" id="rx-${e}-cyl" data-eye="${e}" data-f="cyl">${powerOptions(10, r.cyl)}</select></div>
        <div class="rx-field"><label for="rx-${e}-axis">${T('rx.axis')}</label><input class="rx-input" id="rx-${e}-axis" data-eye="${e}" data-f="axis" type="text" inputmode="numeric" maxlength="3" autocomplete="off" value="${r.axis}" placeholder="${axisOn ? '1–180' : '—'}"${axisOn ? '' : ' disabled'}></div>
      </div>
    </div>`;
  };
  // PD: the visitor measures it (nobody measures it for them: the shop is online only). Two boxes, one per eye (from the nose to each pupil);
  // "I only have one number" keeps the single total. The "?" teaches how to measure it, with a mirror or with someone's help.
  const pdBlock = () => {
    const pd = state.rx.pd, one = pd.kind === 'one';
    const box = (id, key, label, ph) => `<div class="rx-field rxf-pd-f"><label for="${id}">${label}</label><span class="rxf-pd-mm"><input class="rx-input rxf-pd-in" id="${id}" data-pd="${key}" type="text" inputmode="decimal" maxlength="4" autocomplete="off" placeholder="${ph}" value="${esc(pd[key])}"><span aria-hidden="true">mm</span></span></div>`;
    return `<div class="rxf-pd" role="group" aria-labelledby="rx-pd-lbl">
        <span class="rxf-pd-lbl" id="rx-pd-lbl">${T('rx.pd')}<button type="button" class="pd-help" id="pd-help" aria-label="${T('pd.helpAria')}" aria-expanded="false" aria-controls="pd-pop"><span aria-hidden="true">?</span></button></span>
        <p class="rxf-pd-hint">${T('rx.pdHint')}</p>
        <div class="rxf-pd-vals" id="rx-pd-vals">
          <div class="rxf-pd-row">${one ? box('rx-pd', 'total', T('rx.pdTotal'), '63') : box('rx-pd-od', 'od', T('rx.pdRight'), '31.5') + box('rx-pd-os', 'os', T('rx.pdLeft'), '31.5')}</div>
          <button type="button" class="link-u rxf-pd-switch" id="pd-switch">${T(one ? 'rx.pdTwoLink' : 'rx.pdOneLink')}</button>
        </div>
      </div>`;
  };
  // the eye doctor, only where the state asks us to verify the prescription with them (js/data/rx-states.js)
  const docBlock = () => !needsDoctor() ? '' : `<div class="rxf-doc">
      <p class="rxf-eye-h">${T('rx.docTitle')}</p>
      <p class="rxf-doc-why">${fill(T('rx.docWhy'), { state: stName(state.st) })}</p>
      <div class="rxf-doc-f">
        <div class="rx-field"><label for="rx-doc-name">${T('rx.docName')}</label><input class="rx-input" id="rx-doc-name" data-doc="name" type="text" maxlength="40" autocomplete="off" value="${esc(state.rx.doc.name)}"></div>
        <div class="rx-field"><label for="rx-doc-phone">${T('rx.docPhone')}</label><input class="rx-input" id="rx-doc-phone" data-doc="phone" type="tel" inputmode="tel" maxlength="16" autocomplete="off" value="${esc(state.rx.doc.phone)}"></div>
      </div>
    </div>`;
  // ---- uploaded prescription (photo or PDF) instead of typing it: the Worker keeps it, the Central downloads it (lib/optica/recetas) ----
  let rxUp = false;                                    // the Worker's /config said rx:true (an upload store is there)
  let upBusy = false, upErr = '', upThumb = '';        // the thumbnail is an object URL, only for this visit
  let modeTouched = !!(editing && editing.rx && editing.rx.path === 'upload');
  const uploading = () => rxUp && state.rx.path === 'upload';
  // a state that asks for the doctor starts on "Upload" (a copy of the prescription is the proof); elsewhere on typing; the visitor can switch
  const autoMode = () => { if (!modeTouched && rxUp) state.rx.path = needsDoctor() ? 'upload' : 'now'; };
  const modeBlock = () => !rxUp ? '' : `<div class="rxf-mode" role="radiogroup" aria-label="${T('rx.modeAria')}">
        <label class="rxf-pd-opt" data-press><input type="radio" name="rxmode" value="now"${uploading() ? '' : ' checked'}><span class="dot"></span><span>${T('rx.modeType')}</span></label>
        <label class="rxf-pd-opt" data-press><input type="radio" name="rxmode" value="upload"${uploading() ? ' checked' : ''}><span class="dot"></span><span>${T('rx.modeUpload')}</span></label>
      </div>
      <p class="rxf-mode-note">${fill(T(needsDoctor() ? 'rx.modeStrict' : 'rx.modeOpen'), { state: stName(state.st) })}</p>`;
  const fmtSize = n => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const UP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/></svg>';
  const upBlock = () => {
    const f = state.rx.file;
    const body = upBusy ? `<p class="rxf-up-busy" role="status">${T('rx.upBusy')}</p>`
      : f && f.id ? `<div class="rxf-up-file">${upThumb ? `<img class="rxf-up-thumb" src="${upThumb}" alt="">` : `<span class="rxf-up-icon" aria-hidden="true">${f.type === 'application/pdf' ? 'PDF' : 'IMG'}</span>`}
          <span class="rxf-up-meta"><b>${esc(f.name || 'receta')}</b><span>${f.size ? fmtSize(f.size) + ' · ' : ''}${T('rx.upOk')}</span></span>
          <button type="button" class="link-u rxf-up-x" id="rx-up-x">${T('rx.upRemove')}</button></div>`
      : `<button type="button" class="btn rxf-up-btn" id="rx-up-btn">${UP_ICON}<span>${T('rx.upBtn')}</span></button><p class="rxf-up-hint">${T('rx.upHint')}</p>`;
    return `<div class="rxf-up${f && f.id ? ' has-file' : ''}" id="rx-up">${body}${upErr ? `<p class="rxf-up-err" role="alert">${esc(upErr)}</p>` : ''}<input type="file" id="rx-file" accept="image/*,application/pdf,.pdf,.heic,.heif" hidden></div>`;
  };
  // a phone photo is 3–8 MB: big JPG/PNG/WebP photos go as a JPEG of 2400 px at most (still sharp for the optician); PDF and HEIC go as they are
  async function shrink(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size <= 1.5 * 1048576 || !window.createImageBitmap) return file;
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
      return blob && blob.size < file.size ? new File([blob], (file.name || 'receta').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
    } catch (e) { return file; }
  }
  const UP_ERR = { tipo: 'rx.upErrType', vacio: 'rx.upErrType', grande: 'rx.upErrBig', muchas: 'rx.upErrMany', sin_almacen: 'rx.upErrOff' };
  async function upload(file) {
    if (!file || upBusy || !window.hoeCart) return;
    upErr = '';
    if (file.size > 25 * 1048576) { upErr = T('rx.upErrBig'); renderRx(); return; }
    upBusy = true; renderRx();
    try {
      const f = await shrink(file);
      if (f.size > 6 * 1048576) throw Object.assign(new Error('big'), { code: 'grande' });
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const t = setTimeout(() => ctl && ctl.abort(), 60000);
      const r = await fetch(window.hoeCart.API + '/rx?n=' + encodeURIComponent(String(f.name || 'receta').slice(0, 60)),
        { method: 'POST', body: f, headers: { 'Content-Type': f.type || 'application/octet-stream' }, mode: 'cors', credentials: 'omit', signal: ctl ? ctl.signal : undefined });
      clearTimeout(t);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.id) throw Object.assign(new Error('up'), { code: d.error });
      if (upThumb) URL.revokeObjectURL(upThumb);
      upThumb = /^image\/(jpeg|png|webp)$/.test(d.type) ? URL.createObjectURL(f) : '';
      state.rx.file = { id: d.id, name: d.name, type: d.type, size: d.size };
      showErrs(3, []);
    } catch (e) {
      upErr = T(UP_ERR[e && e.code] || 'rx.upErrNet');
    }
    upBusy = false; renderRx();
    const back = $('#rx-up-x') || $('#rx-up-btn'); if (back) back.focus({ preventScroll: true });
  }
  if (window.hoeCart && window.hoeCart.config) window.hoeCart.config().then(c => {
    rxUp = !!(c && c.rx);
    if (!rxUp && state.rx.path === 'upload') state.rx.path = 'now';
    renderRx(); renderLens();
  });

  function renderRx() {
    const rx = state.rx;
    let inner = '';
    if (state.use === 'non-rx') {
      inner = `<p class="rxf-none">${T('rx.none')}</p>`;
    } else if (state.use === 'readers') {
      inner = `<div class="rx-field rxf-one"><label for="rx-readers">${T('rx.readers')}</label><select class="rx-select" id="rx-readers">${addOptions(rx.readers)}</select></div>`;
    } else {
      autoMode();
      const up = uploading();
      inner = `${modeBlock()}
        ${up ? upBlock() : `${eyeRow('od')}${eyeRow('os')}
        ${state.use === 'progressive' ? `<div class="rx-field rxf-one"><label for="rx-add">${T('rx.add')}</label><select class="rx-select" id="rx-add">${addOptions(rx.add)}</select></div>` : ''}`}
        ${pdBlock()}
        ${up ? '' : docBlock()}
        <label class="rxf-confirm" data-press><input type="checkbox" id="rx-confirm"${rx.confirm ? ' checked' : ''}><span class="dot"></span><span>${T('rx.confirm')}</span></label>
        <p class="rxf-help"><a class="link-u" href="receta.html">${T('rx.howTo')}</a></p>`;
    }
    bodyEl(3).innerHTML = `<div class="cfg-body-in">${inner}${errBox(3)}${nextBtn(3)}</div>`;
  }
  const num = v => Number(String(v == null ? '' : v).replace(',', '.'));
  const fmtMm = n => String(Math.round(n * 10) / 10);
  function validateRx() {
    const rx = state.rx, errs = [];
    if (state.use === 'non-rx') return errs;
    if (state.use === 'readers') { if (!rx.readers) errs.push(T('rx.errReaders')); return errs; }
    const up = uploading();
    if (up) { if (!(rx.file && rx.file.id)) errs.push(T('rx.errUpload')); }
    else {
      ['od', 'os'].forEach(e => { const r = rx[e]; if (Number(r.cyl) !== 0 && !(/^\d{1,3}$/.test(r.axis) && Number(r.axis) >= 1 && Number(r.axis) <= 180)) errs.push(fill(T('rx.errAxis'), { eye: T('rx.' + e) })); });
      if (state.use === 'progressive' && !rx.add) errs.push(T('rx.errAdd'));
    }
    if (rx.pd.kind === 'one') { const v = num(rx.pd.total); if (!(v >= 40 && v <= 80)) errs.push(T('rx.errPd')); }
    else { const a = num(rx.pd.od), b = num(rx.pd.os); if (!(a >= 20 && a <= 45 && b >= 20 && b <= 45 && a + b >= 40 && a + b <= 80)) errs.push(T('rx.errPd2')); }
    if (!up && needsDoctor()) {                 // an uploaded copy already is the proof; typed numbers need the doctor to verify them
      if (rx.doc.name.trim().length < 2) errs.push(T('rx.errDocName'));
      if (rx.doc.phone.replace(/\D/g, '').length < 10) errs.push(T('rx.errDocPhone'));
    }
    if (!rx.confirm) errs.push(T('rx.errConfirm'));
    return errs;
  }
  // what goes to the cart: only the PD that was chosen (two numbers → also their sum as `total`, so a reader that knows only the total still shows a PD), the doctor only where it is asked
  function rxForCart() {
    const rx = JSON.parse(JSON.stringify(state.rx));
    const pd = rx.pd;
    if (pd.kind === 'one') rx.pd = { mode: 'own', kind: 'one', total: String(pd.total).replace(',', '.') };
    else rx.pd = { mode: 'own', kind: 'two', od: String(pd.od).replace(',', '.'), os: String(pd.os).replace(',', '.'), total: fmtMm(num(pd.od) + num(pd.os)) };
    if (uploading() && rx.file && rx.file.id) return { path: 'upload', file: { id: rx.file.id, name: rx.file.name, type: rx.file.type, size: rx.file.size }, pd: rx.pd, confirm: rx.confirm };
    rx.path = 'now'; delete rx.file;
    if (!needsDoctor()) delete rx.doc; else { rx.doc.name = rx.doc.name.trim(); rx.doc.phone = rx.doc.phone.trim(); }
    return rx;
  }
  bodyEl(3).addEventListener('change', e => {
    const el = e.target, rx = state.rx;
    if (el.name === 'rxmode') { rx.path = el.value; modeTouched = true; upErr = ''; showErrs(3, []); renderRx(); renderLens(); const r = bodyEl(3).querySelector(`input[name="rxmode"][value="${el.value}"]`); if (r) r.focus({ preventScroll: true }); return; }
    if (el.id === 'rx-file') { const f = el.files && el.files[0]; el.value = ''; upload(f); return; }
    if (el.dataset.eye) {
      rx[el.dataset.eye][el.dataset.f] = el.value;
      if (el.dataset.f === 'cyl') { const ax = $(`#rx-${el.dataset.eye}-axis`); const on = Number(el.value) !== 0; ax.disabled = !on; ax.placeholder = on ? '1–180' : '—'; if (!on) { ax.value = ''; rx[el.dataset.eye].axis = ''; } }
      renderLens();
    }
    if (el.id === 'rx-add') rx.add = el.value;
    if (el.id === 'rx-confirm') rx.confirm = el.checked;
    if (el.id === 'rx-readers') rx.readers = el.value;
  });
  bodyEl(3).addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.f === 'axis') { const clean = el.value.replace(/\D/g, '').slice(0, 3); if (clean !== el.value) el.value = clean; state.rx[el.dataset.eye].axis = clean; }
    if (el.dataset.pd) { const clean = el.value.replace(/[^\d.,]/g, '').slice(0, 4); if (clean !== el.value) el.value = clean; state.rx.pd[el.dataset.pd] = clean; }
    if (el.dataset.doc) {
      const clean = el.dataset.doc === 'phone' ? el.value.replace(/[^\d+\-() ]/g, '').slice(0, 16) : el.value.slice(0, 40);
      if (clean !== el.value) el.value = clean;
      state.rx.doc[el.dataset.doc] = clean;
    }
  });
  bodyEl(3).addEventListener('click', e => {
    if (e.target.closest('#rx-up-btn')) { const i = $('#rx-file'); if (i) i.click(); return; }
    if (e.target.closest('#rx-up-x')) { state.rx.file = null; if (upThumb) { URL.revokeObjectURL(upThumb); upThumb = ''; } renderRx(); const b = $('#rx-up-btn'); if (b) b.focus({ preventScroll: true }); return; }
  });
  // drop a file on the upload area (desktop)
  bodyEl(3).addEventListener('dragover', e => { const z = e.target.closest && e.target.closest('#rx-up'); if (!z) return; e.preventDefault(); z.classList.add('is-over'); });
  bodyEl(3).addEventListener('dragleave', e => { const z = e.target.closest && e.target.closest('#rx-up'); if (z && !z.contains(e.relatedTarget)) z.classList.remove('is-over'); });
  bodyEl(3).addEventListener('drop', e => { const z = e.target.closest && e.target.closest('#rx-up'); if (!z) return; e.preventDefault(); z.classList.remove('is-over'); upload(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
  bodyEl(3).addEventListener('click', e => {
    if (!e.target.closest('#pd-switch')) return;
    const pd = state.rx.pd;
    if (pd.kind === 'one') pd.kind = 'two';
    else { pd.kind = 'one'; if (!pd.total && num(pd.od) && num(pd.os)) pd.total = fmtMm(num(pd.od) + num(pd.os)); }   // two numbers → their sum is the single PD
    renderRx();
    const f = $('#rx-pd-vals input'); if (f) f.focus({ preventScroll: true });
  });

  // ---- PD help: the small "?" opens a floating card (drawing + three steps) over the page, so nobody leaves the purchase to learn how to measure ----
  let pop = null, popBtn = null, popHide = 0;
  const popHTML = () => `<button class="pd-pop-x" type="button" aria-label="${T('pd.close')}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13"/></svg></button>
    <p class="pd-pop-t" id="pd-pop-t">${T('pd.title')}</p>
    <svg class="pd-fig" viewBox="0 0 320 176" role="img" aria-label="${T('pd.figAria')}">
      <path class="pd-brow" d="M58 44c16-12 46-14 66-3M196 41c20-11 50-9 66 3"/>
      <path class="pd-eye" d="M62 78c14-22 50-22 64 0-14 20-50 20-64 0zM194 78c14-22 50-22 64 0-14 20-50 20-64 0z"/>
      <circle class="pd-iris" cx="94" cy="78" r="13"/><circle class="pd-iris" cx="226" cy="78" r="13"/>
      <circle class="pd-pupil" cx="94" cy="78" r="5"/><circle class="pd-pupil" cx="226" cy="78" r="5"/>
      <path class="pd-nose" d="M160 14v108"/>
      <path class="pd-guide" d="M94 92v38M226 92v38"/>
      <path class="pd-arrow" d="M160 112H98M106 107l-8 5 8 5M160 112h62M214 107l8 5-8 5"/>
      <text class="pd-lbl pd-lbl--gold" x="127" y="104" text-anchor="middle">${T('pd.l')} 31.5</text>
      <text class="pd-lbl pd-lbl--gold" x="193" y="104" text-anchor="middle">${T('pd.r')} 31.5</text>
      <text class="pd-lbl pd-lbl--dim" x="160" y="10" text-anchor="middle">${T('pd.nose')}</text>
      <rect class="pd-ruler" x="24" y="132" width="272" height="30" rx="2"/>
      <path class="pd-ticks" d="M34 132v8M42 132v8M50 132v8M58 132v14M66 132v8M74 132v8M82 132v8M90 132v8M98 132v14M106 132v8M114 132v8M122 132v8M130 132v8M138 132v14M146 132v8M154 132v8M162 132v8M170 132v8M178 132v14M186 132v8M194 132v8M202 132v8M210 132v8M218 132v14M226 132v8M234 132v8M242 132v8M250 132v8M258 132v14M266 132v8M274 132v8M282 132v8M290 132v8"/>
      <text class="pd-lbl pd-lbl--paper" x="288" y="156" text-anchor="end">mm</text>
    </svg>
    <ol class="pd-steps">
      <li>${T('pd.s1')}</li><li>${T('pd.s2')}</li><li>${T('pd.s3')}</li>
    </ol>
    <p class="pd-sum"><b>31.5 + 31.5 = 63 mm</b><span>${T('pd.sum')}</span></p>
    <a class="link-u pd-more" href="receta.html#pd" target="_blank" rel="noopener">${T('pd.more')}</a>`;
  function placePop() {
    if (!pop || pop.hidden || !popBtn) return;
    const r = popBtn.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight, m = 12;
    pop.style.maxWidth = Math.min(360, vw - 2 * m) + 'px';
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const left = Math.max(m, Math.min(r.left + r.width / 2 - w / 2, vw - w - m));
    let top = r.bottom + 10;
    const above = top + h > vh - m && r.top - h - 10 >= m;
    if (above) top = r.top - h - 10; else if (top + h > vh - m) top = Math.max(m, vh - h - m);   // no room below: above the "?"
    pop.classList.toggle('is-above', above);
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
    pop.style.setProperty('--pd-arrow', Math.max(14, Math.min(w - 14, r.left + r.width / 2 - left)) + 'px');
  }
  function showPop(btn, focusIn) {
    clearTimeout(popHide);
    if (!pop) {
      pop = document.createElement('div'); pop.className = 'pd-pop'; pop.id = 'pd-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-labelledby', 'pd-pop-t'); pop.hidden = true;
      document.body.appendChild(pop);
      pop.addEventListener('pointerenter', () => clearTimeout(popHide));
      pop.addEventListener('pointerleave', () => { if (fine.matches) schedHide(); });
      pop.addEventListener('click', e => { if (e.target.closest('.pd-pop-x')) hidePop(true); });
    }
    popBtn = btn;
    pop.innerHTML = popHTML();
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    placePop();
    if (focusIn) pop.querySelector('.pd-pop-x').focus({ preventScroll: true });
  }
  function hidePop(refocus) {
    clearTimeout(popHide);
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    const b = popBtn; if (b) { b.setAttribute('aria-expanded', 'false'); if (refocus && document.contains(b)) b.focus({ preventScroll: true }); }
  }
  const schedHide = () => { clearTimeout(popHide); popHide = setTimeout(() => hidePop(false), 180); };
  bodyEl(3).addEventListener('pointerover', e => { const b = e.target.closest('#pd-help'); if (b && fine.matches) showPop(b, false); });
  bodyEl(3).addEventListener('pointerout', e => { const b = e.target.closest('#pd-help'); if (b && fine.matches && !(e.relatedTarget && b.contains(e.relatedTarget))) schedHide(); });
  bodyEl(3).addEventListener('click', e => {
    const b = e.target.closest('#pd-help'); if (!b) return;
    if (pop && !pop.hidden && b.getAttribute('aria-expanded') === 'true' && !fine.matches) { hidePop(false); return; }
    if (pop && !pop.hidden && fine.matches && e.detail === 0) { hidePop(true); return; }   // keyboard: Enter/Space toggles
    showPop(b, e.detail === 0);                                                             // keyboard open moves focus into the card (× and the link are reachable)
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && pop && !pop.hidden) hidePop(true); });
  document.addEventListener('pointerdown', e => { if (pop && !pop.hidden && !pop.contains(e.target) && !(e.target.closest && e.target.closest('#pd-help'))) hidePop(false); });
  window.addEventListener('scroll', () => { if (pop && !pop.hidden) placePop(); }, { passive: true });
  window.addEventListener('resize', () => { if (pop && !pop.hidden) placePop(); });
  document.addEventListener('hoe:lang', () => { if (pop && !pop.hidden) { pop.innerHTML = popHTML(); placePop(); } });

  // ---- step 4: lenses (material + extras in one list) + the sample lens ----
  const maxPower = () => {
    if (state.use === 'non-rx' || state.use === 'readers' || uploading()) return null;      // uploaded: the optician reads the power from the file
    return Math.max(...['od', 'os'].map(e => Math.abs(Number(state.rx[e].sph) || 0) + Math.abs(Number(state.rx[e].cyl) || 0)));
  };
  const MATERIALS = () => {
    const ids = (isKids || frame.rim === 'rimless') ? ['poly-159', 'index-161', 'index-167'] : ['index-150', 'index-161', 'index-167'];
    return ids.map(id => OPTS.materials.find(m => m.id === id)).filter(Boolean);
  };
  const EXTRAS = () => ['blue-light', 'light-responsive', isSun ? 'polarized' : 'tint'].map(id => OPTS.coatings.find(c => c.id === id)).filter(Boolean);
  const DEMO_OF = { 'light-responsive': 'sun', 'blue-light': 'blue', 'anti-reflective': 'ar', polarized: 'sun', tint: 'sun' };
  const recommended = () => {
    const mats = MATERIALS();
    if (isKids) return mats.find(m => m.impact) || mats[0];
    const p = maxPower();
    if (p == null) return mats[0];
    return mats.find(m => p <= m.maxPower) || mats[mats.length - 1];
  };
  const opts4 = $('#cfg-opts4');
  function renderLens() {
    const mats = MATERIALS(), rec = recommended();
    if (!state.material || !mats.some(m => m.id === state.material)) state.material = rec.id;
    opts4.innerHTML = mats.map(m => opt('radio', 'material', m, m.id === state.material, rec.id === m.id)).join('')
      + EXTRAS().map(c => opt('checkbox', 'coat', c, state.extras.has(c.id), false, DEMO_OF[c.id] || '')).join('');
    $('#cfg-add > span').textContent = T('cfg.addToCart');
    demoRest();
  }
  bodyEl(4).addEventListener('change', e => {
    if (e.target.name === 'material') state.material = e.target.value;
    if (e.target.name === 'coat') { e.target.checked ? state.extras.add(e.target.value) : state.extras.delete(e.target.value); }
    renderSummaries();
    demoRest();
  });

  // the sample lens: the partial (src/partials/lens_demo.html) or, until it lands, the same drawing built here
  const demoWrap = $('#cfg-demo');
  const DEMO_FALLBACK = `<figure class="lens-demo" data-mode="">
      <svg viewBox="0 0 220 180" role="img" aria-labelledby="demo-cap">
        <defs>
          <clipPath id="demo-clip"><path d="M18 62C18 34 44 22 110 22s92 12 92 40v46c0 34-30 50-92 50S18 142 18 108z"/></clipPath>
          <linearGradient id="demo-glass-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6ded2"/></linearGradient>
          <linearGradient id="demo-glare-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></linearGradient>
          <linearGradient id="demo-prog-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b28834" stop-opacity="0"/><stop offset=".5" stop-color="#b28834" stop-opacity=".08"/><stop offset="1" stop-color="#b28834" stop-opacity=".26"/></linearGradient>
        </defs>
        <path class="demo-glass" d="M18 62C18 34 44 22 110 22s92 12 92 40v46c0 34-30 50-92 50S18 142 18 108z"/>
        <g clip-path="url(#demo-clip)">
          <path class="demo-layer demo-blue" d="M0 0h220v180H0z"/>
          <path class="demo-layer demo-dark" d="M0 0h220v180H0z"/>
          <g class="demo-layer demo-prog"><rect class="zone" x="0" y="0" width="220" height="180"/><path class="zone-line" d="M30 78h160M44 120h132"/>
            <text x="110" y="56" text-anchor="middle" data-i18n="demo.far">Far</text><text x="110" y="104" text-anchor="middle" data-i18n="demo.mid">Middle</text><text x="110" y="148" text-anchor="middle" data-i18n="demo.near">Near</text></g>
          <g class="demo-layer demo-single"><circle cx="110" cy="90" r="9"/><path d="M110 66v16M110 98v16M86 90h16M118 90h16"/>
            <text x="110" y="128" text-anchor="middle" data-i18n="demo.one">One power</text><text x="110" y="144" text-anchor="middle" data-i18n="demo.one2">edge to edge</text></g>
          <ellipse class="demo-glare" cx="66" cy="52" rx="44" ry="13" transform="rotate(-16 66 52)"/>
        </g>
        <path class="demo-edge" d="M18 62C18 34 44 22 110 22s92 12 92 40v46c0 34-30 50-92 50S18 142 18 108z"/>
      </svg>
      <figcaption id="demo-cap"><span class="demo-name" id="demo-name"></span><span class="demo-what" id="demo-what"></span></figcaption>
    </figure>`;
  if (demoWrap && !demoWrap.querySelector('.lens-demo')) demoWrap.innerHTML = DEMO_FALLBACK;
  const demo = demoWrap && demoWrap.querySelector('.lens-demo');
  const demoName = demo && (demo.querySelector('#demo-name') || demo.querySelector('.demo-name'));
  const demoWhat = demo && (demo.querySelector('#demo-what') || demo.querySelector('.demo-what'));
  // what the lens shows when nothing is under the pointer: the extras marked win, then the use
  const restMode = () => (state.extras.has('light-responsive') || state.extras.has('polarized') || state.extras.has('tint')) ? 'sun'
    : state.extras.has('blue-light') ? 'blue' : state.use === 'progressive' ? 'progressive' : state.use === 'non-rx' ? 'ar' : 'single';
  const restName = () => {
    const m = restMode();
    const id = m === 'sun' ? ['light-responsive', 'polarized', 'tint'].find(x => state.extras.has(x)) : m === 'blue' ? 'blue-light' : m === 'ar' ? 'anti-reflective' : null;
    return id ? loc(OPTS.coatings.find(c => c.id === id)).name : loc(OPTS.uses.find(u => u.id === state.use)).name;
  };
  let demoCur = '';
  function setDemo(mode, name) {
    if (!demo) return;
    if (mode !== demoCur && window.hoeMotion && !reduced.matches && demo.querySelector('figcaption')) demo.querySelector('figcaption').animate([{ opacity: .4 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
    demoCur = mode;
    demo.dataset.mode = mode;
    demoWrap.dataset.mode = mode;
    if (demoName) demoName.textContent = name || '';
    if (demoWhat) demoWhat.textContent = T('cfg.demo.' + mode);
  }
  function demoRest() { setDemo(restMode(), restName()); }
  // the option under the pointer (or focused) previews its lens; leaving goes back to what is marked
  opts4.addEventListener('pointerover', e => { const row = e.target.closest('[data-demo]'); if (row && fine.matches) setDemo(row.dataset.demo, row.querySelector('b').textContent); });
  opts4.addEventListener('pointerleave', () => { if (fine.matches) demoRest(); });
  opts4.addEventListener('focusin', e => { const row = e.target.closest('[data-demo]'); if (row && e.target.matches(':focus-visible')) setDemo(row.dataset.demo, row.querySelector('b').textContent); });
  opts4.addEventListener('focusout', e => { if (!opts4.contains(e.relatedTarget)) demoRest(); });

  // ---- bar, summaries, flow ----
  function renderBar() {
    $('#cfg-bar-name').textContent = `${name} · ${CAT.colorName(frame)}`;
    $('#cfg-bar-price').textContent = `${CAT.price(frame.p)} · ${T('prod.included')}`;
    renderSummaries();
  }
  const fmt = v => (!v || Number(v) === 0 ? '0.00' : (Number(v) > 0 ? '+' : MINUS) + Math.abs(Number(v)).toFixed(2));
  const rxSummary = () => {
    const rx = state.rx;
    if (state.use === 'non-rx') return T('rx.sumNone');
    if (state.use === 'readers') return rx.readers ? fill(T('rx.sumReaders'), { p: rx.readers }) : '';
    const pd = rx.pd.kind === 'one' ? `${T('rx.pd')} ${rx.pd.total}` : `${T('rx.pd')} ${rx.pd.od}/${rx.pd.os}`;
    if (uploading()) return `${T('rx.sumUploaded')} · ${pd}`;
    return `${T('rx.od')} ${fmt(rx.od.sph)} / ${T('rx.os')} ${fmt(rx.os.sph)} · ${pd}`;
  };
  const useName = () => loc(OPTS.uses.find(u => u.id === state.use)).name;
  const matName = () => { const m = OPTS.materials.find(x => x.id === state.material); return m ? loc(m).name : ''; };
  const extrasNames = () => [...state.extras].map(id => loc(OPTS.coatings.find(c => c.id === id)).name);
  function renderSummaries() {
    $('#cfg-sum1').textContent = state.done[1] && state.zip ? `${state.zip} · ${state.st}` : '';
    $('#cfg-sum2').textContent = state.done[2] ? useName() : '';
    $('#cfg-sum3').textContent = state.done[3] ? rxSummary() : '';
    $('#cfg-sum4').textContent = state.done[4] ? [matName(), ...extrasNames()].filter(Boolean).join(' · ') : '';
    STEPS.forEach(n => stepEl(n).classList.toggle('is-done', !!state.done[n]));
  }
  // Scroll so `el` sits just under the compact header + the sticky bar (the target is re-read every frame, so the
  // step still lands right while the previous one collapses).
  let scrollRaf = 0;
  const chromeOffset = () => {
    const hdr = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-compact')) || 64;
    return hdr + ($('#cfg-bar').offsetHeight || 56) + 8;
  };
  function scrollToStep(el) {
    const target = () => Math.max(0, el.getBoundingClientRect().top + window.scrollY - chromeOffset());
    cancelAnimationFrame(scrollRaf); scrollRaf = 0;
    if (reduced.matches) { window.scrollTo({ top: target(), behavior: 'instant' }); return; }
    const t0 = performance.now(); let last = t0;
    const root = document.documentElement;
    root.style.overflowAnchor = document.body.style.overflowAnchor = 'none';
    const stop = () => { cancelAnimationFrame(scrollRaf); scrollRaf = 0; root.style.overflowAnchor = document.body.style.overflowAnchor = ''; window.removeEventListener('wheel', stop); window.removeEventListener('touchstart', stop); };
    window.addEventListener('wheel', stop, { passive: true, once: true }); window.addEventListener('touchstart', stop, { passive: true, once: true });
    const tick = now => {
      const dt = Math.min(48, now - last); last = now;
      const to = target(), y = window.scrollY, diff = to - y;
      window.scrollTo({ top: Math.abs(diff) < .5 ? to : y + diff * (1 - Math.exp(-dt / 80)), behavior: 'instant' });
      const settled = Math.abs(to - window.scrollY) < .5 && now - t0 > 340;
      if (!settled && now - t0 < 1200) scrollRaf = requestAnimationFrame(tick); else stop();
    };
    scrollRaf = requestAnimationFrame(tick);
  }
  function openStep(n, focus = true) {
    STEPS.forEach(i => { if (i !== n) steps.close(stepEl(i)); });
    const d = stepEl(n);
    if (!d.open) d.open = true;
    if (focus) setTimeout(() => { scrollToStep(d); d.querySelector('select, input:not(:disabled), button')?.focus({ preventScroll: true }); }, 60);
  }
  function showErrs(n, errs) {
    const box = $('#cfg-errs' + n); if (!box) return;
    box.hidden = !errs.length;
    box.innerHTML = errs.length ? `<ul>${errs.map(e => `<li>${e}</li>`).join('')}</ul>` : '';
    if (errs.length) box.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'auto' : 'smooth' });
  }
  $('#cfg-form').addEventListener('click', e => {
    const b = e.target.closest('[data-next]'); if (!b) return;
    const n = Number(b.dataset.next);
    const errs = n === 1 ? validateZip() : n === 3 ? validateRx() : [];
    showErrs(n, errs);
    if (errs.length) return;
    state.done[n] = true;
    if (n === 1) commitZip();
    renderSummaries();
    openStep(n + 1);
  });
  // a summary click re-opens a step for editing (the others close)
  $('#cfg-form').addEventListener('click', e => {
    const sum = e.target.closest('details.cfg-step > summary'); if (!sum) return;
    const d = sum.parentElement;
    if (!d.open) STEPS.forEach(i => { if (stepEl(i) !== d) steps.close(stepEl(i)); });
  });

  // the configurator is always on the page (four closed rows under "Details"); .is-active = a step is open (the bar shows)
  const openStepN = () => STEPS.find(n => stepEl(n).open) || 0;
  const syncActive = () => { const on = !!openStepN(); cfg.classList.toggle('is-active', on); cta.setAttribute('aria-expanded', on ? 'true' : 'false'); };
  STEPS.forEach(n => stepEl(n).addEventListener('toggle', syncActive));
  function openCfg(step) {
    cfg.classList.add('is-active');
    cta.setAttribute('aria-expanded', 'true');
    openStep(step || 1, false);
    setTimeout(() => { cfg.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' }); stepEl(step || 1).querySelector('summary').focus({ preventScroll: true }); }, 40);
  }
  cta.addEventListener('click', () => { if (!openStepN()) openCfg(1); else cfg.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' }); });

  // ---- add to cart (from step 4): the button says "Added ✓" for 1.2 s and the cart drawer opens ----
  const addBtn = $('#cfg-add');
  let addedTimer = 0;
  $('#cfg-form').addEventListener('click', e => {
    if (!e.target.closest('#cfg-add') || !window.hoeCart || addBtn.dataset.busy || !inStock) return;
    const errsZip = validateZip();
    if (errsZip.length) { showErrs(4, [fill(T('cfg.missing'), { n: 1 })]); openStep(1); showErrs(1, errsZip); return; }
    const errsRx = validateRx();
    if (errsRx.length) { showErrs(4, [fill(T('cfg.missing'), { n: 3 })]); openStep(3); showErrs(3, errsRx); return; }
    showErrs(4, []);
    if (window.hoeCart.setShip) window.hoeCart.setShip({ zip: state.zip, state: state.st });
    state.done[1] = state.done[3] = state.done[4] = true;
    const pkg = {
      sku: frame.id, name, colorName: { en: (frame.colRaw && frame.colRaw.en) || frame.col, es: (frame.colRaw && frame.colRaw.es) || (frame.colRaw && frame.colRaw.en) || frame.col },
      colorKey: frame.col, cc: frame.cc, img: CAT.img(frame), price: Number(frame.p) || 0, band: frame.size.band,
      size: { lens: frame.size.lens, bridge: frame.size.bridge, temple: frame.size.temple, total: frame.size.total },
      use: state.use, material: state.material, coatings: [...LOCKED, ...state.extras], rx: rxForCart(),
    };
    if (pkg.use === 'non-rx') pkg.rx = { path: 'none' };
    if (editing) { window.hoeCart.update(editing.id, pkg); location.href = 'carrito.html'; return; }
    window.hoeCart.add(pkg);
    renderSummaries();
    addBtn.dataset.busy = '1';
    addBtn.querySelector('span').textContent = T('cfg.added');
    clearTimeout(addedTimer);
    addedTimer = setTimeout(() => { addBtn.querySelector('span').textContent = T('cfg.addToCart'); delete addBtn.dataset.busy; }, 1200);
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn && cartBtn.getAttribute('aria-expanded') !== 'true') setTimeout(() => cartBtn.click(), 180);
  });

  /* =========================================================
     Second read: the same model in its other colours, then the same shape (the global card)
     ========================================================= */
  const more = $('#pdp-more'), moreGrid = $('#pdp-more-grid');
  let moreList = null;
  function paintMore() {
    if (!more || !window.hoeFrameCard || !moreList) return;
    if (!moreList.length) { more.hidden = true; return; }
    more.hidden = false;
    const cat = frame.cats.find(c => c !== 'sun') || frame.cats[0];
    $('#pdp-more-all').href = 'catalogo.html?cat=' + encodeURIComponent(cat) + '&shape=' + encodeURIComponent(frame.sh);
    moreGrid.innerHTML = moreList.map(f => window.hoeFrameCard(f)).join('');
    delete moreGrid.dataset.revealed;
    if (window.hoeMotion) window.hoeMotion.reveal(moreGrid);
  }
  function renderMore() {
    if (moreList) { paintMore(); return; }
    const ok = f => f && f.id !== frame.id && Number(f.st) > 0;
    Promise.all((frame.v || []).map(s => CAT.byId(s.id))).then(sibsFound => {
      const list = sibsFound.filter(ok);
      if (list.length >= 3) return list.slice(0, 3);
      return CAT.chunk(CAT.catOf(frame.id) || frame.cats[0]).then(chunk => {
        const same = chunk.filter(f => ok(f) && f.sh === frame.sh && !list.includes(f));
        const rest = chunk.filter(f => ok(f) && !list.includes(f) && !same.includes(f));
        return list.concat(same, rest).slice(0, 3);
      });
    }).then(l => { moreList = l; paintMore(); });
  }

  /* ---------- language ---------- */
  document.addEventListener('hoe:lang', () => {
    renderViews(); renderBuy(); renderMore();
    { const open = openStepN(); renderZip(); renderUse(); renderRx(); renderLens(); renderBar(); if (open) stepEl(open).open = true; }
  });

  renderViews(); renderBuy(); renderMore();
  renderZip(); renderUse(); renderRx(); renderLens(); renderBar();   // the steps are rendered closed, ready for a click on any row
  if ((q.get('step') || editing) && inStock) openCfg(Math.min(4, Number(q.get('step')) || 1));
  }
})();
