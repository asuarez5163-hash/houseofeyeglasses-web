// Style page (<style>-glasses.html) and styles index (styles.html). The frames, the links and every text are already in
// the HTML (the Central writes them: lib/optica/paginas.py); the page brings its own texts in both languages inside
// <script id="style-data"> ({ t: { en: { h1, lead, title, all }, es: {…} } }), filled by the Central from the dictionary,
// so this only shows the ones of the language the visitor chose (EN | ES translates the page in place).
(() => {
  const lang = () => (window.hoeLang ? window.hoeLang() : 'en');
  let d = null;
  try { const el = document.getElementById('style-data'); d = el ? JSON.parse(el.textContent) : null; } catch (e) { d = null; }
  const put = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.textContent = v; };
  function paint() {
    if (!d || !d.t) { if (document.body.dataset.page === 'estilos' && window.hoeT) document.title = window.hoeT('estilos.meta'); return; }
    const t = d.t[lang()] || d.t.en || {};
    put('style-h1', t.h1); put('style-lead', t.lead); put('style-all-t', t.all);
    if (t.title) document.title = t.title;
  }
  paint();
  document.addEventListener('hoe:lang', paint);
})();
