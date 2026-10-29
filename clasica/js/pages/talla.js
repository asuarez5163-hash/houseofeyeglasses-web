// Tu talla / Find your fit: size from the glasses you own, card measuring and the face-shape guide.
// Nothing here is saved or sent anywhere.
(() => {
  const $ = id => document.getElementById(id);
  const T = key => window.hoeT(key);
  const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const r1 = n => Math.round(n * 10) / 10;

  // ---------- one source for the size bands (total frame width, whole mm) ----------
  const HINGE_MM = 12;                // hinges + endpieces, both sides (real frames add ~12–13 mm to 2×lens + bridge)
  const BANDS = [                     // upper bound inclusive
    { key: 'narrow', max: 127 },
    { key: 'medium', max: 137 },
    { key: 'wide', max: 145 },
    { key: 'xwide', max: Infinity },
  ];
  const EDGES = BANDS.slice(0, -1).map(b => b.max + 0.5);   // 127.5, 137.5, 145.5
  const bandOf = mm => BANDS.find(b => Math.round(mm) <= b.max).key;
  const bandName = key => T('talla.band.' + key);

  /* =========================================================
     01 · size from the three numbers on the temple arm
     ========================================================= */
  const FIELDS = {
    lens: { el: $('ta-lens'), err: $('ta-lens-err'), min: 40, max: 62, val: 52 },
    bridge: { el: $('ta-bridge'), err: $('ta-bridge-err'), min: 12, max: 24, val: 18 },
    temple: { el: $('ta-temple'), err: $('ta-temple-err'), min: 120, max: 155, val: 140 },
  };
  const readField = f => {
    const s = f.el.value.trim();
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    return n >= f.min && n <= f.max ? n : null;
  };
  const clamp = (n, f) => Math.min(f.max, Math.max(f.min, n));

  function setBad(f, bad) {
    f.bad = bad;
    f.el.setAttribute('aria-invalid', String(bad));
    f.el.closest('.ta-field').classList.toggle('is-bad', bad);
    f.err.textContent = bad ? fill(T('talla.err'), { min: f.min, max: f.max }) : '';
  }

  Object.values(FIELDS).forEach(f => {
    f.el.addEventListener('input', () => {
      const v = readField(f);
      if (v == null) { setBad(f, true); renderSize(); return; }
      f.val = v; setBad(f, false); renderSize();
    });
    // leaving the field never strands a bad value: clamp numbers, restore anything else
    f.el.addEventListener('blur', () => {
      if (readField(f) != null) return;
      const n = parseFloat(f.el.value);
      f.val = Number.isFinite(n) ? clamp(Math.round(n), f) : f.val;
      f.el.value = f.val; setBad(f, false); renderSize();
    });
    f.el.closest('.ta-field').querySelectorAll('[data-step]').forEach(btn => {
      const step = () => {
        const base = readField(f) ?? f.val;
        f.val = clamp(base + Number(btn.dataset.step), f);
        f.el.value = f.val; setBad(f, false); renderSize();
      };
      // press and hold repeats (after a short pause); keyboard and assistive tech use click
      let wait, rep;
      const stop = () => { clearTimeout(wait); clearInterval(rep); };
      btn.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        step();
        wait = setTimeout(() => { rep = setInterval(step, 70); }, 420);
      });
      ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(ev => btn.addEventListener(ev, stop));
      btn.addEventListener('click', e => { if (e.detail === 0) step(); });
    });
  });
  $('ta-size-form').addEventListener('submit', e => e.preventDefault());
  // the temple arm drawing (shared with the home page); the numbers on it follow the fields
  $('ta-arm').innerHTML = window.hoeTempleSVG(`${FIELDS.lens.val} \u25a1 ${FIELDS.bridge.val} \u2014 ${FIELDS.temple.val}`, 'ta-arm-nums');

  // front view in millimeters (1 SVG unit = 1 mm), so lens and bridge are drawn to scale
  function frameSVG(L, B, tot) {
    const cx = 90, cy = 50;
    const H = r1(L * 0.74), rx = r1(H * 0.28);
    const top = r1(cy - H / 2), bot = r1(cy + H / 2);
    const lx = cx - B / 2 - L, rxL = cx + B / 2;          // left edge of each lens
    const e = HINGE_MM / 2;
    const x0 = lx - e, x1 = rxL + L + e;
    const yb = r1(top + H * 0.34), ye = r1(top + H * 0.3);
    const dy = 17, ty = 84;
    const dim = (a, b, y) => `<path class="ta-dim" d="M${a} ${y}H${b}M${a} ${y - 2.4}v4.8M${b} ${y - 2.4}v4.8"/>`;
    const ext = (x, y1, y2) => `<path class="ta-ext" d="M${x} ${y1}V${y2}"/>`;
    return `<svg viewBox="0 0 180 96" role="img" aria-label="${fill(T('talla.diag.aria'), { lw: L, br: B, tot })}">
      ${ext(lx, top - 2, dy + 3)}${ext(lx + L, top - 2, dy + 3)}${ext(rxL, top - 2, dy + 3)}
      ${ext(x0, ye + 3, ty + 3)}${ext(x1, ye + 3, ty + 3)}
      <rect class="ta-lensfill" x="${lx}" y="${top}" width="${L}" height="${H}" rx="${rx}"/>
      <rect class="ta-lensfill" x="${rxL}" y="${top}" width="${L}" height="${H}" rx="${rx}"/>
      <rect class="ta-rim" x="${lx}" y="${top}" width="${L}" height="${H}" rx="${rx}"/>
      <rect class="ta-rim" x="${rxL}" y="${top}" width="${L}" height="${H}" rx="${rx}"/>
      <path class="ta-rim" d="M${lx + L} ${yb}Q${cx} ${r1(yb - 4.5)} ${rxL} ${yb}"/>
      <path class="ta-rim" d="M${lx} ${ye}H${x0}M${rxL + L} ${ye}H${x1}"/>
      ${dim(lx, lx + L, dy)}${dim(lx + L, rxL, dy)}${dim(x0, x1, ty)}
      <text class="ta-dim-t" x="${lx + L / 2}" y="${dy - 4.5}" text-anchor="middle">${L}</text>
      <text class="ta-dim-t" x="${cx}" y="${dy - 4.5}" text-anchor="middle">${B}</text>
      <text class="ta-dim-t ta-dim-t--tot" x="${cx}" y="${ty + 9}" text-anchor="middle">≈ ${tot}\u00a0mm</text>
    </svg>`;
  }

  // band meter: 110–160 mm of total frame width
  const M_MIN = 110, M_MAX = 160;
  const mPct = v => ((Math.min(Math.max(v, M_MIN), M_MAX) - M_MIN) / (M_MAX - M_MIN)) * 100;
  function buildMeter() {
    const stops = [M_MIN, ...EDGES, M_MAX];
    const segs = BANDS.map((b, i) => ({ key: b.key, w: mPct(stops[i + 1]) - mPct(stops[i]) }));
    $('ta-meter').innerHTML = `
      <div class="ta-meter-ticks">${EDGES.map(x => `<span style="left:${mPct(x)}%">${Math.ceil(x)}</span>`).join('')}</div>
      <div class="ta-meter-bar">${segs.map(s => `<span class="ta-seg" data-band="${s.key}" style="width:${s.w}%"></span>`).join('')}<span class="ta-mark" id="ta-mark"></span></div>
      <div class="ta-meter-labels">${segs.map(s => `<span data-band="${s.key}" style="width:${s.w}%">${bandName(s.key)}</span>`).join('')}</div>`;
  }

  function renderSize() {
    const L = FIELDS.lens.val, B = FIELDS.bridge.val, TL = FIELDS.temple.val;
    const tot = 2 * L + B + HINGE_MM;
    const band = bandOf(tot);
    const bad = Object.values(FIELDS).some(f => f.bad);

    $('ta-arm-nums').textContent = `${L} □ ${B} — ${TL}`;
    $('ta-diagram').innerHTML = frameSVG(L, B, tot);
    $('ta-meter').querySelectorAll('[data-band]').forEach(s => s.classList.toggle('is-on', s.dataset.band === band));
    $('ta-mark').style.setProperty('--p', r1(mPct(tot)));
    document.querySelector('.ta-out').classList.toggle('is-stale', bad);

    $('ta-band').innerHTML = `<span class="visually-hidden">${T('talla.res.eyebrow')}: </span>` + (bad
      ? `<span class="ta-band-bad">${T('talla.res.invalid')}</span>`
      : `<span class="ta-band-name">${bandName(band)}</span> <span class="ta-band-mm">${fill(T('talla.res.width'), { tot })}</span>`);
    $('ta-math').textContent = fill(T('talla.res.math'), { lw: L, br: B, h: HINGE_MM });
    $('ta-look').textContent = fill(T('talla.res.look'), {
      lw1: L - 2, lw2: L + 2, br1: B - 2, br2: B + 2, tl1: TL - 5, tl2: TL + 5,
    });
  }

  /* =========================================================
     02 · measure the face with a card (85.6 × 53.98 mm)
     ========================================================= */
  const CARD_W = 85.6, CARD_H = 53.98;
  const CX = 12, CY = 30, CW = 276, S = CW / CARD_W, CH = r1(CARD_H * S);
  const cardX = mm => r1(CX + (Math.min(Math.max(mm, CARD_W), 2 * CARD_W) - CARD_W) * S);  // where the right temple lands

  const UNITS = { mm: { min: 100, max: 170, step: '1' }, in: { min: 3.9, max: 6.7, step: '0.1' } };
  let unit = 'mm';
  const fw = $('ta-face-w');

  function readFace() {
    const s = fw.value.trim();
    if (!s) return { empty: true };
    const n = Number(s);
    const u = UNITS[unit];
    if (!Number.isFinite(n) || n < u.min || n > u.max) return { bad: true };
    return { mm: unit === 'in' ? n * 25.4 : n };
  }

  function cardSVG(mm) {
    const stops = [CARD_W, ...EDGES, 2 * CARD_W];
    const band = mm ? bandOf(mm) : '';
    const zones = BANDS.map((b, i) => {
      const a = cardX(stops[i]), z = cardX(stops[i + 1]);
      return `<rect class="ta-zone${b.key === band ? ' is-on' : ''}" x="${a}" y="${CY}" width="${r1(z - a)}" height="${CH}"/>`;
    }).join('');
    const edges = EDGES.map(x => `<path class="ta-zone-edge" d="M${cardX(x)} ${CY + 6}V${CY + CH - 6}"/>`).join('');
    const tick = (f, label) => {
      const x = r1(CX + CW * f);
      return `<path class="ta-tick" d="M${x} ${CY + CH + 3}v7"/><text class="ta-tick-t" x="${x}" y="${CY + CH + 22}" text-anchor="middle">${label}</text>`;
    };
    let mark = '';
    if (mm) {
      const x = cardX(mm);
      const lx = Math.min(Math.max(x, CX + 34), CX + CW - 34);
      mark = `<g class="ta-cmark"><path d="M${x} ${CY - 8}V${CY + CH + 8}"/><circle cx="${x}" cy="${CY - 8}" r="3.5"/>
        <text x="${lx}" y="${CY - 16}" text-anchor="middle">${bandName(band)}</text></g>`;
    }
    const label = mm
      ? fill(T('talla.card.aria'), { pct: Math.round(((cardX(mm) - CX) / CW) * 100), band: bandName(band) })
      : T('talla.card.empty');
    return `<svg viewBox="0 0 300 ${Math.ceil(CY + CH + 30)}" role="img" aria-label="${label}">
      <defs><clipPath id="ta-card-clip"><rect x="${CX}" y="${CY}" width="${CW}" height="${CH}" rx="12"/></clipPath></defs>
      <g clip-path="url(#ta-card-clip)">${zones}</g>
      <rect class="ta-card-edge" x="${CX}" y="${CY}" width="${CW}" height="${CH}" rx="12"/>
      <rect class="ta-chip" x="${CX + 24}" y="${CY + 60}" width="36" height="28" rx="5"/>
      <path class="ta-chip" d="M${CX + 24} ${CY + 74}h36M${CX + 42} ${CY + 60}v28"/>
      ${edges}
      <circle class="ta-finger" cx="${CX}" cy="${r1(CY + CH / 2)}" r="5"/>
      ${tick(0.5, '½')}${tick(2 / 3, '⅔')}
      ${mark}
    </svg>`;
  }

  const inch = mm => {
    const eighths = Math.round((mm / 25.4) * 8);
    const whole = Math.floor(eighths / 8);
    return whole + ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'][eighths % 8];
  };
  function buildMap(active) {
    $('ta-map-body').innerHTML = BANDS.map((b, i) => {
      const lo = i ? BANDS[i - 1].max + 1 : null;
      const hi = b.max === Infinity ? null : b.max;
      const mmTxt = lo == null ? `${T('talla.under')} ${hi + 1}\u00a0mm` : hi == null ? `${T('talla.over')} ${lo - 1}\u00a0mm` : `${lo}–${hi}\u00a0mm`;
      const inTxt = lo == null ? `${T('talla.under')} ${inch(EDGES[0])}\u00a0in` : hi == null ? `${T('talla.over')} ${inch(EDGES[i - 1])}\u00a0in` : `${inch(EDGES[i - 1])}–${inch(EDGES[i])}\u00a0in`;
      return `<tr${b.key === active ? ' class="is-on"' : ''}>
        <th scope="row">${bandName(b.key)}</th>
        <td>${mmTxt}<small>${inTxt}</small></td>
        <td>${T('talla.card.' + b.key)}</td>
      </tr>`;
    }).join('');
  }

  function renderFace() {
    const r = readFace();
    const out = $('ta-fw-out');
    fw.setAttribute('aria-invalid', String(!!r.bad));
    out.classList.toggle('is-bad', !!r.bad);
    if (r.mm) {
      const band = bandOf(r.mm);
      out.innerHTML = `<strong>${bandName(band)}.</strong> ${fill(T('talla.fw.res'), { mm: Math.round(r.mm) })}`;
    } else if (r.bad) {
      out.textContent = fill(T('talla.fw.err'), { min: UNITS[unit].min, max: UNITS[unit].max, unit });
    } else {
      out.textContent = T('talla.fw.prompt');
    }
    $('ta-card').innerHTML = cardSVG(r.mm || 0);
    buildMap(r.mm ? bandOf(r.mm) : '');
  }

  fw.addEventListener('input', renderFace);
  document.querySelectorAll('input[name="ta-unit"]').forEach(radio => radio.addEventListener('change', () => {
    const before = readFace();
    unit = radio.value;
    const u = UNITS[unit];
    Object.assign(fw, { min: u.min, max: u.max, step: u.step });
    if (before.mm) fw.value = unit === 'in' ? (before.mm / 25.4).toFixed(1) : String(Math.round(before.mm));
    renderFace();
  }));

  /* =========================================================
     04 · face shapes (outline geometry) and the frames that contrast them
     ========================================================= */
  const FACES = {
    oval: 'M50 12C69 12 82 30 82 54C82 84 67 108 50 108C33 108 18 84 18 54C18 30 31 12 50 12Z',
    round: 'M50 17C72 17 88 35 88 60C88 86 71 104 50 104C29 104 12 86 12 60C12 35 28 17 50 17Z',
    square: 'M24 15H76C84 15 88 20 88 29V77C88 89 83 96 73 99L58 104H42L27 99C17 96 12 89 12 77V29C12 20 16 15 24 15Z',
    heart: 'M50 108C38 101 23 85 17 63C13 47 13 30 21 21C29 13 41 13 50 19C59 13 71 13 79 21C87 30 87 47 83 63C77 85 62 101 50 108Z',
    diamond: 'M50 10C58 10 64 19 70 31C76 43 86 51 86 60C86 70 77 80 69 90C63 98 56 108 50 108C44 108 37 98 31 90C23 80 14 70 14 60C14 51 24 43 30 31C36 19 42 10 50 10Z',
    oblong: 'M50 5C68 5 78 15 78 33V85C78 103 66 113 50 113C34 113 22 103 22 85V33C22 15 32 5 50 5Z',
  };
  const RECS = {
    oval: ['square', 'aviator', 'geo', 'cateye'],
    round: ['square', 'rect', 'geo'],
    square: ['round', 'oval', 'cateye'],
    heart: ['oval', 'round', 'aviator', 'browline'],
    diamond: ['cateye', 'oval', 'browline'],
    oblong: ['square', 'aviator', 'round'],
  };
  const faceSVG = (k, extra = '') => `<svg viewBox="-8 0 116 118" aria-hidden="true"><path class="ta-face-line" d="${FACES[k]}"/>${extra}</svg>`;

  // forehead / cheekbone / jaw widths, measured on the drawn outline itself
  function guides(path) {
    const len = path.getTotalLength();
    const pts = Array.from({ length: 481 }, (_, i) => path.getPointAtLength((len * i) / 480));
    const ys = pts.map(p => p.y);
    const top = Math.min(...ys), h = Math.max(...ys) - top;
    return [0.24, 0.5, 0.8].map(f => {
      const y = top + h * f;
      const xs = [];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
      const x1 = r1(Math.min(...xs) - 4), x2 = r1(Math.max(...xs) + 4), yy = r1(y);
      return `<path class="ta-guide" d="M${x1} ${yy}H${x2}"/><path class="ta-guide-end" d="M${x1} ${yy - 2.5}v5M${x2} ${yy - 2.5}v5"/>`;
    }).join('');
  }

  document.querySelectorAll('[data-face]').forEach(el => { el.innerHTML = faceSVG(el.dataset.face); });
  const faceOut = document.querySelector('.ta-face-out');

  function renderFaceShape(animate) {
    const k = document.querySelector('input[name="ta-face"]:checked')?.value || 'oval';
    const big = $('ta-face-big');
    big.innerHTML = faceSVG(k);
    big.querySelector('svg').insertAdjacentHTML('beforeend', guides(big.querySelector('path')));
    $('ta-face-title').textContent = T('talla.title.' + k);
    $('ta-tell').textContent = T('talla.tell.' + k);
    $('ta-recs').innerHTML = RECS[k].map((shape, i) => `<li>
      <span class="ta-rec-art">${window.hoeFrameSVG(shape, { c: 'var(--ink)', lens: 'var(--ta-lens)' })}</span>
      <span class="ta-rec-name">${T(`talla.rec.${k}.${i + 1}`)}</span>
      <span class="ta-rec-why">${T(`talla.why.${k}.${i + 1}`)}</span>
    </li>`).join('');
    if (animate) {
      faceOut.classList.remove('is-swap');
      void faceOut.offsetWidth;          // restart the short entrance
      faceOut.classList.add('is-swap');
    }
  }
  // a short entrance only when a face is tapped or clicked; arrow keys switch instantly
  let pointerAt = 0;
  document.querySelector('.ta-faces').addEventListener('pointerdown', () => { pointerAt = performance.now(); });
  document.querySelectorAll('input[name="ta-face"]').forEach(r => r.addEventListener('change', () => renderFaceShape(performance.now() - pointerAt < 600)));

  /* ---------- first paint + language changes ---------- */
  function renderAll() {
    document.title = T('talla.meta.title');
    Object.values(FIELDS).forEach(f => { if (f.bad) setBad(f, true); });
    buildMeter();
    renderSize();
    renderFace();
    renderFaceShape(false);
  }
  document.addEventListener('hoe:lang', renderAll);
  renderAll();
})();
