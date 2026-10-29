/* hoeMotion (loaded after GSAP + ScrollTrigger from cdnjs, before main.js) — shared motion helpers.
   Without GSAP (network down, reduced motion) every helper degrades and the page is complete from the first paint:
   nothing is hidden by CSS alone, so motion only ever adds.

   reveal(target, {stagger}) → target is a root element (its [data-reveal] containers and [data-reveal-self] elements
     are collected), a selector, an element or a list. With GSAP: ScrollTrigger.batch, autoAlpha 0→1, y 24→0, 900 ms,
     expo.out, once, stagger (default 70 ms). Without: IntersectionObserver + the CSS transition. Reduced motion: opacity only.
   band(videoEl) → loads (data-src → src) and plays a muted video only while it is on screen, pauses when it leaves;
     (the browser decides about autoplay; no saveData/reduced-motion gating of our own)
   count(el, to, {duration, trigger}) → the number counts from 0 to `to` when it enters (GSAP); without GSAP the value lands.
   spring({from,to,velocity,damping,response,onUpdate,onDone}) → {stop()}: Apple-style spring on rAF.
   project(v) → px a flick travels (v in px/s).  reduced → MediaQueryList for prefers-reduced-motion.
   PRESSABLE → selector of elements that get .is-pressed on pointerdown (main.js).
   GSAP layer (only when hasGsap): ready(fn(gsap, ScrollTrigger)) after fonts; lines(el) splits a headline and raises its lines;
   draw(svg, opts) draws every stroke; parallax(el, amount, opts) scrubs a decorative move (y ±amount); scene({...}) pins a
   section; auto(root) wires [data-gs]; refresh() recalculates ScrollTrigger (also on 'hoe:lang'). */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hasGsap = !!(window.gsap && window.ScrollTrigger) && !reduced.matches;
  const root = document.documentElement;
  // no `scroll-behavior: smooth` anywhere (it breaks every ScrollTrigger refresh); in-page anchors scroll via JS (main.js)
  if (hasGsap) { window.gsap.registerPlugin(window.ScrollTrigger); root.classList.add('gs'); }
  else root.classList.remove('intro');   // the head script hid the hero copy for the choreography: show it now

  // critically damped by default (damping 1); damping .8 bounces once, for when the finger gave it speed
  function spring({ from, to, velocity = 0, damping = 1, response = .35, onUpdate, onDone }) {
    if (reduced.matches) { onUpdate && onUpdate(to); onDone && onDone(); return { stop() {} }; }
    const k = (2 * Math.PI / response) ** 2;
    const c = 4 * Math.PI * damping / response;
    let x = from, v = velocity, last = performance.now(), raf = 0;
    const step = now => {
      const dt = Math.min(32, now - last) / 1000; last = now;
      v += (-k * (x - to) - c * v) * dt;
      x += v * dt;
      if (Math.abs(x - to) < .05 && Math.abs(v) < 1) { x = to; raf = 0; onUpdate && onUpdate(x); onDone && onDone(); return; }
      onUpdate && onUpdate(x);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return { stop() { if (raf) cancelAnimationFrame(raf); raf = 0; } };
  }
  const project = (v, d = .998) => (v / 1000) * d / (1 - d);

  const PRESSABLE = 'button, summary, [role="button"], .btn, .tile, .cat, .portrait, .shape-row a, .tool-grid a, .tool-list a, .lens-list > div, .acc-btn, .drawer-cats a, .drawer-secondary a, .search-suggest a, .prod-cta, [data-press]';

  // ---------- GSAP layer ----------
  const gsap = window.gsap, ST = window.ScrollTrigger;
  const EXPO = 'expo.out';
  let fontsIn = false;
  const readyQueue = [];
  function ready(fn) {
    if (!hasGsap || typeof fn !== 'function') return;
    if (fontsIn) { try { fn(gsap, ST); } catch (e) { console.error(e); } return; }
    readyQueue.push(fn);
  }
  if (hasGsap) {
    const go = () => { fontsIn = true; readyQueue.splice(0).forEach(fn => { try { fn(gsap, ST); } catch (e) { console.error(e); } }); requestAnimationFrame(() => ST.refresh()); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); else go();
  }
  function refresh() { if (hasGsap) ST.refresh(); }
  document.addEventListener('hoe:lang', () => { if (hasGsap) requestAnimationFrame(refresh); });

  // ---------- reveal on scroll, once ----------
  const settle = el => { el.classList.add('rv-done'); };
  // IO path (no GSAP): .is-in starts the CSS transition
  let io = null;
  const enter = el => {
    el.classList.add('is-in');
    const box = el.hasAttribute('data-reveal-self') ? el : el.parentElement; if (box) box.dataset.revealed = '1';
    let t = setTimeout(() => settle(el), 1500);
    el.addEventListener('transitionend', function f(e) { if (e.target !== el || e.propertyName !== 'opacity') return; el.removeEventListener('transitionend', f); clearTimeout(t); settle(el); });
  };
  // GSAP path: one batch per reveal() call (its own stagger)
  const show = (els, stagger) => {
    els.forEach(el => { el.classList.add('is-in'); const box = el.hasAttribute('data-reveal-self') ? el : el.parentElement; if (box) box.dataset.revealed = '1'; });
    gsap.fromTo(els, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: .9, ease: EXPO, stagger, overwrite: true, clearProps: 'opacity,visibility,transform', onComplete: () => els.forEach(settle) });
  };
  function collect(target, root) {
    if (typeof target === 'string') return [...root.querySelectorAll(target)].map(el => [el, false]);
    if (target instanceof Element && !target.matches('[data-reveal], [data-reveal-self]') && target !== document.body && target.querySelector('[data-reveal], [data-reveal-self]') === null) return [[target, false]];
    if (target && typeof target.length === 'number' && !(target instanceof Element)) return [...target].map(el => [el, false]);
    const r = target instanceof Element ? target : document;
    const all = sel => (r !== document && r.matches(sel) ? [r] : []).concat([...r.querySelectorAll(sel)]);
    const items = [];
    all('[data-reveal]').forEach(box => {
      const stagger = box.dataset.reveal === 'stagger', done = box.dataset.revealed === '1';
      [...box.children].forEach((el, i) => { if (stagger) el.style.setProperty('--rv-i', i); items.push([el, done]); });
    });
    all('[data-reveal-self]').forEach(el => items.push([el, el.dataset.revealed === '1']));
    return items;
  }
  function reveal(target = document, opts = {}) {
    const items = collect(target, document).filter(([el]) => !el.classList.contains('rv'));
    if (!items.length) return;
    const stagger = (opts.stagger != null ? opts.stagger : 70) / 1000;
    const fresh = [];
    items.forEach(([el, done]) => {
      el.classList.add('rv');
      if (done) { el.classList.add('is-in', 'rv-done'); return; }   // re-rendered after a language switch: no second entrance
      fresh.push(el);
    });
    if (!fresh.length) return;
    if (hasGsap) {
      ready(() => {
        const pending = fresh.filter(el => !el.classList.contains('is-in') && el.isConnected);
        if (!pending.length) return;
        ST.batch(pending, { start: 'top 92%', once: true, onEnter: b => show(b, stagger) });
      });
      armFallback();
      return;
    }
    if (!io && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); enter(en.target); } }), { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    }
    const h = window.innerHeight;
    fresh.forEach(el => {
      if (!io || el.getBoundingClientRect().top < h) { el.classList.add('is-in', 'rv-done'); return; }
      io.observe(el);
    });
    armFallback();
  }
  // safety net: if nothing fires (hidden pane, print, odd embed) whatever is on screen shows after 4 s or on print
  let fallbackArmed = false;
  function sweep(force) {
    const h = window.innerHeight || 0;
    const left = [...document.querySelectorAll('.rv:not(.is-in)')].filter(el => force || el.getBoundingClientRect().top < h * .95);
    if (!left.length) return;
    if (hasGsap) show(left, .04); else left.forEach(el => { if (io) io.unobserve(el); enter(el); });
  }
  function armFallback() {
    if (fallbackArmed) return; fallbackArmed = true;
    if (!hasGsap) {
      let tick = false;
      const onScroll = () => { if (tick) return; tick = true; requestAnimationFrame(() => { tick = false; sweep(false); }); };
      window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll);
      setTimeout(() => sweep(false), 1200);
    } else setTimeout(() => sweep(false), 4000);
    window.addEventListener('beforeprint', () => sweep(true));
  }

  // ---------- a video band: play on screen only, pause off screen ----------
  function band(v) {
    if (!v || v.dataset.bandDone) return; v.dataset.bandDone = '1';
    v.muted = true;
    const load = () => { if (v.dataset.src && !v.getAttribute('src')) { v.src = v.dataset.src; v.load(); } };
    const play = () => { load(); const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    if (!('IntersectionObserver' in window)) { play(); return; }
    const o = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) play(); else if (!v.paused) v.pause(); }), { rootMargin: '200px 0px' });
    o.observe(v);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (!v.paused) v.pause(); } });
  }

  // ---------- a figure counting from 0 to its value when it enters ----------
  function count(el, to, opts = {}) {
    if (!el) return;
    const target = Number(to != null ? to : el.textContent) || 0;
    const fmt = v => String(Math.round(v));
    if (!hasGsap) { el.textContent = fmt(target); return; }
    const run = () => {
      const o = { v: 0 };
      el.textContent = '0';
      gsap.to(o, { v: target, duration: opts.duration || .9, ease: 'power2.out', delay: opts.delay || 0, onUpdate: () => { el.textContent = fmt(o.v); }, onComplete: () => { el.textContent = fmt(target); } });
    };
    ready(() => ST.create({ trigger: opts.trigger || el, start: opts.start || 'top 85%', once: true, onEnter: run }));
  }

  // split a headline into .line > .line-in spans and raise each line out of a mask (y 110 % → 0, stagger .09, expo.out)
  function lines(el, opts = {}) {
    if (!hasGsap || !el) return null;
    if (!el.querySelector('.line')) {
      const html = el.innerHTML.trim();
      let parts;
      if (/<br\s*\/?>/i.test(html)) parts = html.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean);
      else {
        const words = el.textContent.trim().split(/\s+/);
        el.innerHTML = words.map(w => `<span class="w">${w}</span>`).join(' ');
        const rows = []; let top = null;
        el.querySelectorAll('.w').forEach(w => { const t = w.offsetTop; if (t !== top) { top = t; rows.push([]); } rows[rows.length - 1].push(w.textContent); });
        parts = rows.map(r => r.join(' '));
      }
      el.innerHTML = parts.map(p => `<span class="line"><span class="line-in">${p}</span></span>`).join('');
    }
    const inner = el.querySelectorAll('.line-in'), outer = el.querySelectorAll('.line');
    gsap.set(el, { opacity: 1 });
    gsap.set(outer, { overflow: 'hidden' });
    gsap.set(inner, { yPercent: 110 });
    const tl = gsap.timeline({ delay: opts.delay || 0, onComplete: () => { gsap.set(outer, { clearProps: 'overflow' }); gsap.set(inner, { clearProps: 'transform' }); } });
    tl.to(inner, { yPercent: 0, duration: opts.duration || 1, ease: EXPO, stagger: opts.stagger || .09 }, 0);
    return tl;
  }

  // draws every stroke of an svg with stroke-dashoffset; filled shapes get their fill back once their outline is in
  function draw(svg, opts = {}) {
    if (!hasGsap || !svg) return null;
    const { duration = .9, stagger = .05, delay = 0, ease = EXPO } = opts;
    const shapes = [...svg.querySelectorAll('path, line, circle, ellipse, rect, polyline')].filter(s => !s.closest('defs, clipPath, mask'));
    const tl = gsap.timeline({ delay });
    shapes.forEach((s, i) => {
      let len = 0; try { len = s.getTotalLength(); } catch (e) { len = 0; }
      if (!len) return;
      const cs = getComputedStyle(s);
      const filled = cs.fill && cs.fill !== 'none' && cs.fill !== 'rgba(0, 0, 0, 0)';
      const stroked = cs.stroke && cs.stroke !== 'none';
      const at = i * stagger;
      if (stroked) { gsap.set(s, { strokeDasharray: len, strokeDashoffset: len }); tl.to(s, { strokeDashoffset: 0, duration, ease, clearProps: 'strokeDasharray,strokeDashoffset' }, at); }
      if (filled) { gsap.set(s, { fillOpacity: 0 }); tl.to(s, { fillOpacity: 1, duration: duration * .6, ease: 'power2.out', clearProps: 'fillOpacity' }, at + (stroked ? duration * .45 : 0)); }
    });
    return tl;
  }

  // decorative parallax: the element drifts from +amount to −amount of its height while its trigger crosses the viewport
  function parallax(el, amount = .06, opts = {}) {
    if (!hasGsap || !el) return null;
    return gsap.fromTo(el, { yPercent: amount * 100 }, {
      yPercent: -amount * 100, ease: 'none',
      scrollTrigger: { trigger: opts.trigger || el.parentElement || el, start: opts.start || 'top bottom', end: opts.end || 'bottom top', scrub: true, invalidateOnRefresh: true },
    });
  }

  // a pinned, scrubbed scene (lentes.html, producto.html keep theirs)
  function scene({ trigger, end = '+=220%', labels = [], build, scrub = .6, pin = true, start = 'top top' } = {}) {
    if (!hasGsap || !trigger || typeof build !== 'function') return null;
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger, start, end, pin, scrub, anticipatePin: 1, invalidateOnRefresh: true } });
    labels.forEach((l, i) => tl.addLabel(l, i));
    build(tl, labels);
    return tl;
  }

  // declarative hooks: [data-gs="lines"|"draw"|"fade"|"parallax"] with [data-speed]; [data-band] on a video; [data-count] on a figure
  function auto(root = document) {
    root.querySelectorAll('video[data-band]').forEach(band);
    root.querySelectorAll('[data-count]').forEach(el => { if (el.dataset.gsDone) return; el.dataset.gsDone = '1'; count(el, el.dataset.count); });
    if (!hasGsap) return;
    root.querySelectorAll('[data-gs]').forEach(el => {
      if (el.dataset.gsDone) return; el.dataset.gsDone = '1';
      const kind = el.dataset.gs;
      if (kind === 'parallax') { parallax(el, parseFloat(el.dataset.speed) || .06, { trigger: el.closest('[data-gs-trigger]') || el.parentElement }); return; }
      if (kind === 'fade') { gsap.from(el, { opacity: 0, y: 14, duration: .52, ease: EXPO, scrollTrigger: { trigger: el, start: 'top 88%', once: true } }); return; }
      if (kind === 'draw') { const svg = el.matches('svg') ? el : el.querySelector('svg'); if (!svg) return; const tl = draw(svg); if (tl) { tl.pause(); ST.create({ trigger: el, start: 'top 70%', once: true, onEnter: () => tl.play() }); } return; }
      if (kind === 'lines') { gsap.set(el, { opacity: 0 }); ST.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => lines(el) }); }
    });
  }
  if (hasGsap) ready(() => auto(document)); else auto(document);

  window.hoeMotion = { reduced, hasGsap, spring, project, reveal, band, count, PRESSABLE, ready, refresh, lines, draw, parallax, scene, auto };
})();
