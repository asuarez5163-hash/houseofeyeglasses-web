// Medidor de DP, versión 2 (11/19, SIN PUBLICAR; Armando 11/18: «¿puedes trabajar en eso?»). Mismo pd.html, mismo flujo,
// mismos avisos y comprobaciones que js/pages/pd.js; cambia la REGLA: dos reglas independientes en vez del iris solo.
// Prueba: pd.html?pd=v2 (js/pages/pd.js le pasa la página a este archivo). Encenderlo para todos = pd.html carga
// css/pages/pd2.css, js/i18n/pd2.js y este archivo EN LUGAR de js/pages/pd.js (+ ASSET_V), tras validar con personas
// reales (E-tryon/test/calib1117/PD-V2.md: método, fuentes, resultados y protocolo; evaluador tools/eval_pd.js).
//
// WHY: the iris alone is one person's trait. Armando's iris reads ≈12.56 mm in MediaPipe (≈ +2 SD; the constant is 11.7):
// pd.js gives him 57.5–59.5 against his doctor's 63 (−6 %). Every ruler has a population spread; two independent ones,
// weighted by their spread, depend less on any single trait.
//
// THE TWO RULERS (each gives mm per px at the eye plane; the PD measured = iris-centre distance 468–473 × mm per px):
// 1. Iris: horizontal visible iris diameter 11.7 mm (Rüfer, Schröder & Erb, Cornea 2005;24(3):259–261: 11.71 ± 0.42 mm,
//    390 adults; Google's MediaPipe Iris uses 11.7 ± 0.5). mm/px = 11.7 / mean iris width (469–471, 474–476).
//    Spread used: σ_I = 4.9 % = the RMS of Google's own test of this ruler (MediaPipe Iris, Aug 2020: >200 people against
//    an iPhone 11 depth sensor, mean relative error 4.3 %, SD 2.4 % → √(4.3² + 2.4²)); it holds the anatomy (3.6 %) and
//    the detector together. Age-proof: the cornea is near adult size in early childhood.
// 2. Face geometry («canon», the try-on's live mode): MediaPipe fits its canonical metric face (an average adult, in cm) to
//    the 478 points and returns the pose (facialTransformationMatrixes) for a virtual camera with a 63° vertical field of
//    view. Projecting the canonical eyes (centroid of each eye's 16 contour points: 63.20 mm apart in canonical_face_model,
//    js/data/face-mesh-v1.json) with that pose gives px per canonical mm AT THE EYES; the field of view cancels out of
//    the ratio. This ruler assumes the person's face is the average adult size: its spread is that of adult face size.
//    Spread used: σ_C = 5.5 % = bizygomatic breadth, both sexes pooled (NIOSH 2003 survey of U.S. respirator users,
//    Zhuang & Bradtmiller, J Occup Environ Hyg 2005;2(11):567–576; Anthrotech final report 2004: men 143.5 ± 6.9 mm,
//    n 2544; women 135.1 ± 6.5, n 1453 → 4.8 % within a sex, 5.7 % pooled). No published test of MediaPipe's own fit
//    exists: 5.5 % is an ESTIMATE until people with a known PD are measured (PD-V2.md, Thursday protocol).
//    NOT for children: a child's face is smaller than the adult canonical face (the try-on's «el de niño se ve de adulto»).
// COMBINED (adults): inverse-variance weights in log space: w_I = (1/σ_I²) / (1/σ_I² + 1/σ_C²) = 0.557, w_C = 0.443;
//    PD = exp(w_I·ln PD_iris + w_C·ln PD_face); expected spread 3.7 % (≈ ±2.3 mm at 63) if the two are independent,
//    against 4.9 % (≈ ±3.1 mm) for the iris alone. «Child under 13» (or arriving from a kids' frame, ?back=…-hoe-k-N.html)
//    = the iris alone, as pd.js.
// FIRST REAL DATA (11/19, doctor's PD; tools/eval_pd.js, PD-V2.md): Armando 63 and a second adult 60.5. The iris read
//    −6.3 % and −4.0/−4.6 %, the face ruler +3.1 % and +8.2/+8.9 %, the combination −1.4 mm and +0.5/+0.9 mm. The weights
//    above were fixed from the literature BEFORE the second person's data: she is a holdout, not a fit. Both rulers carry an
//    offset (MediaPipe reads both irises ≈ 12.0–12.6 mm against two cards; the canonical face reads PDs high), so the
//    disagreement d = ln(PD_face / PD_iris) is NOT centred on 0 for adults: +5…+13 % on their 6 photos (spread
//    √(σ_I² + σ_C²) ≈ 7.4 %).
// MARGIN shown (honest 1 σ, rounded up to 0.5 mm): adult ±2.5 mm (3.7 % of 63 = 2.3); child, the iris alone, ±3 mm
//    (4.9 % of ~58). d outside −5…+25 % (an adult band 2 σ around the observed centre) = the rulers disagree more than they
//    should → ±3.5 mm and the result says what each ruler read. d > +16 % in adult mode (the kids' photo: +19.5 %; the
//    adults: ≤ 12.8 %) → «Measuring a child?» with a one-tap switch. Switching recomputes from the same takes: every frame
//    keeps both rulers.
// UNCHANGED from pd.js: three takes of ≥ 1 s and ≥ 12 valid frames, median take, takes > 1.5 mm apart → measure again; the
//    per-frame checks; OD = the iris on the LEFT of the raw frame; per-eye split from the midpoint of the inner eye corners
//    (133, 362); rounding (total to 0.5 mm, OD by its share, OS = total − OD); «Use this PD» → localStorage hoe-pd.
//    Convergence: the same model (each eye turns in by atan(mono / D), its pupil ROT_MM in front of the centre of rotation
//    moves ROT_MM·sin θ towards the nose), with the distance Z from the COMBINED scale: Z = f · (mm per px), f from the
//    same ASSUMED field of view (FOV_LONG across the frame's long side).
// Nothing leaves the device. Analytics as pd.js plus v: 2 and who: adult|child (never a measurement).
(() => {
  'use strict';
  const main = document.querySelector('main.pd');
  if (!main || window.__pdV2) return;
  window.__pdV2 = true;
  const $ = (s, r = document) => r.querySelector(s);
  const T = k => (window.hoeT ? window.hoeT(k) : k);
  const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ga = (name, p) => { try { if (typeof window.gtag === 'function') window.gtag('event', name, p || {}); } catch (e) { /* analytics is optional */ } };

  // ---------- constants ----------
  const VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  const IRIS_MM = 11.7;            // ruler 1 (see above)
  const FOV_LONG = 65;             // ASSUMED field of view across the frame's long side, degrees (pd.js)
  const ROT_MM = 10.5;             // pupil → the eye's centre of rotation (pd.js)
  const MP_FOV = 63;               // MediaPipe's virtual camera: vertical field of view over the frame HEIGHT (face_geometry)
  const CANON_L = [-3.15987, 2.64319, 3.62606], CANON_R = [3.15987, 2.64319, 3.62606];   // cm: centroid of each eye's contour, canonical face
  const CANON_EYES_MM = 63.1975;   // their distance
  const SIG = { iris: 0.049, face: 0.055 };   // population spreads (see above)
  const KID_D = 0.16;              // adult mode: the face ruler this much above the iris → «Measuring a child?»
  const D_LO = -0.05, D_HI = 0.25; // adult band of d = ln(face / iris); outside it the rulers disagree more than they should
  const MARGIN = { adult: 2.5, child: 3, split: 3.5 };                     // ± mm shown (see above)
  const TAKES = 3, TAKE_MS = 1000, TAKE_MIN = 12, BREAK_MS = 600, SPREAD_MAX = 1.5;
  const LIM = { yaw: 0.10, pitchLo: -20, pitchHi: 10, roll: 7, ear: 0.16, center: 0.12, zNear: 330, zFar: 750, irisMin: 10, edge: 0.01 };
  const STORE = 'hoe-pd';

  // ---------- where to go back: a page of this site (root-level name ending in .html, no // and no :) ----------
  const back = (() => {
    let b = '';
    try { b = new URLSearchParams(location.search).get('back') || ''; } catch (e) { b = ''; }
    return /^[A-Za-z0-9][A-Za-z0-9._-]*\.html$/.test(b) && b.indexOf('//') < 0 && b.indexOf(':') < 0 && !/^pd(\.es)?\.html$/i.test(b) ? b : '';
  })();
  if (back) { const a = $('#pdm-back'); a.href = back; $('#pdm-backline').hidden = false; }
  let who = /-hoe-k-\d+\.html$/i.test(back) ? 'child' : 'adult';      // a kids' frame → a child is being measured

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

  // ---------- the rulers ----------
  function weights(w) {
    if (w === 'child') return { iris: 1, face: 0 };
    const a = 1 / (SIG.iris * SIG.iris), b = 1 / (SIG.face * SIG.face);
    return { iris: a / (a + b), face: b / (a + b) };
  }
  const mix = (i, c, w) => (c > 0 && w.face > 0 ? Math.exp(w.iris * Math.log(i) + w.face * Math.log(c)) : i);
  // ruler 2: mm per px at the eyes according to MediaPipe's canonical (average adult) face, from the pose matrix
  function faceMmPx(mt, W, H) {
    const d = mt && mt.data;
    if (!d || d.length < 16) return null;
    const col = Math.abs(d[14]) > Math.abs(d[11]);                          // by columns: the translation is 12–14
    const at = (r, c) => (col ? d[c * 4 + r] : d[r * 4 + c]);
    const F = (H / 2) / Math.tan(MP_FOV / 2 * Math.PI / 180);
    const pr = v => {
      const x = at(0, 0) * v[0] + at(0, 1) * v[1] + at(0, 2) * v[2] + at(0, 3);
      const y = at(1, 0) * v[0] + at(1, 1) * v[1] + at(1, 2) * v[2] + at(1, 3);
      const z = at(2, 0) * v[0] + at(2, 1) * v[1] + at(2, 2) * v[2] + at(2, 3);
      return z < -1 ? { x: W / 2 + F * x / -z, y: H / 2 - F * y / -z } : null; // the camera looks down −z (cm)
    };
    const a = pr(CANON_L), b = pr(CANON_R);
    const px = a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    return px > 0 ? CANON_EYES_MM / px : null;
  }

  // ---------- one frame → the measurement and its checks ----------
  // res = MediaPipe's result; W × H = the RAW camera frame (never the mirrored picture the person sees).
  // opt (tools/eval_pd.js only): { fov, who } — the page itself always uses FOV_LONG and the visitor's choice.
  function analyze(res, W, H, opt) {
    const fov = (opt && opt.fov) || FOV_LONG, w = weights((opt && opt.who) || who);
    const faces = (res && res.faceLandmarks) || [];
    if (!faces.length || faces[0].length < 478) return { ok: false, why: 'noFace', checks: { face: false } };
    if (faces.length > 1) return { ok: false, why: 'many', checks: { face: false } };
    const lm = faces[0];
    const P = i => ({ x: lm[i].x * W, y: lm[i].y * H });
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const p of lm) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
    const A = { c: P(468), w: dist(P(469), P(471)), idx: 468 }, B = { c: P(473), w: dist(P(474), P(476)), idx: 473 };
    const [od, os] = A.c.x <= B.c.x ? [A, B] : [B, A];
    const pdPx = dist(od.c, os.c);
    if (!(pdPx > 0)) return { ok: false, why: 'noFace', checks: { face: false } };
    const u = { x: (os.c.x - od.c.x) / pdPx, y: (os.c.y - od.c.y) / pdPx };
    const along = (p, o) => (p.x - o.x) * u.x + (p.y - o.y) * u.y;
    const irisPx = (A.w + B.w) / 2;
    const c133 = P(133), c362 = P(362);
    const mid = { x: (c133.x + c362.x) / 2, y: (c133.y + c362.y) / 2 };
    const mt = res.facialTransformationMatrixes && res.facialTransformationMatrixes[0];
    const sI = IRIS_MM / irisPx, sC = faceMmPx(mt, W, H);
    const s = mix(sI, sC, w);                                                // combined mm per px at the eyes
    const f = (Math.max(W, H) / 2) / Math.tan(fov / 2 * Math.PI / 180);
    const zI = f * sI, z = f * s;                                            // camera → eye plane, mm (estimates)
    const roll = Math.atan2(u.y, u.x) * 180 / Math.PI;
    const nose = P(1), eA = P(234), eB = P(454);
    const da = Math.abs(along(nose, eA)), db = Math.abs(along(eB, nose));
    const yaw = (da - db) / ((da + db) || 1);
    let pitch = null;
    if (mt && mt.data && mt.data.length >= 16) {
      const d = mt.data, colMajor = Math.abs(d[14]) > Math.abs(d[11]);
      pitch = Math.atan2(colMajor ? d[9] : d[6], d[10]) * 180 / Math.PI;
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
    return { ok: !why, why, checks, od: od.c, os: os.c, odIndex: od.idx, mid, irisPx, pdPx, z, zI, roll, yaw, pitch, ear, cx,
      pdI: pdPx * sI, pdC: sC ? pdPx * sC : null, pdMm: pdPx * s, share: along(mid, od.c) / pdPx };
  }

  // the distance PD from what the camera saw: each eye turned in to look at it (pd.js, unchanged)
  function farPD(pdMm, share, z) {
    const D = z + ROT_MM;
    const eye = m => { let v = m; for (let i = 0; i < 5; i++) v = m + ROT_MM * Math.sin(Math.atan(v / D)); return v; };
    const od = eye(pdMm * share), os = eye(pdMm * (1 - share));
    return { od, os, total: od + os, add: od + os - pdMm };
  }
  function rounded(far) {
    const total = half(far.total), od = half(total * far.od / far.total);
    return { total, od, os: total - od };
  }

  // ---------- frames → a take → the result (pure: tools/eval_pd.js runs these same functions on still photos) ----------
  function takeOf(fr) {
    const cs = fr.map(f => f.pdC).filter(v => v > 0);
    return { pdI: median(fr.map(f => f.pdI)), pdC: cs.length * 2 >= fr.length ? median(cs) : null,
      share: median(fr.map(f => f.share)), zI: median(fr.map(f => f.zI)), n: fr.length };
  }
  function estimate(tk, w0) {
    const w = weights(w0 || who);
    const pdI = median(tk.map(t => t.pdI)), share = median(tk.map(t => t.share)), zI = median(tk.map(t => t.zI));
    const cs = tk.map(t => t.pdC).filter(v => v > 0);
    const pdC = cs.length === tk.length ? median(cs) : null;
    const wf = pdC && w.face > 0 ? w.face : 0, wv = { iris: 1 - wf, face: wf };
    const pdMm = mix(pdI, pdC, wv);
    const z = zI * pdMm / pdI;                                               // same picture: distance ∝ mm per px
    const far = farPD(pdMm, share, z), r = rounded(far);
    const farI = farPD(pdI, share, zI), farC = pdC ? farPD(pdC, share, zI * pdC / pdI) : null;
    const per = tk.map(t => mix(t.pdI, t.pdC, wv));
    const spread = Math.max(...per) - Math.min(...per);
    const d = pdC ? Math.log(pdC / pdI) : 0;
    const split = wf > 0 && (d < D_LO || d > D_HI);
    const margin = wf > 0 ? (split ? MARGIN.split : MARGIN.adult) : MARGIN.child;
    return { od: r.od, os: r.os, total: r.total, z, add: far.add, spread, margin, split, who: w0 || who, w: wv, d,
      iris: { total: farI.total, z: zI }, face: farC ? { total: farC.total, z: zI * pdC / pdI } : null,
      kid: (w0 || who) === 'adult' && d > KID_D,
      raw: { pdMm, pdI, pdC, share, far, takes: tk.slice() } };
  }

  // ---------- messages (one live region; a guidance line only changes once it has held for 250 ms) ----------
  let msgKey = '', msgMap = null, pendKey = '', pendT = 0;
  function say(key, map, now) {
    if (key === msgKey && JSON.stringify(map || null) === JSON.stringify(msgMap)) { pendKey = ''; return; }
    if (now != null) {
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
    const st = k => (!a || c[k] == null || (k !== 'face' && !c.face) ? '' : c[k] ? '1' : '0');
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

  // ---------- the page's text about the method and its accuracy: v2's copy (js/i18n/pd2.js → tp.pd2.*) ----------
  // with ?pd=v2 the page still names v1's keys; once v2 is switched on, src/pages/pd.html names tp.pd2.* itself (no-op)
  [['tp.pd.r1p', 'tp.pd2.r1p'], ['tp.pd.r2p', 'tp.pd2.r2p'], ['tp.pd.a3', 'tp.pd2.a3'], ['tp.pd.src', 'tp.pd2.src']].forEach(([a, b]) => {
    const el = document.querySelector(`[data-i18n-html="${a}"]`);
    if (el && T(b) !== b) { el.dataset.i18nHtml = b; el.innerHTML = T(b); }        // main.js repaints it on EN | ES
  });

  // ---------- who is being measured (new in v2): adult (two rulers) · child under 13 (the iris alone) ----------
  const whoBox = document.createElement('div');
  whoBox.className = 'pdm-who';
  whoBox.setAttribute('role', 'group');
  whoBox.setAttribute('aria-labelledby', 'pdm-who-t');
  whoBox.innerHTML = '<p class="kicker" id="pdm-who-t"></p><div class="pdm-who-b"><button type="button" data-who="adult"></button><button type="button" data-who="child"></button></div>';
  const prep = $('.pdm-prep'), priv = $('.pdm-priv', prep);
  prep.insertBefore(whoBox, priv);
  const resNote2 = document.createElement('p');                             // what each ruler read, when they disagree
  resNote2.className = 'pdm-note pdm-split'; resNote2.id = 'pdm-split'; resNote2.hidden = true;
  $('#pdm-note').after(resNote2);
  const kidEl = document.createElement('p');
  kidEl.className = 'pdm-kid'; kidEl.id = 'pdm-kid'; kidEl.hidden = true;
  kidEl.innerHTML = '<span></span> <button type="button" class="text-btn pdm-tap" id="pdm-kid-b"></button>';
  resNote2.after(kidEl);
  function paintWho() {
    $('#pdm-who-t').textContent = T('pdm2.who.t');
    whoBox.querySelectorAll('button').forEach(b => { b.textContent = T('pdm2.who.' + b.dataset.who); b.setAttribute('aria-pressed', String(b.dataset.who === who)); });
    $('span', kidEl).textContent = T('pdm2.kid');
    $('#pdm-kid-b').textContent = T('pdm2.kid.b');
  }
  function setWho(next) {
    if (next !== 'adult' && next !== 'child') return;
    who = next; paintWho();
    if (result && !result.rejected && takes.length === TAKES) {               // the same takes, the other weights
      result = estimate(takes, who);
      if (!resEl.hidden) showResult();
    }
  }
  whoBox.addEventListener('click', e => { const b = e.target.closest('button[data-who]'); if (b) setWho(b.dataset.who); });
  $('#pdm-kid-b').addEventListener('click', () => { setWho('child'); ga('pd_who', { who: 'child', from: 'hint' }); });
  paintWho();

  // ---------- drawing: the RAW frame mirrored for the person (like a mirror), the marks in raw coordinates ----------
  let k = 1;
  function fitCanvas(W, H) {
    k = Math.min(1, 1280 / Math.max(W, H));
    const w = Math.round(W * k), h = Math.round(H * k);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  function draw(src, a, W, H) {
    fitCanvas(W, H);
    ctx.setTransform(-k, 0, 0, k, cv.width, 0);
    ctx.drawImage(src, 0, 0, W, H);
    const L2 = Math.max(W, H);
    const good = a && a.ok;
    ctx.lineWidth = Math.max(2, L2 / 400);
    ctx.strokeStyle = good ? 'rgba(201, 163, 90, .95)' : 'rgba(244, 242, 238, .55)';
    ctx.setLineDash(good ? [] : [L2 / 90, L2 / 120]);
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.46, L2 * 0.12, L2 * 0.16, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (a && a.od && a.checks && a.checks.face) {
      ctx.strokeStyle = good ? '#c9a35a' : 'rgba(244, 242, 238, .8)';
      ctx.lineWidth = Math.max(1.5, L2 / 640);
      for (const p of [a.od, a.os]) {
        ctx.beginPath(); ctx.arc(p.x, p.y, a.irisPx / 2, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p.x - a.irisPx * 0.18, p.y); ctx.lineTo(p.x + a.irisPx * 0.18, p.y); ctx.moveTo(p.x, p.y - a.irisPx * 0.18); ctx.lineTo(p.x, p.y + a.irisPx * 0.18); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(a.mid.x, a.mid.y - a.irisPx * 0.9); ctx.lineTo(a.mid.x, a.mid.y + a.irisPx * 0.9); ctx.stroke();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ---------- the engine (downloaded on the first Start only; pd.js, unchanged) ----------
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
      engineP.catch(() => { engineP = null; });
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
    ga('pd_error', { why: key, v: 2 });
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
    if (window.innerWidth <= 700) stage.scrollIntoView({ block: 'center', behavior: reduced.matches ? 'auto' : 'smooth' });
    ga('pd_start', { v: 2 });
    raf = requestAnimationFrame(loop);
  }
  let lastTs = 0;
  function loop() {
    if (mode !== 'measure' && mode !== 'between') return;
    raf = requestAnimationFrame(loop);
    const W = video && video.videoWidth, H = video && video.videoHeight;
    if (!W || !H || video.readyState < 2) return;
    let now = performance.now();
    if (now <= lastTs) now = lastTs + 1;
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
      if (frames.length && now - lastOk > BREAK_MS) { frames = []; takeT0 = 0; paintTakes(takes.length, 0); }
      return;
    }
    lastOk = now;
    if (!frames.length) takeT0 = now;
    frames.push({ pdI: a.pdI, pdC: a.pdC, share: a.share, zI: a.zI });
    say('hold', { n: takes.length + 1 }, now);
    const part = Math.min((now - takeT0) / TAKE_MS, frames.length / TAKE_MIN);
    paintTakes(takes.length, part);
    if (now - takeT0 >= TAKE_MS && frames.length >= TAKE_MIN) {
      takes.push(takeOf(frames));
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
    stopCam();
    stage.classList.add('is-done');
    look.hidden = true;
    result = estimate(takes, who);
    const far = result.raw.far;
    ga('pd_result', { ok: result.spread <= SPREAD_MAX ? 1 : 0, v: 2, who, split: result.split ? 1 : 0, kid: result.kid ? 1 : 0 });   // never the measurement itself
    if (result.spread > SPREAD_MAX) { again('retry', { d: mm(result.spread) }); return; }
    if (!(far.total >= 45 && far.total <= 80) || !(result.od >= 20 && result.od <= 45 && result.os >= 20 && result.os <= 45)) { again('odd', { v: mm(far.total) }); return; }
    say('done');
    showResult();
  }
  function again(key, map) {
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
    $('#pdm-margin').textContent = fill(T('pdm.res.margin'), { m: mm(result.margin) });
    $('#pdm-od').textContent = mm(result.od) + ' mm';
    $('#pdm-os').textContent = mm(result.os) + ' mm';
    $('#pdm-note').textContent = fill(T('pdm.res.note'), Object.assign(cmIn(result.z), { c: mm(result.add) }));
    const wide = result.split && result.face;
    resNote2.hidden = !wide;
    if (wide) resNote2.textContent = fill(T('pdm2.split'), { i: mm(half(result.iris.total)), f: mm(half(result.face.total)) });
    kidEl.hidden = !result.kid;
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
    ga('pd_use', { src: v.src, v: 2 });
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

  // ---------- typed PD (pd.js, unchanged) ----------
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
    paintWho();
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

  // for tools/check_pd_page.js and tools/eval_pd.js (read-only views + the pure functions)
  window.__pd = { version: 2, analyze, farPD, rounded, takeOf, estimate, weights, faceMmPx, setWho,
    get who() { return who; }, get mode() { return mode; }, get last() { return last; }, get takes() { return takes.slice(); },
    get result() { return result; }, get back() { return back; }, LIM, IRIS_MM, FOV_LONG, ROT_MM, MP_FOV, SIG, KID_D, D_LO, D_HI, MARGIN, CANON_EYES_MM };
})();
