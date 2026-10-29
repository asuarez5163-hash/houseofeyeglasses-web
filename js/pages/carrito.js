// Carrito (carrito.html): una línea por paquete desde js/cart.js (localStorage 'hoe-cart'): la foto del armazón (vista 1 del
// sprite) sobre loseta --paper, nombre, color · código · medida, precio real, "Lentes: uso · material", "Receta: OD/OI" con
// Editar (vuelve a producto.html?id=<sku>&edit=&step=2), Quitar con confirmación en línea; a la derecha el resumen (armazones ·
// lentes · envío · TOTAL real), un solo botón que abre el aviso honesto (no hay pasarela: WhatsApp con SKU · nombre · color ·
// precio) y "Qué pasa después" en tres líneas.
// Vacío: el par de círculos, una línea, un botón y los tres armazones más vistos (localStorage hoe-view-<sku>) como .fcard.
(() => {
  'use strict';
  const page = document.querySelector('main.cart-page');
  if (!page || !window.hoeCart) return;
  const $ = (s, r = document) => r.querySelector(s);
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const L = () => (window.hoeLang ? window.hoeLang() : 'en');
  const esc = s => (window.hoeEsc ? window.hoeEsc(s) : String(s));
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const C = window.hoeCart;
  const CAT = window.hoeCatalog;
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
  const sizeOf = it => (it.size ? `${it.size.lens} □ ${it.size.bridge} ${it.size.temple}` : '');
  function line(it) {
    const use = find('uses', it.use), mat = find('materials', it.material);
    const extras = (it.coatings || []).filter(id => !LOCKED.has(id)).map(id => find('coatings', id)).filter(Boolean).map(c => loc(c).name);
    const lenses = [loc(use).name, loc(mat).name, ...extras].filter(Boolean).join(' · ');
    return `<li class="cart-line" data-id="${esc(it.id)}">
      <div class="cart-line-art"><span class="cart-line-img" role="img" aria-label="${esc(it.name)}" style="background-image:url('${esc(it.img)}')"></span></div>
      <div class="cart-line-main">
        <div class="cart-line-top"><span class="cart-line-name">${esc(it.name)}</span><span class="cart-line-price">${C.price(it.price)}</span></div>
        <p class="cart-line-meta">${esc(C.colorOf(it))}${it.cc ? ` · ${esc(it.cc)}` : ''} · ${esc(T('band.' + it.band))} · ${esc(sizeOf(it))}</p>
        <p class="cart-line-meta"><span class="k">${T('cart.lenses')}:</span> ${esc(lenses)} · ${esc(T('prod.included'))}</p>
        <p class="cart-line-meta cart-line-rx"><span class="k">${T('cart.rx')}:</span> <b>${esc(rxText(it))}</b> <a class="cart-line-edit" href="producto.html?id=${encodeURIComponent(it.sku)}&edit=${encodeURIComponent(it.id)}&step=2">${T('cart.edit')}</a></p>
        <p class="cart-line-actions"><button type="button" data-ask="${esc(it.id)}">${T('cart.remove')}</button></p>
        <p class="cart-confirm" data-confirm="${esc(it.id)}"${confirming === it.id ? '' : ' hidden'}><span>${T('cart.removeQ')}</span><button type="button" data-yes="${esc(it.id)}">${T('cart.yes')}</button><button type="button" data-no="${esc(it.id)}">${T('cart.no')}</button></p>
      </div>
    </li>`;
  }

  // the empty cart is not a hole: the three frames looked at most (localStorage hoe-view-<sku>, producto.js), else the best sellers
  const seen = $('#cart-seen'), seenGrid = $('#cart-seen-grid');
  let seenList = null;
  function mostViewed() {
    if (!CAT) return Promise.resolve([]);
    const views = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('hoe-view-')) views.push([k.slice(9), Number(localStorage.getItem(k)) || 0]); } } catch (e) { /* per visit */ }
    const top = views.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
    return Promise.all(top.map(id => CAT.byId(id))).then(found => {
      const ok = found.filter(f => f && Number(f.st) > 0).slice(0, 3);
      if (ok.length >= 3) return ok;
      return CAT.featured().then(f => ok.concat(f.filter(x => !ok.includes(x))).slice(0, 3));   // fewer than three seen: the best sellers fill the row
    });
  }
  function paintSeen() {
    if (!seenList || !seenList.length) { seen.hidden = true; return; }
    seen.hidden = false;
    seenGrid.innerHTML = seenList.map(f => window.hoeFrameCard(f)).join('');
    delete seenGrid.dataset.revealed;
    if (window.hoeMotion) window.hoeMotion.reveal(seenGrid);
  }
  function renderSeen(show) {
    if (!seen || !window.hoeFrameCard) return;
    if (!show) { seen.hidden = true; return; }
    if (seenList) { paintSeen(); return; }
    mostViewed().then(l => { seenList = l; paintSeen(); });
  }

  const proto = $('#cart-proto');
  function render() {
    const d = C.get();
    const n = d.items.length;
    $('#cart-wrap').hidden = n === 0 || !proto.hidden;
    $('#cart-page-empty').hidden = n > 0 || !proto.hidden;
    renderSeen(n === 0 && proto.hidden);
    list.innerHTML = d.items.map(line).join('');
    // the line under the headline and the first row of the summary carry the count; the total is the sum of the real prices
    $('#cart-count-line').textContent = n === 1 ? T('cart.count1') : fill(T('cart.count'), { n });
    $('#cart-sum-n').textContent = String(n);
    $('#cart-sum-total-v').textContent = C.price(C.total());
    const cleaned = $('#cart-cleaned'); if (cleaned) { cleaned.hidden = !C.dropped(); cleaned.textContent = T('cart.cleaned'); }
    const emptyNote = $('#cart-empty-cleaned'); if (emptyNote) { emptyNote.hidden = !C.dropped(); emptyNote.textContent = T('cart.cleaned'); }
    document.title = T('cart.meta');
  }

  list.addEventListener('click', e => {
    const ask = e.target.closest('[data-ask]'); if (ask) { confirming = ask.dataset.ask; const p = $(`[data-confirm="${CSS.escape(confirming)}"]`); p.hidden = false; p.querySelector('[data-yes]').focus({ preventScroll: true }); return; }
    const no = e.target.closest('[data-no]'); if (no) { confirming = null; $(`[data-confirm="${CSS.escape(no.dataset.no)}"]`).hidden = true; $(`[data-ask="${CSS.escape(no.dataset.no)}"]`).focus({ preventScroll: true }); return; }
    const yes = e.target.closest('[data-yes]');
    if (yes) {
      const li = yes.closest('.cart-line');
      confirming = null;
      if (reduced.matches) { C.remove(yes.dataset.yes); return; }
      li.classList.add('is-leaving');
      setTimeout(() => C.remove(yes.dataset.yes), 200);
    }
  });

  // checkout → the honest note: the WhatsApp message carries SKU · name · colour · price per line and the total
  $('#cart-checkout').addEventListener('click', () => {
    const d = C.get();
    const lines = d.items.map(it => `• ${it.sku} · ${it.name} · ${C.colorOf(it)}${it.cc ? ` (${it.cc})` : ''} · ${C.price(it.price)}`).join('\n');
    const msg = L() === 'es'
      ? `Hola, quiero apartar:\n${lines}\nTotal: ${C.price(C.total())}`
      : `Hi, I’d like to reserve:\n${lines}\nTotal: ${C.price(C.total())}`;
    $('#cart-proto-wa').href = 'https://wa.me/17866148629?text=' + encodeURIComponent(msg);
    proto.hidden = false; render();
    setTimeout(() => { proto.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' }); proto.focus({ preventScroll: true }); }, 30);
  });
  $('#cart-proto-back').addEventListener('click', () => { proto.hidden = true; render(); $('#cart-checkout').focus({ preventScroll: true }); });

  document.addEventListener('hoe:cart', render);
  document.addEventListener('hoe:lang', render);
  render();
})();
