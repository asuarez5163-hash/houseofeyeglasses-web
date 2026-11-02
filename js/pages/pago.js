// Pago (pago.html): el pago dentro de la web. Pide al Worker una sesión de Stripe Checkout con ui_mode "elements"
// (hoeCart.pay({ ui: 'elements' }) → { clientSecret }), la monta con Stripe.js (initCheckoutElementsSdk): Contact Details +
// Shipping Address + Payment Element, con el tema oscuro/dorado de la web (Appearance API). confirm() manda a gracias.html?s=<cs_…>
// (return_url de la sesión). El precio lo cobra el Worker desde el catálogo publicado; aquí el resumen sale del carrito y el total
// definitivo lo da la sesión de Stripe.
// Salidas: carrito vacío → carrito.html · Worker viejo que responde { url } → Stripe Checkout alojado · 409/400 (precio cambió /
// armazón ya no está) → el carrito se corrige y se vuelve a carrito.html con el aviso · cualquier otro fallo → pantalla "No pudimos abrir el pago".
(() => {
  'use strict';
  const page = document.querySelector('main.pay-page');
  if (!page || !window.hoeCart) return;
  const $ = (s, r = document) => r.querySelector(s);
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const L = () => (window.hoeLang ? window.hoeLang() : 'en');
  const esc = s => (window.hoeEsc ? window.hoeEsc(s) : String(s == null ? '' : s));
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  const C = window.hoeCart;

  const form = $('#pay-form'), submit = $('#pay-submit'), submitT = $('#pay-submit-t'), msg = $('#pay-msg');
  const fail = $('#pay-fail');
  let cfg = null, session = null, actions = null, checkout = null, starting = false, paying = false;

  // ---------- summary (from the cart; the session total replaces the number once Stripe answers) ----------
  const shipping = () => (cfg && cfg.pagos ? Number(cfg.envio) || 0 : 0);
  function paintSummary() {
    const items = C.get().items;
    $('#pay-lines').innerHTML = items.map(it => `<li>
      <span class="pay-line-art"><span class="pay-line-img" role="img" aria-label="${esc(it.name)}" style="background-image:url('${esc(it.img)}')"></span></span>
      <span class="pay-line-main"><span class="pay-line-name">${esc(it.name)}</span><span class="pay-line-meta">${esc(C.colorOf(it))}${it.cc ? ` · ${esc(it.cc)}` : ''} · ${esc(C.lensName('uses', it.use))}</span></span>
      <span class="pay-line-price">${C.price(it.price)}</span></li>`).join('');
    $('#pay-sum-n').textContent = String(items.length);
    const ship = $('#pay-sum-ship');
    if (!cfg) ship.textContent = T('cart.shipCalc');
    else ship.textContent = shipping() ? C.price(shipping()) : T('cart.shipFree');
    $('#pay-sum-total').textContent = session && session.total && session.total.total && session.total.total.amount ? session.total.total.amount : C.price(C.total() + shipping());
    paintSubmit();
    document.title = T('pay.meta');
  }
  function paintSubmit() {
    const amount = session && session.total && session.total.total && session.total.total.amount;
    submitT.textContent = paying ? T('pay.paying') : (amount ? fill(T('pay.payAmount'), { amount }) : T('pay.pay'));
    submit.disabled = paying || !actions || !(session && session.canConfirm);
    submit.setAttribute('aria-busy', paying ? 'true' : 'false');
  }
  const say = txt => { msg.hidden = !txt; msg.textContent = txt || ''; };

  // ---------- Stripe Appearance: the site's night + gold, hairline inputs, radius 0 ----------
  const appearance = {
    theme: 'night',
    variables: {
      colorPrimary: '#c9a35a', colorBackground: '#121214', colorText: '#f4f2ee', colorTextSecondary: '#b9b5ad', colorTextPlaceholder: '#7d7a74',
      colorDanger: '#e08a7c', colorIcon: '#c9a35a', fontFamily: 'Jost, "Avenir Next", Futura, sans-serif', fontSizeBase: '16px', fontWeightNormal: '300',
      borderRadius: '0px', spacingUnit: '4px', spacingGridRow: '18px', focusBoxShadow: 'none', focusOutline: 'none',
    },
    rules: {
      '.Label': { fontSize: '12px', fontWeight: '500', letterSpacing: '.18em', textTransform: 'uppercase', color: '#b9b5ad' },
      '.Input': { backgroundColor: 'rgba(255,255,255,.03)', border: '1px solid rgba(244,242,238,.18)', boxShadow: 'none', padding: '13px 14px' },
      '.Input:focus': { border: '1px solid #c9a35a', boxShadow: 'none', outline: 'none' },
      '.Input--invalid': { border: '1px solid #e08a7c', boxShadow: 'none' },
      '.Error': { fontSize: '13px', color: '#e08a7c' },
      '.Tab': { backgroundColor: 'rgba(255,255,255,.03)', border: '1px solid rgba(244,242,238,.18)', boxShadow: 'none' },
      '.Tab:hover': { border: '1px solid #c9a35a', color: '#f4f2ee' },
      '.Tab--selected': { backgroundColor: 'rgba(201,163,90,.10)', border: '1px solid #c9a35a', boxShadow: 'none', color: '#f4f2ee' },
      '.Block': { backgroundColor: 'rgba(255,255,255,.03)', border: '1px solid rgba(244,242,238,.14)', boxShadow: 'none' },
      '.CheckboxInput': { border: '1px solid rgba(244,242,238,.3)', backgroundColor: 'transparent' },
    },
  };
  const FONTS = [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&display=swap' }];

  // ---------- leaving: back to the cart with a note · the "could not open" screen ----------
  function backToCart(key) {
    try { if (key) sessionStorage.setItem('hoe-pay-flash', key); } catch (e) { /* private mode */ }
    location.replace('carrito.html');
  }
  function showFail(whatsappOnly) {
    const items = C.get().items;
    const lines = items.map(it => `• ${it.sku} · ${it.name} · ${C.colorOf(it)}${it.cc ? ` (${it.cc})` : ''} · ${C.price(it.price)}`).join('\n');
    const text = L() === 'es' ? `Hola, quiero apartar:\n${lines}\nTotal: ${C.price(C.total())}` : `Hi, I’d like to reserve:\n${lines}\nTotal: ${C.price(C.total())}`;
    $('#pay-wa').href = 'https://wa.me/17866148629?text=' + encodeURIComponent(text);
    $('#pay-retry').hidden = !!whatsappOnly;
    page.setAttribute('data-failed', '');
    fail.hidden = false;
    setTimeout(() => fail.focus({ preventScroll: false }), 30);
  }

  // ---------- start: config → session → Stripe elements ----------
  async function start() {
    if (starting) return; starting = true;
    page.removeAttribute('data-failed'); fail.hidden = true; say('');
    form.setAttribute('aria-busy', 'true');
    try {
      cfg = await C.config();
      paintSummary();
      if (!cfg || !cfg.pagos) { showFail(true); return; }
      const r = await C.pay({ ui: 'elements' });
      if (r && r.url && !r.clientSecret) { location.replace(r.url); return; }          // the Worker is the old one: the hosted Stripe page still works
      if (!r || !r.clientSecret) throw new Error('sin clientSecret');
      if (typeof window.Stripe !== 'function') throw new Error('Stripe.js no cargó');
      const stripe = window.Stripe(cfg.pk, { locale: L() === 'es' ? 'es' : 'en' });
      checkout = stripe.initCheckoutElementsSdk({ clientSecret: Promise.resolve(r.clientSecret), elementsOptions: { appearance, fonts: FONTS } });
      checkout.on('change', s => { session = s; paintSummary(); });
      checkout.createContactDetailsElement().mount('#pay-contact');
      checkout.createShippingAddressElement().mount('#pay-ship');
      checkout.createPaymentElement().mount('#pay-payment');
      const loaded = await checkout.loadActions();
      if (loaded && loaded.type && loaded.type !== 'success') throw new Error('loadActions ' + loaded.type);
      actions = loaded.actions;
      session = actions && actions.getSession ? actions.getSession() : session;
      form.setAttribute('aria-busy', 'false');
      paintSummary();
    } catch (err) {
      const status = err && err.status, data = (err && err.data) || {};
      if (status === 409 && Array.isArray(data.items)) {
        data.items.forEach(p => C.get().items.filter(it => it.sku === p.sku).forEach(it => C.update(it.id, { price: Number(p.precio) || it.price })));
        backToCart('cart.priceChanged'); return;
      }
      if (status === 400 && data.error === 'no_disponible' && Array.isArray(data.items)) {
        const gone = new Set(data.items.filter(p => p.motivo !== 'precio').map(p => p.sku));
        C.get().items.filter(it => gone.has(it.sku)).forEach(it => C.remove(it.id));
        data.items.filter(p => p.motivo === 'precio').forEach(p => C.get().items.filter(it => it.sku === p.sku).forEach(it => C.update(it.id, { price: Number(p.precio) || it.price })));
        backToCart('cart.unavailable'); return;
      }
      showFail(status === 503 && data.error === 'apagado');
    } finally { starting = false; }
  }

  // ---------- pay: confirm() redirects to the return_url (gracias.html) on success; only an immediate error comes back here ----------
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (paying || !actions) return;
    paying = true; say(''); paintSubmit();
    try {
      const res = await actions.confirm();
      if (res && res.type === 'error') { say((res.error && res.error.message) || T('pay.err')); }
    } catch (err) { say(T('pay.err')); }
    paying = false; paintSubmit();
  });
  $('#pay-retry').addEventListener('click', () => location.reload());
  document.addEventListener('hoe:lang', paintSummary);
  document.addEventListener('hoe:cart', paintSummary);

  if (!C.get().items.length) { location.replace('carrito.html'); return; }
  paintSummary();
  start();
})();
