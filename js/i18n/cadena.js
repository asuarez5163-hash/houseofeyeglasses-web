// La cadena de enlaces (11/19, Armando «Sí»): los textos que el Central (lib/optica/paginas.py) escribe en la ficha y en las
// páginas de estilo para que Google llegue a TODAS las fichas. Diccionario NUEVO (un js/i18n/*.js ya publicado lo guarda el CDN
// 30 días con el mismo ?v=): lo cargan src/pages/producto.html y src/pages/estilo.html y viaja en tpl/ssr.json.
// · Ficha (#pdp-chain, debajo de «Lens options»): cad.colors = sus otros colores · cad.similar = armazones parecidos que Google
//   aún no tiene (rotan cada día) · cad.aria = nombre de la sección.
// · Estilo con más de 240 armazones: páginas <estilo>-glasses-<n>.html. cad.pages = rótulo de los números; cad.pageT / pageH1 /
//   pageLead / pageDesc = título, H1, entrada y descripción de la página n (el Central los rellena en los dos idiomas y los deja
//   en style-data: js/pages/estilo.js solo elige cuál enseñar). Huecos: {name} nombre del estilo, {p} página, {total} páginas,
//   {shown} armazones de esta página, {n} del estilo, {min} precio más bajo del estilo.
window.HOE_I18N = window.HOE_I18N || { en: {}, es: {} };
Object.assign(window.HOE_I18N.en, {
  "cad.colors": "This frame in other colors",
  "cad.similar": "Similar frames to explore",
  "cad.aria": "More frames",
  "cad.pages": "Pages",
  "cad.pageT": "{name}, page {p} — House of Eyeglasses",
  "cad.pageH1": "{name}: page {p} of {total}",
  "cad.pageLead": "Page {p} of {total}: {shown} more of the {n} frames in this style, by brand, from {min}.",
  "cad.pageDesc": "{name}: {n} frames in stock from {min}. Page {p} of {total}.",
});
Object.assign(window.HOE_I18N.es, {
  "cad.colors": "Este armazón en otros colores",
  "cad.similar": "Armazones parecidos para descubrir",
  "cad.aria": "Más armazones",
  "cad.pages": "Páginas",
  "cad.pageT": "{name}, página {p} — House of Eyeglasses",
  "cad.pageH1": "{name}: página {p} de {total}",
  "cad.pageLead": "Página {p} de {total}: {shown} más de los {n} armazones de este estilo, por marca, desde {min}.",
  "cad.pageDesc": "{name}: {n} armazones en existencia desde {min}. Página {p} de {total}.",
});
