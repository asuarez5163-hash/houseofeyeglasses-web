// Carrito que llega desde la Tienda de Facebook e Instagram (11/16). Meta no cobra: manda al comprador a la «checkout URL» de la
// tienda, carrito.html, y le añade ?products=<id>:<cantidad>,<id>:<cantidad>[&coupon=…][&cart_origin=…][&utm_…][&fbclid=…]. Los id
// son los del catálogo de Meta = nuestros SKU (la columna id de data/google-feed.txt): HOE-W-679, HOE-M-750, HOE-K-1…
// Aquí esos armazones entran al carrito (js/cart.js) con el MISMO paquete que arma la ficha (js/pages/producto.js, «Agregar al
// carrito») cuando se elige «Sin graduación» (use 'non-rx': el armazón tal cual, nada de lentes que cobrar): una línea por unidad
// (el carrito no tiene cantidad por línea) y el precio del catálogo publicado, nunca uno de la dirección. Lentes, receta y código
// postal se ponen después como siempre: «Editar» en la línea y el aviso del código postal de carrito.js llevan a la ficha.
// Reglas:
//  · solo ids ^HOE-[A-Z]-[0-9]+$ (sin distinguir mayúsculas); cantidad entera, recortada a 1–10 (un id sin «:cantidad» vale 1)
//    y a las existencias del catálogo (Math.floor(f.st)); hasta 20 armazones distintos; cadena de hasta 2.000 caracteres. Lo demás
//    se ignora en silencio. coupon se ignora (no hay cupones).
//  · topes: un enlace pone como mucho 20 unidades en total (sumando todos sus armazones, en el orden del enlace) y un carrito con
//    30 líneas o más no recibe nada de un enlace. Lo que no entra se dice en el aviso (cart.link.cap / cart.link.full).
//  · «al menos la cantidad pedida»: cuentan TODAS las líneas que el carrito ya tiene de ese SKU (con o sin lentes) y solo se añade
//    lo que falte; nunca se borra ni se cambia una línea. Recargar o abrir dos veces el mismo enlace no hace crecer el carrito.
//  · un SKU que no existe, se retiró o está agotado se salta y se dice en el aviso de la página: #cart-cleaned y su gemelo del
//    carrito vacío (carrito.js los reescribe en cada pintada: aquí se vigilan y se vuelven a escribir, siempre con textContent).
//  · al terminar se quitan products, coupon y cart_origin de la dirección (history.replaceState); utm_*, fbclid y lo demás se
//    quedan tal como venían (los lee Analytics). Un catálogo que NO SE PUDO LEER no es «no existe»: se dice, la dirección se queda
//    y recargar lo reintenta (sin duplicar: vale la regla de «al menos»). Igual si el navegador no guardó el carrito (almacén lleno
//    o bloqueado): sin eso, al limpiar la dirección se perdería la selección.
//  · dentro de un iframe (la página metida en otra web) no hace nada.
// Sin ?products= este archivo no hace nada.
// Es un archivo NUEVO porque js/pages/carrito.js ya está publicado con su ?v= (el CDN lo guarda 30 días): en el próximo cambio de
// ASSET_V se funde con él (el aviso pasa a render() y sobran los dos vigilantes). Textos: js/i18n/carrito-meta.js.
// Prueba: node tools/check_meta_cart.js
(() => {
  'use strict';
  const page = document.querySelector('main.cart-page');
  const C = window.hoeCart, CAT = window.hoeCatalog;
  if (!page || !C || !CAT) return;

  // ---- the address: ?products= is read here; coupon and cart_origin leave with it; every other parameter stays as it was written
  const DROP = ['products', 'coupon', 'cart_origin'];
  const dec = s => { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { return null; } };   // null = not valid percent-encoding
  const pairs = location.search.replace(/^\?/, '').split('&').filter(Boolean).map(raw => {
    const i = raw.indexOf('=');
    return { raw, k: dec(i < 0 ? raw : raw.slice(0, i)), v: i < 0 ? '' : raw.slice(i + 1) };
  });
  const asked = pairs.find(p => p.k === 'products');
  if (!asked) return;                                            // no link from Meta: the page is exactly what it was
  if (window.top !== window.self) return;                        // inside another site's frame: a link only fills the cart in its own window
  const rest = pairs.filter(p => DROP.indexOf(p.k) < 0).map(p => p.raw).join('&');
  const clean = () => {
    try { history.replaceState(history.state, '', location.pathname + (rest ? '?' + rest : '') + location.hash); } catch (e) { /* the address stays: opening it again adds nothing */ }
  };

  // ---- what the link asks for: SKU → units, in the order of the link
  const MAX_LEN = 2000, MAX_SKUS = 20, MAX_QTY = 10;
  const MAX_LINES = 20, CART_FULL = 30;                          // units one link may put in the cart · a cart this full takes none
  const want = new Map();
  const list = dec(asked.v);
  if (list && list.length <= MAX_LEN) list.split(',').forEach(entry => {
    const bits = entry.split(':');
    const id = bits[0].trim(), qty = bits.length > 1 ? bits[1].trim() : '1';
    if (bits.length > 2 || !/^HOE-[A-Z]-[0-9]+$/i.test(id) || !/^-?[0-9]+$/.test(qty)) return;
    const sku = id.toUpperCase();
    if (!want.has(sku) && want.size >= MAX_SKUS) return;
    want.set(sku, Math.min(MAX_QTY, (want.get(sku) || 0) + Math.max(1, Math.min(MAX_QTY, Number(qty)))));
  });
  if (!want.size) { clean(); return; }

  // ---- the notice: the cart's own paragraph (and its twin in the empty state). carrito.js writes both again on every paint, so
  // they are watched and the words go back, in the language of the moment
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  // the dictionary file did not load: the nearest words the cart already has (none for the limits: then nothing is said)
  const tx = (k, alt) => { const v = T(k); return v !== k ? v : alt ? T(alt) : ''; };
  const notes = ['cart-cleaned', 'cart-empty-cleaned'].map(id => document.getElementById(id)).filter(Boolean);
  let gone = 0, unread = 0, over = 0, full = 0, held = false;
  function say() {
    const mine = [
      unread ? tx('cart.link.retry', 'cat.updating') : '',
      gone === 1 ? tx('cart.link.gone1', 'cart.unavailable') : gone ? tx('cart.link.gone', 'cart.unavailable').replace('{n}', String(gone)) : '',
      full ? tx('cart.link.full').replace(/\{n\}/g, String(CART_FULL)) : over ? tx('cart.link.cap').replace(/\{n\}/g, String(MAX_LINES)) : '',
    ].filter(Boolean).join(' ');
    if (!mine) return;
    const text = (C.dropped() ? T('cart.cleaned') + ' ' : '') + mine;
    notes.forEach(el => { if (el.textContent !== text) el.textContent = text; if (el.hidden) el.hidden = false; });
    if (held || !('MutationObserver' in window)) return;
    held = true;
    const mo = new MutationObserver(() => say());
    notes.forEach(el => mo.observe(el, { attributes: true, attributeFilter: ['hidden'], childList: true, characterData: true, subtree: true }));
  }

  // ---- the package the frame's page builds for «Non-prescription» (js/pages/producto.js, add to cart): same fields, same order
  const pack = f => {
    const p = Number(f.p) || 0;
    return {
      sku: f.id, ...(CAT.hasPages() ? { u: CAT.slug(f.b, f.n, f.cc, f.id) } : {}), name: CAT.name(f),
      colorName: { en: (f.colRaw && f.colRaw.en) || f.col, es: (f.colRaw && f.colRaw.es) || (f.colRaw && f.colRaw.en) || f.col },
      colorKey: f.col, cc: f.cc, img: CAT.img(f), price: p, framePrice: p, band: f.size.band,
      size: { lens: f.size.lens, bridge: f.size.bridge, temple: f.size.temple, total: f.size.total },
      use: 'non-rx', material: '', coatings: [], rx: { path: 'none' },
    };
  };

  // ---- an empty cart is showing «Your cart is empty» (carrito.js): while the catalog answers, the page says nothing instead
  // (it keeps its place: nothing jumps). The veil lifts by itself after 6 s whatever happens
  const empty0 = C.count() === 0;
  let veiled = false;
  const veil = on => {
    if (veiled === on) return;
    veiled = on;
    if (on) { page.style.visibility = 'hidden'; return; }
    page.style.removeProperty('visibility');
    if (!page.getAttribute('style')) page.removeAttribute('style');
  };
  const cap = empty0 ? setTimeout(() => veil(false), 6000) : 0;
  if (empty0) veil(true);
  // …and carrito.js asked for «Frames you looked at» while the cart was empty: it paints them when the catalog answers, even if
  // the cart has frames by then. Its own rule is "only under an empty cart": with frames in the cart that block stays hidden
  const seen = document.getElementById('cart-seen');
  const hush = () => { if (seen && !seen.hidden && C.count() > 0) seen.hidden = true; };

  // ---- the catalog: the manifest first (unknown() and hasPages() need it), then one frame after another (a phone never asks
  // for two chunks at once; frames of the same chunk cost one download)
  const skus = Array.from(want.keys()), frames = [], failed = [];
  const look = i => (i >= skus.length ? Promise.resolve()
    : Promise.resolve().then(() => CAT.byId(skus[i])).then(f => { frames[i] = f || null; }, () => { failed[i] = true; }).then(() => look(i + 1)));
  Promise.resolve().then(() => CAT.manifest()).catch(() => null).then(() => look(0)).then(() => {
    // each frame gets what the link asks, never more than its stock, until the link's MAX_LINES units are given out (in the order of
    // the link). The share is decided on the link, not on what is added, so opening it again adds nothing; a frame that could not be
    // read keeps its share for the reload
    let room = MAX_LINES;
    const plan = [];
    skus.forEach((sku, i) => {
      const f = frames[i];
      if (!f) {                                                                         // could not be read ≠ does not exist
        if (failed[i] || CAT.unknown(sku)) { unread++; room -= Math.min(room, want.get(sku)); } else gone++;
        return;
      }
      const stock = Math.floor(Number(f.st));
      if (!(stock >= 1) || !(Number(f.p) > 0)) { gone++; return; }                    // sold out (or no price to charge)
      const units = Math.min(want.get(sku), stock), share = Math.min(units, room);
      room -= share; over += units - share;
      const have = C.get().items.filter(it => it.sku === sku).length;                 // every line of this frame counts, whatever its lenses
      if (share > have) plan.push([f, share - have]);
    });
    const missing = plan.reduce((a, p) => a + p[1], 0);
    if (missing && C.count() >= CART_FULL) { full = missing; plan.length = 0; }       // a cart this full takes nothing from a link
    let added = 0;
    plan.forEach(([f, n]) => { for (let k = 0; k < n; k++) { C.add(pack(f)); added++; } });
    // the cart lives in localStorage: if the browser did not keep it (full or blocked), cleaning the address would lose the
    // selection. Then it is «could not be read»: the address stays and the notice asks for a reload
    if (added) {
      let kept = false;
      try { kept = JSON.parse(localStorage.getItem(C.KEY)).items.length === C.count(); } catch (e) { /* blocked or unreadable */ }
      if (!kept) unread++;
    }
    if (added && empty0 && seen && 'MutationObserver' in window) { new MutationObserver(hush).observe(seen, { attributes: true, attributeFilter: ['hidden'] }); hush(); }
    say();
    if (!unread) clean();
  }).finally(() => { clearTimeout(cap); veil(false); });
})();
