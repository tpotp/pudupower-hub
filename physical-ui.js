/* Barsalitsuni · Physical UI v5 — ventana holográfica con normal compensada
 *
 * Modelo geométrico (una sola verdad para todas las capas):
 *   · El cristal de la pantalla es el plano z = 0. El ojo está a EYE_D px del cristal,
 *     desplazado (ex, ey) respecto del centro: ese desplazamiento sale del giroscopio
 *     (ex = −D·tan γ, ey = −D·tan β) o del mouse.
 *   · Cada capa es un plano a altura z (px hacia el usuario; negativo = detrás del cristal).
 *   · COMPENSACIÓN DE INCLINACIÓN: cada plano se gira (rotateX·rotateY) lo justo para que su
 *     normal apunte al ojo, y luego se proyecta sobre el cristal desde el ojo con la proyección
 *     exacta fuera de eje:
 *         S = E + t·(Q − E)      t = D / (D − Qz)      E = ojo      Q = punto 3D del plano
 *     Esa proyección es una HOMOGRAFÍA del plano (no un simple scale/rotate): por eso el
 *     elemento se deforma geométricamente en la pantalla (trapecio) y, visto desde el ojo,
 *     parece siempre de frente. Se entrega al navegador como matrix3d, sin perspective().
 *   · Con el ojo centrado el giro es 0: el CSS describe cómo se ve la maqueta en reposo.
 *   · Capas anidadas (icono dentro de tarjeta) y cortes del grosor componen su homografía
 *     con la inversa de la del padre, así que cada nivel recibe su propio mapa exacto.
 *   · El grosor son cortes a lo largo de la normal ya girada: al cambiar el ángulo, el canto
 *     se ve exactamente como se vería el volumen real.
 *   · Sombra: proyectada sobre un plano de suelo; su desfase respecto del objeto es la
 *     paralaje entre ambos planos más la dirección de la luz.
 *
 * Orden de profundidad en el menú (de cerca a lejos):
 *   iconos 🎞️📹  →  botones de subir/cámara  →  logo y «Video Generator»  →  fondo.
 *   (El fondo es lo único que NO se gira: solo se desplaza con paralaje.)
 *
 * Pantallas TRANQUILAS (cámara en vivo y procesamiento): el motor se apaga por completo.
 * Nada que contenga <video>, <canvas> o <iframe> se transforma jamás.
 * En reposo no se pide ni un frame.
 */
