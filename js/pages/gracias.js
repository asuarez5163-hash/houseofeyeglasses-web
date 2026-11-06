// Gracias (gracias.html): vuelta de Stripe Checkout. Lee ?s=<cs_…>, pide al Worker GET /pedido?s=… (hoeCart.order) y pinta
// uno de tres estados: confirmando · confirmado (referencia del pago, líneas, total, qué pasa después; vacía el carrito) ·
// sin confirmar (reintenta solo 4 veces cada 3 s; botón "Comprobar de nuevo"; WhatsApp). Sin ?s= válido: "nada que mostrar".
(() => {
  'use strict';
  const page = document.querySelector('main.thanks-page');
  if (!page || !window.hoeCart) return;
  const $ = (s, r = document) => r.querySelector(s);
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const esc = s => (window.hoeEsc ? window.hoeEsc(s) : String(s == null ? '' : s));
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  const C = window.hoeCart;
  const sid = new URLSearchParams(location.search).get('s') || '';
  const valid = /^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(sid);
  const states = { wait: $('#thanks-wait'), ok: $('#thanks-ok'), no: $('#thanks-no') };
  let data = null, tries = 0, timer = 0;

  function show(which) { Object.keys(states).forEach(k => { states[k].hidden = k !== which; }); }
  function paint() {
    document.title = T('thanks.meta');
    if (!data) return;
    const n = (data.pedidos && data.pedidos.length) ? data.pedidos.join(', ') : (data.ref || '');   // HOE-P-n when the Central answers, else Stripe's reference
    $('#thanks-title').textContent = data.cliente ? fill(T('thanks.okTitle'), { name: data.cliente }) : T('thanks.okTitleAnon');
    $('#thanks-lead').textContent = data.email ? fill(T('thanks.okLead'), { n, email: data.email }) : fill(T('thanks.okLeadNoMail'), { n });
    $('#thanks-items').innerHTML = (data.items || []).map(it => `<li><span><b>${esc(it.name || it.sku)}</b>${it.cc ? ` · ${esc(it.cc)}` : ''}${it.color ? ` · ${esc(it.color)}` : ''}<br><small>${esc(it.lentes || '')}</small></span><span class="p">${C.price(it.price)}</span></li>`).join('');
    $('#thanks-total').textContent = C.price(data.total);
  }
  function none() {
    $('#thanks-no-title').textContent = T('thanks.noneTitle');
    $('#thanks-no-lead').textContent = T('thanks.noneLead');
    $('#thanks-retry').hidden = true;
    show('no');
  }
  function ask() {
    show('wait');
    C.order(sid).then(r => {
      if (r && r.estado === 'pagado') {
        data = r; paint(); show('ok');
        try {                                                                                   // Google Analytics: una compra (una vez por sesión de pago)
          const k = 'hoe-ga-' + sid;
          if (typeof window.gtag === 'function' && !sessionStorage.getItem(k)) {
            sessionStorage.setItem(k, '1');
            window.gtag('event', 'purchase', { transaction_id: (data.pedidos && data.pedidos[0]) || data.ref || sid, currency: 'USD', value: Number(data.total) || 0,
              items: (data.items || []).map(it => ({ item_id: it.sku, item_name: it.name, price: Number(it.price) || 0, quantity: 1 })) });
          }
        } catch (e) { /* nunca rompe la página */ }
        try { C.clear(); } catch (e) { /* storage blocked */ }
        return;
      }
      throw new Error(r && r.estado ? r.estado : 'sin respuesta');
    }).catch(() => {
      if (tries++ < 4) { timer = setTimeout(ask, 3000); return; }       // the webhook or the Central may need a few seconds
      $('#thanks-no-title').textContent = T('thanks.noTitle');
      $('#thanks-no-lead').textContent = T('thanks.noLead');
      show('no');
    });
  }
  $('#thanks-retry').addEventListener('click', () => { clearTimeout(timer); tries = 0; ask(); });
  document.addEventListener('hoe:lang', () => { paint(); if (!valid) none(); });
  if (!valid) { none(); return; }
  ask();
})();
