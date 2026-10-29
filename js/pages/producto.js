// Ficha de armazón (producto.html): la FOTO real del sprite (assets/frames/<SKU>.webp: hasta 3 vistas, pestañas 1 · 2 · 3)
// sobre la loseta --paper 1:1 y la pestaña "Medida" con la patilla dibujada (hoeTempleSVG); al cargar, la primera foto entra
// en foco (GSAP fade + scale; sin GSAP está desde el primer pintado). Variantes = hermanos de color (f.v): cada punto enlaza a
// producto.html?id=<hermano> (su propia URL canónica) y, bajo el puntero, muestra su foto en la vista 1. Precio real + "lentes
// incluidos", stock (st<=0 → agotado, botón deshabilitado, noindex), Details con marca · modelo · código · color · lente ·
// material · forma · aro · medida, JSON-LD Product, y el configurador de lentes en TRES pasos (uso → receta → lentes) con barra
// pegajosa (nombre + precio) y "Agregar al carrito" (el botón dice "Añadido ✓" 1.2 s y se abre el cajón). En el paso 3 la lente
// de muestra (partial lens_demo, .cfg-demo) reacciona a la opción marcada o bajo el puntero.
// Debajo, "También te pueden gustar": el mismo modelo en otros colores y luego la misma forma (window.hoeFrameCard).
// Datos: js/catalog.js (hoeCatalog.byId: el chunk sale de la letra del SKU), js/data/lenses.js (opciones), js/cart.js (carrito).
// La receta nunca se "manda después de pagar": se escribe aquí y la revisa el óptico antes de que el laboratorio empiece.
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

  const freshRx = () => ({ path: 'now', od: { sph: '0.00', cyl: '0.00', axis: '' }, os: { sph: '0.00', cyl: '0.00', axis: '' }, add: '', pd: { mode: 'store', total: '' }, confirm: false, readers: '' });
  const loadRx = src => {   // a saved package (maybe from an older shape of the form) → today's shape
    const rx = freshRx();
    if (!src || typeof src !== 'object') return rx;
    ['od', 'os'].forEach(e => { if (src[e]) { rx[e].sph = src[e].sph || '0.00'; rx[e].cyl = src[e].cyl || '0.00'; rx[e].axis = src[e].axis || ''; } });
    rx.add = src.add || (src.od && src.od.add) || '';
    if (src.pd) { rx.pd.mode = src.pd.mode === 'store' || !src.pd.total ? 'store' : 'own'; rx.pd.total = src.pd.total || ''; }
    rx.confirm = !!src.confirm;
    rx.readers = src.readers || '';
    return rx;
  };
  const state = {
    use: editing ? editing.use : 'single',
    material: editing ? editing.material : null,
    extras: new Set(editing ? (editing.coatings || []).filter(id => !LOCKED.includes(id)) : []),
    rx: loadRx(editing && editing.rx),
    done: { 1: !!editing, 2: !!editing, 3: !!editing },
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

  // ---- step 1: use (picking one moves on to the prescription) ----
  const USES = () => OPTS.uses.filter(u => !(isSun && u.id === 'readers'));
  function renderStep1() {
    bodyEl(1).innerHTML = `<div class="cfg-body-in"><div class="cfg-opts">${USES().map(u => opt('radio', 'use', u, u.id === state.use)).join('')}</div></div>`;
  }
  bodyEl(1).addEventListener('click', e => {
    const r = e.target.closest('input[name="use"]'); if (!r) return;
    if (state.use !== r.value) { state.use = r.value; state.material = null; renderStep2(); renderStep3(); }
    state.done[1] = true;
    renderBar();
    openStep(2);
  });

  // ---- step 2: prescription ----
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
  function renderStep2() {
    const rx = state.rx;
    let inner = '';
    if (state.use === 'non-rx') {
      inner = `<p class="rxf-none">${T('rx.none')}</p>`;
    } else if (state.use === 'readers') {
      inner = `<div class="rx-field rxf-one"><label for="rx-readers">${T('rx.readers')}</label><select class="rx-select" id="rx-readers">${addOptions(rx.readers)}</select></div>`;
    } else {
      const own = rx.pd.mode === 'own';
      inner = `${eyeRow('od')}${eyeRow('os')}
        ${state.use === 'progressive' ? `<div class="rx-field rxf-one"><label for="rx-add">${T('rx.add')}</label><select class="rx-select" id="rx-add">${addOptions(rx.add)}</select></div>` : ''}
        <div class="rxf-pd" role="radiogroup" aria-label="${T('rx.pd')}">
          <span class="rxf-pd-lbl">${T('rx.pd')}</span>
          <label class="rxf-pd-opt" data-press><input type="radio" name="pdmode" value="store"${own ? '' : ' checked'}><span class="dot"></span><span>${T('rx.pdStore')}</span></label>
          <span class="rxf-pd-own"><label class="rxf-pd-opt" data-press><input type="radio" name="pdmode" value="own"${own ? ' checked' : ''}><span class="dot"></span><span>${T('rx.pdOwn')}</span></label>
          <input class="rx-input rxf-pd-in" id="rx-pd" type="text" inputmode="decimal" maxlength="4" autocomplete="off" aria-label="${T('rx.pd')} (mm)" placeholder="mm" value="${rx.pd.total}"${own ? '' : ' disabled'}></span>
        </div>
        <label class="rxf-confirm" data-press><input type="checkbox" id="rx-confirm"${rx.confirm ? ' checked' : ''}><span class="dot"></span><span>${T('rx.confirm')}</span></label>
        <p class="rxf-help"><a class="link-u" href="receta.html">${T('rx.howTo')}</a></p>`;
    }
    bodyEl(2).innerHTML = `<div class="cfg-body-in">${inner}${errBox(2)}${nextBtn(2)}</div>`;
  }
  function validateStep2() {
    const rx = state.rx, errs = [];
    if (state.use === 'non-rx') return errs;
    if (state.use === 'readers') { if (!rx.readers) errs.push(T('rx.errReaders')); return errs; }
    ['od', 'os'].forEach(e => { const r = rx[e]; if (Number(r.cyl) !== 0 && !(/^\d{1,3}$/.test(r.axis) && Number(r.axis) >= 1 && Number(r.axis) <= 180)) errs.push(fill(T('rx.errAxis'), { eye: T('rx.' + e) })); });
    if (state.use === 'progressive' && !rx.add) errs.push(T('rx.errAdd'));
    if (rx.pd.mode === 'own') { const v = Number(String(rx.pd.total).replace(',', '.')); if (!(v >= 40 && v <= 80)) errs.push(T('rx.errPd')); }
    if (!rx.confirm) errs.push(T('rx.errConfirm'));
    return errs;
  }
  bodyEl(2).addEventListener('change', e => {
    const el = e.target, rx = state.rx;
    if (el.name === 'pdmode') { rx.pd.mode = el.value; const i = $('#rx-pd'); i.disabled = el.value !== 'own'; if (el.value === 'own') i.focus({ preventScroll: true }); else { i.value = ''; rx.pd.total = ''; } return; }
    if (el.dataset.eye) {
      rx[el.dataset.eye][el.dataset.f] = el.value;
      if (el.dataset.f === 'cyl') { const ax = $(`#rx-${el.dataset.eye}-axis`); const on = Number(el.value) !== 0; ax.disabled = !on; ax.placeholder = on ? '1–180' : '—'; if (!on) { ax.value = ''; rx[el.dataset.eye].axis = ''; } }
      renderStep3();
    }
    if (el.id === 'rx-add') rx.add = el.value;
    if (el.id === 'rx-pd') rx.pd.total = el.value.trim();
    if (el.id === 'rx-confirm') rx.confirm = el.checked;
    if (el.id === 'rx-readers') rx.readers = el.value;
  });
  bodyEl(2).addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.f === 'axis') { const clean = el.value.replace(/\D/g, '').slice(0, 3); if (clean !== el.value) el.value = clean; state.rx[el.dataset.eye].axis = clean; }
    if (el.id === 'rx-pd') { const clean = el.value.replace(/[^\d.,]/g, '').slice(0, 4); if (clean !== el.value) el.value = clean; state.rx.pd.total = clean; }
  });
  // typing in the PD box picks "I have it"
  bodyEl(2).addEventListener('focusin', e => { if (e.target.id === 'rx-pd' && state.rx.pd.mode !== 'own') { state.rx.pd.mode = 'own'; const r = $('input[name="pdmode"][value="own"]'); if (r) r.checked = true; } });

  // ---- step 3: lenses (material + extras in one list) + the sample lens ----
  const maxPower = () => {
    if (state.use === 'non-rx' || state.use === 'readers') return null;
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
  const opts3 = $('#cfg-opts3');
  function renderStep3() {
    const mats = MATERIALS(), rec = recommended();
    if (!state.material || !mats.some(m => m.id === state.material)) state.material = rec.id;
    opts3.innerHTML = mats.map(m => opt('radio', 'material', m, m.id === state.material, rec.id === m.id)).join('')
      + EXTRAS().map(c => opt('checkbox', 'coat', c, state.extras.has(c.id), false, DEMO_OF[c.id] || '')).join('');
    $('#cfg-add > span').textContent = T('cfg.addToCart');
    demoRest();
  }
  bodyEl(3).addEventListener('change', e => {
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
  opts3.addEventListener('pointerover', e => { const row = e.target.closest('[data-demo]'); if (row && fine.matches) setDemo(row.dataset.demo, row.querySelector('b').textContent); });
  opts3.addEventListener('pointerleave', () => { if (fine.matches) demoRest(); });
  opts3.addEventListener('focusin', e => { const row = e.target.closest('[data-demo]'); if (row && e.target.matches(':focus-visible')) setDemo(row.dataset.demo, row.querySelector('b').textContent); });
  opts3.addEventListener('focusout', e => { if (!opts3.contains(e.relatedTarget)) demoRest(); });

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
    const pd = rx.pd.mode === 'own' && rx.pd.total ? `${T('rx.pd')} ${rx.pd.total}` : T('rx.sumPdStore');
    return `${T('rx.od')} ${fmt(rx.od.sph)} / ${T('rx.os')} ${fmt(rx.os.sph)} · ${pd}`;
  };
  const useName = () => loc(OPTS.uses.find(u => u.id === state.use)).name;
  const matName = () => { const m = OPTS.materials.find(x => x.id === state.material); return m ? loc(m).name : ''; };
  const extrasNames = () => [...state.extras].map(id => loc(OPTS.coatings.find(c => c.id === id)).name);
  function renderSummaries() {
    $('#cfg-sum1').textContent = state.done[1] ? useName() : '';
    $('#cfg-sum2').textContent = state.done[2] ? rxSummary() : '';
    $('#cfg-sum3').textContent = state.done[3] ? [matName(), ...extrasNames()].filter(Boolean).join(' · ') : '';
    [1, 2, 3].forEach(n => stepEl(n).classList.toggle('is-done', !!state.done[n]));
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
    [1, 2, 3].forEach(i => { if (i !== n) steps.close(stepEl(i)); });
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
    const errs = n === 2 ? validateStep2() : [];
    showErrs(n, errs);
    if (errs.length) return;
    state.done[n] = true;
    renderSummaries();
    openStep(n + 1);
  });
  // a summary click re-opens a step for editing (the others close)
  $('#cfg-form').addEventListener('click', e => {
    const sum = e.target.closest('details.cfg-step > summary'); if (!sum) return;
    const d = sum.parentElement;
    if (!d.open) [1, 2, 3].forEach(i => { if (stepEl(i) !== d) steps.close(stepEl(i)); });
  });

  // the configurator is always on the page (three closed rows under "Details"); .is-active = a step is open (the bar shows)
  const openStepN = () => [1, 2, 3].find(n => stepEl(n).open) || 0;
  const syncActive = () => { const on = !!openStepN(); cfg.classList.toggle('is-active', on); cta.setAttribute('aria-expanded', on ? 'true' : 'false'); };
  [1, 2, 3].forEach(n => stepEl(n).addEventListener('toggle', syncActive));
  function openCfg(step) {
    cfg.classList.add('is-active');
    cta.setAttribute('aria-expanded', 'true');
    openStep(step || 1, false);
    setTimeout(() => { cfg.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' }); stepEl(step || 1).querySelector('summary').focus({ preventScroll: true }); }, 40);
  }
  cta.addEventListener('click', () => { if (!openStepN()) openCfg(1); else cfg.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' }); });

  // ---- add to cart (from step 3): the button says "Added ✓" for 1.2 s and the cart drawer opens ----
  const addBtn = $('#cfg-add');
  let addedTimer = 0;
  $('#cfg-form').addEventListener('click', e => {
    if (!e.target.closest('#cfg-add') || !window.hoeCart || addBtn.dataset.busy || !inStock) return;
    const errs2 = validateStep2();
    if (errs2.length) { showErrs(3, [fill(T('cfg.missing'), { n: 2 })]); openStep(2); showErrs(2, errs2); return; }
    showErrs(3, []);
    state.done[2] = state.done[3] = true;
    const pkg = {
      sku: frame.id, name, colorName: { en: (frame.colRaw && frame.colRaw.en) || frame.col, es: (frame.colRaw && frame.colRaw.es) || (frame.colRaw && frame.colRaw.en) || frame.col },
      colorKey: frame.col, cc: frame.cc, img: CAT.img(frame), price: Number(frame.p) || 0, band: frame.size.band,
      size: { lens: frame.size.lens, bridge: frame.size.bridge, temple: frame.size.temple, total: frame.size.total },
      use: state.use, material: state.material, coatings: [...LOCKED, ...state.extras], rx: JSON.parse(JSON.stringify(state.rx)),
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
    { const open = openStepN(); renderStep1(); renderStep2(); renderStep3(); renderBar(); if (open) stepEl(open).open = true; }
  });

  renderViews(); renderBuy(); renderMore();
  renderStep1(); renderStep2(); renderStep3(); renderBar();          // the steps are rendered closed, ready for a click on any row
  if ((q.get('step') || editing) && inStock) openCfg(Math.min(3, Number(q.get('step')) || 1));
  }
})();
