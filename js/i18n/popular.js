// «Popular frames» (11/17, Armando aprobó la página y los enlaces de la portada) — diccionario NUEVO (los js/i18n/*.js ya
// publicados no se tocan: el CDN los guarda 30 días con el mismo ?v=).
// · pop.*: la página popular-frames.html, que escribe el Central (lib/optica/paginas.py → escribir_populares) con
//   tpl/popular.html y tpl/popular.es.html; pop.meta, pop.desc y pop.h1 los lee de tpl/ssr.json (título, descripción y
//   nombre del JSON-LD); pop.kicker, pop.h1 y pop.lead ya van escritos en el molde (data-i18n).
// · home.lx.* y home.pop.*: las dos filas nuevas de la portada (src/pages/index.html, bloque 4). tp.n.hi/ar/poly son copia
//   de js/i18n/tipo2.js (la portada no lo carga), como en js/i18n/pd-ficha.js: si cambian allí, cambian aquí.
// · Los cinco enlaces de «Popular right now» son las búsquedas del puesto 8–20 de Search Console del 11/17 (28 días):
//   adensco eyeglasses · emporio armani eye frames · mont blanc eyeglasses · italia independent eyeglasses · browline
//   frames for men. Ninguna marca de la prueba de títulos (hasta el 12/07).
window.HOE_I18N = window.HOE_I18N || { en: {}, es: {} };
Object.assign(window.HOE_I18N.en, {
  "pop.meta": "Popular Eyeglasses Frames — Prescription Glasses in Stock | House of Eyeglasses",
  "pop.desc": "The eyeglasses frames people found most often on Google over the last 28 days, all new and in stock, ready for prescription lenses made to your prescription. Free U.S. shipping.",
  "pop.kicker": "Popular right now",
  "pop.h1": "Popular eyeglasses frames",
  "pop.lead": "The frames people found and opened most often from Google search over the last 28 days. Every one is new and in stock, ready for prescription lenses made to your prescription. The list is updated every day.",
  "pop.n": "Popular frames",
  "home.lx.office": "Office lenses",
  "tp.n.hi": "High-index lenses", "tp.n.ar": "Anti-glare glasses", "tp.n.poly": "Polycarbonate lenses",
  "home.pop.adensco": "Adensco eyeglasses",
  "home.pop.ea": "Emporio Armani eye frames",
  "home.pop.mb": "Montblanc eyeglasses",
  "home.pop.ii": "Italia Independent eyeglasses",
  "home.pop.browm": "Browline frames for men",
  "home.gd.cost": "Prescription glasses cost",
  "home.gd.lenses": "Lens thickness & coatings",
});
Object.assign(window.HOE_I18N.es, {
  "pop.meta": "Armazones populares — Espejuelos graduados en existencia | House of Eyeglasses",
  "pop.desc": "Los armazones que más encontró la gente en Google en los últimos 28 días, todos nuevos y en existencia, listos para lentes graduados hechos a tu receta. Envío gratis en EE. UU.",
  "pop.kicker": "Lo más popular ahora",
  "pop.h1": "Armazones populares",
  "pop.lead": "Los armazones que más encontró y abrió la gente desde la búsqueda de Google en los últimos 28 días. Todos son nuevos y están en existencia, listos para lentes graduados hechos a tu receta. La lista se actualiza cada día.",
  "pop.n": "Armazones populares",
  "home.lx.office": "Lentes de oficina",
  "tp.n.hi": "Lentes de alto índice", "tp.n.ar": "Espejuelos antirreflejo", "tp.n.poly": "Lentes de policarbonato",
  "home.pop.adensco": "Espejuelos Adensco",
  "home.pop.ea": "Armazones Emporio Armani",
  "home.pop.mb": "Espejuelos Montblanc",
  "home.pop.ii": "Espejuelos Italia Independent",
  "home.pop.browm": "Armazones browline para hombre",
  "home.gd.cost": "Cuánto cuestan los espejuelos",
  "home.gd.lenses": "Grosor y tratamientos",
});
