// Medidor de DP (11/17): los textos que la ficha de producto (js/pages/producto.js) enseña del medidor de pd.html: el enlace
// «Mídela con tu cámara» de la tarjeta «?» del DP y la nota bajo la DP que se rellenó desde la herramienta. Diccionario aparte
// (el de la página, js/i18n/pd.js, es grande y la ficha no lo necesita). Prefijo pdm.prod.*: js/i18n/producto.js ya usa pd.*.
window.HOE_I18N = window.HOE_I18N || { en: {}, es: {} };
Object.assign(window.HOE_I18N.en, {
  "pdm.prod.cam": "Measure it with your camera",
  "pdm.prod.noteCam": "Measured with your camera on {date}",
  "pdm.prod.noteMan": "Saved from the PD tool on {date}",
});
Object.assign(window.HOE_I18N.es, {
  "pdm.prod.cam": "Mídela con tu cámara",
  "pdm.prod.noteCam": "Medida con tu cámara el {date}",
  "pdm.prod.noteMan": "Guardada desde la herramienta de DP el {date}",
});
