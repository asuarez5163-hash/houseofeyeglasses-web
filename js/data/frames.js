// Armazones DE MUESTRA para el prototipo del flujo de compra (catálogo → ficha → lentes → carrito).
// No son productos reales: no hay marcas, no hay precios (price: null → "Price at launch"), y cada uno se dibuja
// con window.hoeFrameSVG(shape, color) (js/catalog.js). Cuando exista el catálogo real, esta lista se reemplaza.
// size: lens □ bridge temple (mm) · total = ancho total del frente · band: XN | N | M | W | XW (talla.html)
// cats: men | women | kids | sun · bridgeFit: standard | low (puente bajo / nariz baja) · rim: full | half | rimless
(() => {
  const C = {
    black:    { id: 'black',    c: '#1b1917', c2: '#1b1917', lens: 'transparent', i18nKey: 'color.black' },
    matte:    { id: 'matte',    c: '#2d2a27', c2: '#3a3733', lens: 'transparent', i18nKey: 'color.matte' },
    tortoise: { id: 'tortoise', c: '#6b3f1d', c2: '#8a5a2b', lens: 'transparent', i18nKey: 'color.tortoise' },
    honey:    { id: 'honey',    c: '#b8782e', c2: '#b8782e', lens: 'transparent', i18nKey: 'color.honey' },
    crystal:  { id: 'crystal',  c: '#c9c2b6', c2: '#a8a096', lens: 'transparent', i18nKey: 'color.crystal' },
    gold:     { id: 'gold',     c: '#b28834', c2: '#b28834', lens: 'transparent', i18nKey: 'color.gold' },
    silver:   { id: 'silver',   c: '#9a9a98', c2: '#9a9a98', lens: 'transparent', i18nKey: 'color.silver' },
    gunmetal: { id: 'gunmetal', c: '#5a5d61', c2: '#5a5d61', lens: 'transparent', i18nKey: 'color.gunmetal' },
    navy:     { id: 'navy',     c: '#23324d', c2: '#23324d', lens: 'transparent', i18nKey: 'color.navy' },
    olive:    { id: 'olive',    c: '#5c6342', c2: '#5c6342', lens: 'transparent', i18nKey: 'color.olive' },
    rose:     { id: 'rose',     c: '#c98a8a', c2: '#c98a8a', lens: 'transparent', i18nKey: 'color.rose' },
    burgundy: { id: 'burgundy', c: '#6e2434', c2: '#6e2434', lens: 'transparent', i18nKey: 'color.burgundy' },
    blue:     { id: 'blue',     c: '#6f8fb5', c2: '#6f8fb5', lens: 'transparent', i18nKey: 'color.blue' },
    brown:    { id: 'brown',    c: '#4a3426', c2: '#4a3426', lens: 'transparent', i18nKey: 'color.brown' },
    // sun lenses: the same frames with a tinted lens
    blackSun: { id: 'black',    c: '#1b1917', c2: '#1b1917', lens: 'rgba(52, 41, 30, .62)', i18nKey: 'color.black' },
    tortSun:  { id: 'tortoise', c: '#6b3f1d', c2: '#8a5a2b', lens: 'rgba(80, 52, 20, .55)',  i18nKey: 'color.tortoise' },
    goldSun:  { id: 'gold',     c: '#b28834', c2: '#b28834', lens: 'rgba(40, 60, 40, .55)',  i18nKey: 'color.gold' },
    gunSun:   { id: 'gunmetal', c: '#5a5d61', c2: '#5a5d61', lens: 'rgba(30, 30, 34, .6)',   i18nKey: 'color.gunmetal' },
  };
  const size = (lens, bridge, temple) => {
    const total = lens * 2 + bridge + 8;   // + rims and hinges, the usual approximation
    const band = total < 126 ? 'XN' : total < 131 ? 'N' : total < 138 ? 'M' : total < 145 ? 'W' : 'XW';
    return { lens, bridge, temple, total, band };
  };

  window.HOE_SAMPLE_FRAMES = [
    { id: 'dawnview',   nameKey: 'frame.dawnview',   shape: 'rect',     material: 'acetate',  colors: [C.black, C.tortoise, C.navy],  size: size(54, 18, 145), bridgeFit: 'standard', rim: 'full', cats: ['men'],           progressiveOk: true,  price: null },
    { id: 'bayshore',   nameKey: 'frame.bayshore',   shape: 'round',    material: 'metal',    colors: [C.gold, C.silver, C.gunmetal],  size: size(49, 21, 145), bridgeFit: 'standard', rim: 'full', cats: ['men', 'women'],  progressiveOk: true,  price: null },
    { id: 'hydepark',   nameKey: 'frame.hydepark',   shape: 'cateye',   material: 'acetate',  colors: [C.tortoise, C.black, C.rose],   size: size(52, 17, 140), bridgeFit: 'standard', rim: 'full', cats: ['women'],         progressiveOk: true,  price: null },
    { id: 'ybor',       nameKey: 'frame.ybor',       shape: 'square',   material: 'acetate',  colors: [C.crystal, C.black, C.olive],   size: size(50, 20, 145), bridgeFit: 'standard', rim: 'full', cats: ['men', 'women'],  progressiveOk: true,  price: null },
    { id: 'davis',      nameKey: 'frame.davis',      shape: 'aviator',  material: 'metal',    colors: [C.gold, C.gunmetal],            size: size(56, 16, 140), bridgeFit: 'low',      rim: 'full', cats: ['men', 'women'],  progressiveOk: false, price: null },
    { id: 'palma',      nameKey: 'frame.palma',      shape: 'browline', material: 'acetate',  colors: [C.black, C.tortoise, C.honey],  size: size(51, 20, 145), bridgeFit: 'standard', rim: 'half', cats: ['men'],           progressiveOk: true,  price: null },
    { id: 'seminole',   nameKey: 'frame.seminole',   shape: 'oval',     material: 'titanium', colors: [C.silver, C.gunmetal, C.gold],  size: size(50, 18, 140), bridgeFit: 'standard', rim: 'full', cats: ['women', 'men'],  progressiveOk: true,  price: null },
    { id: 'westchase',  nameKey: 'frame.westchase',  shape: 'geo',      material: 'acetate',  colors: [C.crystal, C.honey, C.burgundy],size: size(48, 21, 145), bridgeFit: 'standard', rim: 'full', cats: ['women'],         progressiveOk: false, price: null },
    { id: 'carrollwood',nameKey: 'frame.carrollwood',shape: 'rect',     material: 'titanium', colors: [C.gunmetal, C.brown, C.navy],   size: size(56, 17, 150), bridgeFit: 'standard', rim: 'rimless', cats: ['men'],        progressiveOk: true,  price: null },
    { id: 'riverview',  nameKey: 'frame.riverview',  shape: 'round',    material: 'tr90',     colors: [C.navy, C.olive, C.rose],       size: size(44, 17, 125), bridgeFit: 'low',      rim: 'full', cats: ['kids'],          progressiveOk: false, price: null },
    { id: 'ballast',    nameKey: 'frame.ballast',    shape: 'rect',     material: 'tr90',     colors: [C.black, C.blue, C.burgundy],   size: size(47, 16, 130), bridgeFit: 'low',      rim: 'full', cats: ['kids'],          progressiveOk: false, price: null },
    { id: 'anclote',    nameKey: 'frame.anclote',    shape: 'oval',     material: 'tr90',     colors: [C.rose, C.blue, C.crystal],     size: size(45, 16, 125), bridgeFit: 'low',      rim: 'full', cats: ['kids'],          progressiveOk: false, price: null },
    { id: 'gandy',      nameKey: 'frame.gandy',      shape: 'aviator',  material: 'metal',    colors: [C.goldSun, C.gunSun],           size: size(58, 15, 140), bridgeFit: 'low',      rim: 'full', cats: ['sun', 'men', 'women'], progressiveOk: false, price: null },
    { id: 'channelside',nameKey: 'frame.channelside',shape: 'square',   material: 'acetate',  colors: [C.blackSun, C.tortSun],         size: size(53, 19, 145), bridgeFit: 'standard', rim: 'full', cats: ['sun', 'men'],    progressiveOk: true,  price: null },
    { id: 'sunset',     nameKey: 'frame.sunset',     shape: 'cateye',   material: 'acetate',  colors: [C.tortSun, C.blackSun],         size: size(54, 18, 140), bridgeFit: 'standard', rim: 'full', cats: ['sun', 'women'],  progressiveOk: true,  price: null },
    { id: 'tarpon',     nameKey: 'frame.tarpon',     shape: 'round',    material: 'metal',    colors: [C.goldSun, C.gunSun],           size: size(50, 22, 145), bridgeFit: 'standard', rim: 'full', cats: ['sun', 'women', 'men'], progressiveOk: false, price: null },
  ];

  // names are proper nouns (Tampa places), the same in both languages; colours are translated
  const names = {};
  window.HOE_SAMPLE_FRAMES.forEach(f => { names[f.nameKey] = f.id.charAt(0).toUpperCase() + f.id.slice(1); });
  Object.assign(names, { 'frame.hydepark': 'Hyde Park', 'frame.palma': 'Palma Ceia' });
  const en = {
    'color.black': 'Black', 'color.matte': 'Matte black', 'color.tortoise': 'Tortoise', 'color.honey': 'Honey',
    'color.crystal': 'Crystal', 'color.gold': 'Gold', 'color.silver': 'Silver', 'color.gunmetal': 'Gunmetal',
    'color.navy': 'Navy', 'color.olive': 'Olive', 'color.rose': 'Rose', 'color.burgundy': 'Burgundy', 'color.blue': 'Blue', 'color.brown': 'Brown',
    'band.XN': 'Extra narrow', 'band.N': 'Narrow', 'band.M': 'Medium', 'band.W': 'Wide', 'band.XW': 'Extra wide',
    'rim.full': 'Full rim', 'rim.half': 'Half rim', 'rim.rimless': 'Rimless',
    'bridge.standard': 'Standard bridge', 'bridge.low': 'Low bridge fit',
    'prod.price.launch': 'Price at launch', 'prod.included': 'lenses included', 'prod.sample': 'Sample frame · not for sale yet',
    'catalogo.eta': 'Made to your prescription · ready in a few business days', 'prod.try': 'Try on (soon)',
  };
  const es = {
    'color.black': 'Negro', 'color.matte': 'Negro mate', 'color.tortoise': 'Carey', 'color.honey': 'Miel',
    'color.crystal': 'Cristal', 'color.gold': 'Dorado', 'color.silver': 'Plateado', 'color.gunmetal': 'Gris acero',
    'color.navy': 'Azul marino', 'color.olive': 'Verde oliva', 'color.rose': 'Rosa', 'color.burgundy': 'Vino', 'color.blue': 'Azul', 'color.brown': 'Café',
    'band.XN': 'Extra angosto', 'band.N': 'Angosto', 'band.M': 'Mediano', 'band.W': 'Ancho', 'band.XW': 'Extra ancho',
    'rim.full': 'Aro completo', 'rim.half': 'Medio aro', 'rim.rimless': 'Sin aro',
    'bridge.standard': 'Puente estándar', 'bridge.low': 'Puente bajo',
    'prod.price.launch': 'Precio al lanzamiento', 'prod.included': 'lentes incluidos', 'prod.sample': 'Armazón de muestra · todavía no está a la venta',
    'catalogo.eta': 'Hechos con tu receta · listos en pocos días hábiles', 'prod.try': 'Pruébatelos (pronto)',
  };
  if (window.HOE_I18N) { Object.assign(window.HOE_I18N.en, names, en); Object.assign(window.HOE_I18N.es, names, es); }

  // one card for the catalog and the home grid (css/styles.css .fcard). favs: a Set of ids saved to favourites.
  window.hoeFrameCard = function (f, favs) {
    const T = window.hoeT || (k => k);
    const col = f.colors[0];
    return `<li class="fcard" data-id="${f.id}">
      <a href="producto.html?id=${f.id}" data-press>
        <figure class="fcard-tile">${window.hoeFrameSVG(f.shape, col)}<span class="fcard-try" data-i18n="prod.try">${T('prod.try')}</span></figure>
        <div class="fcard-meta"><span class="fcard-name">${T(f.nameKey)}</span><span class="fcard-price" data-i18n="prod.price.launch">${T('prod.price.launch')}</span></div>
        <span class="fcard-size">${f.size.band} · ${f.size.total} mm</span>
        <ul class="fcard-swatches" aria-hidden="true">${f.colors.map(c => `<li style="--c:${c.c}"></li>`).join('')}</ul>
        <span class="fcard-eta" data-i18n="catalogo.eta">${T('catalogo.eta')}</span>
      </a>
      <button class="fcard-fav" type="button" aria-pressed="${!!(favs && favs.has(f.id))}" data-i18n-aria="prod.fav" aria-label="${T('prod.fav')}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5S3.5 15.4 3.5 9.3A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.5 2.5c0 6.1-8.5 11.2-8.5 11.2z"/></svg>
      </button>
    </li>`;
  };
  window.hoeFavs = () => { try { return new Set((localStorage.getItem('hoe-favs') || '').split(',').filter(Boolean)); } catch (e) { return new Set(); } };
  window.hoeToggleFav = id => { const s = window.hoeFavs(); s.has(id) ? s.delete(id) : s.add(id); try { localStorage.setItem('hoe-favs', [...s].join(',')); } catch (e) { /* storage blocked */ } return s.has(id); };

  window.hoeFrameById = id => window.HOE_SAMPLE_FRAMES.find(f => f.id === id) || null;
  window.hoeFrameSize = f => `${f.size.lens} □ ${f.size.bridge} — ${f.size.temple}`;
  window.hoeFrameSizeShort = f => `${f.size.lens} □ ${f.size.bridge} ${f.size.temple} · ${f.size.total} mm`;
})();
