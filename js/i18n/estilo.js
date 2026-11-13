// Style pages (<style>-glasses.html: one per shape, material, rim, color and gender × shape) and the styles index
// (styles.html): written by the Central from src/pages/estilo.html and src/pages/estilos.html. The Central fills these
// patterns itself, in both languages (lib/optica/paginas.py via tpl/ssr.json), and leaves the results inside the page;
// the browser never builds them (js/pages/estilo.js only shows the one of the language chosen).
//   {x} = the style's own word as the site already says it (shape.* · mat.* · rim.* · color.*), {xl} = the same word with
//   a lower-case initial, {g} / {gl} = who it is for (gender.*), {name} = the style's name (estilo.n.*), {n} = how many
//   frames, {min} = the lowest price, {shown} = how many the page lists.
//   A style that needs its own wording has its own key: estilo.n.<family>.<value> / estilo.t.<family>.<value>.
Object.assign(window.HOE_I18N.en, {
  "estilo.n.shape": "{x} glasses", "estilo.n.material": "{x} glasses", "estilo.n.rim": "{x} glasses", "estilo.n.color": "{x} glasses",
  "estilo.n.gshape": "{g}’s {xl} glasses",
  "estilo.t.shape": "{x} Glasses — {x} Eyeglasses Frames | House of Eyeglasses",
  "estilo.t.material": "{x} Glasses — {x} Eyeglasses Frames | House of Eyeglasses",
  "estilo.t.rim": "{x} Glasses — {x} Eyeglasses Frames | House of Eyeglasses",
  "estilo.t.color": "{x} Glasses — {x} Eyeglasses Frames | House of Eyeglasses",
  "estilo.t.gshape": "{g}’s {x} Glasses & Eyeglasses Frames | House of Eyeglasses",
  "estilo.n.material.tr90": "TR-90 glasses", "estilo.t.material.tr90": "TR-90 Glasses — Flexible TR-90 Eyeglasses Frames | House of Eyeglasses",
  "estilo.n.rim.rimless": "Rimless glasses", "estilo.t.rim.rimless": "Rimless Glasses — Rimless Eyeglasses Frames | House of Eyeglasses",
  "estilo.t.rim.full": "Full-Rim Glasses — Full-Rim Eyeglasses Frames | House of Eyeglasses",
  "estilo.t.rim.half": "Half-Rim Glasses — Semi-Rimless Eyeglasses Frames | House of Eyeglasses",
  "estilo.t.shape.cateye": "Cat-Eye Glasses — Cat-Eye Eyeglasses Frames | House of Eyeglasses",
  "estilo.n.color.transparent": "Clear glasses", "estilo.t.color.transparent": "Clear Glasses — Transparent Eyeglasses Frames | House of Eyeglasses",
  "estilo.lead": "{n} frames in stock, from {min}. Add your prescription lenses in four short steps.",
  "estilo.leadTop": "{n} frames in stock, from {min}; here are {shown} of them. Add your prescription lenses in four short steps.",
  "estilo.none": "Not enough frames in this style right now.",
  "estilo.desc": "{name}: {n} frames, new and in stock, from {min} with free U.S. shipping. Add prescription lenses made to your prescription; an optician in Tampa checks every prescription.",
  "estilo.all": "See all {n} in the catalog", "estilo.allStyles": "All styles",
  "estilos.h1": "Shop glasses by style",
  "estilos.lead": "Every frame is new and in stock. Start from a shape, a material, a rim or a color, then add your prescription lenses.",
  "estilos.meta": "Eyeglasses by Style: Shape, Material, Rim & Color — House of Eyeglasses", "estilos.aria": "Styles",
  "estilos.desc": "Shop eyeglasses frames by style: round, square, cat-eye and more shapes, acetate, metal or titanium, full rim or rimless, and every color. New and in stock, with free U.S. shipping and prescription lenses made to your prescription.",
});
Object.assign(window.HOE_I18N.es, {
  "estilo.n.shape": "Espejuelos {xl}", "estilo.n.material": "Espejuelos de {xl}", "estilo.n.rim": "Espejuelos de {xl}", "estilo.n.color": "Espejuelos de color {xl}",
  "estilo.n.gshape": "Espejuelos {xl} para {gl}",
  "estilo.t.shape": "{name} — Armazones {xl} | House of Eyeglasses",
  "estilo.t.material": "{name} — Armazones de {xl} | House of Eyeglasses",
  "estilo.t.rim": "{name} — Armazones de {xl} | House of Eyeglasses",
  "estilo.t.color": "{name} — Armazones de color {xl} | House of Eyeglasses",
  "estilo.t.gshape": "{name} | House of Eyeglasses",
  "estilo.n.material.tr90": "Espejuelos de TR-90", "estilo.t.material.tr90": "Espejuelos de TR-90 — Armazones flexibles de TR-90 | House of Eyeglasses",
  "estilo.n.rim.rimless": "Espejuelos sin aro", "estilo.t.rim.rimless": "Espejuelos sin aro — Armazones sin aro | House of Eyeglasses",
  "estilo.t.rim.full": "Espejuelos de aro completo — Armazones de aro completo | House of Eyeglasses",
  "estilo.t.rim.half": "Espejuelos de medio aro — Armazones de medio aro | House of Eyeglasses",
  "estilo.t.shape.cateye": "Espejuelos ojo de gato — Armazones ojo de gato | House of Eyeglasses",
  "estilo.n.color.transparent": "Espejuelos transparentes", "estilo.t.color.transparent": "Espejuelos transparentes — Armazones transparentes | House of Eyeglasses",
  "estilo.lead": "{n} armazones en existencia, desde {min}. Agrega tus lentes graduados en cuatro pasos cortos.",
  "estilo.leadTop": "{n} armazones en existencia, desde {min}; aquí van {shown}. Agrega tus lentes graduados en cuatro pasos cortos.",
  "estilo.none": "Por ahora no hay suficientes armazones de este estilo.",
  "estilo.desc": "{name}: {n} armazones nuevos y en existencia, desde {min} con envío gratis en EE. UU. Agrega lentes graduados hechos a tu receta; un óptico en Tampa revisa cada receta.",
  "estilo.all": "Ver los {n} en el catálogo", "estilo.allStyles": "Todos los estilos",
  "estilos.h1": "Espejuelos por estilo",
  "estilos.lead": "Todos los armazones son nuevos y están en existencia. Empieza por una forma, un material, un aro o un color y agrega tus lentes graduados.",
  "estilos.meta": "Espejuelos por estilo: forma, material, aro y color — House of Eyeglasses", "estilos.aria": "Estilos",
  "estilos.desc": "Armazones por estilo: redondos, cuadrados, ojo de gato y más formas, en acetato, metal o titanio, de aro completo o sin aro, y en todos los colores. Nuevos y en existencia, con envío gratis en EE. UU. y lentes graduados hechos a tu receta.",
});
