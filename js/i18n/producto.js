// Ficha de armazón + configurador de lentes en 3 pasos (producto.html) — bilingual copy.
// Prefixes: "prod." (ficha), "cfg." (selector de lentes), "rx." (receta dentro del paso 2).
// Colours, bands, rims and "Price at launch" come from js/data/frames.js; lens names from js/data/lenses.js;
// rx.od / rx.os (OD / OI) live in js/i18n.js because the header drawer uses them.
Object.assign(window.HOE_I18N.en, {
  "prod.meta": "{name} — House of Eyeglasses",
  "prod.views": "Views", "prod.view.front": "Front", "prod.view.side": "Side", "prod.view.face": "On a face",
  "prod.face.lbl": "Face width", "prod.face.narrow": "Narrow", "prod.face.medium": "Medium", "prod.face.wide": "Wide",
  "prod.colorOf": "Color",
  "prod.trust": "If the prescription isn’t right, we remake it free",
  "prod.details": "Details",
  "prod.d.material": "Material", "prod.d.shape": "Shape", "prod.d.rim": "Rim", "prod.d.size": "Size", "prod.d.prog": "Progressives", "prod.d.yes": "Yes", "prod.d.no": "Not recommended (shallow lens)",
  "prod.d.incl": "Included", "prod.d.inclText": "Lenses with anti-reflective and scratch-resistant coatings, hard case and cloth. An optician in Tampa checks every prescription.",
  "prod.notFound": "We couldn’t find that frame.", "prod.notFoundCta": "See all frames",
  "prod.price.plus": "+ Price at launch",
  "prod.more": "You may also like", "prod.moreAll": "See all frames",
  // C-cine: the plate under the drawing and the line under the configurator title
  "prod.plate": "Sample · drawn to scale", "prod.plateSide": "Inside the temple · your size",
  "prod.kickerSun": "Sunglasses",

  "cfg.title": "Choose your lenses",
  "cfg.lead": "Three short steps. An optician in Tampa checks everything before the lab starts.",
  "cfg.step1": "Use", "cfg.step2": "Prescription", "cfg.step3": "Lenses",
  "cfg.edit": "Edit", "cfg.next": "Continue", "cfg.addToCart": "Add to cart", "cfg.rec": "Recommended",
  "cfg.missing": "Finish step {n} first", "cfg.added": "Added ✓",
  "cfg.demo.single": "The same power across the whole lens.", "cfg.demo.progressive": "Three zones, no line: far at the top, reading at the bottom.",
  "cfg.demo.blue": "A faint tint that filters part of the blue light.", "cfg.demo.sun": "In sunlight it darkens; back indoors it clears.",
  "cfg.demo.ar": "The reflection is gone. That is the coating at work, included with every pair.",

  "rx.none": "No prescription needed for this choice.",
  "rx.readers": "Reading power",
  "rx.sph": "SPH", "rx.cyl": "CYL", "rx.axis": "AXIS", "rx.add": "ADD",
  "rx.pd": "PD", "rx.pdStore": "Measure it in the store", "rx.pdOwn": "I have it:",
  "rx.confirm": "My prescription is current",
  "rx.howTo": "How do I read my prescription?",
  "rx.errAxis": "{eye}: add the AXIS (1–180) when CYL is not 0.00.",
  "rx.errAdd": "Add the ADD from your prescription.", "rx.errPd": "Type your PD (40–80 mm).", "rx.errConfirm": "Confirm your prescription is current.", "rx.errReaders": "Choose the reading power.",
  "rx.sumNone": "No prescription", "rx.sumReaders": "Reading +{p}", "rx.sumPdStore": "PD in store",
});

Object.assign(window.HOE_I18N.es, {
  "prod.meta": "{name} — House of Eyeglasses",
  "prod.views": "Vistas", "prod.view.front": "De frente", "prod.view.side": "De lado", "prod.view.face": "En un rostro",
  "prod.face.lbl": "Ancho de cara", "prod.face.narrow": "Angosta", "prod.face.medium": "Mediana", "prod.face.wide": "Ancha",
  "prod.colorOf": "Color",
  "prod.trust": "Si la graduación no está bien, la rehacemos gratis",
  "prod.details": "Detalles",
  "prod.d.material": "Material", "prod.d.shape": "Forma", "prod.d.rim": "Aro", "prod.d.size": "Medida", "prod.d.prog": "Progresivos", "prod.d.yes": "Sí", "prod.d.no": "No recomendado (lente poco alto)",
  "prod.d.incl": "Incluye", "prod.d.inclText": "Lentes con antirreflejo y antirrayas, estuche rígido y paño. Un óptico en Tampa revisa cada receta.",
  "prod.notFound": "No encontramos ese armazón.", "prod.notFoundCta": "Ver todos los armazones",
  "prod.price.plus": "+ Precio al lanzamiento",
  "prod.more": "También te pueden gustar", "prod.moreAll": "Ver todos los armazones",
  "prod.plate": "Muestra · dibujada a escala", "prod.plateSide": "Por dentro de la patilla · tu medida",
  "prod.kickerSun": "Lentes de sol",

  "cfg.title": "Elige tus lentes",
  "cfg.lead": "Tres pasos cortos. Un óptico en Tampa revisa todo antes de que el laboratorio empiece.",
  "cfg.step1": "Uso", "cfg.step2": "Receta", "cfg.step3": "Lentes",
  "cfg.edit": "Editar", "cfg.next": "Continuar", "cfg.addToCart": "Agregar al carrito", "cfg.rec": "Recomendado",
  "cfg.missing": "Termina primero el paso {n}", "cfg.added": "Añadido ✓",
  "cfg.demo.single": "La misma graduación en todo el lente.", "cfg.demo.progressive": "Tres zonas sin línea: lejos arriba, lectura abajo.",
  "cfg.demo.blue": "Un tinte apenas visible que filtra parte de la luz azul.", "cfg.demo.sun": "Con el sol se oscurece; adentro vuelve a aclararse.",
  "cfg.demo.ar": "El reflejo desapareció. Eso hace el tratamiento, incluido en cada par.",

  "rx.none": "Esta opción no necesita receta.",
  "rx.readers": "Aumento de lectura",
  "rx.sph": "SPH", "rx.cyl": "CYL", "rx.axis": "EJE", "rx.add": "ADD",
  "rx.pd": "DP", "rx.pdStore": "La mido en la tienda", "rx.pdOwn": "Ya la tengo:",
  "rx.confirm": "Mi receta está vigente",
  "rx.howTo": "¿Cómo leer mi receta?",
  "rx.errAxis": "{eye}: agrega el EJE (1–180) cuando CYL no es 0.00.",
  "rx.errAdd": "Agrega el ADD de tu receta.", "rx.errPd": "Escribe tu DP (40–80 mm).", "rx.errConfirm": "Confirma que tu receta está vigente.", "rx.errReaders": "Elige el aumento de lectura.",
  "rx.sumNone": "Sin receta", "rx.sumReaders": "Lectura +{p}", "rx.sumPdStore": "DP en la tienda",
});
