// Medidor de DP (11/17): los textos que la ficha de producto (js/pages/producto.js) enseña del medidor de pd.html: el enlace
// «Mídela con tu cámara» de la tarjeta «?» del DP y la nota bajo la DP que se rellenó desde la herramienta. Diccionario aparte
// (el de la página, js/i18n/pd.js, es grande y la ficha no lo necesita). Prefijo pdm.prod.*: js/i18n/producto.js ya usa pd.*.
window.HOE_I18N = window.HOE_I18N || { en: {}, es: {} };
Object.assign(window.HOE_I18N.en, {
  "pdm.prod.cam": "Measure it with your camera",
  "pdm.prod.camBtn": "No PD? Measure it with your camera",
  // «Lens options» on the frame page (11/17): these three live in js/i18n/tipo2.js, which the frame page does not load
  "tp.n.hi": "High-index lenses", "tp.n.ar": "Anti-glare glasses", "tp.n.poly": "Polycarbonate lenses",
  "pdm.prod.noteCam": "Measured with your camera on {date}",
  "pdm.prod.noteMan": "Saved from the PD tool on {date}",
});
Object.assign(window.HOE_I18N.es, {
  "pdm.prod.cam": "Mídela con tu cámara",
  "pdm.prod.camBtn": "¿No tienes tu DP? Mídela con tu cámara",
  "tp.n.hi": "Lentes de alto índice", "tp.n.ar": "Espejuelos antirreflejo", "tp.n.poly": "Lentes de policarbonato",
  "pdm.prod.noteCam": "Medida con tu cámara el {date}",
  "pdm.prod.noteMan": "Guardada desde la herramienta de DP el {date}",
});
