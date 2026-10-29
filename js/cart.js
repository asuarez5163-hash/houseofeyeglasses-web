// Carrito compartido: un solo almacén en localStorage ('hoe-cart'), leído por el cajón #cart del encabezado en todas las
// páginas y por carrito.html. Cada paquete = armazón real { sku, name, colorName {en,es}, colorKey, cc, img, price, band, size }
// + lentes { use, material, coatings, rx }. Un ítem sin sku (del prototipo anterior) se descarta al leer, con aviso.
// Nada sale del dispositivo: no hay servidor todavía.
(() => {
  const KEY = 'hoe-cart';
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const L = () => (window.hoeLang ? window.hoeLang() : 'en');
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let dropped = 0;                                              // older items (no sku) removed on this visit

  function read() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      const items = d && Array.isArray(d.items) ? d.items : [];
      const keep = items.filter(i => i && typeof i === 'object' && typeof i.sku === 'string' && i.sku);
      if (keep.length !== items.length) {
        dropped += items.length - keep.length;
        try { localStorage.setItem(KEY, JSON.stringify({ items: keep })); } catch (e) { /* storage blocked */ }
      }
      return { items: keep };
    } catch (e) { return { items: [] }; }
  }
  function write(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage blocked: the cart lives for this page only */ }
    memory = data;
    document.dispatchEvent(new CustomEvent('hoe:cart', { detail: data }));
  }
  let memory = read();
  const get = () => memory;
  const add = item => { const d = get(); item.id = item.id || ('p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)); d.items.push(item); write(d); return item.id; };
  const remove = id => { const d = get(); d.items = d.items.filter(i => i.id !== id); write(d); };
  const update = (id, patch) => { const d = get(); const it = d.items.find(i => i.id === id); if (it) Object.assign(it, patch); write(d); };
  const count = () => get().items.length;
  const total = () => get().items.reduce((a, i) => a + (Number(i.price) || 0), 0);
  const price = n => (window.hoeCatalog ? window.hoeCatalog.price(n) : '$' + n);
  const colorOf = it => { const c = it.colorName; return (c && typeof c === 'object' ? (c[L()] || c.en) : c) || T('color.' + it.colorKey); };
  const lineImg = it => `<span class="cart-mini-img" role="img" aria-label="${esc(it.name)}" style="background-image:url('${esc(it.img)}')"></span>`;

  // the lens options are the single source (js/data/lenses.js); the cart only keeps ids
  const lensName = (kind, id) => {
    const o = window.HOE_LENS_OPTIONS && window.HOE_LENS_OPTIONS[kind] && window.HOE_LENS_OPTIONS[kind].find(x => x.id === id);
    return o ? (o[L()] || o.en).name : id;
  };
  // one line for a saved prescription: "OD −2.00 / OS −1.50 · PD in store"
  const rxLine = (rx, use) => {
    if (!rx || rx.path === 'none' || use === 'non-rx') return T('cart.rxNone');
    if (use === 'readers') return `+${rx.readers || ''}`;
    const s = v => (!v || Number(v) === 0 ? '0.00' : (Number(v) > 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(2));
    const pd = rx.pd && rx.pd.total ? `PD ${rx.pd.total}` : T('cart.pdStore');
    return `${T('rx.od')} ${s(rx.od && rx.od.sph)} / ${T('rx.os')} ${s(rx.os && rx.os.sph)} · ${pd}`;
  };

  // ---------- header drawer ----------
  const drawer = document.getElementById('cart');
  const countEl = document.querySelector('.cart-count');
  let list = null;
  function renderDrawer() {
    const d = get();
    if (countEl) { countEl.textContent = String(d.items.length); countEl.classList.toggle('has-items', d.items.length > 0); }
    if (!drawer) return;
    const empty = drawer.querySelector('.cart-empty');
    if (!list) {
      list = document.createElement('div');
      list.className = 'cart-mini';
      drawer.appendChild(list);
    }
    const warn = dropped ? `<p class="cart-mini-note cart-mini-note--warn">${esc(T('cart.cleaned'))}</p>` : '';
    if (!d.items.length) { if (empty) empty.hidden = false; list.hidden = !dropped; list.innerHTML = warn; return; }
    if (empty) empty.hidden = true;
    list.hidden = false;
    list.innerHTML = `<ul class="cart-mini-list">${d.items.map(it => `
      <li class="cart-mini-line" data-id="${esc(it.id)}">
        <span class="cart-mini-art">${lineImg(it)}</span>
        <span class="cart-mini-meta">
          <b style="font-size:calc(var(--fs-title, 21px) - 2px)">${esc(it.name)}</b>
          <span>${esc(colorOf(it))} · ${esc(T('band.' + it.band))} · ${esc(lensName('uses', it.use))}</span>
          <span class="cart-mini-price">${price(it.price)} · ${esc(T('prod.included'))}</span>
        </span>
        <button type="button" class="cart-mini-x" data-remove="${esc(it.id)}" aria-label="${esc(T('cart.remove'))}: ${esc(it.name)}">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13"/></svg>
        </button>
      </li>`).join('')}</ul>
      <p class="cart-mini-total"><span>${esc(T('cart.total'))}</span><b>${price(total())}</b></p>
      <a class="btn btn-gold cart-mini-go" href="carrito.html"><span>${esc(T('cart.view'))}</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13M11.5 5.5 16 10l-4.5 4.5"/></svg></a>
      ${warn}<p class="cart-mini-note">${esc(T('cart.proto'))}</p>`;
  }
  drawer?.addEventListener('click', e => {
    const b = e.target.closest('[data-remove]');
    if (b) remove(b.dataset.remove);
  });
  document.addEventListener('hoe:cart', renderDrawer);
  document.addEventListener('hoe:lang', renderDrawer);
  // another tab changed the cart
  window.addEventListener('storage', e => { if (e.key === KEY) { memory = read(); renderDrawer(); document.dispatchEvent(new CustomEvent('hoe:cart', { detail: memory })); } });
  renderDrawer();

  window.hoeCart = { get, add, remove, update, count, total, price, colorOf, lensName, rxLine, fill, dropped: () => dropped, KEY };
})();
