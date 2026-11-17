// Brand page — title test (11/16). For the brands in the test, the Central (lib/optica/paginas.py → PRUEBA_TITULOS) writes
// the "prescription glasses" title and headline in the HTML and leaves both languages in <script id="brand-data">
// ({ rx: { en: { meta, h1 }, es: { meta, h1 } } }). js/pages/marca.js repaints the title and the headline from the
// dictionary on load and on EN | ES; this runs after it (same events, loaded later) and puts the test's text back.
// Brands without `rx` are untouched. A new file, not marca.js: the CDN keeps a published script for 30 days under the
// same ?v= (CLAUDE.md). Remove (or merge into marca.js) when the test ends.
(() => {
  let rx = null;
  try { const el = document.getElementById('brand-data'); rx = el ? (JSON.parse(el.textContent) || {}).rx : null; } catch (e) { rx = null; }
  if (!rx || !rx.en) return;
  const lang = () => (window.hoeLang ? window.hoeLang() : 'en');
  const h1 = document.getElementById('brand-h1');
  function paint() {
    const t = rx[lang()] || rx.en;
    if (h1 && t.h1) h1.textContent = t.h1;
    if (t.meta) document.title = t.meta;
  }
  paint();
  document.addEventListener('hoe:lang', paint);
})();
