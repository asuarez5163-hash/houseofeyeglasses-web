// Medidor de distancia pupilar (pd.html, 11/17, Armando: «un medidor de distancia entre pupilas con la cámara, sí»).
// Classic script: the page (steps, typed PD, «Use this PD») works in any browser; the face detector — MediaPipe Face
// Landmarker, the same engine, version, CDN and model as the try-on (js/pages/pruebatelos.js) — is downloaded ONLY when the
// visitor presses «Start the camera» (≈10 MB the first time; whoever only reads the page downloads nothing).
//
// THE METHOD (one take = ~1 s of valid frames, ≥ 12 of them; three takes; result = the median take):
// · Ruler = the iris. Horizontal visible iris diameter ≈ 11.7 mm in adults: Rüfer, Schröder & Erb, «White-to-white corneal
//   diameter: normal values in healthy humans obtained with the Orbscan II topography system», Cornea 2005;24(3):259–261
//   (390 adults, 11.71 ± 0.42 mm; the same constant MediaPipe Iris uses for depth). mm per px = 11.7 / iris width in px
//   (mean of both irises, landmarks 469–471 and 474–476: the horizontal pair; 470–472 / 475–477 are the vertical one).
// · PD measured = distance between the iris centres (468, 473) × mm per px. Both pupils and both irises lie on the same
//   plane (a frontal face), so perspective cancels out of the ratio.
// · Monocular PDs: from each pupil to the nose's midline = halfway between the inner eye corners (133, 362), measured along
//   the line joining the pupils. Two symmetric points at the same depth: their midpoint survives perspective (168, the nose
//   bridge, sits ~1 cm in front of the eyes and shifts as soon as the face is off-centre).
// · OD = the person's RIGHT eye = the iris on the LEFT of the raw (unmirrored) camera frame (smaller x). MediaPipe numbers
//   its points by image position (468 is always the left one in the image; checked 11/17 on the site's own photos, as they
//   are and flipped: tools/check_pd_page.js), so the rule is written by position, not by index.
// · Convergence. Looking at the camera from distance D, each eye turns in by θ = atan(monocular / D) and its pupil, ROT_MM
//   in front of the eye's centre of rotation, moves ROT_MM·sin θ towards the nose: the measured PD is smaller than the
//   distance PD (the one glasses are made with). D is estimated from the iris: Z = f · 11.7 / iris px, f from an ASSUMED
//   field of view (FOV_LONG across the frame's long side; webcams and phone front cameras are ~55–78°: that range moves Z by
//   −20…+28 % and the correction by about ±0.3 mm), D = Z + ROT_MM. Each eye is corrected on its own (solved by iteration).
//   At 40 cm it adds ~1.6 mm, at 60 cm ~1.1 mm.
// · Rounded to 0.5 mm: the total first, then the right eye by its share, left = total − right (so they always add up).
//   Margin shown: ±2 mm (the iris alone, ±0.42 mm in 11.71, is ±2.3 mm at one SD on a 63 mm PD).
// Checks per frame (all must pass for a frame to count): one face, whole face in the picture, centred (the eyes' midpoint
// within 12 % of the frame's width from the centre), distance 33–75 cm, facing the camera (symmetry of the nose tip between
// the face's side edges 234/454 along the eye line: |asym| ≤ 0.10 ≈ 4° of yaw; pitch from the pose matrix within −20…+10°),
// head level (eye line within 7°), eyes open (lid opening / eye width ≥ 0.16 on both eyes). A take that breaks for more
// than 0.6 s starts again; takes more than 1.5 mm apart → measure again.
// Nothing leaves the device: frames go from the camera to the detector and to the canvas, never anywhere else. The camera
// stops when the three takes are done, on «pagehide» and when the page goes to the background.
// «Use this PD» → localStorage hoe-pd = { od, os, total, at, src: 'camera' | 'manual' } and, with ?back=<page>.html (a page
// of this site: root-level name, no // and no :), back to it; js/pages/producto.js fills its empty PD boxes with it for 7 days.
(() => {
  'use strict';
  const main = document.querySelector('main.pd');
  if (!main) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const L = () => (window.hoeLang ? window.hoeLang() : 'en');
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ga = (name, p) => { try { if (typeof window.gtag === 'function') window.gtag('event', name, p || {}); } catch (e) { /* analytics is optional */ } };

  // ---------- constants ----------
  const VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  const IRIS_MM = 11.7;            // Rüfer et al., Cornea 2005 (see above)
  const FOV_LONG = 65;             // ASSUMED field of view across the frame's long side, degrees (see above)
  const ROT_MM = 10.5;             // pupil → the eye's centre of rotation (≈13.5 mm behind the cornea; the pupil ≈3 mm)
  const TAKES = 3, TAKE_MS = 1000, TAKE_MIN = 12, BREAK_MS = 600, SPREAD_MAX = 1.5, MARGIN = 2;
  const LIM = { yaw: 0.10, pitchLo: -20, pitchHi: 10, roll: 7, ear: 0.16, center: 0.12, zNear: 330, zFar: 750, irisMin: 10, edge: 0.01 };
  const STORE = 'hoe-pd';

  // ---------- where to go back: a page of this site (root-level name ending in .html, no // and no :) ----------
  const back = (() => {
    let b = '';
    try { b = new URLSearchParams(location.search).get('back') || ''; } catch (e) { b = ''; }
    return /^[A-Za-z0-9][A-Za-z0-9._-]*\.html$/.test(b) && b.indexOf('//') < 0 && b.indexOf(':') < 0 && !/^pd(\.es)?\.html$/i.test(b) ? b : '';
  })();
  if (back) { const a = $('#pdm-back'); a.href = back; $('#pdm-backline').hidden = false; }

  // ---------- elements ----------
  const stage = $('#pdm-stage'), cv = $('#pdm-canvas'), ctx = cv.getContext('2d');
  const veil = $('#pdm-veil'), veilT = $('#pdm-veil-t'), bStart = $('#pdm-start'), aRuler = $('#pdm-ruler');
  const msgEl = $('#pdm-msg'), look = $('#pdm-look');
  const checksEl = $('#pdm-checks'), distV = $('#pdm-dist-v'), takesV = $('#pdm-takes-v'), bar = $('#pdm-bar');
  const resEl = $('#pdm-res'), savedEl = $('#pdm-saved');

  // ---------- small helpers ----------
  const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
  const half = v => Math.round(v * 2) / 2;
  const mm = v => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '');            // 31.5 · 63 · 1.4
  const cmIn = z => ({ cm: String(Math.round(z / 10)), in: String(Math.round(z / 25.4)) });
  const num = v => { const s = String(v == null ? '' : v).trim().replace(',', '.'); return /^\d{1,2}(\.\d{0,2})?$/.test(s) ? Number(s) : NaN; };

  // ---------- one frame → the measurement and its checks ----------
  // res = MediaPipe's result; W × H = the RAW camera frame (never the mirrored picture the person sees)
  function analyze(res, W, H) {
    const faces = (res && res.faceLandmarks) || [];
    if (!faces.length || faces[0].length < 478) return { ok: false, why: 'noFace', checks: { face: false } };
    if (faces.length > 1) return { ok: false, why: 'many', checks: { face: false } };
    const lm = faces[0];
    const P = i => ({ x: lm[i].x * W, y: lm[i].y * H });
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const p of lm) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
    // the two irises; OD (the person's right eye) = the one on the left of the raw frame
    const A = { c: P(468), w: dist(P(469), P(471)), idx: 468 }, B = { c: P(473), w: dist(P(474), P(476)), idx: 473 };
    const [od, os] = A.c.x <= B.c.x ? [A, B] : [B, A];
    const pdPx = dist(od.c, os.c);
    if (!(pdPx > 0)) return { ok: false, why: 'noFace', checks: { face: false } };
    const u = { x: (os.c.x - od.c.x) / pdPx, y: (os.c.y - od.c.y) / pdPx };                  // along the eye line, OD → OS
    const along = (p, o) => (p.x - o.x) * u.x + (p.y - o.y) * u.y;
    const irisPx = (A.w + B.w) / 2;
    const c133 = P(133), c362 = P(362);
    const mid = { x: (c133.x + c362.x) / 2, y: (c133.y + c362.y) / 2 };                     // the nose's midline
    const f = (Math.max(W, H) / 2) / Math.tan(FOV_LONG / 2 * Math.PI / 180);
    const z = f * IRIS_MM / irisPx;                                                          // camera → iris plane, mm (estimate)
    const roll = Math.atan2(u.y, u.x) * 180 / Math.PI;
    const nose = P(1), eA = P(234), eB = P(454);
    const da = Math.abs(along(nose, eA)), db = Math.abs(along(eB, nose));
    const yaw = (da - db) / ((da + db) || 1);                                                // 0 = nose tip halfway between the face's edges
    let pitch = null;
    const mt = res.facialTransformationMatrixes && res.facialTransformationMatrixes[0];
    if (mt && mt.data && mt.data.length >= 16) {
      const d = mt.data, colMajor = Math.abs(d[14]) > Math.abs(d[11]);                       // the face's forward axis = 3rd column
      pitch = Math.atan2(colMajor ? d[9] : d[6], d[10]) * 180 / Math.PI;                     // + = chin up
    }
    const ear = Math.min(dist(P(159), P(145)) / (dist(P(33), c133) || 1), dist(P(386), P(374)) / (dist(P(263), c362) || 1));
    const cx = (od.c.x + os.c.x) / 2 / W;
    const checks = {
      face: true,
      edge: x0 > LIM.edge && y0 > LIM.edge && x1 < 1 - LIM.edge && y1 < 1 - LIM.edge,
      dist: z >= LIM.zNear && z <= LIM.zFar && irisPx >= LIM.irisMin,
      center: Math.abs(cx - 0.5) <= LIM.center,
      straight: Math.abs(yaw) <= LIM.yaw && (pitch == null || (pitch >= LIM.pitchLo && pitch <= LIM.pitchHi)),
      level: Math.abs(roll) <= LIM.roll,
      eyes: ear >= LIM.ear,
    };
    checks.face = checks.edge;
    const why = !checks.edge ? 'edge'
      : !checks.dist ? (z > LIM.zFar || irisPx < LIM.irisMin ? 'closer' : 'farther')
        : !checks.center ? 'center'
          : Math.abs(yaw) > LIM.yaw ? 'turn'
            : !checks.straight ? (pitch < LIM.pitchLo ? 'chinUp' : 'chinDown')
              : !checks.level ? 'level'
                : !checks.eyes ? 'eyes' : '';
    const mmPx = IRIS_MM / irisPx;
    return { ok: !why, why, checks, od: od.c, os: os.c, odIndex: od.idx, mid, irisPx, pdPx, z, roll, yaw, pitch, ear, cx,
      pdMm: pdPx * mmPx, share: along(mid, od.c) / pdPx };
  }

  // the distance PD from what the camera saw: each eye turned in to look at it (see the method above)
  function farPD(pdMm, share, z) {
    const D = z + ROT_MM;
    const eye = m => { let v = m; for (let i = 0; i < 5; i++) v = m + ROT_MM * Math.sin(Math.atan(v / D)); return v; };
    const od = eye(pdMm * share), os = eye(pdMm * (1 - share));
    return { od, os, total: od + os, add: od + os - pdMm };
  }
  // what the page shows and saves: total to 0.5 mm, right eye by its share, left = the rest
  function rounded(far) {
    const total = half(far.total), od = half(total * far.od / far.total);
    return { total, od, os: total - od };
  }

  // ---------- messages (one live region; a guidance line only changes once it has held for 250 ms) ----------
  let msgKey = '', msgMap = null, pendKey = '', pendT = 0;
  function say(key, map, now) {
    if (key === msgKey && JSON.stringify(map || null) === JSON.stringify(msgMap)) { pendKey = ''; return; }
    if (now != null) {                                                       // guidance from the frame loop: debounce
      if (pendKey !== key) { pendKey = key; pendT = now; return; }
      if (now - pendT < 250) return;
    }
    pendKey = ''; msgKey = key; msgMap = map || null;
    msgEl.textContent = key ? fill(T('pdm.msg.' + key), map || {}) : '';
  }
  let veilKey = 'ready', veilMap = null;
  function veilSay(key, map) {
    veilKey = key; veilMap = map || null;
    veilT.removeAttribute('data-i18n');
    veilT.textContent = fill(T('pdm.' + key), map || {});
  }

  // ---------- the live checks and the takes bar ----------
  const CHK = ['face', 'dist', 'center', 'straight', 'level', 'eyes'];
  const chkLi = {}; CHK.forEach(k => { chkLi[k] = checksEl.querySelector(`[data-chk="${k}"]`); });
  let chkPrev = '';
  function paintChecks(a) {
    const c = (a && a.checks) || {};
    const st = k => (!a || c[k] == null || (k !== 'face' && !c.face) ? '' : c[k] ? '1' : '0');   // '' = not known yet (no face)
    const sig = CHK.map(st).join(',');
    if (sig !== chkPrev) {
      chkPrev = sig;
      CHK.forEach(k => { const li = chkLi[k], v = st(k); if (v) li.dataset.ok = v; else li.removeAttribute('data-ok'); });
    }
    const dv = a && a.z && c.face ? fill(T('pdm.chk.distV'), cmIn(a.z)) : '';
    if (distV.textContent !== dv) distV.textContent = dv;
  }
  function paintTakes(done, part) {
    const segs = bar.querySelectorAll('i');
    segs.forEach((s, i) => { s.style.transform = `scaleX(${i < done ? 1 : i === done ? Math.max(0, Math.min(1, part || 0)) : 0})`; });
    bar.setAttribute('aria-valuenow', String(done));
    takesV.textContent = fill(T('pdm.takesV'), { n: done });
  }

  // ---------- drawing: the RAW frame mirrored for the person (like a mirror), the marks in raw coordinates ----------
  let k = 1;
  function fitCanvas(W, H) {
    k = Math.min(1, 1280 / Math.max(W, H));
    const w = Math.round(W * k), h = Math.round(H * k);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  function draw(src, a, W, H) {
    fitCanvas(W, H);
    ctx.setTransform(-k, 0, 0, k, cv.width, 0);                              // mirror: x → W − x
    ctx.drawImage(src, 0, 0, W, H);
    const L2 = Math.max(W, H);
    const good = a && a.ok;
    ctx.lineWidth = Math.max(2, L2 / 400);
    ctx.strokeStyle = good ? 'rgba(201, 163, 90, .95)' : 'rgba(244, 242, 238, .55)';
    ctx.setLineDash(good ? [] : [L2 / 90, L2 / 120]);
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.46, L2 * 0.12, L2 * 0.16, 0, 0, Math.PI * 2); ctx.stroke();   // where the face goes
    ctx.setLineDash([]);
    if (a && a.od && a.checks && a.checks.face) {
      ctx.strokeStyle = good ? '#c9a35a' : 'rgba(244, 242, 238, .8)';
      ctx.lineWidth = Math.max(1.5, L2 / 640);
      for (const p of [a.od, a.os]) {
        ctx.beginPath(); ctx.arc(p.x, p.y, a.irisPx / 2, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p.x - a.irisPx * 0.18, p.y); ctx.lineTo(p.x + a.irisPx * 0.18, p.y); ctx.moveTo(p.x, p.y - a.irisPx * 0.18); ctx.lineTo(p.x, p.y + a.irisPx * 0.18); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(a.mid.x, a.mid.y - a.irisPx * 0.9); ctx.lineTo(a.mid.x, a.mid.y + a.irisPx * 0.9); ctx.stroke();   // the nose's midline
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ---------- the engine (downloaded on the first Start only) ----------
  // import() is written through Function so that an old browser that can't parse it still runs the rest of this file
  // (steps, typed PD, «Use this PD»); there is no Content-Security-Policy on the site.
  let engineP = null;
  function engine() {
    if (!engineP) {
      engineP = (async () => {
        const mod = await (new Function('u', 'return import(u)'))(VISION + '/vision_bundle.mjs');
        const files = await mod.FilesetResolver.forVisionTasks(VISION + '/wasm');
        const opts = d => ({ baseOptions: { modelAssetPath: MODEL, delegate: d }, runningMode: 'VIDEO', numFaces: 2, outputFacialTransformationMatrixes: true });
        try { return await mod.FaceLandmarker.createFromOptions(files, opts('GPU')); }
        catch (e) { return mod.FaceLandmarker.createFromOptions(files, opts('CPU')); }
      })();
      engineP.catch(() => { engineP = null; });                              // a failed download can be tried again
    }
    return engineP;
  }

  // ---------- the camera ----------
  let lmk = null, video = null, stream = null, raf = 0, run = 0;
  let mode = 'idle';                     // idle · starting · measure · between · done · error
  let frames = [], takes = [], takeT0 = 0, lastOk = 0, last = null, result = null;
  function stopCam() {
    cancelAnimationFrame(raf); raf = 0;
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (video) { video.srcObject = null; video = null; }
  }
  function setStage(live) {
    stage.classList.toggle('is-idle', !live);
    stage.classList.toggle('is-live', live);
    veil.hidden = live;
    look.hidden = !live;
    if (!live) say('');
  }
  function camError(e) {
    const n = (e && e.name) || '';
    if (e && e.code === 'unsupported') return 'unsupported';
    if (/NotAllowed|Security|PermissionDenied/i.test(n)) return 'denied';
    if (/NotReadable|TrackStart|Abort/i.test(n)) return 'busy';
    return 'noCam';
  }
  function fail(key, map) {
    stopCam(); mode = 'error';
    setStage(false);
    stage.classList.add('is-error');
    veilSay('err.' + key, map);
    bStart.hidden = false; bStart.disabled = false;
    bStart.querySelector('span').textContent = T('pdm.again');
    aRuler.hidden = false;
    paintChecks(null);
    ga('pd_error', { why: key });
  }
  async function start() {
    if (mode === 'starting' || mode === 'measure' || mode === 'between') return;
    const my = ++run;
    stopCam();
    mode = 'starting'; result = null; frames = []; takes = []; last = null;
    resEl.hidden = true; savedEl.hidden = true; $('#pdm-checks-w').hidden = false;
    stage.classList.remove('is-error', 'is-done');
    bStart.disabled = true; aRuler.hidden = true;
    paintTakes(0, 0); paintChecks(null);
    veilSay('msg.camStart');
    const eng = engine();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('unsupported'), { code: 'unsupported' });
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } } });
    } catch (e) { if (my === run) fail(camError(e)); return; }
    if (my !== run) { stopCam(); return; }
    video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.setAttribute('playsinline', ''); video.srcObject = stream;
    try { await video.play(); } catch (e) { /* some browsers resolve play() late; the loop waits for frames */ }
    veilSay('msg.loading');
    try { lmk = await eng; }
    catch (e) { if (my === run) fail('engine', { e: String((e && e.message) || e).slice(0, 80) }); return; }
    if (my !== run || !stream) return;
    mode = 'measure'; takeT0 = 0; lastOk = 0;
    setStage(true);
    if (window.innerWidth <= 700) stage.scrollIntoView({ block: 'center', behavior: reduced.matches ? 'auto' : 'smooth' });   // a phone: the picture and its guidance on screen
    ga('pd_start');
    raf = requestAnimationFrame(loop);
  }
  let lastTs = 0;
  function loop() {
    if (mode !== 'measure' && mode !== 'between') return;
    raf = requestAnimationFrame(loop);
    const W = video && video.videoWidth, H = video && video.videoHeight;
    if (!W || !H || video.readyState < 2) return;
    let now = performance.now();
    if (now <= lastTs) now = lastTs + 1;                                    // the detector wants strictly increasing times
    lastTs = now;
    let res = null;
    try { res = lmk.detectForVideo(video, now); } catch (e) { res = null; }
    const a = analyze(res, W, H);
    last = a;
    draw(video, a, W, H);
    paintChecks(a);
    if (mode === 'measure') step(a, now);
  }
  function step(a, now) {
    if (!a.ok) {
      say(a.why, null, now);
      if (frames.length && now - lastOk > BREAK_MS) { frames = []; takeT0 = 0; paintTakes(takes.length, 0); }   // the take broke: start it again
      return;
    }
    lastOk = now;
    if (!frames.length) takeT0 = now;
    frames.push({ pd: a.pdMm, share: a.share, z: a.z });
    say('hold', { n: takes.length + 1 }, now);
    const part = Math.min((now - takeT0) / TAKE_MS, frames.length / TAKE_MIN);
    paintTakes(takes.length, part);
    if (now - takeT0 >= TAKE_MS && frames.length >= TAKE_MIN) {
      takes.push({ pd: median(frames.map(f => f.pd)), share: median(frames.map(f => f.share)), z: median(frames.map(f => f.z)), n: frames.length });
      frames = [];
      paintTakes(takes.length, 0);
      if (takes.length < TAKES) {
        mode = 'between'; say('next', { n: takes.length + 1 });
        setTimeout(() => { if (mode === 'between') { mode = 'measure'; takeT0 = 0; } }, 700);
      } else finish();
    }
  }
  function finish() {
    mode = 'done';
    stopCam();                                                               // the last frame stays on the canvas; the camera is off
    stage.classList.add('is-done');
    look.hidden = true;
    const pds = takes.map(t => t.pd);
    const spread = Math.max(...pds) - Math.min(...pds);
    const pdMm = median(pds), share = median(takes.map(t => t.share)), z = median(takes.map(t => t.z));
    const far = farPD(pdMm, share, z), r = rounded(far);
    result = { od: r.od, os: r.os, total: r.total, z, add: far.add, spread, raw: { pdMm, share, far, takes: takes.slice() } };
    ga('pd_result', { ok: spread <= SPREAD_MAX ? 1 : 0 });              // never the measurement itself: no number about a face leaves the page
    if (spread > SPREAD_MAX) { again('retry', { d: mm(spread) }); return; }
    if (!(far.total >= 45 && far.total <= 80) || !(r.od >= 20 && r.od <= 45 && r.os >= 20 && r.os <= 45)) { again('odd', { v: mm(far.total) }); return; }
    say('done');
    showResult();
  }
  function again(key, map) {                                                 // a measurement we don't trust: say why and offer a new one
    result = Object.assign(result || {}, { rejected: key });
    setStage(false);
    stage.classList.add('is-error');
    veilSay('msg.' + key, map);
    bStart.hidden = false; bStart.disabled = false;
    bStart.querySelector('span').textContent = T('pdm.again');
    aRuler.hidden = false;
    mode = 'error';
  }
  function showResult() {
    if (!result || result.rejected) return;
    $('#pdm-checks-w').hidden = true;
    $('#pdm-total').textContent = mm(result.total);
    $('#pdm-margin').textContent = fill(T('pdm.res.margin'), { m: MARGIN });
    $('#pdm-od').textContent = mm(result.od) + ' mm';
    $('#pdm-os').textContent = mm(result.os) + ' mm';
    $('#pdm-note').textContent = fill(T('pdm.res.note'), Object.assign(cmIn(result.z), { c: mm(result.add) }));
    const wasHidden = resEl.hidden;
    resEl.hidden = false;
    if (wasHidden) resEl.focus({ preventScroll: true });
    if (wasHidden && window.innerWidth < 1100) resEl.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'auto' : 'smooth' });
  }

  // ---------- «Use this PD» ----------
  function save(v, out) {
    const rec = { od: v.od == null ? null : v.od, os: v.os == null ? null : v.os, total: v.total, at: Date.now(), src: v.src };
    let ok = false;
    try { localStorage.setItem(STORE, JSON.stringify(rec)); ok = localStorage.getItem(STORE) != null; } catch (e) { ok = false; }
    ga('pd_use', { src: v.src });
    const pdTxt = (rec.od != null && rec.os != null ? `${mm(rec.od)}/${mm(rec.os)} mm (${mm(rec.total)} mm)` : `${mm(rec.total)} mm`);
    out.hidden = false;
    if (ok && back) {
      out.textContent = T('pdm.savedBack');
      setTimeout(() => { location.href = back; }, 350);
      return;
    }
    out.innerHTML = '';
    const p = document.createElement('span');
    p.textContent = ok ? T('pdm.saved') : fill(T('pdm.notSaved'), { pd: pdTxt });
    out.appendChild(p);
    if (ok) {
      const a = document.createElement('a');
      a.className = 'link-u pdm-tap'; a.href = 'catalogo.html'; a.textContent = T('pdm.shop');
      out.appendChild(document.createTextNode(' ')); out.appendChild(a);
    }
  }
  $('#pdm-use').addEventListener('click', () => { if (result && !result.rejected) save({ od: result.od, os: result.os, total: result.total, src: 'camera' }, savedEl); });
  $('#pdm-again').addEventListener('click', () => { resEl.hidden = true; start(); });
  bStart.addEventListener('click', start);

  // ---------- typed PD ----------
  const form = $('#pdm-form'), errEl = $('#pdm-man-err'), manSaved = $('#pdm-man-saved');
  const inOd = $('#pdm-in-od'), inOs = $('#pdm-in-os'), inTot = $('#pdm-in-total');
  form.addEventListener('input', e => {
    const el = e.target; if (!el.classList || !el.classList.contains('pdm-in')) return;
    const clean = el.value.replace(/[^\d.,]/g, '').slice(0, 4);
    if (clean !== el.value) el.value = clean;
    el.removeAttribute('aria-invalid');
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const od = num(inOd.value), os = num(inOs.value), tot = num(inTot.value);
    const twoOk = od >= 20 && od <= 45 && os >= 20 && os <= 45 && od + os >= 40 && od + os <= 80;
    const oneOk = tot >= 40 && tot <= 80;
    [inOd, inOs, inTot].forEach(i => i.removeAttribute('aria-invalid'));
    if (twoOk) { errEl.hidden = true; save({ od, os, total: Math.round((od + os) * 10) / 10, src: 'manual' }, manSaved); return; }
    if (oneOk && !inOd.value && !inOs.value) { errEl.hidden = true; save({ od: null, os: null, total: tot, src: 'manual' }, manSaved); return; }
    errEl.textContent = T('pdm.man.err'); errEl.hidden = false; manSaved.hidden = true;
    const bad = (inOd.value || inOs.value) ? [inOd, inOs] : [inTot];
    bad.forEach(i => i.setAttribute('aria-invalid', 'true'));
    bad[0].focus();
  });

  // ---------- language, background, leaving ----------
  document.addEventListener('hoe:lang', () => {
    const t = T('tp.pd.meta'); if (t && t !== 'tp.pd.meta') document.title = t;
    if (veilKey !== 'ready') veilSay(veilKey, veilMap);
    if (mode === 'error' || mode === 'done') bStart.querySelector('span').textContent = T('pdm.again');
    if (msgKey) { const k0 = msgKey; msgKey = ''; say(k0, msgMap); }
    paintTakes(takes.length, 0);
    chkPrev = ''; paintChecks(mode === 'measure' || mode === 'between' ? last : null);
    if (result && !result.rejected && !resEl.hidden) showResult();
    if (!errEl.hidden) errEl.textContent = T('pdm.man.err');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (mode === 'measure' || mode === 'between' || mode === 'starting')) {
      run++; stopCam(); mode = 'idle'; setStage(false);
      veilSay('msg.paused'); bStart.disabled = false; bStart.hidden = false;
      bStart.querySelector('span').textContent = T('pdm.again');
    }
  });
  window.addEventListener('pagehide', () => { run++; stopCam(); });
  paintTakes(0, 0);

  // for tools/check_pd_page.js (read-only views + the pure functions)
  window.__pd = { analyze, farPD, rounded, get mode() { return mode; }, get last() { return last; }, get takes() { return takes.slice(); }, get result() { return result; }, get back() { return back; }, LIM, IRIS_MM, FOV_LONG, ROT_MM };
})();
