// Carrito que llega desde la Tienda de Facebook e Instagram (11/16): los textos del aviso de js/pages/carrito-meta.js.
// Claves cart.link.*: un armazón del enlace que ya no está (no existe, se retiró o se agotó), un catálogo que no se pudo leer
// (o un carrito que el navegador no guardó) y los topes: cap = el enlace pedía más de 20 unidades, full = el carrito ya tenía 30
// líneas o más ({n} = el tope, lo pone js/pages/carrito-meta.js).
// Va en un archivo NUEVO porque js/i18n.js y js/i18n/carrito.js ya están publicados con su ?v= (el CDN los guarda 30 días):
// en el próximo cambio de ASSET_V se funde con js/i18n/carrito.js.
window.HOE_I18N = window.HOE_I18N || { en: {}, es: {} };
Object.assign(window.HOE_I18N.en, {
  "cart.link.gone1": "One frame from your selection is no longer available and was not added.",
  "cart.link.gone": "{n} frames from your selection are no longer available and were not added.",
  "cart.link.retry": "We could not load your selection. Reload the page to try again.",
  "cart.link.cap": "Only the first {n} frames of your selection went into your cart: one link adds up to {n}.",
  "cart.link.full": "Your cart already has {n} frames or more, so nothing from your selection was added.",
});

Object.assign(window.HOE_I18N.es, {
  "cart.link.gone1": "Un armazón de tu selección ya no está disponible y no se agregó.",
  "cart.link.gone": "{n} armazones de tu selección ya no están disponibles y no se agregaron.",
  "cart.link.retry": "No pudimos cargar tu selección. Recarga la página para intentarlo de nuevo.",
  "cart.link.cap": "Solo los primeros {n} armazones de tu selección entraron en tu carrito: un enlace agrega hasta {n}.",
  "cart.link.full": "Tu carrito ya tiene {n} armazones o más, así que no se agregó nada de tu selección.",
});
