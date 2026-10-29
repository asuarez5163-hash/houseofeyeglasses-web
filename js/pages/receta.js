// Tu receta / Your prescription (receta.html)
// 1) receta de ejemplo anotada, 2) "Entiende tu receta" (escribir → confirmar signos → lectura), 3) calculadora de PD.
// Todo corre en el navegador: nada se envía ni se guarda (ni en localStorage). Materiales: fuente única js/data/lenses.js.
(() => {
  'use strict';
  const page = document.querySelector('main.rx');
  if (!page) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const lang = () => (window.hoeLang ? window.hoeLang() : 'en');
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MINUS = '−';
  const round2 = v => Math.round(v * 100) / 100;
  const signed = v => (v > 0 ? '+' : v < 0 ? MINUS : '') + Math.abs(v).toFixed(2);
  const signedHTML = v => (v === 0 ? '0.00' : `<span class="rx-sgn">${v > 0 ? '+' : MINUS}</span>${Math.abs(v).toFixed(2)}`);
  const mm = v => { const r = Math.round(v * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); };
  const loc = o => (o && (o[lang()] || o.en)) || { name: '', text: '' };
  const ICON = {
    warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.3v.2"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.2"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8L16.2 9.5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/></svg>',
  };

  /* =========================================================
     1) Annotated sample: hover (mouse), tap or focus a column
     ========================================================= */
  const read = $('#read-rx');
  const TERMS = ['od', 'os', 'sph', 'cyl', 'axis', 'add', 'prism', 'pd', 'exp'];
  const explainBody = $('#rx-explain-body');
  let term = 'sph';

  function renderTerm(animate) {
    const i = TERMS.indexOf(term);
    const pad = n => String(n).padStart(2, '0');
    $('#rx-explain-count').textContent = `${pad(i + 1)} / ${pad(TERMS.length)}`;
    const k = `receta.t.${term}.`;
    explainBody.innerHTML =
      `<p class="rx-explain-abbr num">${T(k + 'abbr')}</p>` +
      `<h3 class="rx-explain-name">${T(k + 'name')}</h3>` +
      `<p class="rx-explain-text">${T(k + 'text')}</p>` +
      `<p class="rx-explain-ex"><span>${T('receta.inSample')}</span>${T(k + 'ex')}</p>`;
    swapIn(animate);
    $$('.rx-term', read).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.term === term)));
    $$('[data-col]', read).forEach(c => c.classList.toggle('is-on', c.dataset.col === term));
    $$('tr[data-row]', read).forEach(r => r.classList.toggle('is-on', r.dataset.row === term));
  }
  // the new term settles in: 200 ms crossfade with a 2 px blur that masks the swap (transform-free, interruptible)
  let swapAnim = null;
  function swapIn(animate) {
    if (swapAnim) { swapAnim.cancel(); swapAnim = null; }
    if (!animate || typeof explainBody.animate !== 'function') return;
    swapAnim = explainBody.animate(
      [{ opacity: 0, filter: 'blur(2px)' }, { opacity: 1, filter: 'blur(0px)' }],
      { duration: 200, easing: 'cubic-bezier(.16,1,.3,1)' },
    );
    swapAnim.onfinish = () => { swapAnim = null; };
  }
  function setTerm(t, animate) {
    if (!TERMS.includes(t) || t === term) return;
    term = t;
    renderTerm(animate && !reduceMotion());
  }
  const termOf = el => el && (el.dataset.term || el.dataset.col);

  // hover only for a real mouse; touch uses tap (click) so a scroll never flips the panel
  read.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest('.rx-paper [data-col], .rx-paper [data-term]');
    if (el) setTerm(termOf(el), true);
  });
  read.addEventListener('click', e => {
    const byPointer = e.detail > 0;
    const el = e.target.closest('.rx-paper [data-col], .rx-paper [data-term]');
    if (el) setTerm(termOf(el), byPointer);
    const step = e.target.closest('[data-explain]');
    if (step) {
      const i = TERMS.indexOf(term);
      setTerm(TERMS[(i + Number(step.dataset.explain) + TERMS.length) % TERMS.length], byPointer);
    }
  });
  read.addEventListener('focusin', e => { const b = e.target.closest('.rx-term'); if (b && b.matches(':focus-visible')) setTerm(b.dataset.term, false); });
  // arrow keys move between the annotated parts
  read.addEventListener('keydown', e => {
    const b = e.target.closest('.rx-term');
    if (!b || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const i = TERMS.indexOf(b.dataset.term);
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? TERMS.length - 1
      : (i + (e.key === 'ArrowRight' ? 1 : -1) + TERMS.length) % TERMS.length;
    read.querySelector(`.rx-term[data-term="${TERMS[n]}"]`).focus();
  });

  /* =========================================================
     2) Understand my prescription: enter → confirm signs → read
     ========================================================= */
  const tool = $('#understand');
  const form = $('#rx-form');
  const confirmEl = $('#rx-confirm');
  const resultEl = $('#rx-result');
  const errBox = $('#rx-errors');
  const EYES = ['od', 'os'];
  const eyeName = e => T(e === 'od' ? 'receta.rightEye' : 'receta.leftEye');
  let step = 1;
  let errorsOn = false;
  let osAddTouched = false;

  // options: SPH ±20.00, CYL ±10.00 in 0.25 steps; ADD +0.25..+3.50; PD 42–80 or 21–40 per eye in 0.5 mm
  const opt = (v, label, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${label}</option>`;
  function powerOptions(max) {
    let plus = '', minus = '';
    for (let n = max * 4; n >= 1; n--) plus += opt((n / 4).toFixed(2), '+' + (n / 4).toFixed(2));
    for (let n = 1; n <= max * 4; n++) minus += opt((-n / 4).toFixed(2), MINUS + (n / 4).toFixed(2));
    return `<optgroup data-lbl="receta.optPlus">${plus}</optgroup>${opt('0.00', '0.00', true)}<optgroup data-lbl="receta.optMinus">${minus}</optgroup>`;
  }
  function stepOptions(min, max, stepSize, value, label, emptyKey) {
    let h = `<option value="" data-lbl="${emptyKey}" selected></option>`;
    for (let v = min; v <= max + 1e-9; v = round2(v + stepSize)) h += opt(value(v), label(v));
    return h;
  }
  EYES.forEach(e => {
    $(`#${e}-sph`).innerHTML = powerOptions(20);
    $(`#${e}-cyl`).innerHTML = powerOptions(10);
    $(`#${e}-add`).innerHTML = stepOptions(0.25, 3.5, 0.25, v => v.toFixed(2), v => '+' + v.toFixed(2), 'receta.none');
  });
  $('#pd-one').innerHTML = stepOptions(42, 80, 0.5, mm, mm, 'receta.pick');
  $('#pd-od').innerHTML = $('#pd-os').innerHTML = stepOptions(21, 40, 0.5, mm, mm, 'receta.pick');

  function applyLabels() {
    $$('[data-lbl]', page).forEach(el => {
      const v = T(el.dataset.lbl);
      if (el.tagName === 'OPTGROUP') el.label = v; else el.textContent = v;
    });
  }

  function syncAxis(e) {
    const on = Number($(`#${e}-cyl`).value) !== 0;
    const ax = $(`#${e}-axis`);
    ax.disabled = !on;
    ax.setAttribute('aria-required', String(on));
    ax.placeholder = on ? '1–180' : '—';
    if (!on) ax.value = '';
  }
  const pdMode = () => ($('input[name="rx-pdmode"]:checked') || { value: 'single' }).value;
  function syncPd() {
    const dual = pdMode() === 'dual';
    $('#rx-pd-single').hidden = dual;
    $('#rx-pd-dual').hidden = !dual;
  }

  function readForm() {
    const eye = e => {
      const sph = Number($(`#${e}-sph`).value);
      const cyl = Number($(`#${e}-cyl`).value);
      const axRaw = $(`#${e}-axis`).value.trim();
      const addRaw = $(`#${e}-add`).value;
      return { sph, cyl, axRaw, axis: cyl !== 0 && /^\d{1,3}$/.test(axRaw) ? Number(axRaw) : null, add: addRaw === '' ? null : Number(addRaw) };
    };
    const num = id => ($(`#${id}`).value === '' ? null : Number($(`#${id}`).value));
    const mode = pdMode();
    const pd = mode === 'single' ? { mode, total: num('pd-one') } : { mode, od: num('pd-od'), os: num('pd-os') };
    if (mode === 'dual') pd.total = pd.od != null && pd.os != null ? round2(pd.od + pd.os) : null;
    return { od: eye('od'), os: eye('os'), pd };
  }

  function validate(rx) {
    const errs = [];
    EYES.forEach(e => {
      const r = rx[e];
      if (r.cyl === 0) return;
      const el = $(`#${e}-axis`);
      if (r.axRaw === '') errs.push({ el, msg: fill(T('receta.errAxisReq'), { eye: eyeName(e) }) });
      else if (r.axis == null || r.axis < 1 || r.axis > 180) errs.push({ el, msg: fill(T('receta.errAxisRange'), { eye: eyeName(e) }) });
    });
    if (rx.pd.mode === 'dual' && (rx.pd.od == null) !== (rx.pd.os == null)) {
      errs.push({ el: $(rx.pd.od == null ? '#pd-od' : '#pd-os'), msg: T('receta.errPdBoth') });
    }
    return errs;
  }

  function showErrors(errs) {
    $$('[aria-invalid]', form).forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
    errorsOn = errs.length > 0;
    errBox.hidden = !errorsOn;
    if (!errorsOn) { errBox.innerHTML = ''; return; }
    errBox.innerHTML = `<p>${T('receta.errTitle')}</p><ul>${errs.map((er, i) =>
      `<li id="rx-err-${i}"><a href="#${er.el.id}">${er.msg}</a></li>`).join('')}</ul>`;
    errs.forEach((er, i) => { er.el.setAttribute('aria-invalid', 'true'); er.el.setAttribute('aria-describedby', `rx-err-${i}`); });
  }
  const recheck = () => { if (errorsOn) showErrors(validate(readForm())); };

  EYES.forEach(e => {
    $(`#${e}-cyl`).addEventListener('change', () => { syncAxis(e); recheck(); });
    $(`#${e}-axis`).addEventListener('input', ev => {
      const clean = ev.target.value.replace(/\D/g, '').slice(0, 3);
      if (clean !== ev.target.value) ev.target.value = clean;
      recheck();
    });
  });
  // ADD is usually written once: copy right → left until the left one is changed by hand
  $('#os-add').addEventListener('change', () => { osAddTouched = true; });
  $('#od-add').addEventListener('change', ev => { if (!osAddTouched) $('#os-add').value = ev.target.value; });
  $$('input[name="rx-pdmode"]').forEach(r => r.addEventListener('change', () => { syncPd(); recheck(); }));
  ['pd-od', 'pd-os'].forEach(id => $(`#${id}`).addEventListener('change', recheck));

  errBox.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    const f = document.getElementById(a.getAttribute('href').slice(1));
    if (!f) return;
    f.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
    f.focus({ preventScroll: true });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const errs = validate(readForm());
    showErrors(errs);
    if (errs.length) { errBox.focus(); return; }
    go(2);
  });

  function go(n, moveFocus = true) {
    step = n;
    form.hidden = n !== 1;
    confirmEl.hidden = n !== 2;
    if (n === 2) renderConfirm();
    if (n === 3) renderResult(); else resultEl.innerHTML = '';
    $$('#rx-steps li').forEach((li, i) => {
      if (i + 1 === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      li.classList.toggle('is-done', i + 1 < n);
    });
    if (!moveFocus) return;
    const target = n === 1 ? $('#od-sph') : n === 2 ? $('#rx-confirm-title') : $('#rx-result-title');
    const top = $('#rx-steps').getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.4) $('#rx-steps').scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
    target.focus({ preventScroll: true });
  }

  // ---- step 2: every value with its sign spelled out ----
  const said = v => (v === 0 ? T('receta.zero') : `<strong>${T(v < 0 ? 'receta.minus' : 'receta.plus')}</strong> ${Math.abs(v).toFixed(2)}`);
  const row = (abbr, val, words) => `<div><dt>${abbr}</dt><dd><span class="rx-c-val">${val}</span><span class="rx-c-said">${words}</span></dd></div>`;

  function renderConfirm() {
    const rx = readForm();
    const eyeBlock = e => {
      const r = rx[e];
      return `<div class="rx-conf-eye">
        <p class="rx-group-h"><strong>${e.toUpperCase()}</strong> <span>${eyeName(e)}</span></p>
        <dl>
          ${row('SPH', signedHTML(r.sph), said(r.sph))}
          ${row('CYL', signedHTML(r.cyl), said(r.cyl))}
          ${row('AXIS', r.axis != null ? `${r.axis}°` : '—', r.axis != null ? `${r.axis} ${T('receta.degrees')}` : T('receta.noAxis'))}
          ${row('ADD', r.add != null ? signedHTML(r.add) : '—', r.add != null ? said(r.add) : T('receta.noAdd'))}
        </dl>
      </div>`;
    };
    const pd = rx.pd;
    let pdVal = '—', pdSaid = T('receta.noPd');
    if (pd.total != null && pd.mode === 'single') { pdVal = mm(pd.total); pdSaid = `${mm(pd.total)} ${T('receta.mm')}`; }
    if (pd.total != null && pd.mode === 'dual') { pdVal = `${mm(pd.od)} / ${mm(pd.os)}`; pdSaid = `${mm(pd.od)} + ${mm(pd.os)} = ${mm(pd.total)} ${T('receta.mm')}`; }
    $('#rx-confirm-body').innerHTML = eyeBlock('od') + eyeBlock('os') +
      `<div class="rx-conf-eye rx-conf-pd"><dl>${row('PD', pdVal, pdSaid)}</dl></div>`;
  }

  // ---- step 3: reading (educational, not a diagnosis) ----
  function analyze(rx) {
    const eyes = {};
    EYES.forEach(e => {
      const { sph, cyl, add } = rx[e];
      const m1 = sph, m2 = round2(sph + cyl);            // the two main meridians
      const neg = m1 < 0 || m2 < 0, pos = m1 > 0 || m2 > 0;
      eyes[e] = {
        type: neg && pos ? 'mixed' : neg ? 'myopia' : pos ? 'hyperopia' : 'none',
        astig: cyl !== 0,
        power: Math.max(Math.abs(m1), Math.abs(m2)),     // strongest meridian
        se: sph + cyl / 2,                               // spherical equivalent
        add,
      };
    });
    return eyes;
  }
  const whichEyes = list => (list.length === 2 ? T('receta.both') : T(list[0] === 'od' ? 'receta.rightOnly' : 'receta.leftOnly'));
  const item = (title, tag, body) => `<div><dt>${title}${tag ? ` <span class="rx-tag">${tag}</span>` : ''}</dt><dd>${body}</dd></div>`;

  function renderResult() {
    const rx = readForm();
    const eyes = analyze(rx);
    const by = t => EYES.filter(e => eyes[e].type === t);
    const adds = EYES.filter(e => eyes[e].add != null);
    const hasAdd = adds.length > 0;
    const distZero = by('none').length === 2;
    const addText = adds.length === 2 && eyes.od.add !== eyes.os.add
      ? `${signed(eyes.od.add)} / ${signed(eyes.os.add)}` : hasAdd ? signed(eyes[adds[0]].add) : '';

    // your eyes
    const findings = [];
    const push = (key, list, map) => findings.push(item(T(`receta.f.${key}.t`), whichEyes(list), fill(T(`receta.f.${key}.d`), map || {})));
    if (distZero && !hasAdd) push('plano', EYES);
    else {
      if (distZero) push('zero', EYES);
      if (by('myopia').length) push('myopia', by('myopia'));
      if (by('hyperopia').length) push('hyperopia', by('hyperopia'));
      if (by('mixed').length) push('mixed', by('mixed'));
      const astig = EYES.filter(e => eyes[e].astig && eyes[e].type !== 'mixed');
      if (astig.length) push('astig', astig);
      if (hasAdd) push('presby', adds, { add: addText });
    }

    // lenses that make sense (names come from js/data/lenses.js)
    const opts = window.HOE_LENS_OPTIONS || { uses: [], materials: [] };
    const useId = hasAdd ? (distZero ? 'readers' : 'progressive') : (distZero ? 'non-rx' : 'single');
    const useKey = { progressive: 'progressive', readers: 'readers', single: 'single', 'non-rx': 'nonrx' }[useId];
    const use = opts.uses.find(u => u.id === useId);
    const lenses = [item(loc(use).name, T('receta.use.tag'), `<p>${T('receta.use.' + useKey)}</p>`)];

    const P = round2(Math.max(eyes.od.power, eyes.os.power));
    const mat = window.hoeSuggestIndex ? window.hoeSuggestIndex(P) : null;
    if (mat) {
      const where = eyes.od.power === eyes.os.power ? T('receta.eyeB') : T(eyes.od.power > eyes.os.power ? 'receta.eyeR' : 'receta.eyeL');
      const poly = opts.materials.find(m => m.impact);
      const basis = P === 0 ? T('receta.mat.zero') : `${fill(T('receta.mat.basis'), { p: P.toFixed(2), eye: where })} ${T('receta.mat.how')}`;
      lenses.push(item(loc(mat).name, T('receta.mat.tag'),
        `<p>${loc(mat).text}</p><p>${basis}</p>` +
        (P > 6 ? `<p>${T('receta.mat.high')}</p>` : '') +
        (poly ? `<p>${fill(T('receta.mat.kids'), { name: loc(poly).name })}</p>` : '') +
        `<a class="link-u" href="lentes.html">${T('receta.mat.link')}</a>`));
    }

    // worth a second look
    const flags = [];
    const diff = Math.abs(eyes.od.se - eyes.os.se);
    if (diff > 3) flags.push(['warn', fill(T('receta.flag.aniso'), { d: (Math.round(diff * 4) / 4).toFixed(2) })]);
    if (rx.pd.total == null) flags.push(['info', T('receta.flag.pdMissing')]);
    else if (rx.pd.total < 50 || rx.pd.total > 75) flags.push(['warn', fill(T('receta.flag.pdRange'), { pd: mm(rx.pd.total) })]);
    if (adds.length === 1 || (adds.length === 2 && eyes.od.add !== eyes.os.add)) flags.push(['warn', T('receta.flag.addDiff')]);
    if (rx.od.cyl > 0 || rx.os.cyl > 0) flags.push(['info', T('receta.flag.plusCyl')]);
    if (!flags.length) flags.push(['ok', T('receta.flag.none')]);

    resultEl.innerHTML = `<div class="rx-res">
      <h3 class="rx-panel-title" id="rx-result-title" tabindex="-1">${T('receta.resTitle')}</h3>
      <p class="rx-panel-lead">${T('receta.resLead')}</p>
      <div class="rx-res-grid">
        <div><h4 class="rx-kicker">${T('receta.resEyes')}</h4><dl class="rx-list">${findings.join('')}</dl></div>
        <div><h4 class="rx-kicker">${T('receta.resLenses')}</h4><dl class="rx-list">${lenses.join('')}</dl></div>
      </div>
      <div class="rx-flags-wrap">
        <h4 class="rx-kicker">${T('receta.resFlags')}</h4>
        <ul class="rx-flags">${flags.map(([k, txt]) => `<li class="is-${k}">${ICON[k]}<span>${txt}</span></li>`).join('')}</ul>
      </div>
      <p class="rx-private">${ICON.lock}<span>${T('receta.resPrivate')}</span></p>
      <div class="rx-actions">
        <button type="button" class="rx-btn-line" data-act="edit">${T('receta.resEdit')}</button>
        <button type="button" class="text-btn" data-act="restart">${T('receta.resRestart')}</button>
      </div>
    </div>`;
    // entrance order (css: .rx-res .rx-list > div, .rx-res .rx-flags li use --i for their delay)
    $$('.rx-list, .rx-flags', resultEl).forEach(list => { Array.from(list.children).forEach((el, i) => el.style.setProperty('--i', i)); });
  }

  // ---- sample / clear ----
  const setVal = (id, v) => { $(`#${id}`).value = v; };
  function fillSample() {
    setVal('od-sph', '-2.25'); setVal('od-cyl', '-0.75'); syncAxis('od'); setVal('od-axis', '180'); setVal('od-add', '1.75');
    setVal('os-sph', '-2.00'); setVal('os-cyl', '0.00'); syncAxis('os'); setVal('os-add', '1.75');
    $('input[name="rx-pdmode"][value="single"]').checked = true; syncPd();
    setVal('pd-one', '63'); setVal('pd-od', ''); setVal('pd-os', '');
    osAddTouched = false;
    showErrors([]);
  }
  function clearForm() {
    EYES.forEach(e => { setVal(`${e}-sph`, '0.00'); setVal(`${e}-cyl`, '0.00'); setVal(`${e}-add`, ''); syncAxis(e); });
    $('input[name="rx-pdmode"][value="single"]').checked = true; syncPd();
    ['pd-one', 'pd-od', 'pd-os'].forEach(id => setVal(id, ''));
    osAddTouched = false;
    showErrors([]);
  }

  tool.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'confirm') go(3);
    else if (act === 'edit') go(1);
    else if (act === 'restart') { clearForm(); go(1); }
    else if (act === 'sample') fillSample();
    else if (act === 'clear') { clearForm(); $('#od-sph').focus(); }
  });

  /* =========================================================
     3) PD calculator: add two monocular values
     ========================================================= */
  const cOd = $('#calc-od'), cOs = $('#calc-os'), cOut = $('#calc-out'), cMsg = $('#calc-msg');
  function renderCalc() {
    const vals = [cOd, cOs].map(i => (i.value === '' ? NaN : parseFloat(i.value)));
    const bad = [cOd, cOs].filter((i, n) => i.value !== '' && (isNaN(vals[n]) || vals[n] < 21 || vals[n] > 40));
    [cOd, cOs].forEach(i => { if (bad.includes(i)) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); });
    cOut.textContent = !isNaN(vals[0]) && !isNaN(vals[1]) ? `${mm(vals[0] + vals[1])} mm` : '—';
    cMsg.textContent = bad.length ? T('receta.calc.range') : '';
  }
  [cOd, cOs].forEach(i => i.addEventListener('input', renderCalc));

  /* ---------- language ---------- */
  function onLang() {
    applyLabels();
    renderTerm(false);
    const active = document.activeElement;
    const act = active && page.contains(active) ? active.dataset.act : null;
    if (errorsOn) showErrors(validate(readForm()));
    if (step === 2) renderConfirm();
    if (step === 3) renderResult();
    if (act) { const b = page.querySelector(`[data-act="${act}"]`); if (b) b.focus({ preventScroll: true }); }
    renderCalc();
    document.title = T('receta.docTitle');
  }
  document.addEventListener('hoe:lang', onLang);

  EYES.forEach(syncAxis);
  syncPd();
  applyLabels();
  renderTerm(false);
  renderCalc();
  document.title = T('receta.docTitle');
})();
