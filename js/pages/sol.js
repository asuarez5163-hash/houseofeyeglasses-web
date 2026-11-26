// Sunglasses pages written by the Central (11/25, lib/optica/sol.py): <brand>-sunglasses.html and the sunglasses style
// pages (womens-sunglasses.html…). The frames, the links and every text are already in the HTML; the page brings its own
// texts in both languages inside <script id="sol-data"> ({ t: { en: { h1, lead, title, all }, es: {…} }, about: { en, es } }),
// so this only shows the ones of the language the visitor chose (EN | ES translates the page in place). A new file: the
// CDN keeps a published script for 30 days under the same ?v= (CLAUDE.md).
(() => {
  const lang = () => (window.hoeLang ? window.hoeLang() : 'en');
  let d = null;
  try { const el = document.getElementById('sol-data'); d = el ? JSON.parse(el.textContent) : null; } catch (e) { d = null; }
  if (!d || !d.t) return;
  const put = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.textContent = v; };
  const box = document.getElementById('sol-about');
  let shown = 'en';                                                   // the language the HTML came with
  function paint() {
    const l = d.t[lang()] ? lang() : 'en', t = d.t[l] || {};
    put('sol-h1', t.h1); put('sol-lead', t.lead); put('sol-all-t', t.all);
    if (t.title) document.title = t.title;
    if (box && d.about && d.about[l] && l !== shown) { box.innerHTML = d.about[l]; shown = l; }
  }
  paint();
  document.addEventListener('hoe:lang', paint);
})();
