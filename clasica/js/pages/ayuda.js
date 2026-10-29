// Ayuda / Help: búsqueda instantánea sobre las preguntas frecuentes.
// Busca en EN y ES a la vez (sin importar el idioma en pantalla), ignora acentos y guiones,
// y entiende sinónimos simples (lentes/anteojos/glasses, receta/Rx, DP/PD, graduación/power…).
(() => {
  const input = document.getElementById('help-q');
  if (!input) return;

  const D = window.HOE_I18N;
  const lang = () => (window.hoeLang ? window.hoeLang() : 'en');
  const t = (k, vars) => {
    const s = (D[lang()] && D[lang()][k]) || D.en[k] || k;
    return vars ? s.replace(/\{(\w+)\}/g, (m, v) => (vars[v] != null ? vars[v] : m)) : s;
  };

  // ---------- text normalization ----------
  const deaccent = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const stripTags = s => String(s || '').replace(/<[^>]+>/g, ' ');
  const clean = s => deaccent(stripTags(s)).replace(/[^a-z0-9]+/g, ' ').trim();

  // Grupos de sinónimos (ya normalizados). "gafas" y "espejuelos" solo se ACEPTAN al buscar; el sitio escribe "lentes".
  const SYN = [
    ['glasses', 'eyeglasses', 'spectacles', 'lentes', 'anteojos', 'espejuelos', 'gafas', 'optica'],
    ['lens', 'lenses', 'lente', 'lentes', 'mica', 'micas', 'cristal', 'cristales'],
    ['prescription', 'prescriptions', 'rx', 'receta', 'recetas', 'formula', 'prescripcion'],
    ['power', 'strength', 'graduacion', 'graduado', 'graduados', 'aumento', 'sph', 'esfera', 'dioptria', 'dioptrias', 'diopter', 'diopters'],
    ['progressive', 'progressives', 'progresivo', 'progresivos', 'multifocal', 'multifocales', 'bifocal', 'bifocales', 'varifocal', 'varifocals'],
    ['pd', 'dp', 'pupillary', 'pupilar', 'pupilas', 'pupils'],
    ['reading', 'readers', 'reader', 'lectura', 'leer'],
    ['blue', 'azul', 'screen', 'screens', 'pantalla', 'pantallas', 'computer', 'computadora', 'digital'],
    ['antireflective', 'antirreflejo', 'antireflejo', 'reflejo', 'reflejos', 'glare', 'brillo', 'brillos'],
    ['scratch', 'scratches', 'rayas', 'rayones', 'antirrayas', 'antirayas'],
    ['uv', 'ultraviolet', 'ultravioleta'],
    ['photochromic', 'transitions', 'fotocromatico', 'fotocromaticos', 'lightresponsive'],
    ['sun', 'sunglasses', 'sol', 'polarized', 'polarizado', 'polarizados', 'tint', 'tinte'],
    ['thin', 'thinner', 'delgado', 'delgados', 'index', 'indice', 'thickness', 'grosor', 'grueso', 'gruesos', 'polycarbonate', 'policarbonato'],
    ['astigmatism', 'astigmatismo', 'cyl', 'cylinder', 'cilindro', 'axis', 'eje'],
    ['measure', 'measuring', 'medir', 'mido', 'medida', 'ruler', 'regla'],
    ['insurance', 'seguro', 'seguros', 'aseguradora', 'vsp', 'eyemed', 'claim', 'reclamo', 'reimbursement', 'network'],
    ['fsa', 'hsa', 'savings', 'ahorro'],
    ['return', 'returns', 'devolucion', 'devoluciones', 'devolver', 'refund', 'exchange', 'cambio', 'cambiar'],
    ['shipping', 'ship', 'envio', 'envios', 'delivery', 'entrega', 'enviar'],
    ['track', 'tracking', 'rastrear', 'rastreo', 'seguimiento'],
    ['order', 'orders', 'pedido', 'pedidos', 'orden', 'ordenes', 'compra'],
    ['account', 'cuenta', 'login', 'signin', 'password', 'contrasena'],
    ['size', 'sizes', 'talla', 'tallas', 'tamano', 'fit', 'medidas', 'width', 'ancho', 'measurements'],
    ['face', 'cara', 'rostro', 'shape', 'forma'],
    ['kids', 'kid', 'children', 'child', 'ninos', 'nino', 'nina', 'ninas', 'hijo', 'hija', 'hijos', 'infantil'],
    ['expired', 'expire', 'expiration', 'vencida', 'vencido', 'caducada', 'vencimiento'],
    ['frame', 'frames', 'armazon', 'armazones', 'montura', 'monturas', 'marco', 'aros'],
    ['adjust', 'adjustment', 'ajustar', 'ajuste', 'loose', 'flojo', 'flojos', 'tight', 'aprietan', 'apretado', 'slide', 'slipping', 'resbalan'],
    ['spanish', 'espanol', 'english', 'ingles', 'idioma', 'language'],
    ['contact', 'contacto', 'phone', 'telefono', 'call', 'llamar', 'email', 'correo', 'whatsapp'],
    ['pay', 'payment', 'pagar', 'pago', 'card', 'tarjeta'],
  ];
  const STOP = new Set(('the a an and or of to for in on at my i me do does is are can how what which with your you it be get from ' +
    'el la los las un una unos unas de del y o a en para por mi mis como que cual cuales con se es son puedo tu te lo al su').split(' '));

  // ---------- index: every Q&A in both languages + its keywords ----------
  const items = [...document.querySelectorAll('.faq-item')].map(el => {
    const qk = el.querySelector('[data-i18n]').dataset.i18n;
    const ak = el.querySelector('[data-i18n-html]').dataset.i18nHtml;
    const all = [D.en[qk], D.en[ak], D.es && D.es[qk], D.es && D.es[ak], el.dataset.k].join(' ');
    const text = clean(all);
    const joined = clean(all.replace(/-/g, ''));           // "anti-reflective" también como "antireflective"
    const words = [...new Set((text + ' ' + joined).split(' '))];
    return { el, hay: ' ' + text + ' ' + joined + ' ', words, set: new Set(words) };
  });
  const cats = [...document.querySelectorAll('.help-cat')];
  const tocLinks = [...document.querySelectorAll('.help-toc [data-cat]')];
  const empty = document.getElementById('help-empty');
  const status = document.getElementById('help-status');
  const clearBtn = document.getElementById('help-clear');
  const page = document.querySelector('.help');

  function expand(tok) {
    const out = new Set();
    SYN.forEach(g => { if (g.some(m => m === tok || (tok.length >= 4 && m.startsWith(tok)))) g.forEach(m => out.add(m)); });
    out.delete(tok);
    return out;
  }
  // Lo que escribe la persona: ≤2 letras = palabra exacta (PD, Rx, UV), 3 = inicio de palabra, 4+ = en cualquier parte.
  const hitTyped = (it, w) => (w.length <= 2 ? it.set.has(w) : w.length === 3 ? it.words.some(x => x.startsWith(w)) : it.hay.includes(w));
  // Sinónimos: palabra exacta si son cortos, inicio de palabra si no (evita que "red" encuentre "reduce").
  const hitSyn = (it, w) => (w.length <= 3 ? it.set.has(w) : it.words.some(x => x.startsWith(w)));

  function tokens(q) {
    const all = clean(q).split(' ').filter(w => w.length > 1);
    const content = all.filter(w => !STOP.has(w));
    return content.length ? content : all;
  }

  let query = '';
  function run(raw, { fromUser = true } = {}) {
    query = (raw || '').trim();
    const toks = tokens(query);
    const active = toks.length > 0;
    const plans = toks.map(w => ({ w, syn: [...expand(w)] }));
    let n = 0;
    items.forEach(it => {
      const ok = !active || plans.every(p => hitTyped(it, p.w) || p.syn.some(s => hitSyn(it, s)));
      it.el.hidden = !ok;
      if (active && ok) { n++; if (!it.el.open) { it.el.open = true; it.el.dataset.auto = '1'; } }
      if (!active && it.el.dataset.auto) { it.el.open = false; delete it.el.dataset.auto; }
      if (active && !ok && it.el.dataset.auto) { it.el.open = false; delete it.el.dataset.auto; }
    });
    cats.forEach(c => { c.hidden = !c.querySelector('.faq-item:not([hidden])'); });
    tocLinks.forEach(a => { a.parentElement.hidden = document.getElementById(a.dataset.cat).hidden; });
    empty.hidden = !active || n > 0;
    page.classList.toggle('is-searching', active);
    clearBtn.hidden = !query;
    renderStatus(active, n);
    if (fromUser && input.value !== raw) input.value = raw;
  }
  function renderStatus(active = tokens(query).length > 0, n = items.filter(it => !it.el.hidden).length) {
    const q = query.length > 40 ? query.slice(0, 40) + '…' : query;
    status.textContent = !active ? '' : n === 0 ? t('ayuda.none', { q }) : t(n === 1 ? 'ayuda.count1' : 'ayuda.countN', { n, q });
    status.classList.toggle('is-empty', active && n === 0);
  }

  input.addEventListener('input', () => run(input.value, { fromUser: false }));
  document.getElementById('help-search').addEventListener('submit', e => {
    e.preventDefault();
    const first = items.find(it => !it.el.hidden);
    if (query && first) first.el.querySelector('summary').focus();
  });
  function clearSearch() { input.value = ''; run('', { fromUser: false }); input.focus(); }
  clearBtn.addEventListener('click', clearSearch);
  document.getElementById('help-empty-clear').addEventListener('click', clearSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Escape' && input.value) { e.preventDefault(); e.stopPropagation(); clearSearch(); } });
  document.querySelectorAll('.help-pop-btn').forEach(b => b.addEventListener('click', () => { input.value = b.textContent.trim(); run(input.value, { fromUser: false }); input.focus(); }));

  // ---------- deep links: ayuda.html#pd opens that answer; ?q=receta pre-fills the search ----------
  function openFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id && document.getElementById(id);
    if (el && el.matches('details.faq-item')) {
      if (el.hidden) { input.value = ''; run('', { fromUser: false }); }
      el.open = true;
      requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
    }
  }
  window.addEventListener('hashchange', openFromHash);
  const preset = new URLSearchParams(location.search).get('q');
  if (preset) { input.value = preset.slice(0, 80); run(input.value, { fromUser: false }); }
  if (location.hash) openFromHash();

  // ---------- FAQ structured data (current language) + page title ----------
  function schema() {
    const data = {
      '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: lang() === 'es' ? 'es-US' : 'en-US',
      mainEntity: items.map(it => ({
        '@type': 'Question',
        name: it.el.querySelector('.faq-q').textContent.trim(),
        acceptedAnswer: { '@type': 'Answer', text: it.el.querySelector('.faq-a').innerHTML.trim() },
      })),
    };
    let tag = document.getElementById('faq-schema');
    if (!tag) { tag = document.createElement('script'); tag.type = 'application/ld+json'; tag.id = 'faq-schema'; document.head.appendChild(tag); }
    tag.textContent = JSON.stringify(data);
    document.title = t('ayuda.metaTitle');
  }
  schema();
  document.addEventListener('hoe:lang', () => { renderStatus(); schema(); });
})();
