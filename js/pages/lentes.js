// Lens options page (lentes.html).
// Everything about an option (name, text, index, power range) comes from js/data/lenses.js — never from here.
// Options carry no price of their own: the note at the top of the page says prescription lenses are included in every frame price.
// First paint uses window.hoeLang(); every language change ('hoe:lang' from main.js) re-renders.
(() => {
  const data = window.HOE_LENS_OPTIONS;
  const suggest = window.hoeSuggestIndex;
  if (!data || !suggest || !document.querySelector('.lx')) return;

  const lang = () => (window.hoeLang ? window.hoeLang() : 'en');
  const t = (key, vars) => {
    const s = window.hoeT ? window.hoeT(key) : key;
    return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
  };
  const tOr = key => { const s = t(key); return s === key ? '' : s; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const loc = o => o[lang()] || o.en;
  const groups = () => Object.keys(data).filter(k => Array.isArray(data[k]));
  const findOpt = id => { for (const g of groups()) { const o = data[g].find(x => x.id === id); if (o) return o; } return null; };

  // ---------- numbers ----------
  const MINUS = '−';
  const fmt = v => (v === 0 ? '0.00' : (v > 0 ? '+' : MINUS) + Math.abs(v).toFixed(2));      // for reading
  const fmtIn = v => (v === 0 ? '0.00' : (v > 0 ? '+' : '-') + Math.abs(v).toFixed(2));      // for the input box
  const fmtAbs = v => '±' + Math.abs(v).toFixed(2);

  // Power ranges come from maxPower in the data file: each non-impact material starts where the previous one ends.
  const OPEN = 30; // strongest possible input (|SPH| 20 + |CYL| 10): a maxPower at or above this has no upper limit
  const ladder = () => data.materials.filter(m => !m.impact).sort((a, b) => a.maxPower - b.maxPower);
  function range(m) {
    if (m.impact) return t('lentes.range.upto', { a: fmtAbs(m.maxPower) });
    const l = ladder();
    const i = l.indexOf(m);
    const prev = i > 0 ? l[i - 1].maxPower : null;
    if (m.maxPower >= OPEN) return prev == null ? '' : t('lentes.range.above', { a: fmtAbs(prev) });
    if (prev == null) return t('lentes.range.upto', { a: fmtAbs(m.maxPower) });
    return t('lentes.range.between', { a: fmtAbs(prev + 0.25), b: fmtAbs(m.maxPower) });
  }

  // ---------- drawings ----------
  // A lens cross-section. Same power needs curves ~1/(n-1) as deep, so thickness scales with 0.5/(n-1) against 1.50.
  function profile(x0, x1, mid, c, e) {
    const cx = (x0 + x1) / 2, top = mid - e / 2, bot = mid + e / 2;
    const cTop = 2 * (mid - c / 2) - top, cBot = 2 * (mid + c / 2) - bot; // quadratic passes through the centre thickness
    const f = n => n.toFixed(2);
    return `M${x0} ${f(top)}Q${cx} ${f(cTop)} ${x1} ${f(top)}L${x1} ${f(bot)}Q${cx} ${f(cBot)} ${x0} ${f(bot)}Z`;
  }
  function shape(power, index, scale) {
    const d = scale * Math.min(Math.abs(power), 20) * (0.5 / (index - 1));
    if (power < 0) return { c: 2, e: 2 + d };      // minus: thicker at the edge
    if (power > 0) return { c: 1.6 + d, e: 1.6 };  // plus: thicker in the centre
    return { c: 2, e: 2 };
  }
  const REF = -6; // reference power for the small material drawings

  const LENS = 'M5 15c0-5 5-7 15-7s15 2 15 7v3c0 9-6 14-15 14S5 27 5 18z';
  const GLYPH = {
    single: `<path d="${LENS}"/><circle cx="20" cy="20" r="1.6"/>`,
    progressive: `<path d="${LENS}"/><path d="M10 15h20M14 21h12M17.5 27h5"/>`,
    readers: `<path d="${LENS}"/><path d="M20 16v8M16 20h8"/>`,
    'non-rx': `<path d="${LENS}"/><path d="M11 19l5-5M13 25l9-9"/>`,
    'anti-reflective': `<path d="${LENS}"/><path d="M12 20c2.4-3 13.6-3 16 0-2.4 3-13.6 3-16 0z"/><circle cx="20" cy="20" r="1.6"/>`,
    scratch: `<path d="M20 5 9 9.5V18c0 7.5 4.8 13 11 16 6.2-3 11-8.5 11-16V9.5z"/><path d="m15 19.5 3.5 3.5L26 15.5"/>`,
    uv: `<circle cx="20" cy="20" r="6"/><path d="M20 6v4M20 30v4M6 20h4M30 20h4M10.1 10.1l2.8 2.8M27.1 27.1l2.8 2.8M10.1 29.9l2.8-2.8M27.1 12.9l2.8-2.8"/>`,
    'blue-light': `<rect x="6" y="8" width="28" height="18" rx="2"/><path d="M15 33h10M20 26v7"/>`,
    'light-responsive': `<circle cx="20" cy="20" r="12"/><path class="lx-fill" d="M20 8a12 12 0 0 1 0 24z"/>`,
    polarized: `<path d="${LENS}"/><path d="M8 14h24M7 19h26M8.5 24h23M12.5 29h15"/>`,
    tint: `<path d="${LENS}"/><path class="lx-fill" d="M5 15c0-5 5-7 15-7s15 2 15 7v4H5z"/>`,
  };

  // ---------- option lists ----------
  function row(o, group) {
    const L = loc(o);
    let art = GLYPH[o.id] ? `<svg viewBox="0 0 40 40">${GLYPH[o.id]}</svg>` : '';
    let forTxt = L.for || tOr('lentes.for.' + o.id);
    if (group === 'materials' && o.index) {
      art = `<span class="lx-idx">${o.index.toFixed(2)}</span>`;   // the cut in the intro shows the thickness; here the number is the mark
      const r = range(o);
      forTxt = [forTxt, r && t('lentes.range.line', { r })].filter(Boolean).join(' · ');
    }
    const note = o.needsAdd ? `<span class="lx-opt-note">${esc(t('lentes.needsAdd'))}</span>` : '';
    return `<li class="lx-opt" id="lens-${esc(o.id)}">
        <span class="lx-opt-art" aria-hidden="true">${art}</span>
        <h3 class="lx-opt-name">${esc(group === 'materials' && o.index ? L.name.replace(/\s*\d\.\d\d$/, '') : L.name)}</h3>
        <p class="lx-opt-text">${esc(L.text)}</p>
        ${forTxt || note ? `<p class="lx-opt-for"><span class="lx-k">${esc(t('lentes.col.for'))}</span> <span>${esc(forTxt)}</span>${note}</p>` : ''}
      </li>`;
  }

  // the intro figure: the same REF lens, edge on, in every material of the ladder (thick to thin).
  // One button per profile: hover, tap or focus fills it (css); a tap keeps it filled until the next tap.
  let cutOn = null;
  function renderCut() {
    const box = document.getElementById('lx-hero-cut');
    if (!box) return;
    const mats = data.materials.slice().sort((a, b) => a.index - b.index);
    const colW = 104, H = 160, y0 = 6, y1 = 148;
    box.innerHTML = mats.map(m => {
      // edge thickness scales with 1/(n−1): the 1.74 edge is about two thirds of the 1.50 edge
      const e = 3 + 7 * Math.abs(REF) * (0.5 / (m.index - 1)), c = 3;
      // profile() draws the lens lying down; stand it up so the thick edges read left and right
      const g = `<g transform="translate(${colW / 2} ${((y0 + y1) / 2).toFixed(1)}) rotate(90)"><path class="lx-cut-lens" d="${profile(-(y1 - y0) / 2, (y1 - y0) / 2, 0, c, e)}"/></g>`;
      return `<button type="button" class="lx-cut-item" data-id="${esc(m.id)}" aria-pressed="${cutOn === m.id}">`
        + `<svg viewBox="0 0 ${colW} ${H}" aria-hidden="true">${g}</svg>`
        + `<span class="lx-cut-idx">${m.index.toFixed(2)}</span><span class="lx-cut-name">${esc(loc(m).name.replace(/\s*\d\.\d\d$/, ''))}</span></button>`;
    }).join('');
    const cap = document.getElementById('lx-hero-cap');
    if (cap) cap.textContent = t('lentes.cut.cap', { p: fmt(REF) });
  }
  document.getElementById('lx-hero-cut')?.addEventListener('click', e => {
    const b = e.target.closest('.lx-cut-item');
    if (!b) return;
    cutOn = cutOn === b.dataset.id ? null : b.dataset.id;
    b.parentElement.querySelectorAll('.lx-cut-item').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.id === cutOn)));
  });

  function renderStatic() {
    renderCut();
    document.querySelectorAll('.lx-list[data-group]').forEach(ul => {
      const g = ul.dataset.group;
      ul.innerHTML = (Array.isArray(data[g]) ? data[g] : []).map(o => row(o, g)).join('');
    });
    const cap = document.getElementById('lx-mat-cap');
    if (cap) cap.textContent = t('lentes.materials.cap', { p: fmt(REF) });
    // FAQ: "Anti-reflective: is it worth adding?" — the name comes from the data file
    const lcFirst = s => (/^\p{Lu}\p{Ll}/u.test(s) ? s[0].toLocaleLowerCase(lang()) + s.slice(1) : s);
    document.querySelectorAll('[data-opt]').forEach(el => {
      const names = el.dataset.opt.split(',').map(id => findOpt(id.trim())).filter(Boolean).map((o, i) => (i ? lcFirst(loc(o).name) : loc(o).name));
      el.textContent = names.length ? names.join(t('lentes.faq.or')) + ': ' : '';
    });
    document.title = t('lentes.meta.title');
    // the option rows are new nodes: hand them to the shared reveal-on-scroll (no-op when motion.js is not loaded)
    if (window.hoeMotion && typeof window.hoeMotion.reveal === 'function') window.hoeMotion.reveal(document.querySelector('.lx'));
  }

  // ---------- good to know: closing an answer waits for its height to shrink (css: details.lx-q grid rows) ----------
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('details.lx-q > summary').forEach(sum => {
    const d = sum.parentElement;
    let fallback = 0;
    const finish = () => { clearTimeout(fallback); d.removeEventListener('transitionend', onEnd); d.open = false; d.classList.remove('is-closing'); };
    const onEnd = e => { if (e.target === d && e.propertyName === 'grid-template-rows') finish(); };
    sum.addEventListener('click', e => {
      if (d.classList.contains('is-closing')) {            // clicked again while closing: it comes back from where it is
        e.preventDefault(); clearTimeout(fallback); d.removeEventListener('transitionend', onEnd); d.classList.remove('is-closing'); return;
      }
      if (!d.open || reduced.matches) return;               // opening (or no motion): the browser toggles it
      e.preventDefault();
      d.classList.add('is-closing');
      d.addEventListener('transitionend', onEnd);
      fallback = setTimeout(finish, 260);                    // transitions can be off (hidden tab): never leave it stuck
    });
  });

  // ---------- thickness helper ----------
  const FIELDS = {
    sph: { min: -20, max: 20, allowEmpty: false, label: 'SPH' },
    cyl: { min: -10, max: 10, allowEmpty: true, label: 'CYL' },
  };
  const input = key => document.getElementById('lx-' + key);
  const state = { err: { sph: null, cyl: null }, result: null, lastId: null };

  function parse(key, raw) {
    const f = FIELDS[key];
    const s = String(raw).trim().toLowerCase().replace(/\s+/g, '').replace(/[−‒–—]/g, '-').replace(',', '.');
    if (!s) return f.allowEmpty ? { v: 0 } : { err: 'empty' };
    if (/^(pl|plano|ds|neutro)$/.test(s)) return { v: 0 };
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return { err: 'nan' };
    const v = Number(s);
    if (v < f.min || v > f.max) return { err: 'range', v };
    if (Math.abs(v * 4 - Math.round(v * 4)) > 1e-9) return { err: 'step', v };
    return { v: Math.round(v * 4) / 4 + 0 }; // "+ 0" turns -0 into 0
  }

  function errText(key, code) {
    const f = FIELDS[key];
    return t('lentes.err.' + code, { f: f.label, min: fmt(f.min), max: fmt(f.max) });
  }
  function setErr(key, code) {
    state.err[key] = code || null;
    const el = input(key);
    const out = document.getElementById('lx-' + key + '-err');
    el.setAttribute('aria-invalid', String(!!code));
    el.closest('.lx-field').classList.toggle('is-invalid', !!code);
    const msg = code ? errText(key, code) : '';
    if (out.textContent !== msg) out.textContent = msg;
  }

  // Reads both fields. showErrors=false only clears errors that are fixed; it never adds new ones.
  function read(showErrors) {
    const vals = {};
    let ok = true;
    for (const key of Object.keys(FIELDS)) {
      const r = parse(key, input(key).value);
      if (r.err) { ok = false; if (showErrors) setErr(key, r.err); }
      else {
        vals[key] = r.v;
        if (state.err[key]) setErr(key, null);
        if (showErrors && input(key).value !== fmtIn(r.v)) input(key).value = fmtIn(r.v);
      }
    }
    return ok ? vals : null;
  }

  function run(showErrors) {
    const v = read(showErrors);
    if (!v) {
      if (showErrors) { state.result = 'invalid'; renderResult(); }
      return false;
    }
    const a = v.sph, b = v.sph + v.cyl;          // the two main meridians
    const viaSum = Math.abs(b) > Math.abs(a);
    state.result = { sph: v.sph, cyl: v.cyl, p: viaSum ? b : a, via: viaSum ? 'sum' : 'sph' };
    renderResult();
    return true;
  }

  let statusTimer;
  function announce(msg) {
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { const s = document.getElementById('lx-status'); if (s) s.textContent = msg; }, 350);
  }

  const SHIELD = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4 7 9v9c0 8.5 5.6 15 13 18 7.4-3 13-9.5 13-18V9z"/><path d="m14 20 4.5 4.5L27 16"/></svg>';

  // Power scale: one segment per material of the thickness ladder, widths from maxPower. The marker is |power|.
  let markAt = null; // last marker position (%), so the marker glides instead of jumping
  function scale(p) {
    const l = ladder();
    const finite = l.filter(m => m.maxPower < OPEN);
    const cap = (finite.length ? finite[finite.length - 1].maxPower : 6) + 2;
    const on = p == null ? null : suggest(p);
    let prev = 0;
    const segs = l.map(m => {
      const open = m.maxPower >= OPEN;
      const end = open ? cap : Math.min(m.maxPower, cap);
      const seg = `<span class="lx-scale-seg${on === m ? ' is-on' : ''}${open ? ' is-open' : ''}" style="flex-grow:${Math.max(end - prev, 0.5)}">`
        + `<span class="lx-scale-idx">${m.index.toFixed(2)}</span><span class="lx-scale-tick">${prev === 0 ? '0' : fmtAbs(prev)}</span></span>`;
      prev = end;
      return seg;
    }).join('');
    const to = p == null ? null : Math.min(Math.abs(p), cap) / cap * 100;
    const mark = to == null ? '' : `<span class="lx-scale-mark" data-to="${to.toFixed(2)}" style="transform:translateX(${(markAt ?? to).toFixed(2)}%)"></span>`;
    markAt = to;
    return `<div class="lx-scale" aria-hidden="true"><div class="lx-scale-track">${segs}${mark}</div></div>`;
  }
  function glideMark(box) {
    const m = box.querySelector('.lx-scale-mark');
    if (!m) return;
    void m.offsetWidth; // commit the old position so the move transitions (transform only: no layout work)
    m.style.transform = `translateX(${m.dataset.to}%)`;
  }

  function renderResult() {
    const box = document.getElementById('lx-result');
    if (!box) return;
    const r = state.result;
    if (!r || r === 'invalid') {
      const msg = t(r ? 'lentes.res.invalid' : 'lentes.res.empty');
      box.innerHTML = `<p class="lx-res-empty${r ? ' is-invalid' : ''}">${esc(msg)}</p>${scale(null)}<p class="lx-res-cap">${esc(t('lentes.scale.cap'))}</p>`;
      box.dataset.state = r ? 'invalid' : 'empty';
      state.lastId = null;
      announce(r ? msg : '');
      return;
    }
    const m = suggest(r.p);
    const L = loc(m);
    const std = ladder()[0];
    const strong = r.via === 'sum'
      ? t('lentes.res.sum', { p: fmt(r.p), s: fmt(r.sph), c: fmt(r.cyl) })
      : t('lentes.res.sph', { p: fmt(r.p) });
    const rg = range(m);
    const why = Math.abs(r.p) > m.maxPower ? t('lentes.res.beyond') : rg ? t('lentes.res.why', { r: rg }) : '';
    const sideNote = r.p < 0 ? t('lentes.res.minus') : r.p > 0 ? t('lentes.res.plus') : '';

    const sSug = shape(r.p, m.index, 2.8);
    const sStd = std && std !== m ? shape(r.p, std.index, 2.8) : null;
    const svg = `<svg viewBox="0 0 240 64" aria-hidden="true" focusable="false">
        ${sStd ? `<path class="lx-p-std" d="${profile(20, 220, 32, sStd.c, sStd.e)}"/>` : ''}
        <path class="lx-p-sug" d="${profile(20, 220, 32, sSug.c, sSug.e)}"/>
      </svg>`;
    const legend = `${sStd ? `<span class="is-std">${esc(loc(std).name)}</span>` : ''}<span class="is-sug">${esc(L.name)}</span>`;

    const poly = data.materials.find(x => x.impact);
    const kids = poly
      ? t('lentes.res.kids', { n: loc(poly).name, r: range(poly) }) + (Math.abs(r.p) > poly.maxPower ? ' ' + t('lentes.res.kidsOver') : '')
      : '';

    const changed = state.lastId !== m.id;
    state.lastId = m.id;
    box.dataset.state = 'ok';
    box.innerHTML = `
      <p class="lx-res-main"><span class="lx-res-idx num">${m.index.toFixed(2)}</span><span class="lx-res-name"><span class="lx-k">${esc(t('lentes.res.k'))}</span>${esc(L.name)}</span></p>
      <p class="lx-res-why">${esc(strong)} ${esc(why)}</p>
      ${scale(r.p)}
      <figure class="lx-res-fig">
        ${svg}
        <figcaption><span class="lx-legend">${legend}</span><span class="lx-res-cap">${esc([sideNote, t('lentes.res.cap')].filter(Boolean).join(' '))}</span></figcaption>
      </figure>
      ${kids ? `<p class="lx-res-kids">${SHIELD}<span>${esc(kids)}</span></p>` : ''}`;
    glideMark(box);
    if (changed) settleIndex(box.querySelector('.lx-res-idx'));
    announce(`${t('lentes.res.k')}: ${L.name}. ${strong} ${why}`);
  }

  // a new material settles in on a spring: scale .96 → 1 with the opacity (hoeMotion.spring; instant under reduced motion)
  let settling = null;
  function settleIndex(el) {
    if (!el || !window.hoeMotion || typeof window.hoeMotion.spring !== 'function') return;
    if (settling) settling.stop();
    const paint = v => { el.style.transform = `scale(${(0.96 + 0.04 * v).toFixed(4)})`; el.style.opacity = String(Math.min(1, Math.max(0, v))); };
    paint(0);
    settling = window.hoeMotion.spring({ from: 0, to: 1, response: .35, damping: 1, onUpdate: paint, onDone() { el.style.transform = ''; el.style.opacity = ''; settling = null; } });
  }

  // steppers: click / keyboard steps once; press and hold repeats
  function step(key, dir, instant) {
    const f = FIELDS[key];
    if (instant) markAt = null;
    const r = parse(key, input(key).value);
    const base = r.err ? (Number.isFinite(r.v) ? Math.round(r.v * 4) / 4 : 0) : r.v;
    const next = Math.min(f.max, Math.max(f.min, base + dir * 0.25)) + 0;
    input(key).value = fmtIn(next);
    setErr(key, null);
    run(true);
    syncLimits();
  }

  function syncLimits() {
    form?.querySelectorAll('.lx-step-btn').forEach(btn => {
      const key = btn.dataset.field, f = FIELDS[key], r = parse(key, input(key).value);
      const atEnd = !r.err && (Number(btn.dataset.step) < 0 ? r.v <= f.min : r.v >= f.max);
      btn.setAttribute('aria-disabled', String(atEnd));
    });
  }

  const form = document.getElementById('lx-form');
  let holdDelay, holdEvery;
  const stopHold = () => { clearTimeout(holdDelay); clearInterval(holdEvery); };
  form?.querySelectorAll('.lx-step-btn').forEach(btn => {
    const key = btn.dataset.field, dir = Number(btn.dataset.step);
    btn.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault(); // keep focus where it is; the click that follows is ignored below
      step(key, dir);
      stopHold();
      holdDelay = setTimeout(() => { holdEvery = setInterval(() => step(key, dir), 70); }, 420);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stopHold));
    btn.addEventListener('click', e => { if (e.detail === 0) step(key, dir, true); }); // keyboard (Enter / Space)
  });
  window.addEventListener('blur', stopHold);

  Object.keys(FIELDS).forEach(key => {
    const el = input(key);
    if (!el) return;
    el.addEventListener('focus', () => requestAnimationFrame(() => el.select()));
    el.addEventListener('input', () => { if (state.err[key] && !parse(key, el.value).err) setErr(key, null); });
    el.addEventListener('change', () => { run(true); syncLimits(); });
    el.addEventListener('keydown', e => {
      const d = { ArrowUp: 1, ArrowDown: -1, PageUp: 4, PageDown: -4 }[e.key];
      if (!d) return;
      e.preventDefault();
      step(key, d, true);
      el.select();
    });
  });
  form?.addEventListener('submit', e => {
    e.preventDefault();
    if (!run(true)) {
      const bad = Object.keys(FIELDS).find(k => state.err[k]);
      if (bad) input(bad).focus();
      return;
    }
    // stacked layout: the answer sits below the form, so bring it up if it is off screen
    const box = document.getElementById('lx-result');
    const top = box.getBoundingClientRect().top;
    if (top > window.innerHeight * 0.75) {
      const head = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0;
      window.scrollBy({ top: top - head - 16 });
    }
  });

  // ---------- first paint + language changes ----------
  function renderAll() {
    renderStatic();
    Object.keys(FIELDS).forEach(k => { if (state.err[k]) setErr(k, state.err[k]); });
    renderResult(); // same material and marker position, so nothing animates on a language switch
  }
  renderAll();
  document.addEventListener('hoe:lang', renderAll);
})();
