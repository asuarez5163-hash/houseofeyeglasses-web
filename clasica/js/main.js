(() => {
  const root = document.documentElement;
  root.classList.add('js');

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

  // ---------- header height (search panel sticks under it) ----------
  const header = document.querySelector('.site-header');
  const syncHeader = () => root.style.setProperty('--header-h', header.offsetHeight + 'px');
  syncHeader();
  new ResizeObserver(syncHeader).observe(header);
  // compact header after the hero starts to scroll (hysteresis avoids flicker at the threshold)
  let compact = false;
  const onScroll = () => {
    const y = window.scrollY;
    if (!compact && y > 120) { compact = true; header.classList.add('is-compact'); }
    else if (compact && y < 40) { compact = false; header.classList.remove('is-compact'); }
  };
  window.addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
  onScroll();

  // ---------- drawers (menu + cart) ----------
  const scrim = document.querySelector('.scrim');
  const menuBtn = document.querySelector('.menu-btn');
  const cartBtn = document.querySelector('.cart-btn');
  const panels = { drawer: document.getElementById('drawer'), cart: document.getElementById('cart') };
  const openers = { drawer: menuBtn, cart: cartBtn };
  let openPanel = null;
  let lastFocus = null;

  document.querySelectorAll('.drawer-primary > li, .drawer-secondary > li').forEach((li, i) => li.style.setProperty('--i', i));

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
  function close(restore = true) {
    if (!openPanel) return;
    const p = panels[openPanel];
    const name = openPanel;
    // the items stay put while the panel slides out, then reset for the next open
    p.classList.add('is-closing');
    p.classList.remove('is-open', 'is-dragging');
    p.style.transform = '';
    p.inert = true;
    openers[name].setAttribute('aria-expanded', 'false');
    scrim.classList.remove('is-on');
    clearTimeout(closingTimer);
    closingTimer = setTimeout(() => { p.classList.remove('is-closing'); if (!openPanel) scrim.hidden = true; }, 420);
    document.body.classList.remove('is-locked');
    openPanel = null;
    if (restore && lastFocus) lastFocus.focus({ preventScroll: true });
  }
  // swipe the menu closed: it follows the finger 1:1, then a flick or half the width lets it go
  (() => {
    const d = panels.drawer;
    let id = null, x0 = 0, y0 = 0, dx = 0, axis = null, hist = [];
    d.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || openPanel !== 'drawer') return;
      id = e.pointerId; x0 = e.clientX; y0 = e.clientY; dx = 0; axis = null; hist = [[e.clientX, performance.now()]];
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
      hist.push([e.clientX, performance.now()]); if (hist.length > 6) hist.shift();
      // rubber-band when pulled the wrong way (right): a real object resists, it does not stick
      dx = mx < 0 ? mx : (mx * 40) / (mx + 40);
      d.style.transform = `translateX(${dx}px)`;
      scrim.style.opacity = String(Math.max(0, 1 + dx / d.offsetWidth));
    });
    const end = e => {
      if (e.pointerId !== id) return;
      id = null;
      if (axis !== 'x') return;
      const [xa, ta] = hist[0], [xb, tb] = hist[hist.length - 1];
      const v = tb > ta ? (xb - xa) / (tb - ta) : 0;                // px per ms, negative = leftwards
      d.classList.remove('is-dragging');
      scrim.style.opacity = '';
      if (v < -0.35 || (dx < -d.offsetWidth * 0.45 && v <= 0.1)) { d.style.transform = ''; close(); }
      else d.style.transform = '';                                // springs back along the drawer curve
    };
    d.addEventListener('pointerup', end);
    d.addEventListener('pointercancel', end);
  })();
  menuBtn.addEventListener('click', () => open('drawer'));
  cartBtn.addEventListener('click', () => open('cart'));
  document.querySelectorAll('[data-close="drawer"], [data-close="cart"], [data-close="all"]').forEach(el => el.addEventListener('click', () => close()));
  // links inside the drawer close it (in-page anchors for now)
  const herePage = location.pathname.split('/').pop() || 'index.html';
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

  // accordions (shape / material / lenses)
  document.querySelectorAll('.acc-btn[aria-controls]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      const willOpen = btn.getAttribute('aria-expanded') !== 'true';
      document.querySelectorAll('.acc-btn[aria-expanded="true"]').forEach(other => {
        if (other !== btn) { other.setAttribute('aria-expanded', 'false'); document.getElementById(other.getAttribute('aria-controls')).hidden = true; }
      });
      btn.setAttribute('aria-expanded', String(willOpen));
      panel.hidden = !willOpen;
    });
  });

  // ---------- search (tools, guides and help; synonyms EN/ES; honest empty state) ----------
  const searchBtn = document.querySelector('[data-open="search"]');
  const searchPanel = document.getElementById('search-panel');
  const qInput = document.getElementById('q');
  const resultsEl = document.getElementById('search-results');
  const emptyEl = document.getElementById('search-empty');
  const norm = t => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9. ]+/g, ' ');
  function searchItems(q) {
    const idx = window.HOE_SEARCH || [];
    const words = norm(q).split(/\s+/).filter(w => w.length > 1);
    if (!words.length) return idx.slice(0, 6);
    return idx.map(it => {
      const hay = norm(`${it.en} ${it.es} ${it.k}`);
      let score = 0;
      for (const w of words) { if (hay.includes(w)) score += 2; else if (w.length > 3 && hay.includes(w.slice(0, -1))) score += 1; else return null; }
      if (norm(it[lang] || it.en).includes(words[0])) score += 1;
      return { it, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 7).map(r => r.it);
  }
  function renderSearch() {
    if (!resultsEl) return;
    const q = qInput.value.trim();
    const items = searchItems(q);
    resultsEl.innerHTML = items.map((it, i) => `<li role="option" id="sr-${i}"><a href="${it.url}">${it[lang] || it.en}</a></li>`).join('');
    emptyEl.hidden = items.length > 0;
    if (!items.length) emptyEl.textContent = tr('search.none').replace('{q}', q);
    qInput.setAttribute('aria-expanded', String(items.length > 0));
  }
  function openSearch() { searchPanel.hidden = false; searchBtn.setAttribute('aria-expanded', 'true'); renderSearch(); qInput.focus(); }
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

  // ---------- best sellers + shapes (rendered from the sample catalog) ----------
  function renderDynamic() {
    const haveCatalog = !!(window.HOE_CATALOG && window.HOE_CATALOG.length);
    document.querySelectorAll('a[href$="#best-sellers"]').forEach(a => { (a.closest('li') || a).hidden = !haveCatalog; });
    if (document.getElementById('lens-demo')) document.title = tr('index.docTitle');
    const rail = document.getElementById('rail');
    const shapeRow = document.getElementById('shape-row');
    if (!rail || !window.HOE_CATALOG) return;
    const best = document.getElementById('best-sellers');
    if (best) best.hidden = !window.HOE_CATALOG.length;
    const favs = new Set((store.get('hoe-favs') || '').split(',').filter(Boolean));
    const money = new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    rail.innerHTML = window.HOE_CATALOG.map(p => {
      const sel = Math.min(Number(rail.dataset['sel_' + p.id] || 0), p.colors.length - 1);
      const col = p.colors[sel];
      const tagKey = p.tag ? 'tag.' + p.tag : p.kids ? 'tag.kids' : p.sun ? 'tag.sun' : '';
      return `<li class="prod" data-id="${p.id}">
        <div class="prod-art">
          ${tagKey ? `<span class="tag">${tr(tagKey)}</span>` : ''}
          ${window.hoeFrameSVG(p.shape, col)}
          <button class="fav" type="button" aria-pressed="${favs.has(p.id)}" aria-label="${tr('prod.fav')}: ${p.name}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5S3.5 15.4 3.5 9.3A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.5 2.5c0 6.1-8.5 11.2-8.5 11.2z"/></svg>
          </button>
        </div>
        <div class="prod-info">
          <h3 class="prod-name">${p.name}</h3>
          <span class="prod-price">${money.format(p.price)}</span>
          <p class="prod-meta">${col[lang] || col.en} · ${tr('prod.size')} ${p.size}</p>
          <div class="swatches" role="group" aria-label="${tr('prod.color')}">
            ${p.colors.map((c, i) => `<button class="swatch" type="button" style="--c:${c.c}" aria-pressed="${i === sel}" aria-label="${c[lang] || c.en}" data-i="${i}"></button>`).join('')}
          </div>
          <a class="prod-cta" href="#product-${p.id}">${tr('prod.lenses')}</a>
        </div>
      </li>`;
    }).join('');

    // no catalog yet: each shape opens the style quiz, the one tool that picks shapes today
    if (shapeRow && !shapeRow.children.length) {
      shapeRow.innerHTML = window.HOE_SHAPE_ORDER.map(k =>
        `<li><a href="quiz.html">${window.hoeFrameSVG(k)}<span data-i18n="${window.HOE_SHAPE_LABEL[k]}"></span></a></li>`).join('');
    }
    shapeRow?.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
    updateRailButtons();
  }

  const railEl = document.getElementById('rail');
  railEl?.addEventListener('click', e => {
    const card = e.target.closest('.prod');
    if (!card) return;
    const id = card.dataset.id;
    const sw = e.target.closest('.swatch');
    if (sw) { railEl.dataset['sel_' + id] = sw.dataset.i; const x = railEl.scrollLeft; renderDynamic(); railEl.scrollLeft = x; railEl.querySelector(`.prod[data-id="${id}"] .swatch[data-i="${sw.dataset.i}"]`)?.focus(); return; }
    const fav = e.target.closest('.fav');
    if (fav) {
      const favs = new Set((store.get('hoe-favs') || '').split(',').filter(Boolean));
      favs.has(id) ? favs.delete(id) : favs.add(id);
      store.set('hoe-favs', [...favs].join(','));
      fav.setAttribute('aria-pressed', String(favs.has(id)));
    }
  });
  function updateRailButtons() {
    if (!railEl) return;
    const max = railEl.scrollWidth - railEl.clientWidth - 2;
    document.querySelectorAll('[data-rail]').forEach(b => { b.disabled = b.dataset.rail === '-1' ? railEl.scrollLeft <= 2 : railEl.scrollLeft >= max; });
  }
  document.querySelectorAll('[data-rail]').forEach(b => b.addEventListener('click', () => {
    const card = railEl.querySelector('.prod');
    railEl.scrollBy({ left: Number(b.dataset.rail) * (card ? card.offsetWidth + 20 : 300), behavior: 'smooth' });
  }));
  railEl?.addEventListener('scroll', () => requestAnimationFrame(updateRailButtons), { passive: true });
  window.addEventListener('resize', updateRailButtons);
  document.addEventListener('hoe:catalog', renderDynamic);

  // first paint in the visitor's language (renders the catalog too)
  const saved = store.get('hoe-lang');
  setLang(saved || ((navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en'));

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- find your fit: the temple drawing (shared with talla.html) ----------
  const fitTemple = document.getElementById('fit-temple');
  if (fitTemple && window.hoeTempleSVG) fitTemple.innerHTML = window.hoeTempleSVG('52 \u25a1 18 \u2014 140', null, { marks: true });

  // ---------- which lenses: the sample lens does what the option under the pointer says ----------
  const demo = document.getElementById('lens-demo');
  const lensList = document.getElementById('lens-list');
  if (demo && lensList) {
    const nameEl = document.getElementById('demo-name');
    const whatEl = document.getElementById('demo-what');
    const hint = whatEl.innerHTML;
    const resetHint = () => { whatEl.innerHTML = hint; whatEl.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); }); };
    let current = '';
    const setMode = (row) => {
      const mode = row ? row.dataset.demo : '';
      if (mode === current) return;
      current = mode;
      demo.dataset.mode = mode;
      lensList.querySelectorAll('.is-on').forEach(el => el.classList.remove('is-on'));
      if (!row) { nameEl.textContent = ''; resetHint(); return; }
      row.classList.add('is-on');
      nameEl.textContent = row.querySelector('dt').textContent;
      whatEl.textContent = tr('demo.' + mode);
    };
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    lensList.addEventListener('pointerover', e => { if (fine.matches) setMode(e.target.closest('[data-demo]')); });
    lensList.addEventListener('pointerleave', () => { if (fine.matches) setMode(null); });
    // focus counts when it comes from the keyboard (or a mouse click); a tap also focuses the link on Android,
    // and reacting to that focus would mark the row as "already shown" and let the first tap navigate
    lensList.addEventListener('focusin', e => { const row = e.target.closest('[data-demo]'); if (fine.matches || (row && e.target.matches(':focus-visible'))) setMode(row); });
    lensList.addEventListener('focusout', e => { if (!lensList.contains(e.relatedTarget)) setMode(null); });
    // touch: the first tap shows the lens, the second follows the link
    lensList.addEventListener('click', e => {
      if (fine.matches) return;
      const row = e.target.closest('[data-demo]');
      if (!row) return;
      if (row.dataset.demo !== current) { e.preventDefault(); setMode(row); }
    });
    document.addEventListener('hoe:lang', () => { if (current) { const row = lensList.querySelector('.is-on'); nameEl.textContent = row.querySelector('dt').textContent; whatEl.textContent = tr('demo.' + current); } else resetHint(); });
  }
})();
