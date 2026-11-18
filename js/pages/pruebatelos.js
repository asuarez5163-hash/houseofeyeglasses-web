// Pruébatelos (pruebatelos.html?id=<SKU>): the virtual try-on, in 3D over the visitor's camera (or a photo).
// Data: data/manifest.json → tryon[cat] = data/t/<cat>.<hash>.json ([{ id, a:[ax,ay], m, h:[[x,y],[x,y]], c, p:[w,h], v }],
// written by the Central next to the catalog) + assets/tryon/<SKU>.webp (the frame's front, cut out, no temples) + the
// catalog record (js/catalog.js: name, price, size; the temple length draws the temples in 3D).
// Engine: MediaPipe Face Landmarker (478 points + the head's pose matrix, in cm) and three.js. The canonical face
// (js/data/face-mesh-v1.json) plus an invisible skull and two ears make the "occluder": whatever sits behind them is not
// drawn, so the temples rest on the ear and go down behind it. Everything runs on the device: no image leaves it.
// The product page shows its "Try them on" link only when the record carries t:1 (the Central marks it once the cut exists).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
import { FaceLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';

const dbg = window.__tyDbg || (() => {});   // ?debug=1 (inline script in pruebatelos.html): stage log + pings to the Worker
window.__tyStarted = true;
dbg('module ok: three ' + THREE.REVISION + ', mediapipe import ok');
(async () => {
  const main = document.querySelector('main.ty');
  if (!main || !window.hoeCatalog) { dbg('sin main.ty o sin hoeCatalog'); return; }
  const CAT = window.hoeCatalog;
  const $ = (s, r = document) => r.querySelector(s);
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const esc = s => (window.hoeEsc ? window.hoeEsc(s) : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  const ga = (name, p) => { try { if (typeof window.gtag === 'function') window.gtag('event', name, p || {}); } catch (e) { /* analytics is optional */ } };
  const q = new URLSearchParams(location.search);
  const wanted = (q.get('id') || '').trim();

  const stage = $('#ty-stage'), out = $('#ty-canvas'), octx = out.getContext('2d');
  const veil = $('#ty-veil'), veilText = $('#ty-veil-text'), msgEl = $('#ty-msg');
  const bCam = $('#ty-cam'), bShot = $('#ty-shot'), bMirror = $('#ty-mirror'), bStop = $('#ty-stop'), lFile2 = $('#ty-file2'), file = $('#ty-file');
  const nowEl = $('#ty-now'), stripEl = $('#ty-strip'), stripT = $('#ty-strip-t');
  const msg = (k, map) => { msgEl.textContent = k ? fill(T(k), map || {}) : ''; };
  const setVeil = (k, map) => { veilText.dataset.i18n = ''; veilText.textContent = fill(T(k), map || {}); veilText._k = k; veilText._map = map; };

  // ---------- data: the frames that can be tried on ----------
  const tryon = new Map();                           // sku → entry of data/t
  const loadedCats = new Set();
  const m = await CAT.manifest();
  dbg('manifest ' + (m ? 'ok v=' + m.v + ' tryon=' + Object.keys(m.tryon || {}).length : 'NULL'));
  if (!m) { notAvailable('tryon.updating'); return; }
  const refs = (m.tryon && typeof m.tryon === 'object') ? m.tryon : {};
  const loadCat = cat => {
    if (!refs[cat] || loadedCats.has(cat)) return Promise.resolve();
    loadedCats.add(cat);
    return fetch(refs[cat]).then(r => (r.ok ? r.json() : [])).catch(() => []).then(list => {
      (Array.isArray(list) ? list : []).forEach(e => { if (e && e.id && Array.isArray(e.p) && Array.isArray(e.a)) tryon.set(e.id, e); });
    });
  };
  function notAvailable(key, backHref) {
    $('#ty-sec').hidden = true;
    const box = $('#ty-404'); box.hidden = false;
    const p = $('#ty-404-text'); p.dataset.i18n = key; p.textContent = T(key);
    if (backHref) { const a = $('#ty-404-cta'); a.href = backHref; a.querySelector('span').dataset.i18n = 'tryon.thisFrame'; a.querySelector('span').textContent = T('tryon.thisFrame'); }
  }

  let frame = null, entry = null;
  if (wanted) {
    frame = await CAT.byId(wanted);
    if (!frame) { notAvailable('tryon.notFound'); return; }
    await loadCat(CAT.catOf(wanted) || frame.cats[0]);
    entry = tryon.get(wanted) || null;
    if (!entry) { notAvailable('tryon.notReady', CAT.url(frame)); return; }
  }
  // the strip: this model in its other colours, then more frames of the same category (in stock, ready to try on)
  async function buildStrip() {
    let pool = [];
    if (frame) {
      const cat = CAT.catOf(frame.id) || frame.cats[0];
      pool = await CAT.chunk(cat);
    } else {
      const feats = await CAT.featured();
      await Promise.all([...new Set(feats.map(f => CAT.catOf(f.id)).filter(Boolean))].map(loadCat));
      pool = feats;
      if (!feats.some(f => tryon.has(f.id))) { await loadCat('women'); pool = await CAT.chunk('women'); }
    }
    const ready = pool.filter(f => tryon.has(f.id) && Number(f.st) > 0);
    const sibs = new Set(frame ? (frame.v || []).map(s => s.id) : []);
    const list = [];
    if (frame) list.push(frame);
    ready.filter(f => sibs.has(f.id)).forEach(f => list.push(f));
    ready.filter(f => !sibs.has(f.id) && !(frame && f.id === frame.id)).sort((a, b) => Number(b.st) - Number(a.st) || (a.id < b.id ? -1 : 1))
      .forEach(f => { if (list.length < 24) list.push(f); });
    return list;
  }
  let strip = await buildStrip();
  if (!frame && strip.length) { frame = strip[0]; entry = tryon.get(frame.id); }
  dbg('frame ' + (frame ? frame.id : 'NINGUNO') + ' entry ' + !!entry + ' strip ' + strip.length);
  if (!frame) { notAvailable('tryon.updating'); return; }

  const imgUrl = (f, e) => `assets/tryon/${encodeURIComponent(f.id)}.webp?v=${(e && e.v) || 0}`;
  function renderNow() {
    const size = window.hoeFrameSize ? window.hoeFrameSize(frame) : '';
    nowEl.innerHTML = `<p class="kicker">${esc(frame.b || '')}</p><h2>${esc(CAT.name(frame))}</h2>
      <p class="ty-price"><b>${esc(CAT.price(frame.p))}</b> ${esc(T('tryon.frame'))} · ${esc(size)}</p>
      <a class="link-u" href="${esc(CAT.url(frame))}">${esc(T('tryon.see'))}</a>`;
    stripT.hidden = strip.length < 2;
    stripEl.innerHTML = strip.map(f => `<button class="ty-tile${f.id === frame.id ? ' is-on' : ''}" type="button" data-id="${esc(f.id)}" aria-pressed="${f.id === frame.id}" aria-label="${esc(fill(T('tryon.tile'), { name: CAT.name(frame) }))}">
        <span class="ty-img"><img src="${imgUrl(f, tryon.get(f.id))}" alt="" loading="lazy" decoding="async"></span>
        <small><b>${esc(f.b || '')}</b> ${esc(CAT.model(f.b, f.n))} · ${esc(CAT.colorName(f))}</small></button>`).join('');
    document.title = `${CAT.name(frame)} — ${T('tryon.h1')} · House of Eyeglasses`;
  }
  renderNow();
  stripEl.addEventListener('click', e => {
    const t = e.target.closest('.ty-tile'); if (!t) return;
    const f = strip.find(x => x.id === t.dataset.id); if (!f || f.id === frame.id) return;
    frame = f; entry = tryon.get(f.id);
    history.replaceState(null, '', 'pruebatelos.html?id=' + encodeURIComponent(f.id));
    renderNow(); buildGlasses();
    if (mode === 'photo') drawPhoto();
    ga('tryon_pick', { sku: f.id });
  });
  document.addEventListener('hoe:lang', () => {
    renderNow();
    if (veilText._k) setVeil(veilText._k, veilText._map);
    bMirror.textContent = T(mirror ? 'tryon.mirrorOn' : 'tryon.mirrorOff');
  });

  // ---------- face geometry (MediaPipe canonical_face_model, cm; +y up, +z towards the camera) ----------
  const FOV = 63;                                   // MediaPipe's virtual camera (face_geometry: vertical_fov_degrees 63)
  const Z_FRONT = 6.0;                              // the frame's front: ~12 mm in front of the cornea (canonical nasion z 5.24)
  const Y_DROP = 0.3;                               // the pupils sit ~3 mm above the lens centre
  const EAR = { x: 7.9, z: -4.2, top: 3.3 };        // the ear: side, depth and the height of its top edge (cm): the temple RESTS there and goes down behind (11/06: 6 mm further back, Armando's side photo)
  const GLASSES_Y = 2.63 - Y_DROP;                  // the glasses group's height on the face (lens centre)

  // ---------- the face's REAL size (11/17, Armando: «el de niño se ve de adulto»): the iris as a ruler ----------
  // MediaPipe fits every face to its canonical (average adult) face, in cm: on its own, every visitor would count as that
  // average face and a frame would look the same size on a child as on a large adult. The iris (horizontal visible diameter
  // ≈ 11.7 mm in adults: Rüfer et al., Cornea 2005 — the same ruler as pd.html) says how big THIS face is:
  // k = (px per canonical cm) ÷ (px per real cm), both measured at the eyes; the frame (real mm) is drawn at 1/k in the
  // head's canonical units (k > 1: a bigger face than the average one → the same frame looks smaller on it). Only frontal
  // views update it (|yaw| ≤ 15°, iris ≥ 8 px), median of the last 30 readings, clamped to 0.78–1.20 (outside that range it
  // is a bad reading, not a face). HELD 11/18: calibration on Armando's photos (E-tryon/test/calib1117/RESULTADO.md) drew the
  // frame ~10 % too big with the iris (MediaPipe's iris reads ~8 % large on him), so the live default stays the canonical face
  // (k = 1, as before 11/17) and the iris mode only runs with ?escala=iris, for calibration.
  const IRIS_MM = 11.7, K_MIN = 0.78, K_MAX = 1.2;
  const EYE_L = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];          // each eye's contour (canonical mesh)
  const EYE_R = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
  const metricScale = q.get('escala') === 'iris';
  let kFace = 1, kBuilt = 1, kLast = null, rebuilding = false, eyeL = null, eyeR = null;
  const kSamples = [];

  let lm = null, mode = 'idle', video = null, stream = null, photo = null, mirror = true, raf = 0;
  let mesh = null, lastErr = null;
  const texLoader = new THREE.TextureLoader();
  const texCache = {};

  // ---------- three.js ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 3 / 4, 1, 10000);   // units: cm; the face sits at negative z
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(30, 60, 120); scene.add(key);
  const head = new THREE.Group(); head.matrixAutoUpdate = false; scene.add(head);     // everything attached to the head (MediaPipe's pose)
  const occluderMat = new THREE.MeshBasicMaterial({ colorWrite: false });           // invisible, but it writes depth
  let glasses = null;

  function buildOccluder() {
    const pos = new Float32Array(mesh.v.length * 3);
    mesh.v.forEach((p, i) => { pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(mesh.f.flat());
    const face = new THREE.Mesh(g, occluderMat); face.renderOrder = -2;
    // the skull: an ellipsoid behind the face (the mesh ends at the ears) hides the temples behind the head
    const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), occluderMat);
    skull.scale.set(7.7, 10.2, 9.2); skull.position.set(0, 0.6, -3.6); skull.renderOrder = -2;
    const occluder = new THREE.Group(); occluder.add(face, skull);
    for (const side of [-1, 1]) {                   // the ears (the mesh has none): the temple goes behind them, the bend never shows
      const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), occluderMat);
      ear.scale.set(0.8, 3.0, 1.9); ear.position.set(side * EAR.x, EAR.top - 3.0, EAR.z - 0.4); ear.renderOrder = -2;
      occluder.add(ear);
    }
    head.add(occluder);
    buildHeadSides();
  }

  // ---------- how far out the head reaches, per side (11/18, Armando: «las patas quedan por dentro») ----------
  // The temple's path is a curve from the hinge to the ear; on narrow frames (kids, A ≤ 50) it ran 1–2 mm INSIDE the
  // canonical face between the temple of the head and the ear, so the occluder hid its middle: it looked as if the temple
  // went into the head and came out at the ear. headSide(side, y, z) = the outermost x (cm, head coordinates) of the face
  // mesh and the skull at that height and depth (ears left out: the temple rests on them); the temple is kept outside it.
  // A grid of 2 mm cells, filled once from the mesh's triangles (each triangle writes the x it reaches in the cells its
  // y–z footprint covers), max of the 4 cells around a point: never under the real surface by more than a cell's slope.
  const SIDE_G = { y0: -2, y1: 8, z0: -9, z1: 8, s: 0.2 };
  let sideGrid = null;
  function buildHeadSides() {
    const ny = Math.round((SIDE_G.y1 - SIDE_G.y0) / SIDE_G.s) + 1, nz = Math.round((SIDE_G.z1 - SIDE_G.z0) / SIDE_G.s) + 1;
    const out = [new Float32Array(ny * nz).fill(-1e9), new Float32Array(ny * nz).fill(-1e9)];   // [−x side as +, +x side]
    const V = mesh.v;
    for (const f of mesh.f) {
      const a = V[f[0]], b = V[f[1]], c = V[f[2]];
      const ymin = Math.min(a[1], b[1], c[1]), ymax = Math.max(a[1], b[1], c[1]), zmin = Math.min(a[2], b[2], c[2]), zmax = Math.max(a[2], b[2], c[2]);
      const j0 = Math.max(0, Math.floor((ymin - SIDE_G.y0) / SIDE_G.s)), j1 = Math.min(ny - 1, Math.ceil((ymax - SIDE_G.y0) / SIDE_G.s));
      const k0 = Math.max(0, Math.floor((zmin - SIDE_G.z0) / SIDE_G.s)), k1 = Math.min(nz - 1, Math.ceil((zmax - SIDE_G.z0) / SIDE_G.s));
      const d = (b[1] - a[1]) * (c[2] - a[2]) - (c[1] - a[1]) * (b[2] - a[2]);
      for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) {
        const y = SIDE_G.y0 + j * SIDE_G.s, z = SIDE_G.z0 + k * SIDE_G.s;
        let xs;
        if (Math.abs(d) > 1e-9) {                     // barycentric in the y–z plane: the x of the triangle along this line
          const u = ((y - a[1]) * (c[2] - a[2]) - (c[1] - a[1]) * (z - a[2])) / d, v = ((b[1] - a[1]) * (z - a[2]) - (y - a[1]) * (b[2] - a[2])) / d;
          if (u < -0.05 || v < -0.05 || u + v > 1.05) continue;
          xs = [a[0] + u * (b[0] - a[0]) + v * (c[0] - a[0])];
        } else xs = [a[0], b[0], c[0]];               // seen edge-on: its own x's
        for (const x of xs) { const i = j * nz + k; if (-x > out[0][i]) out[0][i] = -x; if (x > out[1][i]) out[1][i] = x; }
      }
    }
    sideGrid = { ny, nz, out };
  }
  function headSide(side, y, z) {
    let x = 0;
    const r = 1 - ((y - 0.6) / 10.2) ** 2 - ((z + 3.6) / 9.2) ** 2;   // the skull (same ellipsoid as the occluder)
    if (r > 0) x = 7.7 * Math.sqrt(r);
    if (sideGrid) {
      const g = sideGrid.out[side < 0 ? 0 : 1], fj = (y - SIDE_G.y0) / SIDE_G.s, fk = (z - SIDE_G.z0) / SIDE_G.s;
      const j = Math.floor(fj), k = Math.floor(fk);
      for (const jj of [j, j + 1]) for (const kk of [k, k + 1]) if (jj >= 0 && kk >= 0 && jj < sideGrid.ny && kk < sideGrid.nz) x = Math.max(x, g[jj * sideGrid.nz + kk]);
    }
    return x;
  }

  // ---------- the cut-out's contour (2.5D front): alpha mask → outer boundary + lens holes, image px, y down ----------
  const maskCache = {};
  const loadMask = url => maskCache[url] || (maskCache[url] = new Promise(resolve => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
        resolve(traceMask(x.getImageData(0, 0, c.width, c.height)));
      } catch (err) { dbg('contorno falló: ' + err); resolve(null); }
    };
    im.onerror = () => resolve(null);
    im.src = url;
  }));
  function traceMask(id) {
    const W = id.width, H = id.height, d = id.data, w = W + 2, h = H + 2, n = w * h;   // a 1-px empty border closes every boundary
    const solid = new Uint8Array(n);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) solid[(y + 1) * w + x + 1] = d[(y * W + x) * 4 + 3] > 100 ? 1 : 0;
    const stack = new Int32Array(n);
    const flood = (seed, ok, mark, val) => {            // 4-connected fill; returns the area
      let sp = 0, area = 0; stack[sp++] = seed; mark[seed] = val;
      while (sp) {
        const j = stack[--sp]; area++;
        const cand = [j - w, j + w]; if (j % w) cand.push(j - 1); if ((j + 1) % w) cand.push(j + 1);
        for (const k of cand) if (k >= 0 && k < n && ok(k) && !mark[k]) { mark[k] = val; stack[sp++] = k; }
      }
      return area;
    };
    // the frame's pieces: 8-connected (two strokes that touch only at a corner are one piece; the background stays
    // 4-connected, the usual pairing). 11/18 «a otras les falta un pedazo»: only the biggest piece was drawn, so a front cut in
    // two at a thin or lost bridge showed ONE lens (≈190 frames), and a brow bar, a lower lens edge or an end piece apart from
    // the rest vanished (≈100 more). Now every piece that belongs to the front is drawn (pieces() below).
    const flood8 = (seed, mark, val, box) => {
      let sp = 0, area = 0; stack[sp++] = seed; mark[seed] = val;
      while (sp) {
        const j = stack[--sp]; area++;
        const x = j % w, y = (j / w) | 0;
        if (x < box[0]) box[0] = x; if (x > box[1]) box[1] = x; if (y < box[2]) box[2] = y; if (y > box[3]) box[3] = y; box[4] += x;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const k = j + dy * w + dx;
          if ((dx || dy) && k >= 0 && k < n && solid[k] && !mark[k]) { mark[k] = val; stack[sp++] = k; }
        }
      }
      return area;
    };
    const label = new Int32Array(n), areas = [0], boxes = [null]; let nl = 0, big = 0, bigArea = 0;
    for (let i = 0; i < n; i++) if (solid[i] && !label[i]) {
      nl++; const box = [w, -1, h, -1, 0]; const a = flood8(i, label, nl, box); areas.push(a); boxes.push(box);
      if (a > bigArea) { bigArea = a; big = nl; }
    }
    if (!big) return null;
    const outside = new Uint8Array(n); flood(0, k => !solid[k], outside, 1);
    const hole = new Int32Array(n); let nh = 0; const holeArea = [0], holeOf = [0];
    for (let i = 0; i < n; i++) if (!solid[i] && !outside[i] && !hole[i]) {
      nh++; holeArea.push(flood(i, k => !solid[k] && !outside[k], hole, nh));
      holeOf.push(label[i - 1]);                       // the pixel left of a hole's first pixel belongs to the piece around it
    }
    // which pieces belong to the front: big enough (≥ 0.3 % of the biggest, ≥ 40 px) and not a leftover of the folded
    // temples (a piece wholly ABOVE the front in its columns and out at the corners, |x − centre| > 30 % of the width: a
    // brow bar or a top bar over the bridge is above the front too, but central); a piece beside the front (an end piece cut
    // off) must reach the upper part of its height
    const keep = new Uint8Array(nl + 1); keep[big] = 1;
    {
      const halves = []; for (let k = 1; k <= nl; k++) if (areas[k] >= 0.25 * bigArea) halves.push(k);
      const top = new Int32Array(w).fill(h);
      let fTop = h, fBot = -1;
      for (const k of halves) { const b = boxes[k]; if (b[2] < fTop) fTop = b[2]; if (b[3] > fBot) fBot = b[3]; }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const l = label[y * w + x]; if (l && areas[l] >= 0.25 * bigArea && top[x] > y) top[x] = y; }
      const minA = Math.max(40, 0.003 * bigArea), cx0 = w / 2;
      let extra = 0;
      const order = []; for (let k = 1; k <= nl; k++) if (!keep[k] && areas[k] >= minA) order.push(k);
      order.sort((a, b) => areas[b] - areas[a]);
      for (const k of order) {
        if (extra >= 12) break;
        const b = boxes[k], cx = b[4] / areas[k];
        let localTop = h; for (let x = b[0]; x <= b[1]; x++) if (top[x] < localTop) localTop = top[x];
        let ok;
        if (areas[k] >= 0.25 * bigArea) ok = true;
        else if (localTop < h) ok = !(b[3] < localTop && Math.abs(cx - cx0) > 0.3 * w);
        else ok = b[2] <= fTop + 0.6 * (fBot - fTop) && b[3] >= fTop;
        if (ok) { keep[k] = 1; extra++; }
      }
    }
    // Moore-neighbour boundary tracing (8-connected, clockwise, Jacob's stopping criterion) from the first pixel in raster order
    const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const trace = inside => {
      let s = -1; for (let i = 0; i < n; i++) if (inside(i)) { s = i; break; }
      if (s < 0) return [];
      const sx = s % w, sy = (s / w) | 0; let x = sx, y = sy, bx = x - 1, by = y, dir0 = -1; const pts = [];
      for (let guard = 0; guard < 400000; guard++) {
        pts.push([x - 1, y - 1]);
        const from = DIRS.findIndex(dd => dd[0] === bx - x && dd[1] === by - y);
        let moved = false;
        for (let k = 1; k <= 8; k++) {
          const di = (from + k) % 8, cx = x + DIRS[di][0], cy = y + DIRS[di][1];
          if (!inside(cy * w + cx)) continue;
          if (x === sx && y === sy && pts.length > 1 && di === dir0) return pts;
          if (dir0 < 0) dir0 = di;
          const pb = (di + 7) % 8; bx = x + DIRS[pb][0]; by = y + DIRS[pb][1]; x = cx; y = cy; moved = true; break;
        }
        if (!moved) return pts;
      }
      return pts;
    };
    const rdp = (pts, eps) => {                        // Ramer–Douglas–Peucker, iterative
      if (pts.length < 4) return pts;
      const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
      while (st.length) {
        const [a, b] = st.pop(); let md = 0, mi = -1;
        const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
        for (let i = a + 1; i < b; i++) { const dd = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (dd > md) { md = dd; mi = i; } }
        if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
      }
      return pts.filter((p, i) => keep[i]);
    };
    // a traced boundary is CLOSED (it ends next to where it started): simplify it in two halves, split at the point
    // farthest from the start, or RDP sees a zero-length base line and throws every point away
    const rdpClosed = (pts, eps) => {
      if (pts.length < 8) return pts;
      let far = 0, fd = -1;
      for (let i = 1; i < pts.length; i++) { const dd = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (dd > fd) { fd = dd; far = i; } }
      const a = rdp(pts.slice(0, far + 1), eps), b = rdp(pts.slice(far), eps);
      return a.concat(b.slice(1));
    };
    // each piece: its outline + the lens holes it closes (a hole goes ONLY with its own piece: before, the second lens's
    // hole was added to the first piece's shape and came out as a stray black crescent)
    const pieces = [];
    for (let k = 1; k <= nl; k++) {
      if (!keep[k]) continue;
      const po = rdpClosed(trace(i => label[i] === k), 0.9);
      if (po.length < 3) continue;
      const ph = [];
      for (let j = 1; j <= nh; j++) if (holeOf[j] === k && holeArea[j] > 120) { const p = rdpClosed(trace(i => hole[i] === j), 0.9); if (p.length > 6) ph.push(p); }
      pieces.push({ outer: po, holes: ph, area: areas[k], main: k === big });
    }
    const mainP = pieces.find(p => p.main) || { outer: [], holes: [] };
    const outer = mainP.outer, holes = mainP.holes;
    // the end piece's outer face height per side (px): rows whose outer edge is solid (≥6 px inward) and within 3 px of the
    // extreme, longest contiguous run — the same rule the Central uses for the hinge; the temple can't be taller than this
    const faceH = {};
    for (const side of ['L', 'R']) {
      const xs = new Int32Array(H).fill(-1);
      for (let y = 0; y < H; y++) {
        const row = (y + 1) * w;
        let x = -1;
        if (side === 'L') { for (let i = 1; i <= W; i++) if (keep[label[row + i]] && label[row + i]) { x = i; break; } }
        else { for (let i = W; i >= 1; i--) if (keep[label[row + i]] && label[row + i]) { x = i; break; } }
        if (x < 0) continue;
        let ok = true;
        for (let k = 0; k < 6; k++) { const xx = side === 'L' ? x + k : x - k; if (xx < 1 || xx > W || !label[row + xx] || !keep[label[row + xx]]) { ok = false; break; } }
        if (ok) xs[y] = x;
      }
      let ext = -1;
      for (let y = 0; y < H; y++) if (xs[y] >= 0 && (ext < 0 || (side === 'L' ? xs[y] < ext : xs[y] > ext))) ext = xs[y];
      let best = 0, run = 0;
      for (let y = 0; y <= H; y++) {
        const flat = y < H && xs[y] >= 0 && (side === 'L' ? xs[y] <= ext + 3 : xs[y] >= ext - 3);
        if (flat) run++; else { if (run > best) best = run; run = 0; }
      }
      faceH[side] = best;
    }
    // per row, how many px of solid the front has from its outer edge inward (each side): how far into the end piece the
    // temple may start without showing through the lens (11/18: it started 4 mm in, and on thin metal end pieces that
    // put a dark stub INSIDE the lens)
    const run = { L: new Int16Array(H), R: new Int16Array(H) };
    for (let y = 0; y < H; y++) {
      const row = (y + 1) * w;
      for (const side of ['L', 'R']) {
        let x = side === 'L' ? 1 : W, c = 0;
        const step = side === 'L' ? 1 : -1;
        while (x >= 1 && x <= W && !(label[row + x] && keep[label[row + x]])) x += step;
        while (x >= 1 && x <= W && label[row + x] && keep[label[row + x]]) { c++; x += step; }
        run[side][y] = c;
      }
    }
    return { outer, holes, pieces, faceH, run, n: nl };
  }

  // the temple photo (assets/tryon/<SKU>-p.webp) starts with the end piece / hinge block: find where the temple proper
  // begins (8 columns no taller than 1.7× the temple's median height) and the rows it spans, to map only that part
  const templeCache = {};
  const loadTemple = url => templeCache[url] || (templeCache[url] = new Promise(resolve => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => {
      try {
        const W = im.naturalWidth, H = im.naturalHeight;
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
        const d = x.getImageData(0, 0, W, H).data;
        const top = new Int16Array(W).fill(-1), bot = new Int16Array(W).fill(-1), hgt = new Int16Array(W);
        for (let px = 0; px < W; px++) for (let py = 0; py < H; py++) if (d[(py * W + px) * 4 + 3] > 100) { if (top[px] < 0) top[px] = py; bot[px] = py; }
        const cols = [];
        for (let px = 0; px < W; px++) { hgt[px] = top[px] < 0 ? 0 : bot[px] - top[px] + 1; if (hgt[px]) cols.push(px); }
        if (cols.length < 20) { resolve(null); return; }
        resolve({ W, H, top, bot, hgt, cols });
      } catch (err) { dbg('pata falló: ' + err); resolve(null); }
    };
    im.onerror = () => resolve(null);
    im.src = url;
  }));

  // where the temple proper starts in its photo and which rows to show: the end-piece block on the left is skipped (8
  // columns no taller than max(1.7× the temple's median height, 1.2× the end piece's real height)) and the band is
  // clipped to the end piece's real height (faceHpx, in photo px) around the temple's own centre line at the hinge
  function templeFit(t, faceHpx) {
    const { W, H, top, bot, hgt, cols } = t;
    const mid = cols.slice(Math.floor(cols.length * 0.3), Math.floor(cols.length * 0.7)).map(px => hgt[px]).sort((a, b) => a - b);
    const med = mid[Math.floor(mid.length / 2)] || 1;
    const lim = Math.max(1.7 * med, faceHpx ? 1.2 * faceHpx : 0);
    let x0 = cols[0];
    for (let i = 0; i < cols.length - 8; i++) {
      let ok = true;
      for (let k = 0; k < 8; k++) if (hgt[cols[i + k]] > lim) { ok = false; break; }
      if (ok) { x0 = cols[i]; break; }
    }
    if (x0 > W * 0.45) x0 = cols[0];
    let y0 = H, y1 = -1;
    for (let px = x0; px < W; px++) if (hgt[px]) { if (top[px] < y0) y0 = top[px]; if (bot[px] > y1) y1 = bot[px]; }
    let cy0 = 0, nc = 0;                                   // centre row of the temple where it meets the hinge (first 10 columns)
    for (let px = x0; px < Math.min(W, x0 + 10); px++) if (hgt[px]) { cy0 += (top[px] + bot[px]) / 2; nc++; }
    cy0 = nc ? cy0 / nc : (y0 + y1) / 2;
    let up = cy0 - y0 + 0.5, down = y1 - cy0 + 0.5;
    if (faceHpx) { up = Math.min(up, faceHpx / 2 + 1); down = Math.min(down, faceHpx / 2 + 1); }   // never taller than the end piece
    return { x0, up, down, cy0, W, H };
  }

  const THICK = { acetate: 0.42, tr90: 0.34, mixed: 0.3, metal: 0.14, titanium: 0.12 };   // front thickness, cm, by catalog material
  let lastTemples = [];
  // the temple's path, N points by arc length (group coordinates), pushed OUT wherever it would pass inside the canonical
  // head between the hinge and the ear (see headSide): the whole band (up/down of its centre line) at least `clear` cm
  // outside. The push is smoothed with a running max + average (never under what each point needs), so the temple bows
  // out round the head the way a real one does on a narrow frame; behind the ear (z beyond earZ) nothing is pushed.
  function clearHead(curve, N, side, up, down, earZ, clear) {
    const P = [], need = new Float32Array(N);
    for (let k = 0; k < N; k++) {
      const p = curve.getPointAt(k / (N - 1)); P.push(p);
      if (-p.z > earZ + 0.05 || p.z > -0.6) continue;             // the tail behind the ear; the join inside the end piece
      const zh = p.z + Z_FRONT, yh = p.y + GLASSES_Y;
      const reach = Math.max(headSide(side, yh - down, zh), headSide(side, yh, zh), headSide(side, yh + up, zh));
      need[k] = Math.max(0, reach + clear - side * p.x);
    }
    const R = 3, env = new Float32Array(N), push = new Float32Array(N);
    for (let k = 0; k < N; k++) { let m = 0; for (let j = Math.max(0, k - R); j <= Math.min(N - 1, k + R); j++) m = Math.max(m, need[j]); env[k] = m; }
    for (let k = 0; k < N; k++) { let sum = 0, c = 0; for (let j = Math.max(0, k - R); j <= Math.min(N - 1, k + R); j++) { sum += env[j]; c++; } push[k] = sum / c; }
    return P.map((p, k) => (push[k] > 0 ? new THREE.Vector3(p.x + side * push[k], p.y, p.z) : p));
  }
  function buildGlasses() {
    if (!mesh || !entry) return Promise.resolve();
    const e = entry, f = frame;
    const url = imgUrl(f, e);
    const tex = texCache[url] || (texCache[url] = texLoader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }));
    const pa0 = Array.isArray(e.pa) && e.pa.length === 3 ? e.pa : null;
    const paUrl0 = pa0 ? `assets/tryon/${encodeURIComponent(f.id)}-p.webp?v=${e.v || 0}` : null;
    return Promise.all([loadMask(url), paUrl0 ? loadTemple(paUrl0) : null]).then(([msk, tinfo]) => {
      if (entry !== e) return;                                            // another frame was picked meanwhile
      if (glasses) { head.remove(glasses); glasses.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
      glasses = new THREE.Group(); lastTemples = [];
      const glasses_y = GLASSES_Y;                                      // the group's height on the face (lens centre)
      const kUse = kFace; kBuilt = kUse;                                // this face's size ÷ the canonical one (1 = canonical)
      const mmReal = Number(e.m) / 10;                                  // real cm per px of the cut-out
      const mm = mmReal / kUse;                                         // … in the head's canonical units
      const col = new THREE.Color(/^#[0-9a-f]{6}$/i.test(e.c || '') ? e.c : '#2a2a2a');
      const thick = THICK[f.mat] || 0.3;
      if (msk && msk.outer.length > 8) {
        // 2.5D: the cut-out's outline extruded by the material's thickness; the photo on the faces, the rim colour on the sides.
        // Every piece of the front (traceMask → pieces), each with its own lens holes
        const toV = ([x, y]) => new THREE.Vector2(x, e.p[1] - y);
        // the main piece and any other big one (half a front) take the material's thickness; the small ones (a lens edge of a
        // half-rim, a brow bar, an end piece) at most a metal's 1.4 mm, or an acetate lens edge comes out as a thick rim
        const all = msk.pieces && msk.pieces.length ? msk.pieces : [{ outer: msk.outer, holes: msk.holes, main: true, area: 1 }];
        const bigA = Math.max(...all.map(pc => pc.area || 0));
        const shapesOf = list => list.map(pc => {
          const shape = new THREE.Shape(pc.outer.map(toV));
          pc.holes.forEach(hp => shape.holes.push(new THREE.Path(hp.map(toV))));
          return shape;
        });
        const thin = Math.min(thick, 0.14);
        const fat = all.filter(pc => pc.main || (pc.area || 0) >= 0.25 * bigA), slim = all.filter(pc => !fat.includes(pc));
        const geo = new THREE.ExtrudeGeometry(shapesOf(fat), { depth: thick / mm, bevelEnabled: false });   // px units: the mesh scales by mm
        tex.repeat.set(1 / e.p[0], 1 / e.p[1]); tex.offset.set(0, 0);
        const matF = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide });   // the photo carries its own light: unlit, so it keeps its colours
        const matS = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.2 });
        const solid = new THREE.Mesh(geo, [matF, matS]);
        solid.scale.set(mm, mm, mm);
        solid.position.set(-e.a[0] * mm, -(e.p[1] - e.a[1]) * mm, -thick);   // the anchor (lens centre) at the origin; the front face at z = 0
        solid.renderOrder = 2;
        glasses.add(solid);
        if (slim.length) {                                               // same faces and sides, thinner, flush with the front face
          const g2 = new THREE.ExtrudeGeometry(shapesOf(slim), { depth: thin / mm, bevelEnabled: false });
          const s2 = new THREE.Mesh(g2, [matF, matS]);
          s2.scale.set(mm, mm, mm);
          s2.position.set(-e.a[0] * mm, -(e.p[1] - e.a[1]) * mm, -thin);
          s2.renderOrder = 2;
          glasses.add(s2);
        }
      } else {
        const W = e.p[0] * mm, H = e.p[1] * mm;
        const ax = (e.a[0] - e.p[0] / 2) * mm, ay = (e.p[1] / 2 - e.a[1]) * mm;
        tex.repeat.set(1, 1);
        const front = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide }));
        front.position.set(-ax, -ay, 0); front.renderOrder = 2;
        glasses.add(front);
      }
      // the temples: from each end piece backwards, opening out until they rest on the ear and go down behind it (catalog length).
      // With the temple's photo (e.pa: [w, h, mm] of assets/tryon/<SKU>-p.webp, hinge at the left) they are textured ribbons
      // stretched to the catalog length; without it, a tube in the rim colour.
      const pa = pa0, paUrl = paUrl0;
      const paTex = paUrl ? (texCache[paUrl] || (texCache[paUrl] = texLoader.load(paUrl, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }))) : null;
      let paUp = pa ? pa[1] / 2 : 0, paDown = paUp;                     // rows of the photo above / below the hinge line
      if (paTex && tinfo) {
        // the end piece's real height (front px → cm → temple-photo px): the temple band can't be taller than that
        const faceCm = msk && msk.faceH ? Math.max(msk.faceH.L || 0, msk.faceH.R || 0) * mmReal : 0;   // real cm (the temple photo's mm/px is real)
        const fit = templeFit(tinfo, faceCm ? faceCm * 10 / pa[2] : 0);
        paUp = fit.up; paDown = fit.down;
        paTex.offset.set(fit.x0 / fit.W, (fit.H - 1 - (fit.cy0 + fit.down)) / fit.H);
        paTex.repeat.set((fit.W - fit.x0) / fit.W, (fit.up + fit.down) / fit.H);
      } else if (paTex) { paTex.offset.set(0, 0); paTex.repeat.set(1, 1); }
      const matT = new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.25 });
      const matP = paTex ? new THREE.MeshBasicMaterial({ map: paTex, alphaTest: 0.4, side: THREE.DoubleSide }) : null;   // unlit too (lit, a white temple came out dark grey)
      const hinges = Array.isArray(e.h) && e.h.length === 2 ? e.h : [[0, e.a[1]], [e.p[0], e.a[1]]];
      hinges.forEach((hp, i) => {
        const side = i === 0 ? -1 : 1;
        const hx = (hp[0] - e.a[0]) * mm, hy = (e.a[1] - hp[1]) * mm;
        const len = Math.max(10, (f.size.temple || 140) / 10);          // cm
        const straight = Math.min(len - 3.5, Z_FRONT - EAR.z);         // up to the ear
        const restY = EAR.top + 0.14 - glasses_y;                      // resting on the ear's top edge (group coordinates)
        // born INSIDE the end piece, at mid-thickness, so the join is hidden in the solid: as far in as the end piece is
        // solid at the hinge's height (minus ½ mm), between ½ and 4 mm
        let solidPx = 0;
        if (msk && msk.run) for (let y = Math.round(hp[1]) - 2; y <= Math.round(hp[1]) + 2; y++) if (y >= 0 && y < msk.run.L.length) solidPx = Math.max(solidPx, msk.run[side < 0 ? 'L' : 'R'][y]);
        const inset = msk && msk.run ? Math.min(0.4, Math.max(0.05, solidPx * mm - 0.05)) : 0.4;
        const pts = [
          new THREE.Vector3(hx - side * inset, hy, -thick * 0.5),
          new THREE.Vector3(hx + side * 0.25, hy + (restY - hy) * 0.35, -straight * 0.35),
          new THREE.Vector3(side * EAR.x, restY, -straight),
          // behind the ear the tail turns down and IN, into the skull: hidden at once (11/18: it went straight down at the
          // ear's side and, wherever the visitor's ear is not where the canonical one is, a hook showed in the air)
          new THREE.Vector3(side * (EAR.x - 1.3), restY - 1.3, -straight - Math.min(1.8, (len - straight) * 0.9)),
        ];
        const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
        const up = matP ? paUp * pa[2] / 10 / kUse : 0.13, down = matP ? paDown * pa[2] / 10 / kUse : 0.13, N = 48;   // canonical cm above / below the curve (ribbon) or the tube's radius
        const path = clearHead(curve, N, side, up, down, Math.abs(curve.points[2].z), matP ? 0.2 : 0.25);
        lastTemples.push({ side, up, down, earZ: Math.abs(curve.points[2].z), path: path.map(p => [p.x, p.y + GLASSES_Y, p.z + Z_FRONT]) });   // QA: __tryon.temples
        let temple;
        if (matP) {
          const pos = new Float32Array(N * 6), uv = new Float32Array(N * 4), idx = [];   // the photo's alpha shapes the ribbon
          for (let k = 0; k < N; k++) {
            const p = path[k], u = k / (N - 1);
            pos.set([p.x, p.y - down, p.z, p.x, p.y + up, p.z], k * 6); uv.set([u, 0, u, 1], k * 4);
            if (k) { const a = (k - 1) * 2, b = k * 2; if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1); }
          }
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
          g.setIndex(idx); g.computeVertexNormals();
          temple = new THREE.Mesh(g, matP);
        } else {
          temple = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0.5), 40, 0.13, 10, false), matT);
        }
        temple.renderOrder = 1;
        glasses.add(temple);
      });
      glasses.position.set(0, glasses_y, Z_FRONT);
      head.add(glasses);
      if (mode === 'photo') drawPhoto();
    });
  }

  // the pose: data may come by columns or by rows → told apart by where the translation lands (the face's z ≈ −30…−80 cm)
  const M = new THREE.Matrix4();
  function setPose(data) {
    const colMajor = Math.abs(data[14]) > Math.abs(data[11]);
    M.fromArray(data);
    if (!colMajor) M.transpose();
    head.matrix.copy(M);
    head.updateMatrixWorld(true);
  }
  function projError(lms, w, h) {                 // how far the canonical mesh projects from the 2D points (px): a health figure
    const ids = [33, 263, 1, 152, 10];
    let s = 0;
    for (const i of ids) {
      const p = new THREE.Vector3(...mesh.v[i]).applyMatrix4(head.matrix).project(camera);
      s += Math.hypot((p.x + 1) / 2 * w - lms[i].x * w, (1 - p.y) / 2 * h - lms[i].y * h);
    }
    return Math.round(s / ids.length);
  }

  // ---------- the detector + the canonical face ----------
  // the first visit downloads ~15 MB (engine + model): the veil says what is loading and, past 20 s, that it is slow
  const t0 = performance.now();
  const slow = setTimeout(() => { if (!lm && veilText._k !== 'tryon.detFail') setVeil('tryon.slow'); }, 20000);
  const fail = e => { clearTimeout(slow); const t = ((e && (e.message || e.reason && e.reason.message)) || String(e)).slice(0, 160); dbg('FALLO detector: ' + t); setVeil('tryon.detFail', { e: t }); };
  window.addEventListener('unhandledrejection', e => { if (!lm) fail(e.reason || e); });
  try {
    setVeil('tryon.loading');
    dbg('renderer ok, cargando wasm…');
    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    dbg('wasm fileset ok');
    setVeil('tryon.loadingModel');
    const fm = await fetch('js/data/face-mesh-v1.json').then(r => r.json());
    mesh = fm; buildOccluder();
    const centre = ids => ids.reduce((v, i) => v.add(new THREE.Vector3(...mesh.v[i])), new THREE.Vector3()).multiplyScalar(1 / ids.length);
    eyeL = centre(EYE_L); eyeR = centre(EYE_R);
    buildGlasses();
    dbg('malla ok, creando landmarker…');
    const opts = d => ({ baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate: d },
      runningMode: 'IMAGE', numFaces: 1, outputFacialTransformationMatrixes: true });
    try { lm = await FaceLandmarker.createFromOptions(vision, opts('GPU')); dbg('landmarker GPU ok'); }
    catch (e) { dbg('GPU falló (' + ((e && e.message) || e) + '), probando CPU'); lm = await FaceLandmarker.createFromOptions(vision, opts('CPU')); dbg('landmarker CPU ok'); }
    clearTimeout(slow);
    const hasCam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    bCam.disabled = !hasCam;
    setVeil(hasCam ? 'tryon.ready' : 'tryon.noCam');
    dbg('LISTO en ' + Math.round(performance.now() - t0) + ' ms · cámara ' + hasCam);
    ga('tryon_ready', { ms: Math.round(performance.now() - t0) });
  } catch (e) {
    fail(e);
  }

  // ---------- a frame: source → detector → 3D → a 3:4 crop that follows the face ----------
  let bgTex = null, srcW = 0, srcH = 0;
  function setSource(el, w, h) {
    srcW = w; srcH = h;
    const scale = Math.min(1, 1280 / Math.max(w, h));
    renderer.setSize(Math.round(w * scale), Math.round(h * scale), false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (bgTex) bgTex.dispose();
    bgTex = el instanceof HTMLVideoElement ? new THREE.VideoTexture(el) : new THREE.Texture(el);
    bgTex.colorSpace = THREE.SRGBColorSpace; bgTex.needsUpdate = true;
    scene.background = bgTex;
  }
  const sm = { sx: 0, sy: 0, sw: 0, sh: 0, init: false };
  function frameCrop(lms, w, h) {
    if (!lms) return sm.init ? sm : { sx: 0, sy: 0, sw: w, sh: h };
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const p of lms) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
    const fw = (x1 - x0) * w, cx = (x0 + x1) / 2 * w, cy = (y0 + y1) / 2 * h;
    let sw = Math.min(w, fw * 2.1), sh = sw * 4 / 3;
    if (sh > h) { sh = h; sw = sh * 3 / 4; }
    const sx = Math.min(Math.max(0, cx - sw / 2), w - sw), sy = Math.min(Math.max(0, cy - sh / 2 - 0.08 * sh), h - sh);
    const g = mode === 'video' && sm.init ? 0.12 : 1;
    if (!sm.init) Object.assign(sm, { sx, sy, sw, sh, init: true });
    else { sm.sx += (sx - sm.sx) * g; sm.sy += (sy - sm.sy) * g; sm.sw += (sw - sm.sw) * g; sm.sh += (sh - sm.sh) * g; }
    return sm;
  }
  function drawFrame(res, w, h) {
    const lms = res && res.faceLandmarks && res.faceLandmarks[0];
    const mat = res && res.facialTransformationMatrixes && res.facialTransformationMatrixes[0];
    if (bgTex && !(bgTex instanceof THREE.VideoTexture)) bgTex.needsUpdate = true;
    if (lms && mat) { setPose(mat.data); head.visible = true; lastErr = projError(lms, w, h); updateK(lms, w, h); }
    else head.visible = false;
    renderer.render(scene, camera);
    const c = frameCrop(lms, w, h);
    const rw = renderer.domElement.width, rh = renderer.domElement.height, kx = rw / w, ky = rh / h;
    octx.save();
    if (mirror) { octx.translate(out.width, 0); octx.scale(-1, 1); }
    octx.drawImage(renderer.domElement, c.sx * kx, c.sy * ky, c.sw * kx, c.sh * ky, 0, 0, out.width, out.height);
    octx.restore();
  }

  // ---------- the camera ----------
  function showControls(on, isVideo) {
    stage.classList.toggle('idle', !on); veil.hidden = on;
    bShot.hidden = !on; bMirror.hidden = !on; bStop.hidden = !(on && isVideo); lFile2.hidden = !on;
  }
  async function startCam() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    } catch (e) { msg('tryon.camFail', { e: (e && e.message) || e }); return; }
    photo = null;
    video = document.createElement('video'); video.srcObject = stream; video.setAttribute('playsinline', ''); video.muted = true;
    await video.play();
    await lm.setOptions({ runningMode: 'VIDEO' });
    mode = 'video'; mirror = true; sm.init = false; kSamples.length = 0;
    setSource(video, video.videoWidth, video.videoHeight);
    showControls(true, true);
    bMirror.textContent = T('tryon.mirrorOn');
    msg('');
    ga('tryon_start', { sku: frame.id, mode: 'camera' });
    loop();
  }
  function loop() {
    if (mode !== 'video') return;
    const w = video.videoWidth, h = video.videoHeight;
    if (w) {
      if (w !== srcW || h !== srcH) setSource(video, w, h);
      const res = lm.detectForVideo(video, performance.now());
      drawFrame(res, w, h);
      msg(res.faceLandmarks && res.faceLandmarks[0] ? '' : 'tryon.face');
    }
    raf = requestAnimationFrame(loop);
  }
  function stopCam() {
    cancelAnimationFrame(raf);
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    video = null;
    if (mode === 'video') { mode = 'idle'; showControls(false, false); msg(''); }
  }

  // ---------- a photo ----------
  let photoRes = null;
  async function loadPhoto(url) {
    if (!lm) return;
    stopCam();
    const im = new Image(); im.src = url;
    try { await im.decode(); } catch (e) { msg('tryon.badImg'); return; }
    photo = im; mode = 'photo'; mirror = false; sm.init = false; kSamples.length = 0;
    if (neutralOn) setNeutral(false);
    await lm.setOptions({ runningMode: 'IMAGE' });
    setSource(photo, photo.naturalWidth, photo.naturalHeight);
    photoRes = lm.detect(photo);
    showControls(true, false);
    bMirror.textContent = T('tryon.mirrorOff');
    drawPhoto();
    msg(photoRes.faceLandmarks && photoRes.faceLandmarks[0] ? '' : 'tryon.noFace');
    ga('tryon_start', { sku: frame.id, mode: 'photo' });
  }
  function drawPhoto() { sm.init = false; drawFrame(photoRes, photo.naturalWidth, photo.naturalHeight); }
  texLoader.manager.onLoad = () => { if (mode === 'photo') drawPhoto(); else if (mode === 'neutral') renderNeutral(); };   // the cut-out may arrive after the first paint

  // ---------- the face's size: one reading per frame (see «the face's REAL size» above) ----------
  const px = (lms, i, w, h) => [lms[i].x * w, lms[i].y * h];
  const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const proj = (v, w, h) => { const p = v.clone().applyMatrix4(head.matrix).project(camera); return [(p.x + 1) / 2 * w, (1 - p.y) / 2 * h]; };
  function faceReading(lms, w, h) {
    if (!lms || lms.length < 478 || !eyeL) return null;
    const iris = (dist2(px(lms, 469, w, h), px(lms, 471, w, h)) + dist2(px(lms, 474, w, h), px(lms, 476, w, h))) / 2;
    const m = head.matrix.elements;                                      // column-major: the head's z axis = (m[8], m[9], m[10])
    const yaw = Math.atan2(m[8], m[10]) * 180 / Math.PI;
    const canonPxCm = dist2(proj(eyeL, w, h), proj(eyeR, w, h)) / eyeL.distanceTo(eyeR);   // px per canonical cm at the eyes
    const realPxCm = iris / (IRIS_MM / 10);                                                // px per real cm at the eyes
    return { iris, yaw, canonPxCm, realPxCm, k: canonPxCm / realPxCm, ipd: dist2(px(lms, 468, w, h), px(lms, 473, w, h)) };
  }
  function updateK(lms, w, h) {
    if (!metricScale) return;
    const r = faceReading(lms, w, h);
    kLast = r ? r.k : null;
    if (!r || r.iris < 8 || Math.abs(r.yaw) > 15 || r.k < K_MIN * 0.9 || r.k > K_MAX * 1.1) return;
    kSamples.push(r.k); if (kSamples.length > 30) kSamples.shift();
    const s = kSamples.slice().sort((a, b) => a - b);
    kFace = Math.min(K_MAX, Math.max(K_MIN, s[Math.floor(s.length / 2)]));
    if (Math.abs(kFace / kBuilt - 1) > 0.015 && !rebuilding) {           // rebuild only when the size really moved
      rebuilding = true;
      buildGlasses().then(() => { rebuilding = false; }, () => { rebuilding = false; });
    }
  }

  // ---------- QA and calibration without a camera ----------
  // calib(): the numbers tools/calibrar_probador.js compares with a face photo of known PD or known glasses (the photo is
  // loaded with loadPhoto): px per cm the try-on assumes at the eyes and at the frame's plane, canonical (k = 1) and with
  // this face's k, plus the drawn front's width in px. neutral(): no face at all — the canonical face itself, drawn in
  // neutral grey, frontal at 45 cm, with the current frame on it (contact sheets: a kids frame next to an adult one).
  function calib() {
    const lms = mode === 'photo' && photoRes && photoRes.faceLandmarks && photoRes.faceLandmarks[0];
    if (!lms || !entry) return null;
    const w = srcW, h = srcH, r = faceReading(lms, w, h);
    const a = new THREE.Vector3(-3.16, GLASSES_Y, Z_FRONT), b = new THREE.Vector3(3.16, GLASSES_Y, Z_FRONT);
    const framePxCm = dist2(proj(a, w, h), proj(b, w, h)) / 6.32;        // px per canonical cm at the frame's plane
    const frontMm = entry.p[0] * entry.m;
    return { w, h, mode: metricScale ? 'iris' : 'canon', kUsed: kBuilt, kFace, kSample: r && r.k, yaw: r && r.yaw, iris: r && r.iris,
      ipd: r && r.ipd, canonPxCmEyes: r && r.canonPxCm, realPxCmEyes: r && r.realPxCm, framePxCm, frontMm,
      frontPx: frontMm / 10 / kBuilt * framePxCm, err: lastErr };
  }
  let neutralOn = false;
  const neutralMat = new THREE.MeshStandardMaterial({ color: 0xcbb8a5, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
  function setNeutral(on) {
    neutralOn = on;
    head.traverse(o => {
      if (!o.isMesh || (o.material !== occluderMat && o.material !== neutralMat)) return;
      if (on && !o.geometry.attributes.normal) o.geometry.computeVertexNormals();      // the occluder never needed light
      o.material = on ? neutralMat : occluderMat;
    });
  }
  let neutralCanvas = null, neutralDist = 45;
  function renderNeutral() {
    if (!neutralCanvas) return;
    renderer.render(scene, camera);
    const rw = renderer.domElement.width, rh = renderer.domElement.height;
    // a fixed window (24 cm wide at the head's distance, centred on it): the same scale for every frame, turn and tilt
    const pxCm = rh / (2 * neutralDist * Math.tan(FOV / 2 * Math.PI / 180));
    const sw = Math.min(rw, 24 * pxCm), sh = sw * 4 / 3, cx = rw / 2, cy = rh / 2;
    octx.drawImage(renderer.domElement, cx - sw / 2, Math.max(0, cy - sh * 0.45), sw, sh, 0, 0, out.width, out.height);
  }
  // neutral(dist, yaw, pitch): the head turned yaw° (+ = it shows its left side… the visitor's right in the mirror) and tilted
  // pitch° (90 = seen from above: the temples' path against the skull and the ears)
  async function neutral(distCm = 45, yawDeg = 0, pitchDeg = 0) {
    stopCam();
    neutralCanvas = neutralCanvas || Object.assign(document.createElement('canvas'), { width: 960, height: 1280 });
    const x = neutralCanvas.getContext('2d'); x.fillStyle = '#e9e6e1'; x.fillRect(0, 0, 960, 1280);
    mode = 'neutral'; photo = null; photoRes = null; kSamples.length = 0; kFace = 1; neutralDist = distCm;
    setSource(neutralCanvas, 960, 1280);
    setNeutral(true);
    head.matrix.makeTranslation(0, 0, -distCm)
      .multiply(new THREE.Matrix4().makeRotationX(pitchDeg * Math.PI / 180))
      .multiply(new THREE.Matrix4().makeRotationY(yawDeg * Math.PI / 180));
    head.updateMatrixWorld(true); head.visible = true;
    showControls(true, false);
    await buildGlasses();
    renderNeutral();
    return true;
  }

  // ---------- controls ----------
  bCam.addEventListener('click', startCam);
  bStop.addEventListener('click', stopCam);
  file.addEventListener('change', () => { const f = file.files && file.files[0]; if (f) loadPhoto(URL.createObjectURL(f)); file.value = ''; });
  bMirror.addEventListener('click', () => { mirror = !mirror; bMirror.textContent = T(mirror ? 'tryon.mirrorOn' : 'tryon.mirrorOff'); if (mode === 'photo') drawPhoto(); });
  bShot.addEventListener('click', () => {
    out.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `house-of-eyeglasses-${frame.id}.jpg`; a.click(); }, 'image/jpeg', .92);
  });
  window.addEventListener('pagehide', stopCam);

  window.__tryon = { get mode() { return mode; }, get err() { return lastErr; }, get frame() { return frame; }, get entry() { return entry; }, strip, loadPhoto, scene, head, get glasses() { return glasses; }, THREE, loadMask, traceMask, loadTemple, buildGlasses, drawPhoto: () => { if (mode === 'photo') drawPhoto(); },
    get k() { return { face: kFace, built: kBuilt, last: kLast, n: kSamples.length, metric: metricScale }; }, calib, neutral, get ready() { return !!lm && !!mesh; },
    get temples() { return lastTemples; }, headSide,
    pick(id) { const f = strip.find(x => x.id === id); if (!f) return false; frame = f; entry = tryon.get(f.id); renderNow(); const p = buildGlasses(); if (mode === 'photo') drawPhoto(); return p.then(() => { if (mode === 'neutral') renderNeutral(); return true; }); } };
})();
