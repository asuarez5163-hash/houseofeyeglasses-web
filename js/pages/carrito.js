// Carrito (carrito.html): una línea por paquete desde js/cart.js (localStorage 'hoe-cart'): dibujo sobre loseta --paper, nombre,
// color/medida, "Lentes: uso · material", "Receta: OD/OI" con Editar (vuelve a producto.html?id&edit=&step=2), Quitar con
// confirmación en línea; a la derecha el resumen (armazones · lentes · envío · total), un solo botón que abre el aviso honesto
// del pago y "Qué pasa después" en tres líneas.
// Vacío: el par de círculos, una línea, un botón y los tres armazones más vistos (localStorage hoe-view-*) como .fcard.
(() => {
  'use strict';
  const page = document.querySelector('main.cart-page');
  if (!page || !window.hoeCart) return;
  const $ = (s, r = document) => r.querySelector(s);
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const L = () => (window.hoeLang ? window.hoeLang() : 'en');
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const C = window.hoeCart;
  const OPTS = window.HOE_LENS_OPTIONS || { uses: [], materials: [], coatings: [] };
  const loc = o => (o && (o[L()] || o.en)) || { name: '' };
  const find = (kind, id) => OPTS[kind].find(x => x.id === id);
  const LOCKED = new Set(['anti-reflective', 'scratch']);
  const MINUS = '−';
  const s = v => (!v || Number(v) === 0 ? '0.00' : (Number(v) > 0 ? '+' : MINUS) + Math.abs(Number(v)).toFixed(2));

  const list = $('#cart-list');
  let confirming = null;   // id of the line with the "remove?" question open

  const eye = r => (r ? `${s(r.sph)}${Number(r.cyl) ? ` ${s(r.cyl)}×${r.axis || '—'}` : ''}` : '0.00');
  function rxText(it) {
    const rx = it.rx || {};
    if (rx.path === 'none' || it.use === 'non-rx') return T('cart.rxNone');
    if (it.use === 'readers') return fill(T('cart.readers'), { p: rx.readers || '' });
    const pd = rx.pd && rx.pd.total ? `${T('cart.pd')} ${rx.pd.total}` : T('cart.pdStore');
    return `${T('rx.od')} ${eye(rx.od)} / ${T('rx.os')} ${eye(rx.os)} · ${pd}`;
  }
  function line(it) {
    const use = find('uses', it.use), mat = find('materials', it.material);
    const extras = (it.coatings || []).filter(id => !LOCKED.has(id)).map(id => find('coatings', id)).filter(Boolean).map(c => loc(c).name);
    const lenses = [loc(use).name, loc(mat).name, ...extras].filter(Boolean).join(' · ');
    return `<li class="cart-line" data-id="${it.id}">
      <div class="cart-line-art">${window.hoeFrameSVG(it.shape, it.color)}</div>
      <div class="cart-line-main">
        <div class="cart-line-top"><span class="cart-line-name">${T(it.nameKey)}</span><span class="cart-line-price">${T('prod.price.launch')}</span></div>
        <p class="cart-line-meta">${T(it.color.i18nKey)} · ${T('band.' + it.band)} · ${it.size.lens} □ ${it.size.bridge} ${it.size.temple}</p>
        <p class="cart-line-meta"><span class="k">${T('cart.lenses')}:</span> ${lenses}</p>
        <p class="cart-line-meta cart-line-rx"><span class="k">${T('cart.rx')}:</span> <b>${rxText(it)}</b> <a class="cart-line-edit" href="producto.html?id=${it.frameId}&edit=${it.id}&step=2">${T('cart.edit')}</a></p>
        <p class="cart-line-actions"><button type="button" data-ask="${it.id}">${T('cart.remove')}</button></p>
        <p class="cart-confirm" data-confirm="${it.id}"${confirming === it.id ? '' : ' hidden'}><span>${T('cart.removeQ')}</span><button type="button" data-yes="${it.id}">${T('cart.yes')}</button><button type="button" data-no="${it.id}">${T('cart.no')}</button></p>
      </div>
    </li>`;
  }

  // the empty cart is not a hole: the three frames looked at most (localStorage hoe-view-*, producto.js), else the first three
  const seen = $('#cart-seen'), seenGrid = $('#cart-seen-grid');
  function mostViewed() {
    const FR = window.HOE_SAMPLE_FRAMES || [];
    let views = [];
    try { views = FR.map(f => [f, Number(localStorage.getItem('hoe-view-' + f.id) || 0)]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([f]) => f); } catch (e) { views = []; }
    return views.concat(FR.filter(f => !views.includes(f))).slice(0, 3);
  }
  function renderSeen(show) {
    if (!seen || !window.hoeFrameCard) return;
    seen.hidden = !show;
    if (!show) return;
    seenGrid.innerHTML = mostViewed().map(f => window.hoeFrameCard(f)).join('');
    delete seenGrid.dataset.revealed;
    if (window.hoeMotion) window.hoeMotion.reveal(seenGrid);
  }

  const proto = $('#cart-proto');
  function render() {
    const d = C.get();
    const n = d.items.length;
    $('#cart-wrap').hidden = n === 0 || !proto.hidden;
    $('#cart-page-empty').hidden = n > 0 || !proto.hidden;
    renderSeen(n === 0 && proto.hidden);
    list.innerHTML = d.items.map(line).join('');
    // the line under the headline and the first row of the summary carry the count
    $('#cart-count-line').textContent = n === 1 ? T('cart.count1') : fill(T('cart.count'), { n });
    $('#cart-sum-n').textContent = String(n);
    document.title = T('cart.meta');
  }

  list.addEventListener('click', e => {
    const ask = e.target.closest('[data-ask]'); if (ask) { confirming = ask.dataset.ask; const p = $(`[data-confirm="${confirming}"]`); p.hidden = false; p.querySelector('[data-yes]').focus({ preventScroll: true }); return; }
    const no = e.target.closest('[data-no]'); if (no) { confirming = null; $(`[data-confirm="${no.dataset.no}"]`).hidden = true; $(`[data-ask="${no.dataset.no}"]`).focus({ preventScroll: true }); return; }
    const yes = e.target.closest('[data-yes]');
    if (yes) {
      const li = yes.closest('.cart-line');
      confirming = null;
      if (reduced.matches) { C.remove(yes.dataset.yes); return; }
      li.classList.add('is-leaving');
      setTimeout(() => C.remove(yes.dataset.yes), 200);
    }
  });

  // checkout → the honest note
  $('#cart-checkout').addEventListener('click', () => {
    const d = C.get();
    const names = d.items.map(it => `${T(it.nameKey)} (${T(it.color.i18nKey)}, ${T('band.' + it.band)})`).join(', ');
    const msg = L() === 'es' ? `Hola, quiero apartar: ${names}` : `Hi, I’d like to reserve: ${names}`;
    $('#cart-proto-wa').href = 'https://wa.me/17866148629?text=' + encodeURIComponent(msg);
    proto.hidden = false; render();
    setTimeout(() => { proto.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' }); proto.focus({ preventScroll: true }); }, 30);
  });
  $('#cart-proto-back').addEventListener('click', () => { proto.hidden = true; render(); $('#cart-checkout').focus({ preventScroll: true }); });

  document.addEventListener('hoe:cart', render);
  document.addEventListener('hoe:lang', render);
  render();
})();
