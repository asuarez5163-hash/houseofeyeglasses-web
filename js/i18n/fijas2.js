// Textos corregidos de páginas fijas (11/16): quitan los restos de «antes de abrir la tienda» del quiz y de la guía de receta.
// Va en un archivo NUEVO porque js/i18n/quiz.js y js/i18n/receta.js ya están publicados con su ?v= (el CDN los guarda 30 días):
// en el próximo cambio de ASSET_V se funden con sus diccionarios y se borran las claves viejas (quiz.r.nextText, receta.way2.s).
window.HOE_I18N = window.HOE_I18N || { en: {}, es: {} };
Object.assign(window.HOE_I18N.en, {
  "quiz.r.nextText2": "Keep this profile handy: the shapes, material and colors above are what to look for in our catalog. Every frame lists its size, so you can compare it with the glasses you own.",
  "quiz.r.shop2": "Shop frames",
  "receta.way2.s2": "Upload it in the lens step when you order",
});
Object.assign(window.HOE_I18N.es, {
  "quiz.r.nextText2": "Guarda este perfil: las formas, el material y los colores de arriba son lo que debes buscar en nuestro catálogo. Cada armazón trae su medida, así puedes compararla con los espejuelos que ya tienes.",
  "quiz.r.shop2": "Ver armazones",
  "receta.way2.s2": "Súbela en el paso de lentes al hacer tu pedido",
});