(() => {
  'use strict';
  if (window.PhysicalUI) return;

  const doc = document;
  const root = doc.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const camPage = !!doc.getElementById('cvwrap');
  const touchDevice = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const TILT_ON = !reduce && !camPage;

  /* ---------- Ajustes rápidos ---------- */
  const SLOW = 1;              // 1 = normal · 1.5 = transiciones más lentas
  const EYE_D = 1400;          // distancia ojo → pantalla en px CSS (≈ 37 cm)
  const EYE_SIGN_X = 1;        // respuesta lateral invertida para coincidir con la inclinación real
  const EYE_SIGN_Y = -1;       // respuesta vertical invertida para coincidir con la inclinación real
  const SENSOR_GAIN = 1.0;     // 1 = el ojo se desplaza exactamente lo que giras el teléfono
  const MAX_EYE_DEG = 13;      // ángulo máximo ojo ↔ normal de la pantalla
  const MOUSE_EYE_DEG = 9;     // ángulo máximo con mouse
  const SENSOR_SMOOTH = .16;   // filtro pasa-bajos del sensor (s)
  const TILT_COMPENSATION = 1; // 1 = la normal de cada capa apunta exactamente al ojo · 0 = sin giro
  const MAX_FACE_DEG = 18;     // tope de giro de una capa (grados)
  const BG_Z = -620;           // fondo más lento, sin perder profundidad visual
  const GROUND_Z = -140;       // plano sobre el que se proyectan las sombras
  const CALM = new Set(['view-camera', 'view-processing']);   // pantallas sin efectos

  const ms = (v) => v * SLOW;
  const FLIGHT_MS = ms(3600);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const persp = (z, y, rx) => `perspective(1200px) translate3d(0,${y}px,${z}px) rotateX(${rx}deg)`;
  const REST = persp(0, 0, 0);
  const tz = (z) => EYE_D / (EYE_D - z);          // factor de proyección a altura z
  const eyeOffset = (deg) => EYE_D * Math.tan(clamp(deg, -MAX_EYE_DEG, MAX_EYE_DEG) * Math.PI / 180);

  if (TILT_ON) root.classList.add('pl-on');

  /* ---------- Física: resortes ---------- */
  const spring = (s, target, k, c, dt) => {
    s.v += ((target - s.p) * k - s.v * c) * dt;
    s.p += s.v * dt;
  };
  const still = (s, target, eps) => Math.abs(s.p - target) < eps && Math.abs(s.v) < eps * 4;

  /* ---------- Capas ---------- */
  const SURF = 'video,canvas,iframe';
  const SURF_ANC = '#cvwrap,.video-box,.youtube-player-shell,.render-youtube-shell';
  const hasSurface = (el) => Boolean(el.closest(SURF_ANC) || el.matches(SURF) || el.querySelector(SURF));

  const PAL = {                                   // canto: [claro, oscuro]
    bronze: [[132, 92, 44], [26, 16, 8]],
    moss:   [[126, 150, 54], [16, 25, 10]],
    amber:  [[222, 134, 26], [88, 40, 6]],
    crimson:[[224, 70, 92], [86, 14, 30]],
    ghost:  [[104, 82, 58], [26, 18, 12]],
    neon:   [[0, 190, 134], [0, 56, 40]]
  };
  const palFor = (el) => {
    const c = el.classList;
    if (c.contains('mode-vid')) return PAL.moss;
    if (c.contains('mode-live')) return PAL.crimson;
    if (c.contains('mode-card')) return PAL.bronze;
    if (c.contains('btn-gold') || c.contains('btn-primary')) return PAL.amber;
    if (c.contains('btn-crimson') || c.contains('btn-rec')) return PAL.crimson;
    if (c.contains('btn-outline') || c.contains('btn-ghost')) return PAL.ghost;
    if (c.contains('btn')) return PAL.neon;
    return PAL.bronze;
  };

  // z = altura sobre el cristal en px · thick = grosor del volumen · press = se hunde al pulsar
  const SPECS = camPage ? [] : [
    // La tarjeta y su icono forman un único bloque físico: el icono se mueve
    // como contenido de la tarjeta, sin una segunda proyección independiente.
    // Las dos opciones de entrada son ahora losas de cristal (glass-ui.js): permanecen SIEMPRE
    // alineadas con el plano de la pantalla (flat = sin matrix3d, sin trapecio). El volumen y el
    // canto los dibuja glass-ui.js; aquí solo se conserva el vuelo al pulsar.
    ['.mode-card',         { flat: true, press: true, pressZ: 40, z: 50 }],
    ['.steps > div',       { thick: 3, z: 18, motion: .72, direction: -1 }], // mismo sentido global, más lento
    ['.card, .trimmer-card', { thick: 6, z: 18 }],
    ['.btn',               { thick: 5, press: true, pressZ: 32, z: 26 }],
    ['.brand-logo',        { z: -60 }],                                       // logo barsalitsuni
    ['.generator-label',   { z: -40 }],                                       // «Video Generator»
    ['.kitty',             { z: -20 }],                                       // círculo del gatito
    ['.foot',              { z: 6 }]
  ];

  const layers = [];
  const byEl = new WeakMap();
  let live = [];
  let curView = '';

  function register(el, o) {
    if (byEl.has(el) || hasSurface(el)) return;
    const l = {
      el, flat: Boolean(o.flat), thick: o.flat ? 0 : (o.thick || 0), press: Boolean(o.press), pressZ: o.pressZ || 24,
      pal: palFor(el), z: o.z || 0, frozen: false, fx: 0, fy: 0,
      motion: o.motion === undefined ? 1 : o.motion,
      direction: o.direction === undefined ? 1 : o.direction,
      pr: { p: 0, v: 0 }, hv: { p: 0, v: 0 }, tPr: 0, tHv: 0, touchX: 0, touchY: 0,
      key: '', rest: false, parent: null, cx: 0, cy: 0,
      slices: [], zc: o.z || 0, tr: tz(o.z || 0), basis: null, Hf: null, Hfi: null, memo: -1
    };
    el.classList.add('pl');
    if (l.thick && !camPage) {
      el.classList.add('pl-ext');
      addRealVolume(el, l);
    } else l.thick = 0;
    byEl.set(el, l);
    layers.push(l);
  }

  // Grosor = cortes a z decreciente. Se pintan del más profundo al más cercano y
  // la cara al final, así el orden de pintado coincide con el orden de profundidad.
  function addRealVolume(el, l) {
    const cs = getComputedStyle(el);
    const volume = doc.createElement('span');
    volume.className = 'pl-volume';
    volume.setAttribute('aria-hidden', 'true');
    volume.setAttribute('role', 'presentation');

    const count = clamp(Math.round(l.thick), touchDevice ? 2 : 4, touchDevice ? 6 : 10);
    const [a, b] = l.pal;
    for (let i = count; i >= 1; i--) {
      const side = doc.createElement('i');
      const f = (i - 1) / Math.max(1, count - 1);
      side.className = 'pl-depth-layer';
      side.setAttribute('aria-hidden', 'true');
      side.style.background = `rgb(${Math.round(lerp(a[0], b[0], f))},${Math.round(lerp(a[1], b[1], f))},${Math.round(lerp(a[2], b[2], f))})`;
      side.style.borderColor = `rgba(${Math.round(lerp(a[0], b[0], f * .4)) + 60},${Math.round(lerp(a[1], b[1], f * .4)) + 60},${Math.round(lerp(a[2], b[2], f * .4)) + 40},${(.62 - .5 * f).toFixed(2)})`;
      volume.append(side);
      l.slices.push({ el: side, depth: l.thick * i / count });
    }
    const face = doc.createElement('span');
    face.className = 'pl-face';
    face.setAttribute('aria-hidden', 'true');
    face.style.background = cs.background;
    face.style.borderRadius = cs.borderRadius;
    volume.append(face);

    el.style.background = 'transparent';
    el.style.backgroundImage = 'none';
    el.append(volume);
    l.volume = volume;
  }

  // Cada capa conoce a su padre físico para componer sus mapas de proyección.
  function linkLayers() {
    layers.forEach((l) => {
      const p = l.el.parentElement && l.el.parentElement.closest('.pl');
      l.parent = p ? byEl.get(p) || null : null;
    });
  }

  /* ---------- Posición de maquetación (inmune a transformaciones y animaciones) ---------- */
  function layoutCenter(el) {
    let x = el.offsetWidth / 2;
    let y = el.offsetHeight / 2;
    let n = el;
    while (n) {
      x += n.offsetLeft; y += n.offsetTop;
      const p = n.offsetParent;
      if (!p || p === doc.body) break;
      x += p.clientLeft; y += p.clientTop;
      n = p;
    }
    for (let a = el.parentElement; a; a = a.parentElement) { x -= a.scrollLeft; y -= a.scrollTop; }
    return [x - innerWidth / 2, y - innerHeight / 2];     // vector centro-de-pantalla → centro de la capa
  }
  function measure() {
    for (let i = 0; i < live.length; i++) {
      const c = layoutCenter(live[i].el);
      live[i].cx = c[0]; live[i].cy = c[1];
    }
  }
  let measureQueued = 0;
  function queueMeasure() {
    if (measureQueued || !TILT_ON) return;
    measureQueued = requestAnimationFrame(() => {
      measureQueued = 0;
      if (isBusy()) return;
      measure();
      paintAll(performance.now() / 1000);
    });
  }

  /* ---------- Estado global del ojo ---------- */
  let tgtX = 0;               // ojo objetivo (px sobre el cristal respecto del centro)
  let tgtY = 0;
  const gX = { p: 0, v: 0 };  // ojo actual (resorte)
  const gY = { p: 0, v: 0 };
  let sensorOn = false;
  let sensorReady = false;
  let sensorBound = false;
  let sensorPermissionPromise = null;
  let lastOrientationAt = 0;
  let bgEl = null;

  const recEl = () => doc.getElementById('recIndicator');
  const expEl = () => doc.getElementById('exportModal');
  const isBusy = () => camPage || CALM.has(curView);

  function clearSceneMotion() {
    const scene = doc.getElementById('app');
    if (scene) {
      scene.style.transform = '';
      if (doc.getAnimations) {
        doc.getAnimations().forEach((animation) => {
          if (animation.effect && animation.effect.target === scene) animation.cancel();
        });
      }
    }
    if (bgEl) bgEl.style.transform = '';
    for (let i = 0; i < layers.length; i++) {
      const l = layers[i];
      if (!flightStates.has(l.el)) l.el.style.transform = '';
      for (let k = 0; k < l.slices.length; k++) l.slices[k].el.style.transform = '';
      l.rest = false;
    }
  }

  function refresh() {
    const v = doc.querySelector('.view.active');
    curView = v ? v.id : '';
    const physicalView = TILT_ON && !CALM.has(curView);
    root.classList.toggle('pl-on', physicalView);
    if (physicalView) syncBackdrop();
    else {
      root.classList.remove('pl-bg-on');
      if (bgEl) bgEl.style.transform = '';
    }
    live = layers.filter((l) => l.el.isConnected && l.el.offsetParent !== null);
    syncSensor();
    if (isBusy()) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      clearSceneMotion();
      return;
    }
    measure();
    for (let i = 0; i < live.length; i++) live[i].rest = false;
    paintAll(performance.now() / 1000);
    wake();
  }

  /* ---------- Proyección ---------- */
  let pass = 0;

  /*MATH-BEGIN*/
  // Matrices 3×3 (fila a fila) = homografías 2D en coordenadas homogéneas (u, v, 1).
  const T3 = (x, y) => [1, 0, x, 0, 1, y, 0, 0, 1];
  const mul3 = (A, B) => [
    A[0] * B[0] + A[1] * B[3] + A[2] * B[6], A[0] * B[1] + A[1] * B[4] + A[2] * B[7], A[0] * B[2] + A[1] * B[5] + A[2] * B[8],
    A[3] * B[0] + A[4] * B[3] + A[5] * B[6], A[3] * B[1] + A[4] * B[4] + A[5] * B[7], A[3] * B[2] + A[4] * B[5] + A[5] * B[8],
    A[6] * B[0] + A[7] * B[3] + A[8] * B[6], A[6] * B[1] + A[7] * B[4] + A[8] * B[7], A[6] * B[2] + A[7] * B[5] + A[8] * B[8]
  ];
  const inv3 = (M) => {
    const a = M[0], b = M[1], c = M[2], d = M[3], e = M[4], f = M[5], g = M[6], h = M[7], i = M[8];
    const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
    const det = a * A + b * B + c * C || 1e-12;
    return [
      A / det, (c * h - b * i) / det, (b * f - c * e) / det,
      B / det, (a * i - c * g) / det, (c * d - a * f) / det,
      C / det, (b * g - a * h) / det, (a * e - b * d) / det
    ];
  };

  // Base del plano girado, R = Rx(φ)·Ry(ψ) (mismo orden y signos que CSS rotateX() rotateY()).
  // Columnas: r0 = imagen del eje u, r1 = imagen del eje v, r2 = normal del plano.
  const planeBasis = (psi, phi) => {
    const cp = Math.cos(psi), sp = Math.sin(psi), cf = Math.cos(phi), sf = Math.sin(phi);
    return [cp, sf * sp, -cf * sp,   0, cf, sf,   sp, -sf * cp, cf * cp];
  };

  // Ángulos (ψ = giro sobre Y, φ = giro sobre X) que llevan la normal de un plano centrado en
  // (c3x, c3y, zc) desde "mirar al ojo neutro" hasta "mirar al ojo actual (ex, ey)".
  // Es el DELTA respecto del reposo: con el ojo centrado vale 0 y la maqueta queda intacta.
  const faceAngles = (c3x, c3y, zc, ex, ey, gain, maxRad) => {
    const d = Math.max(1, EYE_D - zc);
    const psi = (Math.atan2(ex - c3x, d) - Math.atan2(-c3x, d)) * gain;
    const phi = -(Math.atan2(ey - c3y, d) - Math.atan2(-c3y, d)) * gain;
    return [clamp(psi, -maxRad, maxRad), clamp(phi, -maxRad, maxRad)];
  };

  // Homografía LOCAL de un plano: (u, v, 1) = desplazamiento en px de maquetación desde el centro
  // del elemento  →  posición en pantalla (px desde el centro de la ventana).
  //   cx,cy  centro de maquetación del elemento (px desde el centro de la ventana)
  //   tr     factor de proyección en reposo (EYE_D/(EYE_D−z))
  //   zc     altura actual del plano · depth: corte del grosor, medido hacia dentro por la normal
  //   ex,ey  ojo real · px,py: desfase extra de paralaje (ajuste fino por capa)
  // Punto 3D:   Q(u,v) = C + (u/tr)·r0 + (v/tr)·r1,   C = (cx/tr, cy/tr, zc) − depth·r2
  // Proyección: S = E + D·(Q − E)/(D − Qz)   → fracción lineal en (u,v) = homografía exacta.
  const planeH = (cx, cy, tr, zc, depth, B, ex, ey, px, py) => {
    const Cx = cx / tr - depth * B[6];
    const Cy = cy / tr - depth * B[7];
    const Cz = zc - depth * B[8];
    const W0 = -B[2] / tr, W1 = -B[5] / tr, W2 = EYE_D - Cz;
    const X0 = (ex + px) * W0 + EYE_D * B[0] / tr, X1 = (ex + px) * W1 + EYE_D * B[3] / tr;
    const X2 = (ex + px) * W2 + EYE_D * (Cx - ex);
    const Y0 = (ey + py) * W0 + EYE_D * B[1] / tr, Y1 = (ey + py) * W1 + EYE_D * B[4] / tr;
    const Y2 = (ey + py) * W2 + EYE_D * (Cy - ey);
    return [X0, X1, X2, Y0, Y1, Y2, W0, W1, W2];
  };

  // 3×3 → matrix3d (columna-mayor, z intacto, normalizada con w = 1 en el centro).
  const css3 = (L) => {
    const k = 1 / L[8];
    const n = (v) => (v * k).toFixed(7);
    return `matrix3d(${n(L[0])},${n(L[3])},0,${n(L[6])},${n(L[1])},${n(L[4])},0,${n(L[7])},0,0,1,0,${n(L[2])},${n(L[5])},0,1)`;
  };
  /*MATH-END*/

  // Mapa total de una capa respecto de su maquetación: gira la normal hacia el ojo y proyecta.
  const FACE_MAX = MAX_FACE_DEG * Math.PI / 180;
  function faceOf(l, depth, B, ex, ey) {
    const zp = l.zc - depth * B[8];
    const k = (l.motion * l.direction - 1) * (1 - tz(zp));   // ajuste fino de paralaje por capa
    return planeH(l.cx, l.cy, l.tr, l.zc, depth, B, ex, ey, ex * k, ey * k);
  }

  function solve(l) {
    if (l.memo === pass) return l;
    const comp = clamp(l.pr.p, -.25, 1.15);                       // 0 reposo · 1 hundido
    l.zc = l.z + l.hv.p * 10 - comp * (l.press ? l.pressZ : 0);   // pulsar = alejarse del cristal
    const ex = l.frozen ? l.fx : gX.p;
    const ey = l.frozen ? l.fy : gY.p;
    const ang = faceAngles(l.cx / l.tr, l.cy / l.tr, l.zc, ex, ey, TILT_COMPENSATION, FACE_MAX);
    l.basis = planeBasis(ang[0], ang[1]);
    l.Hf = faceOf(l, 0, l.basis, ex, ey);
    l.Hfi = inv3(l.Hf);
    l.memo = pass;
    return l;
  }

  function paint(l) {
    if (l.flat) return;          // losa de cristal: nunca se deforma
    const par = l.parent ? solve(l.parent) : null;
    solve(l);
    // CSS aplica la transformación del hijo dentro de la del padre:  H_hijo_local = H_padre⁻¹ · H_hijo
    // (referida al centro del propio elemento).
    const L = par
      ? mul3(T3(par.cx - l.cx, par.cy - l.cy), mul3(par.Hfi, l.Hf))
      : mul3(T3(-l.cx, -l.cy), l.Hf);
    l.el.style.transform = css3(L);
    if (!l.thick) return;
    const ex = l.frozen ? l.fx : gX.p;
    const ey = l.frozen ? l.fy : gY.p;
    const n = l.slices.length;
    for (let i = 0; i < n; i++) {
      const s = l.slices[i];
      // Cada corte es el mismo plano girado, desplazado `depth` hacia dentro por la normal.
      // Comparte el mapa de la cara; así el canto sigue al volumen real.
      s.el.style.transform = css3(mul3(l.Hfi, faceOf(l, s.depth, l.basis, ex, ey)));
    }
    // Sombra: el objeto en l.zc proyecta sobre el plano de suelo; su desfase en pantalla
    // es la paralaje entre ambos planos más la dirección de la luz (arriba-delante).
    const h = l.zc - GROUND_Z;
    const tg = tz(GROUND_Z);
    const sx = ex * (tz(l.zc) - tg) - .04 * h;
    const sy = ey * (tz(l.zc) - tg) + .20 * h;
    const key = `${Math.round(sx)}|${Math.round(sy)}|${Math.round(h / 4)}`;
    if (key !== l.key) {
      l.key = key;
      l.el.style.setProperty('--gs', `${sx.toFixed(1)}px ${sy.toFixed(1)}px ${(10 + h * .12).toFixed(0)}px rgba(0,0,0,${clamp(.5 - h * .0007, .22, .5).toFixed(2)})`);
    }
  }

  function paintBg() {
    if (!bgEl) return;
    const t = tz(BG_Z);
    bgEl.style.transform = `translate(${(gX.p * (1 - t)).toFixed(2)}px,${(gY.p * (1 - t)).toFixed(2)}px)`;
  }

  function paintAll() {
    pass++;
    for (let i = 0; i < live.length; i++) paint(live[i]);
    paintBg();
  }

  function stepLayer(l, dt) {
    spring(l.pr, l.tPr, 320, 15, dt);
    spring(l.hv, l.tHv, 160, 16, dt);
    const moving = !(still(l.pr, l.tPr, .004) && still(l.hv, l.tHv, .004));
    l.rest = !moving;
    return moving;
  }

  /* ---------- Loop (duerme cuando todo está quieto) ---------- */
  let raf = 0;
  let last = 0;

  function wake() {
    if (raf || reduce || camPage || isBusy()) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(.034, (now - last) / 1000 || .016);
    last = now;
    if (isBusy()) { clearSceneMotion(); return; }
    const gMoving = !(still(gX, tgtX, .02) && still(gY, tgtY, .02));
    spring(gX, tgtX, 70, 11, dt);
    spring(gY, tgtY, 70, 11, dt);
    let moving = gMoving;
    let ran = gMoving;
    for (let i = 0; i < live.length; i++) {
      const l = live[i];
      if (l.rest && !gMoving) continue;
      ran = true;
      if (stepLayer(l, dt)) moving = true;
    }
    if (ran) paintAll();
    if (moving) raf = requestAnimationFrame(frame);
  }

  /* ---------- Entradas: puntero y acelerómetro ---------- */
  const layerAt = (t) => {
    const el = t && t.closest ? t.closest('.pl') : null;
    return el ? byEl.get(el) : null;
  };
  let pressed = null;
  let hovered = null;
  let frozen = null;
  let suppressModeClick = null;
  let suppressModeClickTimer = 0;

  doc.addEventListener('pointerdown', (e) => {
    if (reduce || isBusy()) return;
    const l = layerAt(e.target);
    if (!l) return;
    // Controles de formulario (sliders, selects): la capa se queda quieta mientras los usas.
    if (e.target.closest && e.target.closest('input,select,textarea')) {
      l.fx = gX.p; l.fy = gY.p;
      l.frozen = true; frozen = l; l.rest = false; wake();
    }
    if (!l.press || l.el.disabled || l.el.getAttribute('aria-disabled') === 'true') return;
    const r = l.el.getBoundingClientRect();
    const u = clamp(((e.clientX - r.left) / r.width - .5) * 2, -1, 1);
    const v = clamp(((e.clientY - r.top) / r.height - .5) * 2, -1, 1);
    // El vuelo empieza en pointerdown, no en click. Así el primer toque
    // siempre tiene respuesta, también cuando el selector de archivos tarda.
    const modeEl = l.el.closest ? l.el.closest('#dropZone, a.mode-live') : null;
    if (modeEl && !modeEl.classList.contains('mode-card')) {
      const state = ensureChoiceFlight(modeEl, { x: u, y: v });
      if (modeEl.id === 'dropZone') scheduleChoiceReturn(state);
    }
    l.touchX = u;
    l.touchY = v;
    l.tPr = 1;
    l.rest = false;
    pressed = l;
    // El botón empieza a viajar en cuanto se pulsa. Capturar el puntero evita
    // perder el pointerup cuando la tarjeta ya no está bajo el dedo/cursor.
    try { l.el.setPointerCapture?.(e.pointerId); } catch (_) { /* no disponible */ }
    wake();
  }, { capture: true, passive: true });

  function suppressNextModeClick(el) {
    suppressModeClick = el;
    if (suppressModeClickTimer) window.clearTimeout(suppressModeClickTimer);
    suppressModeClickTimer = window.setTimeout(() => {
      if (suppressModeClick === el) suppressModeClick = null;
      suppressModeClickTimer = 0;
    }, 1200);
  }

  function activateModeCardOnRelease(el, event) {
    const modeEl = el && el.closest ? el.closest('#dropZone, a.mode-live') : el;
    if (!modeEl || !modeEl.isConnected || modeEl.disabled || modeEl.getAttribute('aria-disabled') === 'true') return false;
    const isUpload = modeEl.id === 'dropZone';
    const isCamera = modeEl.matches('a.mode-live');
    if (!isUpload && !isCamera) return false;

    // The browser can cancel the synthetic click after a long press. Execute
    // the real action from pointerup, while the user gesture is still active.
    if (event && event.cancelable) event.preventDefault();
    suppressNextModeClick(modeEl);

    if (isUpload) {
      const input = doc.getElementById('videoInput');
      if (input) input.click();
      return Boolean(input);
    }

    let url = null;
    try { url = new URL(modeEl.href || modeEl.getAttribute('href'), location.href); } catch (_) { /* href inválido */ }
    if (!url || url.origin !== location.origin || url.pathname === location.pathname || leaving) return false;
    leave(modeEl, url);
    return true;
  }

  const release = (event, activate = false) => {
    const releasedLayer = pressed;
    if (frozen) { frozen.frozen = false; frozen.rest = false; frozen = null; wake(); }
    if (!releasedLayer) return;
    releasedLayer.tPr = 0; releasedLayer.rest = false;
    pressed = null;
    if (event && event.pointerId !== undefined) {
      try { releasedLayer.el.releasePointerCapture?.(event.pointerId); } catch (_) { /* ya liberado */ }
    }
    wake();
    if (activate) activateModeCardOnRelease(releasedLayer.el, event);
  };
  doc.addEventListener('pointerup', (e) => release(e, true), { capture: true, passive: false });
  doc.addEventListener('pointercancel', (e) => release(e, false), { capture: true, passive: true });

  doc.addEventListener('pointermove', (e) => {
    if (reduce || e.pointerType !== 'mouse' || isBusy()) return;
    if (pressed) {
      const r = pressed.el.getBoundingClientRect();
      // Las tarjetas de entrada se transforman hacia el fondo mientras están
      // pulsadas; su rectángulo cambia a propósito, así que no debemos
      // interpretar ese vuelo como que el usuario canceló la pulsación.
      if (!(pressed.el.closest && pressed.el.closest('#dropZone, a.mode-live')) &&
          (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) release();
    }
    if (TILT_ON && !sensorOn) {
      tgtX = clamp((e.clientX / innerWidth - .5) * 2, -1, 1) * eyeOffset(MOUSE_EYE_DEG);
      tgtY = clamp((e.clientY / innerHeight - .5) * 2, -1, 1) * eyeOffset(MOUSE_EYE_DEG);
    }
    const l = layerAt(e.target);
    const next = l && l.press ? l : null;
    if (next !== hovered) {
      if (hovered) { hovered.tHv = 0; hovered.rest = false; }
      hovered = next;
      if (hovered) { hovered.tHv = 1; hovered.rest = false; }
    }
    wake();
  }, { passive: true });

  // Evita que el menú contextual del navegador cancele una pulsación larga
  // sobre una opción de entrada antes de que llegue su pointerup.
  doc.addEventListener('contextmenu', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    const mode = t && t.closest ? t.closest('#dropZone, a.mode-live') : null;
    if (mode) e.preventDefault();
  }, { capture: true, passive: false });

  root.addEventListener('mouseleave', () => {
    if (!sensorOn) { tgtX = 0; tgtY = 0; }
    if (hovered) { hovered.tHv = 0; hovered.rest = false; hovered = null; }
    wake();
  });

  let baseB = null;
  let baseG = null;
  let smoothX = 0;
  let smoothY = 0;
  let smoothAt = 0;
  function paintSensorNow() {
    if (!TILT_ON || isBusy() || !live.length) return;
    // El sensor no depende de RAF: se pinta directo con el ojo ya filtrado.
    gX.p = tgtX; gX.v = 0;
    gY.p = tgtY; gY.v = 0;
    paintAll();
  }

  function onOrient(e, fromMotion = false) {
    if (e.beta == null || e.gamma == null || isBusy()) return;
    if (!fromMotion) lastOrientationAt = performance.now();
    if (baseB === null) { baseB = e.beta; baseG = e.gamma; }
    // La "postura neutra" se adapta despacio a cómo sostienes el teléfono.
    baseB += (e.beta - baseB) * .004;
    baseG += (e.gamma - baseG) * .004;
    sensorOn = true;
    // Girar el teléfono γ grados desplaza el ojo −D·tanγ sobre el plano de la pantalla.
    const rawX = EYE_SIGN_X * eyeOffset(clamp(e.gamma - baseG, -30, 30) * SENSOR_GAIN);
    const rawY = EYE_SIGN_Y * eyeOffset(clamp(e.beta - baseB, -30, 30) * SENSOR_GAIN);
    const now = performance.now();
    const dt = smoothAt ? clamp((now - smoothAt) / 1000, .008, .2) : .016;
    smoothAt = now;
    const blend = 1 - Math.exp(-dt / SENSOR_SMOOTH);
    smoothX += (rawX - smoothX) * blend;
    smoothY += (rawY - smoothY) * blend;
    tgtX = smoothX; tgtY = smoothY;
    paintSensorNow();
    wake();
  }
  // El sensor solo se escucha en pantallas vivas: en cámara/procesamiento se desconecta del todo.
  function onMotion(e) {
    if (isBusy() || performance.now() - lastOrientationAt < 260) return;
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(a.z)) return;
    const gamma = Math.atan2(a.x, Math.hypot(a.y, a.z)) * 180 / Math.PI;
    const beta = Math.atan2(a.y, Math.hypot(a.x, a.z)) * 180 / Math.PI;
    onOrient({ beta, gamma }, true);
  }

  function syncSensor() {
    const want = TILT_ON && sensorReady && !isBusy();
    if (want && !sensorBound) {
      baseB = null;
      baseG = null;
      smoothX = 0;
      smoothY = 0;
      smoothAt = 0;
      lastOrientationAt = 0;
      window.addEventListener('deviceorientation', onOrient, { passive: true });
      window.addEventListener('deviceorientationabsolute', onOrient, { passive: true });
      window.addEventListener('devicemotion', onMotion, { passive: true });
      sensorBound = true;
    } else if (!want && sensorBound) {
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('deviceorientationabsolute', onOrient);
      window.removeEventListener('devicemotion', onMotion);
      sensorBound = false;
      sensorOn = false;
      tgtX = 0;
      tgtY = 0;
      smoothX = 0;
      smoothY = 0;
      smoothAt = 0;
    }
  }
  const listen = () => { sensorReady = true; syncSensor(); };

  const enableSensor = () => {
    if (sensorPermissionPromise) return sensorPermissionPromise;
    const apis = [window.DeviceOrientationEvent, window.DeviceMotionEvent]
      .filter((api) => api && typeof api.requestPermission === 'function');
    if (!apis.length) {
      listen();
      return Promise.resolve(true);
    }
    // Enlazar antes de resolver el diálogo replica el flujo de dondesalgo.cl:
    // al concederse el permiso no se pierde el primer paquete del sensor.
    listen();
    sensorPermissionPromise = Promise.all(apis.map((api) => {
      try { return Promise.resolve(api.requestPermission()).catch(() => 'denied'); }
      catch (_) { return Promise.resolve('denied'); }
    })).then((states) => {
      const granted = states.some((state) => state === 'granted');
      if (granted) listen();
      else {
        sensorPermissionPromise = null;
        armSensorPermission();
      }
      return granted;
    });
    return sensorPermissionPromise;
  };

  let sensorGestureArmed = false;
  const SENSOR_GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click'];
  const isEntryActionTarget = (eventOrTarget) => {
    const candidates = [];
    if (eventOrTarget?.target) candidates.push(eventOrTarget.target);
    else candidates.push(eventOrTarget);
    if (eventOrTarget?.composedPath) candidates.push(...eventOrTarget.composedPath());
    return candidates.some((candidate) => Boolean(
      candidate && candidate.closest && candidate.closest('#dropZone, a.mode-live')
    ));
  };
  const disarmSensorPermission = () => {
    if (!sensorGestureArmed) return;
    sensorGestureArmed = false;
    SENSOR_GESTURES.forEach((type) => doc.removeEventListener(type, requestSensorFromGesture, true));
  };
  function requestSensorFromGesture(event) {
    // En iOS, requestPermission() abre un diálogo modal que puede cancelar el
    // click que estaba abriendo el selector de archivos o la cámara. Las
    // acciones de entrada tienen prioridad: el sensor se pedirá en el próximo
    // gesto que no sea una de esas acciones.
    if (isEntryActionTarget(event)) return;
    disarmSensorPermission();
    void enableSensor();
  }
  const armSensorPermission = () => {
    if (sensorGestureArmed) return;
    sensorGestureArmed = true;
    SENSOR_GESTURES.forEach((type) => doc.addEventListener(type, requestSensorFromGesture, { passive: true, capture: true }));
  };

  const OR = window.DeviceOrientationEvent;
  const MO = window.DeviceMotionEvent;
  if (TILT_ON && (OR || MO)) {
    const needsPermission = [OR, MO].some((api) => api && typeof api.requestPermission === 'function');
    if (!needsPermission) listen();
    else if (!camPage) {
      // Intentar al cargar permite que los permisos ya concedidos funcionen
      // desde el primer frame. En iOS una primera concesión sigue exigiendo
      // un gesto del usuario; el respaldo queda armado abajo.
      // Escuchar al cargar permite aprovechar un permiso ya concedido, pero
      // no llamar requestPermission() todavía: Safari iOS puede aplazar ese
      // diálogo hasta el primer toque y cancelar así "Subir videos" o
      // "Cámara". El permiso se solicita en un gesto posterior que no sea de
      // entrada mediante armSensorPermission().
      listen();
      armSensorPermission();
    }
    // En la página de cámara de iOS no se pide el sensor: así no se mezcla con el permiso del micrófono.
  }

  const flightStates = new WeakMap();
  let lastChoice = null;

  function choiceFlight(el, dur, point) {
    const old = flightStates.get(el);
    if (old && old.animation) old.animation.cancel();
    const u = clamp(point && point.x !== undefined ? point.x : 0, -1, 1);
    const v = clamp(point && point.y !== undefined ? point.y : 0, -1, 1);
    const dx = clamp(u * 34, -34, 34);
    const dy = clamp(86 + v * 14, 70, 104);
    const rx = clamp(-v * 15, -18, 18);
    const ry = clamp(u * 20, -24, 24);
    const rz = clamp(u * 8 + v * 4, -12, 12);
    const origin = el.style.transformOrigin;
    el.style.transformOrigin = `${(50 + u * 30).toFixed(1)}% ${(50 + v * 30).toFixed(1)}%`;
    const animation = el.animate([
      { transform: 'perspective(1100px) translate3d(0,0,0) rotateX(0) rotateY(0) rotateZ(0) scale(1)', opacity: 1, offset: 0 },
      { transform: `perspective(1100px) translate3d(${(dx * .18).toFixed(1)}px,-8px,-42px) rotateX(${(rx * .25).toFixed(1)}deg) rotateY(${(ry * .25).toFixed(1)}deg) rotateZ(${(rz * .2).toFixed(1)}deg) scale(.97)`, opacity: 1, offset: .14 },
      { transform: `perspective(1100px) translate3d(${(dx * .58).toFixed(1)}px,-${(dy * .48).toFixed(1)}px,-230px) rotateX(${(rx * .65).toFixed(1)}deg) rotateY(${(ry * .65).toFixed(1)}deg) rotateZ(${(rz * .6).toFixed(1)}deg) scale(.86)`, opacity: .86, offset: .52 },
      { transform: `perspective(1100px) translate3d(${dx.toFixed(1)}px,-${dy.toFixed(1)}px,-520px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) rotateZ(${rz.toFixed(1)}deg) scale(.68)`, opacity: .28, offset: .82 },
      { transform: `perspective(1100px) translate3d(${(dx * 1.05).toFixed(1)}px,-${(dy * 1.03).toFixed(1)}px,-720px) rotateX(${(rx * 1.1).toFixed(1)}deg) rotateY(${(ry * 1.1).toFixed(1)}deg) rotateZ(${(rz * 1.1).toFixed(1)}deg) scale(.54)`, opacity: .03 }
    ], { duration: dur, easing: 'cubic-bezier(.18,.06,.16,1)', fill: 'forwards' });
    const state = { el, animation, origin, done: false, returning: false };
    state.promise = animation.finished.then(() => { state.done = true; }, () => { state.done = true; });
    flightStates.set(el, state);
    lastChoice = state;
    return state;
  }

  function ensureChoiceFlight(el, point) {
    if (el && el.classList && el.classList.contains('mode-card')) {
      return { el, promise: Promise.resolve(), done: true, returning: false };
    }
    const current = flightStates.get(el);
    if (current && !current.returning && !current.done) return current;
    return choiceFlight(el, FLIGHT_MS, point);
  }

  function cancelChoice() {
    const state = lastChoice;
    if (!state || state.returning) return;
    state.returning = true;
    const current = getComputedStyle(state.el);
    try { state.animation.cancel(); } catch (_) { /* ya terminÃ³ */ }
    const back = state.el.animate([
      { transform: current.transform, opacity: Number(current.opacity) || .2 },
      { transform: 'none', opacity: 1 }
    ], { duration: ms(720), easing: 'cubic-bezier(.2,1.15,.3,1)', fill: 'forwards' });
    back.finished.then(() => {
      state.el.style.transformOrigin = state.origin;
      flightStates.delete(state.el);
      if (lastChoice === state) lastChoice = null;
      const l = byEl.get(state.el);
      if (l) { l.rest = false; wake(); }
    }, () => {});
  }

  function clearChoiceState(state) {
    try { state.animation.cancel(); } catch (_) { /* ya terminÃ³ */ }
    state.el.style.transform = '';
    state.el.style.opacity = '';
    state.el.style.transformOrigin = state.origin;
    flightStates.delete(state.el);
    if (lastChoice === state) lastChoice = null;
  }

  function waitForChoice() {
    const state = lastChoice;
    if (!state) return Promise.resolve();
    if (state.done) { clearChoiceState(state); return Promise.resolve(); }
    return state.promise.then(() => {
      // WAAPI con fill:forwards conserva el último fotograma aunque la vista
      // se oculte; limpiarlo evita que la tarjeta reaparezca transparente.
      clearChoiceState(state);
    });
  }

  function scheduleChoiceReturn(state) {
    state.returnTimer = setTimeout(() => {
      if (lastChoice === state && doc.visibilityState !== 'hidden') cancelChoice();
    }, FLIGHT_MS + ms(700));
  }

  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'visible' && lastChoice && lastChoice.el.id === 'dropZone' && lastChoice.done) cancelChoice();
  });

  const ORDER = ['view-start', 'view-camera', 'view-edit', 'view-processing', 'view-result'];
  let lastTrigger = null;

  function swap(prev, next, apply) {
    if (reduce || !prev || prev === next || !prev.isConnected) { apply(); refresh(); return; }
    const app = prev.parentElement;
    const forward = ORDER.indexOf(next.id) >= ORDER.indexOf(prev.id);
    const calm = CALM.has(next.id) || CALM.has(prev.id);     // con video en vivo / render: transición mínima
    const trig = lastTrigger && performance.now() - lastTrigger.t < 900 && prev.contains(lastTrigger.el)
      ? lastTrigger.el : null;

    if (trig && !calm) {
      const point = lastTrigger.point;
      lastTrigger = null;
      const state = choiceFlight(trig, FLIGHT_MS, point);
      state.promise.then(() => swap(prev, next, apply));
      return;
    }

    // La vista saliente se congela en su sitio mientras la nueva aparece.
    const ar = app.getBoundingClientRect();
    const pr = prev.getBoundingClientRect();
    const scroll = prev.scrollTop;
    prev.classList.add('pl-leaving');
    prev.style.top = `${pr.top - ar.top}px`;
    prev.style.left = `${pr.left - ar.left}px`;
    prev.style.width = `${pr.width}px`;
    prev.style.height = `${pr.height}px`;

    apply();
    prev.scrollTop = scroll;

    const anims = [];
    let done;
    if (calm) {
      // Solo opacidad: no se transforma nada que contenga la vista previa o el render.
      done = prev.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(320), easing: 'ease-out', fill: 'forwards' });
      anims.push(done);
      next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms(380), delay: ms(120), easing: 'ease-out', fill: 'backwards' });
      // En cámara/render la transición es solo opacidad; ningún control vuela.
    } else {
      const out = forward ? persp(-280, -34, 7) : persp(240, 46, -6);
      const inn = forward ? persp(200, 70, -8) : persp(-260, -40, 6);
      const dOut = ms(720);
      done = prev.animate([{ transform: REST }, { transform: out }],
        { duration: dOut, easing: 'cubic-bezier(.5,0,.75,.4)', fill: 'forwards' });
      anims.push(done,
        prev.animate([{ opacity: 1 }, { opacity: 1, offset: .55 }, { opacity: 0 }],
          { duration: dOut, easing: 'linear', fill: 'forwards' }));
      next.animate([{ transform: inn }, { transform: REST }],
        { duration: ms(760), delay: ms(140), easing: 'cubic-bezier(.2,1.1,.3,1)', fill: 'backwards' });
      next.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: ms(420), delay: ms(140), easing: 'ease-out', fill: 'backwards' });
      Array.from(next.children).forEach((child, i) => {
        if (child.matches('script,style')) return;
        child.animate([{ opacity: 0, transform: 'translate3d(0,26px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }],
          { duration: ms(620), delay: ms(180 + i * 70), easing: 'cubic-bezier(.2,.9,.25,1.1)', fill: 'backwards' });
      });
    }

    const cleanup = () => {
      anims.forEach((a) => { try { a.cancel(); } catch (_) { /* ya cancelada */ } });
      prev.classList.remove('pl-leaving');
      prev.style.top = prev.style.left = prev.style.width = prev.style.height = '';
    };
    done.finished.then(cleanup, cleanup);
    refresh();
  }

  /* ---------- Cambio de página con vuelo ---------- */
  const veil = doc.createElement('div');
  veil.className = 'pl-veil';
  veil.setAttribute('aria-hidden', 'true');
  let leaving = false;
  const NAV_KEY = 'pl-nav';

  function leave(link, url) {
    if (camPage) { location.assign(url.href); return; }
    leaving = true;
    try { sessionStorage.setItem(NAV_KEY, '1'); } catch (_) { /* sin storage */ }
    const point = lastTrigger && lastTrigger.point;
    lastTrigger = null;
    const state = ensureChoiceFlight(link, point);
    state.promise.then(() => location.assign(url.href));
  }

  doc.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const b = t.closest('button, a, [role="button"]');
    if (b && suppressModeClick === b) {
      suppressModeClick = null;
      if (suppressModeClickTimer) window.clearTimeout(suppressModeClickTimer);
      suppressModeClickTimer = 0;
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (b) {
      const r = b.getBoundingClientRect();
      const point = {
        x: r.width ? clamp(((e.clientX - r.left) / r.width - .5) * 2, -1, 1) : 0,
        y: r.height ? clamp(((e.clientY - r.top) / r.height - .5) * 2, -1, 1) : 0
      };
      lastTrigger = { el: b, t: performance.now(), point };
      if (!camPage && b.tagName === 'BUTTON' && b.classList.contains('mode-card') && !b.disabled) {
        const state = ensureChoiceFlight(b, point);
        if (b.id === 'dropZone') scheduleChoiceReturn(state);
      }
    }

    const a = t.closest('a[href]');
    if (a && !reduce && !leaving && !e.defaultPrevented && !e.button && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey &&
        !a.target && !a.hasAttribute('download')) {
      let url = null;
      try { url = new URL(a.href, location.href); } catch (_) { /* href inválido */ }
      if (url && /^https?:$/.test(url.protocol) && url.origin === location.origin && url.pathname !== location.pathname) {
        e.preventDefault();
        leave(a, url);
        return;
      }
    }

    if (reduce || isBusy() || !b) return;
    // "Subir video" (botón que abre el selector de archivos): sale volando y regresa.
    // Cualquier otro botón: rebote en el aire al soltar.
    const l = byEl.get(b);
    if (l && l.press && !(b.tagName === 'BUTTON' && b.classList.contains('mode-card'))) {
      l.hv.v += 9; l.rest = false; wake();
    }
  }, true);

  function arrive() {
    if (reduce || camPage) return;
    let fromNav = false;
    try { fromNav = sessionStorage.getItem(NAV_KEY) === '1'; sessionStorage.removeItem(NAV_KEY); } catch (_) { /* sin storage */ }
    ['#app'].forEach((sel) => {
      const el = doc.querySelector(sel);
      if (!el) return;
      el.animate([{ opacity: 0, transform: persp(-220, 24, 6) }, { opacity: 1, transform: REST }],
        { duration: ms(fromNav ? 820 : 600), easing: 'cubic-bezier(.2,.9,.25,1.05)', fill: 'backwards' });
    });
  }

  function flyIn(box) {
    if (reduce || camPage || !box) return;
    box.animate([
      { opacity: 0, transform: 'perspective(900px) translate3d(0,50px,-200px) rotateX(14deg)' },
      { opacity: 1, transform: 'perspective(900px) translate3d(0,0,0) rotateX(0)' }
    ], { duration: ms(650), easing: 'cubic-bezier(.2,.9,.25,1.08)', fill: 'backwards' });
  }

  /* ---------- Fondo con parallax (solo index, un único elemento) ---------- */
  function syncBackdrop() {
    if (camPage || !TILT_ON) return;
    root.classList.remove('pl-bg-on');
    const cs = getComputedStyle(doc.body, '::before');
    if (!cs.backgroundImage || cs.backgroundImage === 'none') return;
    if (!bgEl) {
      bgEl = doc.createElement('div');
      bgEl.className = 'pl-bg';
      bgEl.setAttribute('aria-hidden', 'true');
      doc.body.prepend(bgEl);
    }
    Object.assign(bgEl.style, {
      backgroundImage: cs.backgroundImage,
      backgroundSize: cs.backgroundSize,
      backgroundPosition: cs.backgroundPosition,
      backgroundRepeat: 'no-repeat',
      backgroundColor: cs.backgroundColor
    });
    root.classList.add('pl-bg-on');
  }

  /* ---------- Arranque ---------- */
  function init() {
    SPECS.forEach(([sel, o]) => doc.querySelectorAll(sel).forEach((el) => register(el, o)));
    linkLayers();
    doc.body.appendChild(veil);
    syncBackdrop();
    refresh();
    arrive();

    // Solo se vigilan las vistas (nunca el DOM completo): refrescar capas visibles al cambiar de pantalla.
    const viewObs = new MutationObserver(refresh);
    doc.querySelectorAll('.view').forEach((v) => viewObs.observe(v, { attributes: true, attributeFilter: ['class'] }));

    if (camPage) {
      ['cameraPermission', 'exportModal'].forEach((id) => {
        const m = doc.getElementById(id);
        if (!m) return;
        if (m.classList.contains('open')) flyIn(m.firstElementChild);
        let was = m.classList.contains('open');
        new MutationObserver(() => {
          const now = m.classList.contains('open');
          if (now && !was) flyIn(m.firstElementChild);
          was = now;
          refresh();
        }).observe(m, { attributes: true, attributeFilter: ['class'] });
      });
    }

    let rz = 0;
    addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => { syncBackdrop(); refresh(); }, 120);
    }, { passive: true });
    // Posiciones de maquetación: se recalculan si cambia el scroll, el tamaño o las fuentes/imágenes.
    doc.addEventListener('scroll', queueMeasure, { capture: true, passive: true });
    window.addEventListener('load', queueMeasure, { once: true });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(queueMeasure);
    const app = doc.getElementById('app');
    if (app && window.ResizeObserver) new ResizeObserver(queueMeasure).observe(app);
  }

  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    if (doc.getAnimations) doc.getAnimations().forEach((a) => a.cancel());
    veil.classList.remove('on');
    leaving = false;
    arrive();
    refresh();
  });

  window.PhysicalUI = { swap, refresh, wake, waitForChoice, cancelChoice, enableSensor,
    eye: () => [gX.p, gY.p] };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();