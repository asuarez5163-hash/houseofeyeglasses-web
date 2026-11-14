// Brand pages (<brand>-eyeglasses.html): the brand's own block under its grid (11/14). The Central composes it from the
// brand's frames with these patterns (lib/optica/paginas.py → sobre_marca, via tpl/ssr.json) and leaves it in the page in
// both languages (#brand-data → about); js/pages/marca2.js only shows the visitor's. The patterns are written as HTML;
// {label} comes from the catalog's filter names (catalogo.f.*) and the values from shape.* / mat.* / gender.* / rim.*.
// A new file, not js/i18n/marca.js: the CDN keeps a published dictionary for 30 days under the same ?v= (CLAUDE.md).
// What it states = legal.html §6–§7 and what the lens configurator offers: if that changes, this changes.
Object.assign(window.HOE_I18N.en, {
  "marca.about.h": "About our {brand} frames",
  "marca.about.stock": "We carry {n} {brand} frames ({models}), every one new and in stock, {price}.",
  "marca.about.stock1": "We carry one {brand} frame right now, new and in stock, at {min}.",
  "marca.about.models": "{m} models", "marca.about.model1": "one model",
  "marca.about.priceOne": "all at {min}", "marca.about.priceRange": "from {min} to {max}",
  "marca.about.line": "{label}: {list}.", "marca.about.item": "{name} ({n})", "marca.about.and": " and ",
  "marca.about.sizes": "Lens widths run from {a} to {b} mm.", "marca.about.size1": "Lens width: {a} mm.",
  "marca.about.rxh": "{brand} glasses with prescription lenses",
  "marca.about.rx": "Any {brand} frame on this page can be made with your prescription. Choose <a href=\"single-vision-glasses.html\">single-vision</a>, <a href=\"progressive-glasses.html\">progressive</a> or <a href=\"computer-glasses.html\">computer</a> lenses, clear or as <a href=\"sunglasses.html\">prescription sunglasses</a>, and add <a href=\"anti-glare-glasses.html\">anti-glare</a>, <a href=\"blue-light-glasses.html\">blue-light</a> or <a href=\"photochromic-glasses.html\">light-responsive</a> options. Stronger prescriptions can use <a href=\"high-index-lenses.html\">thinner high-index lenses</a>. You add your prescription in four short steps, and an optician checks every prescription.",
  "marca.about.ship": "Standard U.S. shipping is free. Frames ordered without prescription lenses can be returned within 30 days.",
});
Object.assign(window.HOE_I18N.es, {
  "marca.about.h": "Nuestros armazones {brand}",
  "marca.about.stock": "Tenemos {n} armazones {brand} ({models}), todos nuevos y en existencia, {price}.",
  "marca.about.stock1": "Por ahora tenemos un armazón {brand}, nuevo y en existencia, a {min}.",
  "marca.about.models": "{m} modelos", "marca.about.model1": "un modelo",
  "marca.about.priceOne": "a {min} cada uno", "marca.about.priceRange": "de {min} a {max}",
  "marca.about.line": "{label}: {list}.", "marca.about.item": "{name} ({n})", "marca.about.and": " y ",
  "marca.about.sizes": "El ancho de lente va de {a} a {b} mm.", "marca.about.size1": "Ancho de lente: {a} mm.",
  "marca.about.rxh": "Espejuelos {brand} con lentes graduados",
  "marca.about.rx": "Cualquier armazón {brand} de esta página se puede hacer con tu receta. Elige lentes <a href=\"single-vision-glasses.html\">monofocales</a>, <a href=\"progressive-glasses.html\">progresivos</a> o <a href=\"computer-glasses.html\">para computadora</a>, transparentes o como <a href=\"sunglasses.html\">lentes de sol con receta</a>, y agrega <a href=\"anti-glare-glasses.html\">antirreflejo</a>, <a href=\"blue-light-glasses.html\">filtro de luz azul</a> o <a href=\"photochromic-glasses.html\">fotocromáticos</a>. Para graduaciones altas hay <a href=\"high-index-lenses.html\">lentes más delgados de alto índice</a>. Agregas tu receta en cuatro pasos cortos y un óptico revisa cada receta.",
  "marca.about.ship": "El envío estándar en EE. UU. es gratis. Los armazones pedidos sin lentes graduados se pueden devolver en 30 días.",
});
