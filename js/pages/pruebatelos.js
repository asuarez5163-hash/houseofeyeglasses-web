// Pruébatelos (pruebatelos.html?id=<SKU>): the virtual try-on, in 3D over the visitor's camera (or a photo).
// Data: data/manifest.json → tryon[cat] = data/t/<cat>.<hash>.json ([{ id, a:[ax,ay], m, h:[[x,y],[x,y]], c, p:[w,h], v }],
// written by the Central next to the catalog) + assets/tryon/<SKU>.webp (the frame's front, cut out, no temples) + the
// catalog record (js/catalog.js: name, price, size; the temple length draws the temples in 3D).
// Engine: MediaPipe Face Landmarker (478 points + the head's pose matrix, in cm) and three.js. The canonical face
// (js/data/face-mesh-v1.json) plus an invisible skull and two ears make the "occluder": whatever sits behind them is not
// drawn, so the temples rest on the ear and go down behind it. Everything runs on the device: no image leaves it.
// The product page shows its "Try them on" link only when the record carries t:1 (the Central marks it once the cut exists).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { FaceLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';

(async () => {
  const main = document.querySelector('main.ty');
  if (!main || !window.hoeCatalog) return;
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
    if (!entry) { notAvailable('tryon.notReady', 'producto.html?id=' + encodeURIComponent(frame.id)); return; }
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
  if (!frame) { notAvailable('tryon.updating'); return; }

  const imgUrl = (f, e) => `assets/tryon/${encodeURIComponent(f.id)}.webp?v=${(e && e.v) || 0}`;
  function renderNow() {
    const size = window.hoeFrameSize ? window.hoeFrameSize(frame) : '';
    nowEl.innerHTML = `<p class="kicker">${esc(frame.b || '')}</p><h2>${esc(CAT.name(frame))}</h2>
      <p class="ty-price"><b>${esc(CAT.price(frame.p))}</b> ${esc(T('tryon.frame'))} · ${esc(size)}</p>
      <a class="link-u" href="producto.html?id=${encodeURIComponent(frame.id)}">${esc(T('tryon.see'))}</a>`;
    stripT.hidden = strip.length < 2;
    stripEl.innerHTML = strip.map(f => `<button class="ty-tile${f.id === frame.id ? ' is-on' : ''}" type="button" data-id="${esc(f.id)}" aria-pressed="${f.id === frame.id}" aria-label="${esc(fill(T('tryon.tile'), { name: CAT.name(frame) }))}">
        <span class="ty-img"><img src="${imgUrl(f, tryon.get(f.id))}" alt="" loading="lazy" decoding="async"></span>
        <small><b>${esc(f.b || '')}</b> ${esc(f.n || '')} · ${esc(CAT.colorName(f))}</small></button>`).join('');
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
  const EAR = { x: 7.9, z: -3.6, top: 3.3 };        // the ear: side, depth and the height of its top edge (cm): the temple RESTS there and goes down behind

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
  }

  function buildGlasses() {
    if (!mesh || !entry) return;
    if (glasses) { head.remove(glasses); glasses.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const e = entry;
    glasses = new THREE.Group();
    const glasses_y = 2.63 - Y_DROP;                                  // the group's height on the face (lens centre)
    const mm = Number(e.m) / 10;                                      // cm per px of the cut-out
    const W = e.p[0] * mm, H = e.p[1] * mm;
    const ax = (e.a[0] - e.p[0] / 2) * mm, ay = (e.p[1] / 2 - e.a[1]) * mm;   // the anchor (lens centre) relative to the image centre
    const url = imgUrl(frame, e);
    const tex = texCache[url] || (texCache[url] = texLoader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }));
    const front = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide }));
    front.position.set(-ax, -ay, 0); front.renderOrder = 2;
    glasses.add(front);
    // the temples: from each end piece backwards, opening out until they rest on the ear and go down behind it (catalog length)
    const col = new THREE.Color(/^#[0-9a-f]{6}$/i.test(e.c || '') ? e.c : '#2a2a2a');
    const matT = new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.25 });
    const hinges = Array.isArray(e.h) && e.h.length === 2 ? e.h : [[0, e.a[1]], [e.p[0], e.a[1]]];
    hinges.forEach((hp, i) => {
      const side = i === 0 ? -1 : 1;
      const hx = (hp[0] - e.a[0]) * mm, hy = (e.a[1] - hp[1]) * mm;
      const len = Math.max(10, (frame.size.temple || 140) / 10);      // cm
      const straight = Math.min(len - 3.5, Z_FRONT - EAR.z);         // up to the ear
      const restY = EAR.top + 0.14 - glasses_y;                      // resting on the ear's top edge (group coordinates)
      const pts = [
        new THREE.Vector3(hx, hy, 0),
        new THREE.Vector3(hx + side * 0.25, hy + (restY - hy) * 0.35, -straight * 0.35),
        new THREE.Vector3(side * EAR.x, restY, -straight),
        new THREE.Vector3(side * (EAR.x - 0.2), restY - 2.0, -straight - Math.min(2.2, (len - straight) * 0.9)),
      ];
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3), 32, 0.13, 10, false), matT);
      tube.renderOrder = 1;
      glasses.add(tube);
    });
    glasses.position.set(0, glasses_y, Z_FRONT);
    head.add(glasses);
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
  try {
    const [vision, fm] = await Promise.all([
      FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'),
      fetch('js/data/face-mesh-v1.json').then(r => r.json()),
    ]);
    mesh = fm; buildOccluder(); buildGlasses();
    const opts = d => ({ baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate: d },
      runningMode: 'IMAGE', numFaces: 1, outputFacialTransformationMatrixes: true });
    try { lm = await FaceLandmarker.createFromOptions(vision, opts('GPU')); } catch (e) { lm = await FaceLandmarker.createFromOptions(vision, opts('CPU')); }
    const hasCam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    bCam.disabled = !hasCam;
    setVeil(hasCam ? 'tryon.ready' : 'tryon.noCam');
  } catch (e) {
    setVeil('tryon.detFail', { e: (e && e.message) || e });
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
    if (lms && mat) { setPose(mat.data); head.visible = true; lastErr = projError(lms, w, h); }
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
    mode = 'video'; mirror = true; sm.init = false;
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
    photo = im; mode = 'photo'; mirror = false; sm.init = false;
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
  texLoader.manager.onLoad = () => { if (mode === 'photo') drawPhoto(); };   // the cut-out may arrive after the first paint

  // ---------- controls ----------
  bCam.addEventListener('click', startCam);
  bStop.addEventListener('click', stopCam);
  file.addEventListener('change', () => { const f = file.files && file.files[0]; if (f) loadPhoto(URL.createObjectURL(f)); file.value = ''; });
  bMirror.addEventListener('click', () => { mirror = !mirror; bMirror.textContent = T(mirror ? 'tryon.mirrorOn' : 'tryon.mirrorOff'); if (mode === 'photo') drawPhoto(); });
  bShot.addEventListener('click', () => {
    out.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `house-of-eyeglasses-${frame.id}.jpg`; a.click(); }, 'image/jpeg', .92);
  });
  window.addEventListener('pagehide', stopCam);

  window.__tryon = { get mode() { return mode; }, get err() { return lastErr; }, get frame() { return frame; }, get entry() { return entry; }, strip, loadPhoto,
    pick(id) { const f = strip.find(x => x.id === id); if (!f) return false; frame = f; entry = tryon.get(f.id); renderNow(); buildGlasses(); if (mode === 'photo') drawPhoto(); return true; } };
})();
