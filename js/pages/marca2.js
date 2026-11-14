// Brand page (<brand>-eyeglasses.html): the brand's own block under the grid (#brand-about). The Central writes it in
// English in the HTML and leaves both languages in <script id="brand-data"> ({ about: { en, es } }, composed from the
// brand's frames: lib/optica/paginas.py → sobre_marca); this only shows the one of the language the visitor chose
// (EN | ES translates the page in place). A new file, not js/pages/marca.js: the CDN keeps a published script for 30 days
// under the same ?v= (CLAUDE.md). To merge into marca.js at the next ASSET_V change.
(() => {
  const box = document.getElementById('brand-about');
  if (!box) return;
  let about = null;
  try { const el = document.getElementById('brand-data'); about = el ? (JSON.parse(el.textContent) || {}).about : null; } catch (e) { about = null; }
  if (!about || !about.en) return;
  const lang = () => (window.hoeLang ? window.hoeLang() : 'en');
  let shown = 'en';                                                   // what the HTML came with
  function paint() {
    const l = about[lang()] ? lang() : 'en';
    if (l === shown) return;
    box.innerHTML = about[l];
    shown = l;
  }
  paint();
  document.addEventListener('hoe:lang', paint);
})();
