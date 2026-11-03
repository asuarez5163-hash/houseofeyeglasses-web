// Carrito compartido: un solo almacén en localStorage ('hoe-cart'), leído por el cajón #cart del encabezado en todas las
// páginas y por carrito.html. Cada paquete = armazón real { sku, name, colorName {en,es}, colorKey, cc, img, price, band, size }
// + lentes { use, material, coatings, rx }. Un ítem sin sku (del prototipo anterior) se descarta al leer, con aviso.
// Pago: window.hoeCart.pay() manda los paquetes (sku + lentes + receta) al Worker de Cloudflare que despliega el Central, que
// cobra EL PRECIO DEL CATÁLOGO PUBLICADO y abre Stripe Checkout; el Central lee el pago en Stripe y lo anota como pedido.
// config() dice si el cobro está abierto y el envío.
(() => {
  const KEY = 'hoe-cart';
  const API = 'https://hoe-pagos.asuarez5163.workers.dev';    // Cloudflare Worker deployed by the Central (scripts/cloudflare/pagos-worker.js)
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const L = () => (window.hoeLang ? window.hoeLang() : 'en');
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let dropped = 0;                                              // older items (no sku) removed on this visit

  // the ZIP (and its state) is one per cart: the visitor gives it in step 1 of the lens configurator; it decides whether the eye doctor is asked for
  const cleanShip = o => (o && typeof o === 'object' && /^\d{5}$/.test(String(o.zip)) && /^[A-Z]{2}$/.test(String(o.state)) ? { zip: String(o.zip), state: String(o.state) } : null);
  function read() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      const items = d && Array.isArray(d.items) ? d.items : [];
      const keep = items.filter(i => i && typeof i === 'object' && typeof i.sku === 'string' && i.sku);
      if (keep.length !== items.length) {
        dropped += items.length - keep.length;
        try { localStorage.setItem(KEY, JSON.stringify({ items: keep })); } catch (e) { /* storage blocked */ }
      }
      return { items: keep, ship: cleanShip(d && d.ship) };
    } catch (e) { return { items: [], ship: null }; }
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
  const clear = () => write({ items: [], ship: get().ship || null });   // the ZIP stays for the next purchase
  const ship = () => get().ship || null;
  const setShip = o => { const s = cleanShip(o); if (!s) return; const d = get(); d.ship = s; write(d); };
  // PD as the cart shows it: "31.5/32" (one per eye), "63" (one number) or '' (not given: the store measures it)
  const pdText = pd => (pd && pd.mode === 'own' ? (pd.kind === 'one' || !(pd.od && pd.os) ? (pd.total || '') : `${pd.od}/${pd.os}`) : '');
  // items that still lack the eye doctor where the ZIP's state asks for it (table: js/data/rx-states.js; loaded by the pages that call this)
  const needsDoc = it => { const sh = ship(), R = window.hoeRxStates; return !!(sh && R && R.strict(sh.state) && (it.use === 'single' || it.use === 'progressive')); };
  const hasDoc = it => { const d = it.rx && it.rx.doc; return !!(d && String(d.name || '').trim().length >= 2 && String(d.phone || '').replace(/\D/g, '').length >= 10); };
  const needsRx = it => it.use === 'single' || it.use === 'progressive';
  const pdMissing = it => needsRx(it) && !pdText(it.rx && it.rx.pd);                  // the PD is always the visitor's own (nobody measures it for them)
  const proofMissing = it => needsDoc(it) && !hasDoc(it);
  const rxIssues = () => get().items.filter(it => pdMissing(it) || proofMissing(it));
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
    const pdt = pdText(rx.pd);
    const pd = pdt ? `PD ${pdt}` : T('cart.pdStore');
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

  // ---------- payment (the Central creates the Stripe Checkout session; the browser only carries the cart) ----------
  const fetchJson = (url, opts, ms) => {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), ms || 8000);
    return fetch(url, Object.assign({ signal: ctl ? ctl.signal : undefined, mode: 'cors', credentials: 'omit' }, opts || {}))
      .then(r => r.json().catch(() => ({})).then(data => { if (!r.ok) { const e = new Error(data.mensaje || ('HTTP ' + r.status)); e.status = r.status; e.data = data; throw e; } return data; }))
      .finally(() => clearTimeout(t));
  };
  let cfgP = null;
  const config = () => cfgP || (cfgP = fetchJson(API + '/config', { method: 'GET' }, 6000).catch(() => null));   // null = the Central did not answer
  // opts.ui = 'elements' → the Worker answers { clientSecret } for the on-site payment page (pago.html); without it, { url } (hosted Stripe Checkout)
  const pay = opts => {
    if (!ship() || rxIssues().length) { const e = new Error('rx'); e.data = { error: 'rx_pendiente' }; return Promise.reject(e); }   // ZIP and (where asked) eye doctor are required before paying
    const items = get().items.map(it => ({ id: it.id, sku: it.sku, price: it.price, use: it.use, material: it.material, coatings: it.coatings || [], rx: it.rx || { path: 'none' } }));
    const body = { items, lang: L(), ship: ship() };
    if (opts && opts.ui) body.ui = opts.ui;
    return fetchJson(API + '/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 20000);
  };
  const order = sid => fetchJson(API + '/pedido?s=' + encodeURIComponent(sid), { method: 'GET' }, 20000);

  window.hoeCart = { get, add, remove, update, clear, count, total, price, colorOf, lensName, rxLine, fill, ship, setShip, pdText, rxIssues, pdMissing, proofMissing, dropped: () => dropped, KEY, API, config, pay, order };
})();
