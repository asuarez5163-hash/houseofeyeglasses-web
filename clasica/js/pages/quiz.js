// Quiz de estilo: 6 preguntas, una por pantalla, con progreso y "Atrás".
// El resultado se ve aquí mismo: SIN muro de email ni teléfono. El correo opcional va con casilla SIN marcar
// y avisa que todavía no está conectado. Las respuestas viven solo en sessionStorage (esta pestaña).
(() => {
  const quiz = document.getElementById('quiz');
  if (!quiz || !window.hoeFrameSVG) return;

  const D = window.HOE_I18N;
  const lang = () => (window.hoeLang ? window.hoeLang() : 'en');
  const raw = k => { const d = D[lang()] || {}; return d[k] != null ? d[k] : D.en[k]; };
  const t = (k, vars) => {
    const s = raw(k);
    if (s == null) return k;
    return vars ? s.replace(/\{(\w+)\}/g, (m, v) => (vars[v] != null ? vars[v] : m)) : s;
  };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- questions ----------
  const STEPS = [
    { id: 'who', opts: ['me', 'kid'] },
    { id: 'use', opts: ['allday', 'screen', 'reading', 'sun'] },
    { id: 'face', opts: ['oval', 'round', 'square', 'heart', 'long', 'unsure'], link: 'talla.html#face' },
    { id: 'vibe', opts: ['classic', 'bold', 'minimal', 'vintage'] },
    { id: 'feel', opts: ['metal', 'acetate', 'either'] },
    { id: 'color', opts: ['neutral', 'tortoise', 'color', 'clear'] },
  ];
  const DONE = STEPS.length;

  // ---------- state (this tab only) ----------
  const KEY = 'hoe-quiz';
  const store = {
    get() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
    set(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* storage blocked: quiz still works for this visit */ } },
    clear() { try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ } },
  };
  let state = { step: 0, a: {}, edit: false };
  (function restore() {
    const s = store.get();
    if (!s || typeof s !== 'object' || !s.a) return;
    const a = {};
    STEPS.forEach(q => { if (q.opts.includes(s.a[q.id])) a[q.id] = s.a[q.id]; });
    let step = Number.isInteger(s.step) ? Math.max(0, Math.min(DONE, s.step)) : 0;
    const firstOpen = STEPS.findIndex(q => !a[q.id]);
    if (step === DONE && firstOpen !== -1) step = firstOpen;
    state = { step, a, edit: !!s.edit };
  })();
  const save = () => store.set(state);
  const complete = () => STEPS.every(q => state.a[q.id]);
  // kid-aware copy: "quiz.q.face.kid" wins when the glasses are for a child
  const tk = k => (state.a.who === 'kid' && raw(k + '.kid') != null ? raw(k + '.kid') : t(k));

  // ---------- drawings (SVG only) ----------
  const ICON = {
    who: {
      me: '<circle cx="44" cy="14" r="8"/><path d="M28 44c1.8-9.5 8.2-15 16-15s14.2 5.5 16 15"/>',
      kid: '<circle cx="44" cy="23" r="5.5"/><path d="M34 44c1.3-6.5 5.2-10 10-10s8.7 3.5 10 10"/>',
    },
    use: {
      allday: '<circle cx="44" cy="24" r="17"/><path d="M44 13.5V24l7 4.5"/>',
      screen: '<rect x="25" y="8" width="38" height="25" rx="2"/><path d="M17 40h54"/>',
      reading: '<path d="M22 11c7.5-2 15-1 22 3.5v27c-7-4.5-14.5-5.5-22-3.5zM66 11c-7.5-2-15-1-22 3.5v27c7-4.5 14.5-5.5 22-3.5z"/>',
      sun: '<circle cx="44" cy="24" r="8"/><path d="M44 6.5v5M44 36.5v5M26.5 24h5M56.5 24h5M31.6 11.6l3.5 3.5M52.9 32.9l3.5 3.5M31.6 36.4l3.5-3.5M52.9 15.1l3.5-3.5"/>',
    },
    face: {
      oval: '<ellipse cx="44" cy="24" rx="14" ry="19"/>',
      round: '<circle cx="44" cy="24" r="18"/>',
      square: '<rect x="27" y="6" width="34" height="37" rx="7"/>',
      heart: '<path d="M26.5 11.5c0-3.8 3.2-6.5 7-6.5h21c3.8 0 7 2.7 7 6.5 0 12.5-8.3 26.5-17.5 31.5-9.2-5-17.5-19-17.5-31.5z"/>',
      long: '<rect x="31" y="3" width="26" height="42" rx="12"/>',
      unsure: '<ellipse cx="44" cy="24" rx="15" ry="19" stroke-dasharray="2.5 4"/>',
    },
  };
  const icon = body => `<svg class="q-ico" viewBox="0 0 88 48" aria-hidden="true">${body}</svg>`;
  const frameArt = (shape, thin) => `<span class="q-frame${thin ? ' is-thin' : ''}">${window.hoeFrameSVG(shape, { c: 'currentColor', lens: 'transparent' })}</span>`;
  const PALETTE = {
    neutral: [{ c: '#1b1a19' }, { c: '#4a4541' }, { c: '#857e75' }],
    tortoise: [{ c: '#4b2a17' }, { c: '#7d4a22' }, { c: '#a8733a' }],
    color: [{ c: '#233f69' }, { c: '#6c2432' }, { c: '#355c47' }],
    clear: [{ c: '#b3a792', lens: 'rgba(255,255,255,.7)' }, { c: '#c2a986', lens: 'rgba(255,255,255,.7)' }, { c: '#93a6b3', lens: 'rgba(255,255,255,.7)' }],
  };
  const swatches = fam => `<svg class="q-ico" viewBox="0 0 88 48" aria-hidden="true">${PALETTE[fam].map((p, i) =>
    `<circle cx="${24 + i * 20}" cy="24" r="9" style="fill:${p.c};stroke:rgba(20,19,18,.18);stroke-width:1"/>`).join('')}</svg>`;
  function art(step, v) {
    if (ICON[step]) return icon(ICON[step][v]);
    if (step === 'vibe') return frameArt({ classic: 'rect', bold: 'square', minimal: 'round', vintage: 'browline' }[v], v === 'minimal');
    if (step === 'feel') return frameArt({ metal: 'rect', acetate: 'rect', either: 'browline' }[v], v === 'metal');
    if (step === 'color') return swatches(v);
    return '';
  }

  // ---------- scoring: face shape first, then style, then feel/use; kids skip adult-only shapes ----------
  const FACE = {
    round: ['rect', 'square', 'geo', 'browline'],
    square: ['round', 'oval', 'cateye', 'aviator'],
    heart: ['oval', 'round', 'aviator', 'rect'],
    long: ['square', 'round', 'browline', 'aviator'],
  };
  const VIBE = {
    classic: ['rect', 'oval', 'aviator', 'browline'],
    bold: ['square', 'cateye', 'geo', 'rect'],
    minimal: ['round', 'oval', 'rect', 'geo'],
    vintage: ['browline', 'round', 'cateye', 'aviator'],
  };
  const FEEL = { metal: ['aviator', 'round', 'oval', 'geo'], acetate: ['square', 'rect', 'cateye', 'browline'] };
  const USE = { sun: { aviator: 1.5, square: 0.5, cateye: 0.5 }, reading: { rect: 0.5, oval: 0.5 }, screen: { rect: 0.5, square: 0.5 } };
  const KID = { aviator: -3, browline: -3, cateye: -1, geo: -1, round: 1, rect: 1, square: 0.5 };

  function pick(a) {
    const order = window.HOE_SHAPE_ORDER;
    const score = Object.fromEntries(order.map(s => [s, 0]));
    const add = (list, w) => list.forEach((s, i) => { score[s] += w[Math.min(i, w.length - 1)]; });
    if (a.face === 'oval') order.forEach(s => { score[s] += 2; });
    else if (FACE[a.face]) add(FACE[a.face], [3, 3, 2, 2]);
    add(VIBE[a.vibe], [2.5, 2, 1.5, 1]);
    if (FEEL[a.feel]) add(FEEL[a.feel], [1]);
    Object.entries(USE[a.use] || {}).forEach(([s, w]) => { score[s] += w; });
    if (a.who === 'kid') Object.entries(KID).forEach(([s, w]) => { score[s] += w; });
    return order.slice()
      .sort((x, y) => score[y] - score[x] || order.indexOf(x) - order.indexOf(y))
      .slice(0, 3)
      .map(s => ({ s, face: a.face === 'oval' || (FACE[a.face] || []).includes(s), style: VIBE[a.vibe].includes(s) }));
  }

  // ---------- elements ----------
  const stage = document.getElementById('q-stage');
  const result = document.getElementById('quiz-result');
  const back = document.getElementById('q-back');
  const track = document.getElementById('q-track');
  const count = document.getElementById('q-count');

  function renderBar() {
    const s = state.step;
    back.disabled = s === 0;
    const frac = s >= DONE ? 1 : (s + 1) / (DONE + 1);
    track.style.setProperty('--p', frac.toFixed(3));
    track.setAttribute('aria-valuenow', String(Math.min(s, DONE)));
    const label = s >= DONE ? t('quiz.countDone') : t('quiz.count', { n: s + 1, t: DONE });
    track.setAttribute('aria-valuetext', label);
    count.textContent = label;
  }

  function renderStep(dir) {
    const q = STEPS[state.step];
    stage.innerHTML = `
      <div class="q-screen${dir ? ' is-' + dir : ''}" data-step="${q.id}">
        <div class="q-ask">
          <h2 class="q-title" id="q-title" tabindex="-1">${tk('quiz.q.' + q.id)}</h2>
          <p class="q-hint">${tk('quiz.qh.' + q.id)}</p>
          ${q.link ? `<a class="link-u q-link" href="${q.link}">${t('quiz.face.link')}</a>` : ''}
        </div>
        <div class="q-opts" role="group" aria-labelledby="q-title">
          ${q.opts.map(v => `
          <button type="button" class="q-opt" data-v="${v}" aria-pressed="${state.a[q.id] === v}">
            <span class="q-opt-art" aria-hidden="true">${art(q.id, v)}</span>
            <span class="q-opt-txt"><span class="q-opt-name">${tk(`quiz.o.${q.id}.${v}`)}</span><span class="q-opt-hint">${tk(`quiz.oh.${q.id}.${v}`)}</span></span>
            <span class="q-opt-go" aria-hidden="true">
              <svg class="go" viewBox="0 0 20 20"><path d="M3 10h13M11.5 5.5 16 10l-4.5 4.5"/></svg>
              <svg class="ok" viewBox="0 0 20 20"><path d="m4 10.5 4 4 8-9"/></svg>
            </span>
          </button>`).join('')}
        </div>
      </div>`;
  }

  const LO = window.HOE_LENS_OPTIONS || { uses: [], materials: [], coatings: [] };
  const lensText = o => o[lang()] || o.en;
  const byId = (list, id) => (list || []).find(o => o.id === id);
  const USE_LENS = { allday: 'single', screen: 'single', reading: 'readers', sun: 'single' };
  const COATS = {
    allday: ['anti-reflective', 'scratch', 'uv'],
    screen: ['blue-light', 'anti-reflective', 'scratch'],
    reading: ['anti-reflective', 'scratch'],
    sun: ['polarized', 'light-responsive', 'uv'],
  };

  function renderResult() {
    const a = state.a;
    const kid = a.who === 'kid';
    document.getElementById('qr-face').textContent = t('quiz.fs.' + a.face);

    // answers, each one editable
    document.getElementById('qr-answers').innerHTML = STEPS.map((q, i) => {
      const v = tk(`quiz.o.${q.id}.${a[q.id]}`);
      return `<li><button type="button" class="qr-ans" data-step="${i}">
        <span class="qr-ans-k">${t('quiz.k.' + q.id)}</span>
        <span class="qr-ans-v">${v}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5 15.5 7.5 7.5 15.5H4.5V12.5z"/></svg>
        <span class="visually-hidden">(${t('quiz.r.change')})</span>
      </button></li>`;
    }).join('');

    // three shapes, drawn in the chosen colors
    const pal = PALETTE[a.color];
    const thin = a.feel === 'metal';
    document.getElementById('qr-shapes').innerHTML = pick(a).map((p, i) => {
      const why = [p.face && a.face !== 'unsure' ? t('quiz.r.byFace') : '', p.style ? t('quiz.r.byStyle') : ''].filter(Boolean);
      return `<li class="qr-shape" style="--i:${i}">
        <div class="qr-art${thin ? ' is-thin' : ''}">${window.hoeFrameSVG(p.s, pal[i])}</div>
        <h3>${t(window.HOE_SHAPE_LABEL[p.s])}</h3>
        ${why.length ? `<p class="qr-why">${why.join(' · ')}</p>` : ''}
        <p class="qr-blurb">${t('quiz.sh.' + p.s)}</p>
      </li>`;
    }).join('');

    // material, color, lenses, coatings
    const mats = kid ? ['mat.tr90', 'mat.acetate'] : { metal: ['mat.metal', 'mat.titanium'], acetate: ['mat.acetate'], either: ['mat.mixed', 'mat.acetate', 'mat.metal'] }[a.feel];
    const row = (k, body) => `<div class="qr-row"><dt>${t(k)}</dt><dd>${body}</dd></div>`;
    const rows = [];
    rows.push(row('quiz.r.material', `<p class="qr-names">${mats.map(m => t(m)).join(' · ')}</p><p>${t(kid ? 'quiz.m.kid' : 'quiz.m.' + a.feel)}</p>`));
    rows.push(row('quiz.r.color', `<p class="qr-names"><span class="qr-sw" aria-hidden="true">${pal.map(p => `<span style="--c:${p.c}"></span>`).join('')}</span>${tk('quiz.o.color.' + a.color)}</p><p>${t('quiz.c.' + a.color)}</p>`));
    const use = byId(LO.uses, USE_LENS[a.use]);
    if (use) {
      const poly = kid ? byId(LO.materials, 'poly-159') : null;
      rows.push(row('quiz.r.lens', `<p class="qr-names">${lensText(use).name}</p><p>${lensText(use).text}</p>` +
        `<p class="qr-tip">${tk('quiz.ln.' + a.use)}</p>` +
        (poly ? `<p class="qr-names qr-sub">${t('quiz.r.lensMat')}: ${lensText(poly).name}</p><p>${lensText(poly).text}</p>` : '')));
    }
    let coatIds = COATS[a.use].slice();
    if (kid) coatIds = [...new Set(['scratch', 'uv', ...coatIds])].slice(0, 4);
    const coats = coatIds.map(id => byId(LO.coatings, id)).filter(Boolean);
    if (coats.length) {
      rows.push(row('quiz.r.coatings', `<ul class="qr-coats">${coats.map(c => `<li><strong>${lensText(c).name}.</strong> ${lensText(c).text}</li>`).join('')}</ul>` +
        `<a class="link-u" href="lentes.html">${t('quiz.r.lensLink')}</a>`));
    }
    document.getElementById('qr-details').innerHTML = rows.join('');
  }

  // ---------- flow ----------
  let enterT = 0;
  function render({ dir = '', focus = false } = {}) {
    renderBar();
    const done = state.step >= DONE;
    stage.hidden = done;
    result.hidden = !done;
    quiz.classList.toggle('is-done', done);
    // the result's entrance plays once, on arrival; language re-renders swap text in place
    clearTimeout(enterT);
    result.classList.toggle('is-enter', done && !!dir);
    if (done && dir) enterT = setTimeout(() => result.classList.remove('is-enter'), 800);
    if (done) renderResult(); else renderStep(dir);
    if (focus) {
      const target = done ? document.getElementById('qr-title') : document.getElementById('q-title');
      target.focus({ preventScroll: true });
      const top = quiz.getBoundingClientRect().top;
      const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0;
      if (top < headerH || top > window.innerHeight * 0.45) quiz.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' });
    }
  }
  function go(step, dir) {
    state.step = Math.max(0, Math.min(DONE, step));
    if (state.step >= DONE) state.edit = false;
    save();
    render({ dir, focus: true });
  }

  let advance = 0;
  stage.addEventListener('click', e => {
    const b = e.target.closest('.q-opt');
    if (!b || state.step >= DONE) return;
    const q = STEPS[state.step];
    state.a[q.id] = b.dataset.v;
    stage.querySelectorAll('.q-opt').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    save();
    clearTimeout(advance);
    const next = state.edit && complete() ? DONE : state.step + 1;
    // a short beat so the check mark registers before the next question slides in
    advance = setTimeout(() => go(next, 'fwd'), reduced.matches ? 0 : 240);
  });
  // arrow keys move between the options of the current question
  stage.addEventListener('keydown', e => {
    const opts = [...stage.querySelectorAll('.q-opt')];
    const i = opts.indexOf(document.activeElement);
    if (i === -1) return;
    const map = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: opts.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    opts[(map[e.key] + opts.length) % opts.length].focus();
  });
  back.addEventListener('click', () => { clearTimeout(advance); if (state.step > 0) go(state.step - 1, 'back'); });
  document.getElementById('qr-answers').addEventListener('click', e => {
    const b = e.target.closest('.qr-ans');
    if (!b) return;
    state.edit = true;
    go(Number(b.dataset.step), 'back');
  });

  // ---------- optional email (NOT connected yet: nothing is sent or stored) ----------
  const form = document.getElementById('qr-mail');
  const email = document.getElementById('qr-email');
  const consent = document.getElementById('qr-consent');
  const msg = document.getElementById('qr-msg');
  function showMsg(key, kind) {
    form.dataset.msg = key || '';
    msg.textContent = key ? t(key) : '';
    msg.className = 'qr-msg' + (kind ? ' is-' + kind : '');
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    email.setAttribute('aria-invalid', String(!ok));
    if (!ok) { showMsg('quiz.e.bad', 'error'); email.focus(); return; }
    if (!consent.checked) { showMsg('quiz.e.noConsent', 'error'); consent.focus(); return; }
    showMsg('quiz.e.ok', 'ok');
  });
  email.addEventListener('input', () => { if (email.getAttribute('aria-invalid') === 'true') email.removeAttribute('aria-invalid'); });

  document.getElementById('q-restart').addEventListener('click', () => {
    clearTimeout(advance);
    state = { step: 0, a: {}, edit: false };
    store.clear();
    form.reset();
    email.removeAttribute('aria-invalid');
    showMsg('', '');
    go(0, 'back');
  });

  // ---------- language: re-render in place, keep focus where it was ----------
  document.addEventListener('hoe:lang', () => {
    const active = document.activeElement;
    const inQuiz = quiz.contains(active);
    const v = active && active.dataset ? (active.dataset.v || active.dataset.step) : null;
    render();
    if (form.dataset.msg) msg.textContent = t(form.dataset.msg);
    document.title = t('quiz.metaTitle');
    if (inQuiz && v != null) quiz.querySelector(`[data-v="${v}"], .qr-ans[data-step="${v}"]`)?.focus({ preventScroll: true });
  });

  document.title = t('quiz.metaTitle');
  render();
})();
