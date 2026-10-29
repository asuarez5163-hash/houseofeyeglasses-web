(() => {
  const root = document.documentElement;
  root.classList.add('js');

  // ---------- which page (css hooks: body[data-page="receta"]) + the current category underlined in the nav ----------
  const herePage = location.pathname.split('/').pop() || 'index.html';
  document.body.dataset.page = herePage.replace(/\.html$/, '') || 'index';
  document.querySelectorAll('.main-nav a[href]').forEach(a => {
    const file = a.getAttribute('href').split('#')[0];
    if (file && file === herePage && !a.hash) a.setAttribute('aria-current', 'page');
  });
  // on a phone the row of categories scrolls sideways under a right-edge fade (css); at the end of the row the fade goes
  const navRow = document.querySelector('.main-nav ul');
  if (navRow) {
    const atEnd = () => navRow.classList.toggle('is-end', navRow.scrollWidth - navRow.clientWidth - navRow.scrollLeft < 6);
    navRow.addEventListener('scroll', atEnd, { passive: true }); window.addEventListener('resize', atEnd, { passive: true }); atEnd();
  }

  // ---------- language ----------
  const dict = window.HOE_I18N;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: language still switches for this visit */ } },
  };

  let lang = 'en';
  window.hoeLang = () => lang;
  window.hoeT = key => (dict[lang] && dict[lang][key]) || dict.en[key] || key;
  const tr = key => (dict[lang] && dict[lang][key]) || dict.en[key] || key;

  function setLang(next) {
    lang = dict[next] ? next : 'en';
    const t = dict[lang];
    root.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { const v = t[el.dataset.i18n]; if (v != null) el.textContent = v; });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { const v = t[el.dataset.i18nHtml]; if (v != null) el.innerHTML = v; });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { const v = t[el.dataset.i18nAria]; if (v != null) el.setAttribute('aria-label', v); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { const v = t[el.dataset.i18nPh]; if (v != null) el.placeholder = v; });
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    store.set('hoe-lang', lang);
    renderDynamic();
    document.dispatchEvent(new CustomEvent('hoe:lang', { detail: { lang } }));
  }
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  // ---------- press feedback: .is-pressed on pointerdown, off on release (never before 100ms, so a tap still reads) ----------
  (() => {
    const M = window.hoeMotion; if (!M) return;
    let el = null, t0 = 0, timer = 0;
    const release = () => {
      if (!el) return;
      const target = el; el = null;
      target.removeEventListener('pointerleave', release);
      clearTimeout(timer);
      const wait = 100 - (performance.now() - t0);
      if (wait > 0) timer = setTimeout(() => target.classList.remove('is-pressed'), wait);
      else target.classList.remove('is-pressed');
    };
    document.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const t = e.target.closest(M.PRESSABLE);
      if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true') return;
      release(); clearTimeout(timer);
      el = t; t0 = performance.now();
      t.classList.add('is-pressed');
      t.addEventListener('pointerleave', release);
    });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  })();

  // ---------- header: transparent over the hero, glass once the page moves (hysteresis: on past 80 px, off under 24) ----------
  // The header's box never changes height (no layout shift); the bar inside shrinks and gets the material (css).
  const header = document.querySelector('.site-header');
  const hdrBar = header.querySelector('.hdr-in');
  const syncHeader = () => root.style.setProperty('--header-h', hdrBar.offsetHeight + 'px');
  syncHeader();
  new ResizeObserver(syncHeader).observe(hdrBar);
  let glass = false;
  const setGlass = on => { if (glass === on) return; glass = on; header.classList.toggle('is-glass', on); };
  // phone: the 56 px bar slides away while the finger scrolls down and comes back as soon as it scrolls up (NN/g);
  // never on receta (the prescription form keeps a plain header), never while a panel or the search is open,
  // never with reduced motion.
  const phone = window.matchMedia('(max-width: 860px)');
  let hidden = false, lastY = Math.max(0, window.scrollY);
  const canHide = () => phone.matches && document.body.dataset.page !== 'receta' && !(window.hoeMotion && window.hoeMotion.reduced.matches)
    && !document.body.classList.contains('is-locked') && (document.getElementById('search-panel') || {}).hidden !== false;
  const setHidden = on => { if (hidden === on) return; hidden = on; header.classList.toggle('is-hidden', on); };
  const onScroll = () => {
    const y = Math.max(0, window.scrollY);
    if (!glass && y > 80) setGlass(true);
    else if (glass && y < 24) setGlass(false);
    const dy = y - lastY; lastY = y;
    if (!canHide()) { setHidden(false); return; }
    if (!hidden && dy > 2 && y > header.offsetHeight + 24) setHidden(true);
    else if (hidden && (dy < -2 || y < 40)) setHidden(false);
  };
  window.addEventListener('resize', () => { if (!phone.matches) setHidden(false); });
  window.addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
  onScroll();
  // in-page anchors scroll smoothly through JS (never `scroll-behavior: smooth` in css: it breaks ScrollTrigger)
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a || a.classList.contains('skip-link')) return;
    const el = document.getElementById(a.getAttribute('href').slice(1)); if (!el) return;
    e.preventDefault();
    const reduce = window.hoeMotion && window.hoeMotion.reduced.matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', a.getAttribute('href'));
  });

  // ---------- drawers (menu + cart) ----------
  const scrim = document.querySelector('.scrim');
  const menuBtn = document.querySelector('.menu-btn');
  const cartBtn = document.querySelector('.cart-btn');
  const panels = { drawer: document.getElementById('drawer'), cart: document.getElementById('cart') };
  const openers = { drawer: menuBtn, cart: cartBtn };
  let openPanel = null;
  let lastFocus = null;

  document.querySelectorAll('.drawer-cats > li, .drawer-secondary > li').forEach((li, i) => li.style.setProperty('--i', i));

  let closingTimer;
  function open(name) {
    if (openPanel) close(false);
    const p = panels[name];
    clearTimeout(closingTimer);
    p.classList.remove('is-closing');
    p.style.transform = '';
    lastFocus = document.activeElement;
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add('is-on'));
    p.inert = false;
    p.classList.add('is-open');
    openers[name].setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
    openPanel = name;
    setTimeout(() => p.querySelector('button, a')?.focus({ preventScroll: true }), 60);
  }
  let stopDrag = () => {};
  function close(restore = true, fromDrag = false) {
    if (!openPanel) return;
    const p = panels[openPanel];
    const name = openPanel;
    if (!fromDrag) stopDrag();
    // the items stay put while the panel slides out, then reset for the next open
    // (after a drag the panel is already off screen: nothing to keep visible)
    if (!fromDrag) p.classList.add('is-closing');
    p.classList.remove('is-open');
    if (!fromDrag) { p.classList.remove('is-dragging'); p.style.transform = ''; }
    p.inert = true;
    openers[name].setAttribute('aria-expanded', 'false');
    scrim.classList.remove('is-on');
    clearTimeout(closingTimer);
    closingTimer = setTimeout(() => { p.classList.remove('is-closing'); if (!openPanel) scrim.hidden = true; }, 340);
    document.body.classList.remove('is-locked');
    openPanel = null;
    if (restore && lastFocus) lastFocus.focus({ preventScroll: true });
  }
  // swipe the menu closed: it follows the finger 1:1 (rubber-band when pulled the wrong way), and on release a spring
  // carries on with the finger's speed; a flick projects to where it would stop and the nearer rest wins (open or closed).
  // Touching the panel while that spring runs grabs it where it is.
  (() => {
    const d = panels.drawer;
    const M = window.hoeMotion;
    let id = null, x0 = 0, y0 = 0, dx = 0, axis = null, hist = [], anim = null;
    const paint = x => { d.style.transform = `translateX(${x}px)`; scrim.style.opacity = String(Math.max(0, 1 + x / d.offsetWidth)); };
    const clear = () => { d.style.transform = ''; scrim.style.opacity = ''; };
    stopDrag = () => { if (anim) { anim.stop(); anim = null; } id = null; axis = null; dx = 0; d.classList.remove('is-dragging'); clear(); };
    d.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || openPanel !== 'drawer' || !M) return;
      id = e.pointerId; y0 = e.clientY; hist = [[e.clientX, performance.now()]];
      if (anim) {                                               // mid-spring: take over from where it is on screen
        anim.stop(); anim = null; axis = 'x'; x0 = e.clientX - dx;
        try { d.setPointerCapture(id); } catch (err) { /* synthetic pointer */ }
        d.classList.add('is-dragging');
      } else { axis = null; dx = 0; x0 = e.clientX; }
    });
    d.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      const mx = e.clientX - x0, my = e.clientY - y0;
      if (!axis) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;          // hysteresis before committing to a direction
        axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
        if (axis === 'x') { try { d.setPointerCapture(id); } catch (err) { /* synthetic pointer */ } d.classList.add('is-dragging'); }
      }
      if (axis !== 'x') return;
      hist.push([e.clientX, performance.now()]); if (hist.length > 12) hist.shift();
      dx = mx < 0 ? mx : (mx * 48) / (mx + 48);                 // a real object resists, it does not stick
      paint(dx);
    });
    const end = e => {
      if (e.pointerId !== id) return;
      id = null;
      if (axis !== 'x') return;
      const now = performance.now();
      const recent = hist.filter(([, t]) => now - t <= 80);      // only the last 80ms count: a pause before letting go means no speed
      const a = recent[0], b = recent[recent.length - 1];
      const v = recent.length > 1 && b[1] > a[1] ? ((b[0] - a[0]) / (b[1] - a[1])) * 1000 : 0;   // px/s, negative = leftwards
      const w = d.offsetWidth;
      const target = dx + M.project(v) < -w * .5 ? -w : 0;
      const flick = Math.abs(v) >= 250;
      anim = M.spring({
        from: dx, to: target, velocity: v, damping: flick ? .8 : 1, response: flick ? .3 : .32,
        onUpdate: x => { dx = x; paint(x); },
        onDone: () => {
          anim = null; axis = null;
          if (target === -w) {
            close(false, true);                                    // keep our transform: no CSS slide from where we are
            requestAnimationFrame(() => { clear(); dx = 0; requestAnimationFrame(() => d.classList.remove('is-dragging')); });
          } else { d.classList.remove('is-dragging'); clear(); dx = 0; }
        },
      });
    };
    d.addEventListener('pointerup', end);
    d.addEventListener('pointercancel', end);
  })();
  menuBtn.addEventListener('click', () => open('drawer'));
  cartBtn.addEventListener('click', () => open('cart'));
  document.querySelectorAll('[data-close="drawer"], [data-close="cart"], [data-close="all"]').forEach(el => el.addEventListener('click', () => close()));
  // links inside the drawer close it (in-page anchors for now)
  panels.drawer.querySelectorAll('a[href]').forEach(a => {
    const [file, hash] = a.getAttribute('href').split('#');
    if (hash !== undefined && (file === '' || file === herePage)) a.addEventListener('click', () => close(false));
  });

  // keep Tab inside the open panel
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (openPanel) close(); else closeSearch(); }
    if (e.key !== 'Tab' || !openPanel) return;
    const f = [...panels[openPanel].querySelectorAll('a[href], button:not([disabled]), input')].filter(el => !el.closest('[hidden]'));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // ---------- search (frames from the catalog index + tools, guides and help; synonyms EN/ES; honest empty state) ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  window.hoeEsc = esc;
  const searchBtn = document.querySelector('[data-open="search"]');
  const searchPanel = document.getElementById('search-panel');
  const qInput = document.getElementById('q');
  const resultsEl = document.getElementById('search-results');
  const emptyEl = document.getElementById('search-empty');
  const norm = t => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9. ]+/g, ' ');
  let frameIdx = null;                                    // [{ s: SKU, t: "Brand Model code colour" }], from hoeCatalog.search()
  function searchFrames(words) {
    if (!frameIdx || !words.length) return [];
    const hits = [];
    for (const it of frameIdx) {
      const hay = norm(`${it.t} ${it.s}`);
      let score = 0, ok = true;
      for (const w of words) { if (hay.includes(w)) score += 2; else { ok = false; break; } }
      if (!ok) continue;
      if (hay.startsWith(words[0])) score += 1;
      hits.push({ it, score });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, 5).map(r => ({ url: 'producto.html?id=' + encodeURIComponent(r.it.s), en: r.it.t, es: r.it.t, k: '', frame: true }));
  }
  function searchItems(q) {
    const idx = window.HOE_SEARCH || [];
    const words = norm(q).split(/\s+/).filter(w => w.length > 1);
    if (!words.length) return idx.slice(0, 6);
    const frames = searchFrames(words);
    const guides = idx.map(it => {
      const hay = norm(`${it.en} ${it.es} ${it.k}`);
      let score = 0;
      for (const w of words) { if (hay.includes(w)) score += 2; else if (w.length > 3 && hay.includes(w.slice(0, -1))) score += 1; else return null; }
      if (norm(it[lang] || it.en).includes(words[0])) score += 1;
      return { it, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 7).map(r => r.it);
    return frames.concat(guides.slice(0, Math.max(2, 7 - frames.length)));
  }
  function renderSearch() {
    if (!resultsEl) return;
    const q = qInput.value.trim();
    const items = searchItems(q);
    resultsEl.innerHTML = items.map((it, i) => `<li role="option" id="sr-${i}"${it.frame ? ' class="is-frame"' : ''}><a href="${it.url}">${esc(it[lang] || it.en)}</a></li>`).join('');
    emptyEl.hidden = items.length > 0;
    if (!items.length) emptyEl.textContent = tr('search.none').replace('{q}', q);
    qInput.setAttribute('aria-expanded', String(items.length > 0));
  }
  function openSearch() {
    searchPanel.hidden = false; searchBtn.setAttribute('aria-expanded', 'true'); renderSearch(); qInput.focus();
    if (!frameIdx && window.hoeCatalog) window.hoeCatalog.search().then(list => { frameIdx = list; renderSearch(); });
  }
  function closeSearch() { if (!searchPanel || searchPanel.hidden) return; searchPanel.hidden = true; searchBtn.setAttribute('aria-expanded', 'false'); searchBtn.focus(); }
  searchBtn?.addEventListener('click', () => (searchPanel.hidden ? openSearch() : closeSearch()));
  searchPanel?.querySelector('[data-close="search"]').addEventListener('click', closeSearch);
  qInput?.addEventListener('input', renderSearch);
  document.getElementById('search-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const first = resultsEl.querySelector('a');
    if (first && qInput.value.trim()) window.location.href = first.getAttribute('href');
  });
  document.addEventListener('hoe:lang', renderSearch);

  // ---------- the frame card (home grid, catalog, categories, cart): paper tile with the first photo of the sprite
  // (assets/frames/<SKU>.webp, hoeCatalog.sprite), "Brand Model" · the real price, one dot per colour sibling (f.v) ----------
  const CAT = window.hoeCatalog;
  window.hoeFrameCard = function (f) {
    const sib = [{ id: f.id, col: f.col }, ...(f.v || [])];
    const label = `${CAT.name(f)} · ${CAT.colorName(f)}`;
    return `<li class="fcard" data-id="${esc(f.id)}">
      <a href="producto.html?id=${encodeURIComponent(f.id)}" data-press>
        <figure class="fcard-tile paper"><div class="fcard-img" role="img" aria-label="${esc(label)}" data-ph="${f.ph}" data-bg="${esc(CAT.img(f))}" style="--ph:${f.ph}"></div></figure>
        <div class="fcard-meta"><span class="fcard-name">${esc(CAT.name(f))}</span><span class="fcard-price">${CAT.price(f.p)}</span></div>
        <ul class="fcard-swatches" aria-hidden="true">${sib.map((s, i) => `<li data-sku="${esc(s.id)}"${i ? '' : ' class="is-on"'} style="--c:${CAT.colorHex(s.col)}"></li>`).join('')}</ul>
      </a>
    </li>`;
  };
  // the photos load when a tile comes near the screen (IntersectionObserver), whoever painted the card: one observer for
  // the whole document watches for new .fcard-img[data-bg] (the catalog paints 36 at a time; a phone only fetches what it shows)
  (() => {
    const show = el => { if (el.dataset.bgd) return; el.dataset.bgd = '1'; el.style.backgroundImage = `url('${el.dataset.bg}')`; };
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); show(en.target); } }), { rootMargin: '480px 0px' }) : null;
    const arm = root => (root.querySelectorAll ? root.querySelectorAll('.fcard-img[data-bg]:not([data-bgd])') : []).forEach(el => (io ? io.observe(el) : show(el)));
    window.hoeLazy = arm;
    arm(document);
    if ('MutationObserver' in window) new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) arm(n); }))).observe(document.body, { childList: true, subtree: true });
  })();
  // hover on a card: a colour dot under the pointer swaps the photo for that sibling's (its sprite, front view, preloaded on
  // entering the card); leaving the dot or the card brings the frame's own photo back. One listener for every card, present and future.
  (() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const pre = new Set();
    const preload = src => { if (pre.has(src)) return; pre.add(src); const i = new Image(); i.decoding = 'async'; i.src = src; };
    const imgOf = card => card.querySelector('.fcard-img');
    const restore = (img, card) => { img.classList.remove('is-alt'); img.dataset.bgd = '1'; img.style.backgroundImage = `url('${img.dataset.bg}')`; card.querySelectorAll('.fcard-swatches li').forEach(li => li.classList.toggle('is-on', li.dataset.sku === card.dataset.id)); };
    document.addEventListener('pointerover', e => {
      if (!fine.matches) return;
      const link = e.target.closest('.fcard > a'); if (!link) return;
      const card = link.closest('.fcard'), img = imgOf(card); if (!img) return;
      if (!link.dataset.pre) { link.dataset.pre = '1'; card.querySelectorAll('.fcard-swatches li[data-sku]').forEach(li => { if (li.dataset.sku !== card.dataset.id) preload(CAT.img(li.dataset.sku)); }); }
      const sw = e.target.closest('.fcard-swatches li[data-sku]');
      if (sw && sw.dataset.sku !== card.dataset.id) {
        const src = CAT.img(sw.dataset.sku); preload(src);
        img.classList.add('is-alt'); img.style.backgroundImage = `url('${src}')`;
        card.querySelectorAll('.fcard-swatches li').forEach(li => li.classList.toggle('is-on', li === sw));
        return;
      }
      if (img.classList.contains('is-alt')) restore(img, card);
    });
    document.addEventListener('pointerout', e => {
      const link = e.target.closest('.fcard > a'); if (!link || (e.relatedTarget && link.contains(e.relatedTarget))) return;
      const card = link.closest('.fcard'), img = imgOf(card);
      if (img && img.classList.contains('is-alt')) restore(img, card);
    });
  })();

  // ---------- home · 4: the best sellers (manifest.featuredItems, up to 12), asked for once the block comes within 600 px of the
  // screen (the hero photo and the video bands go first), fetched once and re-painted on each language switch ----------
  let homeList = null, homeAsked = false, homeIO = null;
  function askHome() {
    if (homeAsked) return;
    homeAsked = true;
    CAT.featured().then(list => {
      homeList = list; paintHome();
      // the block just grew by twelve tiles: every ScrollTrigger below it (the figures, the reveals, the band's parallax)
      // keeps the positions measured with the block empty until a refresh
      if (window.hoeMotion) requestAnimationFrame(() => window.hoeMotion.refresh());
    });
  }
  function paintHome() {
    const samples = document.getElementById('home-samples'); if (!samples) return;
    if (!homeList.length) { samples.innerHTML = `<li class="look-empty" data-i18n="cat.updating">${esc(tr('cat.updating'))}</li>`; return; }
    samples.innerHTML = homeList.slice(0, 12).map(f => window.hoeFrameCard(f)).join('');
    if (window.hoeMotion) window.hoeMotion.reveal(samples, { stagger: 60 });
  }
  function renderDynamic() {
    if (document.body.dataset.page === 'index') document.title = tr('index.docTitle');
    const samples = document.getElementById('home-samples');
    if (!samples || !CAT) return;
    if (homeList) { paintHome(); return; }
    if (homeAsked || homeIO) return;
    const block = samples.closest('section') || samples;
    if ('IntersectionObserver' in window) {
      homeIO = new IntersectionObserver(entries => { if (entries.some(en => en.isIntersecting)) { homeIO.disconnect(); askHome(); } }, { rootMargin: '600px 0px' });
      homeIO.observe(block);
    } else askHome();
  }

  // first paint in the visitor's language (arms the best sellers: they are fetched when block 4 comes near)
  const saved = store.get('hoe-lang');
  setLang(saved || ((navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en'));

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- reveal on scroll (what is already on screen shows at once; the rest enters as you reach it) ----------
  window.hoeMotion?.reveal(document);

  // =========================================================
  // Home page: the temple drawing, the video bands, the figures, the load choreography
  // =========================================================
  const M = window.hoeMotion;

  // 5 · the temple with the three numbers marked (shared drawing with talla.html)
  const fitTemple = document.getElementById('fit-temple');
  if (fitTemple && window.hoeTempleSVG) fitTemple.innerHTML = window.hoeTempleSVG('52 □ 18 — 140', null, { marks: true });

  // 3 and 6 · the video bands load and play only on screen (poster with reduced motion or saveData)
  if (M) document.querySelectorAll('video[data-band]').forEach(M.band);

  // the category rail on a phone: the right-edge fade goes at the end of the row
  const rail = document.querySelector('.cat-row');
  if (rail) {
    const atEnd = () => rail.classList.toggle('is-end', rail.scrollWidth - rail.clientWidth - rail.scrollLeft < 6);
    rail.addEventListener('scroll', atEnd, { passive: true }); window.addEventListener('resize', atEnd, { passive: true }); atEnd();
  }

  if (M && M.hasGsap && document.body.dataset.page === 'index') M.ready((gsap, ST) => {
    // ---------- 1 · load choreography, first visit of the session (1.1 s): the veil settles, the kicker, the headline
    // lines rise one by one out of their mask, the lead, the buttons. Nothing blocks a click. ----------
    const h1 = document.getElementById('hero-title');
    const heroText = document.querySelector('.hero-text');
    let seen = true; try { seen = !!sessionStorage.getItem('hoe-intro'); } catch (e) { seen = true; }
    if (!seen && h1 && heroText && root.classList.contains('intro')) {
      const kicker = heroText.querySelector('.kicker'), lead = heroText.querySelector('.hero-lead'), actions = heroText.querySelector('.hero-actions');
      const veil = document.querySelector('.hero-veil'), cue = document.querySelector('.hero-scroll');
      gsap.set([kicker, lead, actions, cue], { autoAlpha: 0 });
      gsap.set(veil, { opacity: 0 });
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.to(veil, { opacity: 1, duration: .9, ease: 'power2.out', clearProps: 'opacity' }, 0)
        .to(kicker, { autoAlpha: 1, y: 0, duration: .6, clearProps: 'all' }, .15)
        .add(M.lines(h1, { duration: 1, stagger: .09 }), .22)
        .fromTo(lead, { y: 16 }, { autoAlpha: 1, y: 0, duration: .8, clearProps: 'all' }, .62)
        .fromTo(actions, { y: 12 }, { autoAlpha: 1, y: 0, duration: .8, clearProps: 'all' }, .78)
        .to(cue, { autoAlpha: 1, duration: .6, clearProps: 'all' }, 1.0);
      setTimeout(() => root.classList.remove('intro'), 700);          // the css hide hands over to the inline values above
      try { sessionStorage.setItem('hoe-intro', '1'); } catch (e) { /* storage blocked: the intro plays again next time */ }
    } else root.classList.remove('intro');

    // ---------- parallax only on the media that bleeds: the hero photo and the two video bands (scrub, y ±6 %) ----------
    const mm = gsap.matchMedia();
    mm.add('(min-width: 861px)', () => {
      const heroImg = document.querySelector('.hero-media');
      if (heroImg) gsap.to(heroImg, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
      document.querySelectorAll('.media-band__media').forEach(m => M.parallax(m, .06, { trigger: m.closest('.media-band') }));
    });

    // ---------- 5 · once, at 80 %: the temple draws itself (900 ms), the marks and numbers follow, the figures count up ----------
    const templeSvg = fitTemple && fitTemple.querySelector('svg');
    const nums = [...document.querySelectorAll('#fit-nums .num')];
    if (templeSvg) {
      const numsText = templeSvg.querySelector('.temple-nums'), marks = templeSvg.querySelector('.temple-nums-marks');
      gsap.set(numsText, { opacity: 0 });
      const drawTl = M.draw(templeSvg, { duration: .9, stagger: .05 }); if (drawTl) drawTl.pause();
      ST.create({
        trigger: fitTemple, start: 'top 82%', once: true,
        onEnter: () => {
          if (drawTl) drawTl.play();
          if (marks) M.draw(marks, { duration: .6, delay: .3 });
          gsap.to(numsText, { opacity: 1, duration: .3, delay: .5, clearProps: 'opacity' });
        },
      });
    }
    nums.forEach(el => M.count(el, el.dataset.count || el.textContent, { trigger: fitTemple || el, start: 'top 82%', duration: .9 }));
  });
})();
