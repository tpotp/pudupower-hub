/* The Power of the Pudú · Hub Principal 3D
 * - 3D Physical Glass Buttons (extrusión 36px, bisel pulido, MeshPhysicalMaterial IOR 1.52 idéntico a barsalitsuni)
 * - Proyección fuera de eje (Off-Axis Perspective) acoplada a physical-ui.js (giroscopio/mouse)
 * - Mascotita 3D interactiva del Pudú:
 *     * Estética Wireframe Neón holográfica idéntica a puduchat (doble capa: sólido translúcido + wireframe brillante)
 *     * Ojos en cuencas orbitales reales con eye-tracking continuo mirando al usuario/cámara
 *     * Locomoción orgánica, respiración torácica, parpadeo natural y expresiones ricas
 *     * Reacción táctil / click / hover / arrastre / caricias
 */
import * as THREE from './vendor/three/three.module.js';

(() => {
  'use strict';

  const GLASS_DEPTH = 36;     // Grosor del vidrio en px
  const BEVEL_SIZE  = 2.8;    // Grosor del bisel pulido en px
  const EYE_D       = 1400;   // Distancia ojo -> pantalla (sincronizada con physical-ui.js)
  const PARALLAX    = 2.2;    // Factor de desplazamiento del ojo
  const MAX_EYE     = 700;    // Límite de desplazamiento del ojo en px
  const FLIGHT_MS   = 460;
  const RETURN_MS   = 380;

  const doc = document;
  const canvas = doc.getElementById('glassCanvas');
  const bubbleEl = doc.getElementById('pudu3d-speech-bubble');
  const bgImg = doc.getElementById('bg-cover-img');

  if (!canvas) return;

  /* ---------- Three.js Renderer ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
  } catch (e) {
    console.warn('[glass-ui] Fallback sin WebGL:', e);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x070b09, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  // WebGL Context Loss Recovery para Safari y Chrome
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    setTimeout(() => {
      if (renderer && renderer.forceContextRestore) renderer.forceContextRestore();
    }, 500);
  }, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 10, EYE_D + 2600);

  let viewportW = 0;
  let viewportH = 0;

  /* ---------- Iluminación y EnvMap PBR (Idéntico a Barsalitsuni) ---------- */
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envCanvas = doc.createElement('canvas');
    envCanvas.width = 128;
    envCanvas.height = 64;
    const ectx = envCanvas.getContext('2d');
    const egrad = ectx.createLinearGradient(0, 0, 0, 64);
    egrad.addColorStop(0, '#557766');
    egrad.addColorStop(0.35, '#223328');
    egrad.addColorStop(0.5, '#111814');
    egrad.addColorStop(0.7, '#1a1012');
    egrad.addColorStop(1, '#050706');
    ectx.fillStyle = egrad;
    ectx.fillRect(0, 0, 128, 64);
    const envTex = new THREE.CanvasTexture(envCanvas);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    const envRT = pmrem.fromEquirectangular(envTex);
    scene.environment = envRT.texture;
    pmrem.dispose();
  } catch (e) {
    console.warn('[glass-ui] PMREM fallback to lights:', e);
  }

  const dirLightTop = new THREE.DirectionalLight(0xffffff, 2.5);
  dirLightTop.position.set(0, 1200, 900);
  scene.add(dirLightTop);

  const dirLightBottom = new THREE.DirectionalLight(0x7799bb, 0.9);
  dirLightBottom.position.set(0, -1000, 600);
  scene.add(dirLightBottom);

  const eyeLight = new THREE.PointLight(0xffffff, 2.4, 1800);
  scene.add(eyeLight);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  // Luz suave que acompaña al Pudú para resaltar sus aristas sin blanquear el vidrio
  const puduGlowLight = new THREE.PointLight(0x00ffaa, 2.0, 700, 1.2);
  puduGlowLight.position.set(0, -120, 220);
  scene.add(puduGlowLight);

  /* ---------- 1 Single Volumetric God Ray / Optical Flares (After Effects Pro style, alpha-safe) ---------- */
  const godRayGroup = new THREE.Group();
  const godRayBasePos = new THREE.Vector3(0, 380, -300);
  godRayGroup.position.copy(godRayBasePos);
  godRayGroup.rotation.set(0.14, 0, -0.35);

  const beamLength = 2200.0;
  const beamTopRadius = 42.0;
  const beamBottomRadius = 920.0;
  const beamGeo = new THREE.CylinderGeometry(beamTopRadius, beamBottomRadius, beamLength, 64, 1, true);
  beamGeo.translate(0, -beamLength * 0.5, 0);

  const beamUniforms = {
    uTime: { value: 0 },
    uCoreColor: { value: new THREE.Color(0xfff4d6) },
    uRayColor: { value: new THREE.Color(0xff9e3d) },
    uScatterColor: { value: new THREE.Color(0x38e8b0) },
    uIntensity: { value: 0.82 },
    uMouseOffset: { value: new THREE.Vector2(0, 0) },
    uPuduScreen: { value: new THREE.Vector2(0.5, 0.45) },
    uLightScreen: { value: new THREE.Vector2(0.5, 0.85) },
    uPuduRadius: { value: 0.11 },
    uAspect: { value: 1.77 }
  };

  // CustomBlending OneFactor + OneFactor con alpha proporcional evita cuadros negros en canvas transparente
  const beamMat = new THREE.ShaderMaterial({
    uniforms: beamUniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendEquationAlpha: THREE.AddEquation,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
    toneMapped: false,
    vertexShader: [
      "varying vec2 vUv;",
      "varying vec3 vNormalView;",
      "varying vec3 vViewDir;",
      "varying vec2 vScreenPos;",
      "void main() {",
      "  vUv = uv;",
      "  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);",
      "  vNormalView = normalize(normalMatrix * normal);",
      "  vViewDir = normalize(-mvPosition.xyz);",
      "  vec4 clipPos = projectionMatrix * mvPosition;",
      "  vScreenPos = (clipPos.xy / max(clipPos.w, 0.0001)) * 0.5 + 0.5;",
      "  gl_Position = clipPos;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "precision highp float;",
      "uniform float uTime;",
      "uniform vec3 uCoreColor;",
      "uniform vec3 uRayColor;",
      "uniform vec3 uScatterColor;",
      "uniform float uIntensity;",
      "uniform vec2 uMouseOffset;",
      "uniform vec2 uPuduScreen;",
      "uniform vec2 uLightScreen;",
      "uniform float uPuduRadius;",
      "uniform float uAspect;",
      "varying vec2 vUv;",
      "varying vec3 vNormalView;",
      "varying vec3 vViewDir;",
      "varying vec2 vScreenPos;",
      "#define TWO_PI 6.28318530718",
      "void main() {",
      "  float h = clamp(vUv.y, 0.0, 1.0);",
      "  float verticalFade = pow(h, 1.15) * smoothstep(0.0, 0.22, h) * smoothstep(1.0, 0.88, h);",
      "  float ndotv = abs(dot(normalize(vNormalView), normalize(vViewDir)));",
      "  float edgeFade = pow(clamp(ndotv, 0.0, 1.0), 1.35);",
      "  float angle = vUv.x * TWO_PI;",
      "  float drift = uTime * 0.18 + uMouseOffset.x * 0.9;",
      "  float s1 = 0.5 + 0.5 * sin(angle * 4.0 + drift + h * 0.8);",
      "  float s2 = 0.5 + 0.5 * sin(angle * 9.0 - drift * 1.3 - h * 1.1);",
      "  float s3 = 0.5 + 0.5 * sin(angle * 17.0 + uTime * 0.28);",
      "  float streaks = pow(s1, 1.8) * 0.50 + pow(s2, 2.5) * 0.35 + pow(s3, 3.5) * 0.25;",
      "  float cloudWave = 0.76 + 0.24 * sin(h * 5.0 - uTime * 0.35 + uMouseOffset.y * 1.2);",
      "  // Truco barato de oclusion volumetrica + halo alrededor del pudu",
      "  vec2 lp = (vScreenPos - uLightScreen) * vec2(uAspect, 1.0);",
      "  vec2 lc = (uPuduScreen - uLightScreen) * vec2(uAspect, 1.0);",
      "  float lcLen2 = max(dot(lc, lc), 0.0001);",
      "  float proj = dot(lp, lc) / lcLen2;",
      "  float perp = length(lp - lc * proj);",
      "  float coneR = uPuduRadius * max(proj, 0.55);",
      "  float inShadow = smoothstep(0.75, 1.05, proj);",
      "  float shadowMask = mix(1.0, mix(0.28, 1.0, smoothstep(coneR * 0.45, coneR * 1.25, perp)), inShadow);",
      "  float rimScatter = exp(-pow((perp - coneR * 0.92) / max(coneR * 0.42, 0.01), 2.0)) * smoothstep(0.65, 1.15, proj) * 0.45;",
      "  float glow = verticalFade * edgeFade * (0.30 + streaks * 0.82 + rimScatter) * cloudWave * shadowMask * uIntensity;",
      "  vec3 col = mix(uRayColor, uCoreColor, pow(h, 1.5));",
      "  col = mix(col, uScatterColor, (1.0 - h) * 0.14);",
      "  vec3 rgb = col * glow;",
      "  float a = clamp(glow * 0.45, 0.0, 0.65);",
      "  gl_FragColor = vec4(rgb, a);",
      "}"
    ].join("\n")
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.renderOrder = 0;
  godRayGroup.add(beamMesh);

  // Corona / Optical Flare principal (sin bordes cuadrados)
  const flareGeo = new THREE.PlaneGeometry(540, 540);
  const flareUniforms = {
    uTime: { value: 0 },
    uCoreColor: { value: new THREE.Color(0xfffaf0) },
    uFlareColor: { value: new THREE.Color(0xffb85c) },
    uAnamorphicColor: { value: new THREE.Color(0x70ffe0) },
    uIntensity: { value: 0.92 }
  };
  const flareMat = new THREE.ShaderMaterial({
    uniforms: flareUniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendEquationAlpha: THREE.AddEquation,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
    toneMapped: false,
    vertexShader: [
      "varying vec2 vUv;",
      "void main() {",
      "  vUv = uv;",
      "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
      "}"
    ].join("\n"),
    fragmentShader: [
      "precision highp float;",
      "uniform float uTime;",
      "uniform vec3 uCoreColor;",
      "uniform vec3 uFlareColor;",
      "uniform vec3 uAnamorphicColor;",
      "uniform float uIntensity;",
      "varying vec2 vUv;",
      "void main() {",
      "  vec2 p = vUv * 2.0 - 1.0;",
      "  float r = length(p);",
      "  if (r >= 0.98) discard;",
      "  float boundaryMask = smoothstep(0.95, 0.30, r);",
      "  float core = exp(-r * 10.5) * 1.45;",
      "  float softSun = exp(-r * 3.8) * 0.42;",
      "  float halo = exp(-pow(r - 0.24, 2.0) / 0.012) * 0.22;",
      "  float angle = atan(p.y, p.x);",
      "  float raysA = pow(0.5 + 0.5 * cos(angle * 8.0 + uTime * 0.14), 8.0);",
      "  float raysB = pow(0.5 + 0.5 * cos(angle * 16.0 - uTime * 0.09), 14.0);",
      "  float starburst = (raysA * 0.42 + raysB * 0.32) * exp(-r * 3.6);",
      "  float anamorphic = exp(-abs(p.y) * 32.0) * exp(-abs(p.x) * 2.6) * 0.58;",
      "  float glow = (core + softSun + halo + starburst) * boundaryMask;",
      "  vec3 sunRgb = mix(uFlareColor, uCoreColor, clamp(core * 1.2, 0.0, 1.0)) * glow;",
      "  vec3 streakRgb = mix(uAnamorphicColor, uCoreColor, 0.55) * (anamorphic * boundaryMask);",
      "  vec3 rgb = (sunRgb + streakRgb) * uIntensity;",
      "  float a = clamp(max(rgb.r, max(rgb.g, rgb.b)) * 0.55, 0.0, 0.85);",
      "  gl_FragColor = vec4(rgb, a);",
      "}"
    ].join("\n")
  });
  const flareMesh = new THREE.Mesh(flareGeo, flareMat);
  flareMesh.position.set(0, 0, 8);
  flareMesh.renderOrder = 1;
  godRayGroup.add(flareMesh);

  // Fantasmas cromáticos de lente (Iris Ghosts tipo After Effects Optical Flares)
  const ghostGeo = new THREE.PlaneGeometry(180, 180);
  const ghostMat = new THREE.ShaderMaterial({
    uniforms: {
      uColorA: { value: new THREE.Color(0x00ffaa) },
      uColorB: { value: new THREE.Color(0xffb703) },
      uIntensity: { value: 0.32 }
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendEquationAlpha: THREE.AddEquation,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
    toneMapped: false,
    vertexShader: [
      "varying vec2 vUv;",
      "void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"
    ].join("\n"),
    fragmentShader: [
      "precision highp float;",
      "uniform vec3 uColorA;",
      "uniform vec3 uColorB;",
      "uniform float uIntensity;",
      "varying vec2 vUv;",
      "void main() {",
      "  vec2 p = vUv * 2.0 - 1.0;",
      "  float r = length(p);",
      "  if (r >= 0.96) discard;",
      "  float ring = exp(-pow(r - 0.58, 2.0) / 0.018) * 0.75 + smoothstep(0.62, 0.0, r) * 0.16;",
      "  float mask = smoothstep(0.95, 0.55, r);",
      "  vec3 col = mix(uColorB, uColorA, r);",
      "  vec3 rgb = col * ring * mask * uIntensity;",
      "  float a = clamp(max(rgb.r, max(rgb.g, rgb.b)) * 0.5, 0.0, 0.5);",
      "  gl_FragColor = vec4(rgb, a);",
      "}"
    ].join("\n")
  });
  const ghostMeshA = new THREE.Mesh(ghostGeo, ghostMat);
  ghostMeshA.position.set(0, 0, -180);
  ghostMeshA.renderOrder = 1;
  scene.add(ghostMeshA);

  const ghostMeshB = new THREE.Mesh(ghostGeo, ghostMat.clone());
  ghostMeshB.scale.setScalar(0.55);
  ghostMeshB.position.set(0, 0, -170);
  ghostMeshB.renderOrder = 1;
  scene.add(ghostMeshB);

  // PointLight en espacio del mundo DELANTE de las tarjetas para crear reflejos reales en el vidrio
  const godRayLight = new THREE.PointLight(0xffdca3, 9.5, 2400, 1.15);
  godRayLight.position.set(160, 120, 360);
  scene.add(godRayLight);

  scene.add(godRayGroup);

  /* ---------- Helpers de geometría y texto ---------- */
  function createRoundedRectShape(w, h, r) {
    const shape = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    return shape;
  }

  function layoutText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let curLine = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = curLine ? `${curLine} ${words[n]}` : words[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && curLine) {
        lines.push(curLine);
        curLine = words[n];
      } else {
        curLine = testLine;
      }
    }
    if (curLine) lines.push(curLine);
    return lines;
  }

  /* ---------- Textura 2D en alta resolución (Estilizada The Power of the Pudú) ---------- */
  function drawCardTexture(canvasEl, card, w, h, dpr) {
    canvasEl.width = Math.round(w * dpr);
    canvasEl.height = Math.round(h * dpr);
    const ctx = canvasEl.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const r = Math.min(24, Math.round(h * 0.16));
    const accentDim = card.accentDim;
    const accentBg = card.accentBg;
    const tagColor = card.tagColor;
    const tagBg = card.tagBg;
    const isCompact = h < 180 || w < 280;

    // 1. Fondo de vidrio oscuro translúcido con gradiente de profundidad
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, r);
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, card.grad0 || 'rgba(16, 28, 20, 0.38)');
    bgGrad.addColorStop(0.45, card.grad1 || 'rgba(10, 20, 12, 0.48)');
    bgGrad.addColorStop(1, card.grad2 || 'rgba(6, 14, 8, 0.62)');
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Borde iluminado con destello exterior fino
    ctx.strokeStyle = accentDim;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    if (isCompact) {
      // Disposición compacta optimizada para pantallas táctiles y móviles
      const padX = 16;
      const iconSize = Math.min(56, Math.max(44, Math.round(h * 0.42)));
      const iconY = Math.round((h - iconSize) / 2);

      // Icono a la izquierda
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(padX, iconY, iconSize, iconSize, 14);
      ctx.fillStyle = accentBg;
      ctx.fill();
      ctx.strokeStyle = accentDim;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (card._loadedIconImg && card._loadedIconImg.complete && card._loadedIconImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(padX, iconY, iconSize, iconSize, 14);
        ctx.clip();
        const img = card._loadedIconImg;
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        const minDim = Math.min(nw, nh);
        const sx = (nw - minDim) / 2;
        const sy = (nh - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, padX, iconY, iconSize, iconSize);
        ctx.restore();
      } else {
        ctx.font = '24px system-ui, "Apple Color Emoji", "Segoe UI Emoji"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.icon, padX + iconSize / 2, iconY + iconSize / 2);
      }
      ctx.restore();

      // Flecha en esquina superior derecha
      ctx.save();
      ctx.fillStyle = tagColor;
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↗', w - padX - 4, iconY + 12);
      ctx.restore();

      // Textos a la derecha del icono
      const textX = padX + iconSize + 14;
      const textMaxW = w - textX - padX - 16;

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 16px "Cinzel", "Fraunces", Georgia, serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(card.title, textX, iconY + 2);

      ctx.fillStyle = '#c5d2ca';
      ctx.font = '400 11.5px "Inter", system-ui, sans-serif';
      const descLines = layoutText(ctx, card.desc, textMaxW).slice(0, 2);
      for (let l = 0; l < descLines.length; l++) {
        ctx.fillText(descLines[l], textX, iconY + 24 + l * 15);
      }
      ctx.restore();

      // Ribbon compacta si aplica
      if (card.ribbon) {
        ctx.save();
        const rw = 58;
        const rh = 16;
        ctx.translate(w - 18, 16);
        ctx.rotate((42 * Math.PI) / 180);
        ctx.beginPath();
        ctx.roundRect(-rw / 2, -rh / 2, rw, rh, 3);
        ctx.fillStyle = 'rgba(255, 68, 88, 0.88)';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 7.5px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.ribbon, 0, 1);
        ctx.restore();
      }
      return;
    }

    // Disposición estándar vertical (Desktop / Tablet)
    const padX = 22;
    const padTop = 20;
    const iconSize = 64;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(padX, padTop, iconSize, iconSize, 16);
    ctx.fillStyle = accentBg;
    ctx.fill();
    ctx.strokeStyle = accentDim;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (card._loadedIconImg && card._loadedIconImg.complete && card._loadedIconImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(padX, padTop, iconSize, iconSize, 16);
      ctx.clip();
      const img = card._loadedIconImg;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const minDim = Math.min(nw, nh);
      const sx = (nw - minDim) / 2;
      const sy = (nh - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, padX, padTop, iconSize, iconSize);
      ctx.restore();
    } else {
      const icx = padX + iconSize / 2;
      const icy = padTop + iconSize / 2;
      ctx.font = '32px system-ui, "Apple Color Emoji", "Segoe UI Emoji"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(card.icon, icx, icy + 1);
    }
    ctx.restore();

    // Flecha de navegación estilizada en esquina superior derecha
    ctx.save();
    ctx.fillStyle = tagColor;
    ctx.font = '700 19px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↗', w - padX - 8, padTop + iconSize / 2);
    ctx.restore();

    // 3. Título Épico con tipografía de Metal Progresivo
    const textY = padTop + iconSize + 16;
    const maxTextW = w - padX * 2;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 20px "Cinzel", "Fraunces", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(card.title, padX, textY);
    ctx.restore();

    // 4. Descripción identitaria en alta legibilidad
    const descY = textY + 28;
    ctx.save();
    ctx.fillStyle = '#c5d2ca';
    ctx.font = '400 12.5px "Inter", system-ui, sans-serif';
    ctx.textBaseline = 'top';
    const descLines = layoutText(ctx, card.desc, maxTextW).slice(0, 3);
    for (let l = 0; l < descLines.length; l++) {
      ctx.fillText(descLines[l], padX, descY + l * 18);
    }
    ctx.restore();

    // 5. Pastillas / Tags en la base de la tarjeta
    const tagH = 22;
    const tagY = h - 22 - tagH;
    let tagX = padX;

    ctx.save();
    ctx.font = '700 9.5px "Orbitron", monospace';
    ctx.textBaseline = 'middle';

    for (const tag of card.tags) {
      const textMetrics = ctx.measureText(tag);
      const tagW = textMetrics.width + 16;

      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, tagH / 2);
      ctx.fillStyle = tagBg;
      ctx.fill();
      ctx.strokeStyle = accentDim;
      ctx.lineWidth = 1.0;
      ctx.stroke();

      ctx.fillStyle = tagColor;
      ctx.textAlign = 'center';
      ctx.fillText(tag, tagX + tagW / 2, tagY + tagH / 2);

      tagX += tagW + 8;
    }
    ctx.restore();

    // 6. Ribbon "ONLINE" si aplica
    if (card.ribbon) {
      ctx.save();
      const rw = 72;
      const rh = 18;
      ctx.translate(w - 24, 20);
      ctx.rotate((42 * Math.PI) / 180);
      ctx.beginPath();
      ctx.roundRect(-rw / 2, -rh / 2, rw, rh, 4);
      ctx.fillStyle = 'rgba(255, 68, 88, 0.85)';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 8.5px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(card.ribbon, 0, 1);
      ctx.restore();
    }
  }

  /* ---------- Definición de los 3 Botones Físicos (The Power of the Pudú) ---------- */
  const cards = [
    {
      sel: '#btn-poop',
      title: 'Pudu Poop Maker',
      desc: 'Caos sonoro y YTP en estado puro: blast beats, cortes esquizofrénicos y metal progresivo sin frenos.',
      tags: ['Blast Beats', 'Caos YTP'],
      icon: '💩',
      iconImg: 'assets/poop_maker_logo.jpg',
      accentColor: 0x00ffaa,
      bodyColor: 0x0a140d,
      accentDim: 'rgba(0, 255, 170, 0.42)',
      accentBg: 'rgba(0, 255, 170, 0.14)',
      tagColor: '#00ffaa',
      tagBg: 'rgba(0, 255, 170, 0.16)',
      grad0: 'rgba(16, 28, 20, 0.38)',
      grad1: 'rgba(10, 20, 12, 0.48)',
      grad2: 'rgba(6, 14, 8, 0.62)',
      ribbon: null,
      speech: '¡Pudu Poop Maker! Caos sonoro y YTP con blast beats esquizofrénicos.'
    },
    {
      sel: '#btn-barsa',
      title: 'Barsalitsuni',
      desc: 'Sintetizador visual 3D con seam carving y estética avant-garde chilena para distorsionar la realidad.',
      tags: ['Seam Carving 3D', 'Avant-Garde'],
      icon: '🌌',
      iconImg: 'assets/barsalitsuni_thumb_circle.jpg',
      accentColor: 0xffb703,
      bodyColor: 0x1e150f,
      accentDim: 'rgba(255, 183, 3, 0.42)',
      accentBg: 'rgba(255, 183, 3, 0.14)',
      tagColor: '#ffb703',
      tagBg: 'rgba(255, 183, 3, 0.16)',
      grad0: 'rgba(32, 22, 16, 0.38)',
      grad1: 'rgba(22, 15, 11, 0.48)',
      grad2: 'rgba(14, 9, 7, 0.62)',
      ribbon: null,
      speech: '¡Barsalitsuni! Sintetizador visual 3D con seam carving y estética avant-garde.'
    },
    {
      sel: '#btn-sim',
      title: 'PuduWorld',
      desc: 'Simulador 3D multijugador impulsado por IA generativa para una metamorfosis colectiva en tiempo real.',
      tags: ['IA Generativa', 'Metamorfosis 3D'],
      icon: '🦌',
      iconImg: 'assets/puduworld_logo.jpg',
      accentColor: 0xff4458,
      bodyColor: 0x1a0d10,
      accentDim: 'rgba(255, 68, 88, 0.42)',
      accentBg: 'rgba(255, 68, 88, 0.14)',
      tagColor: '#ff8d99',
      tagBg: 'rgba(255, 68, 88, 0.16)',
      grad0: 'rgba(38, 18, 24, 0.38)',
      grad1: 'rgba(28, 12, 18, 0.48)',
      grad2: 'rgba(18, 8, 12, 0.62)',
      ribbon: 'ONLINE',
      speech: '¡PuduWorld! Simulador 3D multijugador con IA generativa y metamorfosis colectiva.'
    }
  ];

  for (const card of cards) {
    card.group = null;
    card.faceMesh = null;
    card.glassMesh = null;
    card.texCanvas = doc.createElement('canvas');
    if (card.iconImg) {
      const img = new Image();
      img.onload = () => {
        card._loadedIconImg = img;
        if (typeof drawCardTexture === 'function') drawCardTexture(card);
        if (card.tex) card.tex.needsUpdate = true;
      };
      img.src = card.iconImg;
    }
    card.texture = null;
    card.press = 0;
    card.targetPress = 0;
    card.hovered = false;
    card.flight = {
      active: false,
      startTime: 0,
      u: 0,
      v: 0,
      returning: false,
      returnStartTime: 0,
      returnFrom: null,
      returnTimer: null
    };
    card.baseCx = 0;
    card.baseCy = 0;
    card.w = 0;
    card.h = 0;
    card.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: card.bodyColor,
      emissive: 0x050c07,
      emissiveIntensity: 0.25,
      roughness: 0.04,
      metalness: 0.05,
      transmission: 0.92,
      ior: 1.52,
      thickness: GLASS_DEPTH,
      attenuationColor: new THREE.Color(card.accentColor),
      attenuationDistance: 28,
      transparent: true,
      opacity: 0.78,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03
    });
  }

  function buildCard(card) {
    const el = doc.querySelector(card.sel);
    if (!el) return;

    const cs = getComputedStyle(el);
    const radius = parseFloat(cs.borderTopLeftRadius) || 22;

    const w = card.w;
    const h = card.h;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // 1. Dibujar la textura de la cara frontal (ícono, textos, pastillas, ribbon)
    drawCardTexture(card.texCanvas, card, w, h, dpr);
    if (card.texture) card.texture.dispose();
    card.texture = new THREE.CanvasTexture(card.texCanvas);
    card.texture.colorSpace = THREE.SRGBColorSpace;
    card.texture.minFilter = THREE.LinearFilter;
    card.texture.magFilter = THREE.LinearFilter;

    // 2. Crear grupo 3D contenedor del paralelepípedo
    if (!card.group) {
      card.group = new THREE.Group();
      scene.add(card.group);
    }

    // 3. Cara frontal con el diseño impreso
    const faceGeo = new THREE.PlaneGeometry(w, h);
    const faceMat = new THREE.MeshBasicMaterial({
      map: card.texture,
      transparent: true,
      opacity: 0.98
    });
    if (card.faceMesh) {
      card.group.remove(card.faceMesh);
      card.faceMesh.geometry.dispose();
      card.faceMesh.material.dispose();
    }
    card.faceMesh = new THREE.Mesh(faceGeo, faceMat);
    card.faceMesh.position.set(0, 0, 0.2); // Justo en la cara frontal z=0
    card.group.add(card.faceMesh);

    // 4. Cuerpo de vidrio 3D extruido con bisel pulido
    const innerW = Math.max(12, w - BEVEL_SIZE * 2);
    const innerH = Math.max(12, h - BEVEL_SIZE * 2);
    const innerR = Math.max(1, radius - BEVEL_SIZE);
    const shape = createRoundedRectShape(innerW, innerH, innerR);

    const glassGeo = new THREE.ExtrudeGeometry(shape, {
      depth: GLASS_DEPTH,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: BEVEL_SIZE,
      bevelThickness: BEVEL_SIZE
    });

    // Desplazar en Z para que la cara frontal quede en Z = 0 y el cuerpo vaya hacia Z negativo (profundidad)
    glassGeo.translate(0, 0, -(GLASS_DEPTH + BEVEL_SIZE));

    if (card.glassMesh) {
      card.group.remove(card.glassMesh);
      card.glassMesh.geometry.dispose();
    }
    card.glassMesh = new THREE.Mesh(glassGeo, card.glassMaterial);
    card.group.add(card.glassMesh);
  }

  function resize(force) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    viewportW = W;
    viewportH = H;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);

    camera.aspect = W / H;
    camera.updateProjectionMatrix();

    for (const card of cards) {
      const el = doc.querySelector(card.sel);
      if (el) {
        const r = el.getBoundingClientRect();
        card.w = Math.round(r.width);
        card.h = Math.round(r.height);
        buildCard(card);
      }
    }
  }

  function syncCameraProjection(W, H, ex, ey) {
    camera.position.set(ex, ey, EYE_D);
    camera.rotation.set(0, 0, 0);
    camera.updateMatrixWorld();

    const near = 10;
    const far = EYE_D + 2600;
    const s = near / EYE_D;
    camera.projectionMatrix.makePerspective(
      (-W / 2 - ex) * s,
      ( W / 2 - ex) * s,
      ( H / 2 - ey) * s,
      (-H / 2 - ey) * s,
      near,
      far
    );
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  /* ══════════════════════════════════════════════════════════════
     AUDIO PROCEDURAL (WEB AUDIO API: MEOWS & CHIRPS DE PUDUCHAT)
     ══════════════════════════════════════════════════════════════ */
  let audioCtx = null;
  let audioReady = false;

  function getACtx() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioCtx = new AudioCtx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function unlockAudio() {
    if (audioReady) return;
    const ac = getACtx();
    if (ac) {
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      audioReady = true;
    }
  }
  window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });

  function isPageInFocus() {
    return !doc.hidden && doc.visibilityState === 'visible' && (typeof doc.hasFocus !== 'function' || doc.hasFocus());
  }

  function playPuduMeow(pitch = 1.0, style = 'normal') {
    if (!isPageInFocus()) return;
    try {
      const ac = getACtx();
      if (!ac) return;
      const master = ac.createGain();
      master.gain.setValueAtTime(0, ac.currentTime);
      master.gain.linearRampToValueAtTime(0.22, ac.currentTime + 0.03);
      master.connect(ac.destination);
      const carrier = ac.createOscillator();
      carrier.type = 'triangle';
      const base = 200 * pitch;
      if (style === 'normal') {
        carrier.frequency.setValueAtTime(base, ac.currentTime);
        carrier.frequency.linearRampToValueAtTime(base * 1.5, ac.currentTime + 0.12);
        carrier.frequency.exponentialRampToValueAtTime(base * 0.7, ac.currentTime + 0.55);
      } else if (style === 'chirp') {
        carrier.frequency.setValueAtTime(base * 1.8, ac.currentTime);
        carrier.frequency.exponentialRampToValueAtTime(base * 0.9, ac.currentTime + 0.18);
      }
      const harm = ac.createOscillator();
      harm.type = 'sawtooth';
      harm.frequency.value = base * 2.76;
      const harmGain = ac.createGain();
      harmGain.gain.setValueAtTime(0.08, ac.currentTime);
      harmGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
      harm.connect(harmGain);
      harmGain.connect(master);
      harm.start();
      harm.stop(ac.currentTime + 0.35);

      const env = ac.createGain();
      env.gain.setValueAtTime(0, ac.currentTime);
      env.gain.linearRampToValueAtTime(1, ac.currentTime + 0.04);
      env.gain.setValueAtTime(0.7, ac.currentTime + 0.3);
      env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.7);
      carrier.connect(env);
      env.connect(master);
      carrier.start();
      carrier.stop(ac.currentTime + 0.75);
      master.gain.setValueAtTime(master.gain.value, ac.currentTime + 0.7);
      master.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.8);
    } catch (_) {}
  }

  /* ══════════════════════════════════════════════════════════════
     PUDU AI — MOTOR UTILITY AI Y EMOCIONAL COMPLETO DE PUDUCHAT
     ══════════════════════════════════════════════════════════════ */
  const noise2D = (x, y) => Math.sin(x * 1.7 + y * 2.3) * 0.5 + Math.cos(x * 0.9 - y * 1.1) * 0.5;

class PuduAI {
  constructor(){
    // PAD Emotional Model (Pleasure-Arousal-Dominance)
    this.pleasure=0.5;  // 0=miserable → 1=ecstatic
    this.arousal=0.3;   // 0=comatose → 1=manic
    this.dominance=0.6; // 0=terrified → 1=confident

    // Biological Needs (0=satisfied → 1=desperate)
    this.hunger=0.2; this.energy=0.85; this.curiosity=0.4;
    this.affection=0.3; this.comfort=0.8;

    // Stress & Anger
    this.stress=0; this.angerLevel=0;
    this.angerThreshold=0.7;

    // Memory (persisted)
    this.totalInteractions=0; this.gentleInteractions=0;
    this.roughInteractions=0; this.angryUntil=0; this.angryReason='';
    this.visitCount=0; this.recentTouchTimes=[];

    // State Machine
    this.state='arriving'; this.stateTime=0; this.prevState=null;
    this.stateData={}; this.stateJustChanged=false;

    // Cursor tracking
    this.cursorScreenX=0; this.cursorScreenY=0;
    this.cursorNear=false; this.cursorSpeed=0; this.lastCursorMove=0;

    // Expression
    this.eyeTargetX=0; this.eyeTargetY=0;
    this.blinkTimer=3+Math.random()*4; this.isBlinking=false; this.blinkPhase=0;
    this.mouthShape='smile'; // smile,open,sad,angry,eating,yawn,happy
    this.earMode='neutral';  // neutral,alert,flat,wiggle
    this.tailWag=0; this.cheekBlush=0.55;
    this.bodySquash=1; this.breathPhase=0;

    // Movement
    this.targetX=0; this.walkSpeed=0; this.facingDir=1;

    // Butterfly
    this.bflyX=0; this.bflyY=1.5; this.bflyPhase=0; this.bflyActive=false;

    // Petting detection
    this.petSamples=[]; this.isPetting=false; this.petScore=0;

    this._loadMemory();
  }

  _loadMemory(){try{const s=localStorage.getItem('pudu-ai-memory');if(s){const m=JSON.parse(s);
    this.totalInteractions=m.ti||0;this.gentleInteractions=m.gi||0;this.roughInteractions=m.ri||0;
    this.visitCount=m.vc||0;this.angryUntil=m.au||0;this.angryReason=m.ar||'';
  }}catch(e){}}

  _saveMemory(){try{localStorage.setItem('pudu-ai-memory',JSON.stringify({
    ti:this.totalInteractions,gi:this.gentleInteractions,ri:this.roughInteractions,
    vc:this.visitCount,au:this.angryUntil,ar:this.angryReason
  }));}catch(e){}}

  isAngry(){return Date.now()<this.angryUntil;}

  getAngryCooldownText(){
    const r=Math.max(0,this.angryUntil-Date.now());
    const m=Math.ceil(r/60000);
    return m>1?`Vuelve en ~${m} min`:`Vuelve en ~${Math.ceil(r/1000)}s`;
  }

  // ── Register touch interaction ──
  registerTouch(type){
    this.totalInteractions++;this.lastCursorMove=Date.now();
    this.recentTouchTimes.push(Date.now());
    const cutoff=Date.now()-8000;
    this.recentTouchTimes=this.recentTouchTimes.filter(t=>t>cutoff);
    const spam=this.recentTouchTimes.length;

    switch(type){
      case 'gentle':
        this.gentleInteractions++;
        this.pleasure=Math.min(1,this.pleasure+0.1);
        this.affection=Math.max(0,this.affection-0.2);
        this.stress=Math.max(0,this.stress-0.08);
        this.angerLevel=Math.max(0,this.angerLevel-0.06);
        this.tailWag=Math.min(1,this.tailWag+0.4);
        this.cheekBlush=Math.min(1,this.cheekBlush+0.1);
        break;
      case 'neutral':
        this.pleasure=Math.min(1,this.pleasure+0.04);
        this.arousal=Math.min(1,this.arousal+0.12);
        this.angerLevel=Math.max(0,this.angerLevel-0.03);
        break;
      case 'rough':
        this.roughInteractions++;
        this.stress=Math.min(1,this.stress+0.25);
        this.pleasure=Math.max(0,this.pleasure-0.2);
        this.dominance=Math.max(0,this.dominance-0.12);
        this.angerLevel=Math.min(1,this.angerLevel+0.2);
        break;
      case 'aggressive':
        this.roughInteractions++;
        this.stress=Math.min(1,this.stress+0.5);
        this.pleasure=Math.max(0,this.pleasure-0.35);
        this.dominance=Math.max(0,this.dominance-0.25);
        this.angerLevel=Math.min(1,this.angerLevel+0.4);
        break;
    }
    if(spam>6){this.angerLevel=Math.min(1,this.angerLevel+0.12);this.stress=Math.min(1,this.stress+0.18);}
    if(this.angerLevel>=this.angerThreshold)this._triggerAngry();
    this._saveMemory();
  }

  _triggerAngry(){
    const base=3,extra=Math.floor(this.roughInteractions/3)*2;
    const mins=Math.min(base+extra,15);
    this.angryUntil=Date.now()+mins*60000;
    this.angryReason=this.angerLevel>0.9?
      '😡 El pudú se fue MUY enojado... no maltrates a los animales':'😤 El pudú se fue molesto... trátalo con cariño';
    this.state='angry_leaving';this.stateTime=0;this.stateJustChanged=true;
    this._saveMemory();
  }

  classifyTouch(velocity,duration,isDrag){
    const spd=Math.abs(velocity);
    if(isDrag){
      if(spd>0.5)return'aggressive';if(spd>0.2)return'rough';
      if(spd<0.06&&duration>400)return'gentle';return'neutral';
    }
    return this.recentTouchTimes.length>5?'rough':'neutral';
  }

  // ── Petting detection — smooth slow movement over pudú ──
  addPetSample(x,y){
    const now=Date.now();this.petSamples.push({x,y,t:now});
    if(this.petSamples.length>20)this.petSamples.shift();
    const recent=this.petSamples.filter(s=>now-s.t<1000);
    if(recent.length<4){this.isPetting=false;this.petScore=0;return;}
    let totalDist=0,totalSpeed=0;
    for(let i=1;i<recent.length;i++){
      const dx=recent[i].x-recent[i-1].x,dy=recent[i].y-recent[i-1].y;
      const dt=Math.max(1,recent[i].t-recent[i-1].t);
      totalDist+=Math.sqrt(dx*dx+dy*dy);totalSpeed+=Math.sqrt(dx*dx+dy*dy)/dt;
    }
    const avgSpeed=totalSpeed/(recent.length-1);
    // Petting: moderate distance, low speed, consistent direction
    this.isPetting=avgSpeed>0.02&&avgSpeed<0.4&&totalDist>30;
    this.petScore=this.isPetting?Math.min(1,this.petScore+0.05):Math.max(0,this.petScore-0.08);
    if(this.isPetting&&this.petScore>0.3){
      this.registerTouch('gentle');
      this.mouthShape='happy';this.earMode='flat';// relaxed ears when petted
      this.tailWag=Math.min(1,this.tailWag+0.1);
    }
  }

  // ── Utility AI: pick next state ──
  think(dt){
    if(this.state==='angry_leaving'||this.state==='leaving'||this.state==='arriving')return;
    this.stateTime+=dt;

    // Decay needs
    this.hunger=Math.min(1,this.hunger+dt*0.003);
    this.energy=Math.max(0,this.energy-dt*0.002);
    this.curiosity=Math.min(1,this.curiosity+dt*0.005);
    this.affection=Math.min(1,this.affection+dt*0.003);
    this.stress=Math.max(0,this.stress-0.003*dt);
    this.angerLevel=Math.max(0,this.angerLevel-dt*0.001);
    this.tailWag=Math.max(0,this.tailWag-dt*0.04);
    this.cheekBlush+=(0.55-this.cheekBlush)*dt*0.02;

    // PAD baseline drift
    this.pleasure+=(0.5-this.pleasure)*dt*0.008;
    this.arousal+=(0.3-this.arousal)*dt*0.012;
    this.dominance+=(0.6-this.dominance)*dt*0.006;

    // Cursor proximity
    this.cursorNear=this.cursorSpeed>0.005&&(Date.now()-this.lastCursorMove)<2500;

    // Derive expression
    if(this.stress>0.5){this.mouthShape='worried';this.earMode='flat';}
    else if(this.angerLevel>0.4){this.mouthShape='angry';this.earMode='flat';}
    else if(this.pleasure>0.7){this.mouthShape='happy';this.earMode='alert';}
    else if(this.energy<0.25){this.mouthShape='sleepy';this.earMode='neutral';}
    else if(!this.isPetting){this.mouthShape='smile';this.earMode=this.cursorNear?'alert':'neutral';}

    // Min duration per state
    const minDur={idle:3,walking:3.5,looking:2,eating:4.5,sleeping:7,playing:3.5,
      following:1.5,happy:3,scared:2,sneezing:1.8,yawning:2.5,scratching:3,
      chasing_butterfly:5,sitting:3.5,curious:2};
    if(this.stateTime<(minDur[this.state]||2))return;

    // Score actions (Utility AI)
    const S={};
    S.idle=0.2+(1-this.arousal)*0.25;
    S.walking=this.curiosity*0.4+this.arousal*0.25+(this.stateTime>6?0.2:0);
    S.looking=this.curiosity*0.45+(this.cursorNear?0.35:0);
    S.eating=this.hunger*0.85+(this.hunger>0.6?0.35:0);
    S.sleeping=(1-this.energy)*0.75+(this.stateTime>12?0.15:0);
    S.playing=this.energy*0.3+this.pleasure*0.3;
    S.following=this.cursorNear?(this.curiosity*0.5+this.pleasure*0.25):0;
    S.sitting=(1-this.arousal)*0.3+this.comfort*0.15;
    S.sneezing=Math.random()<0.015?0.85:0;
    S.yawning=(1-this.energy)*0.35;
    S.scratching=Math.random()<0.02?0.75:0;
    S.chasing_butterfly=this.energy*0.2+this.curiosity*0.3+(Math.random()<0.015?0.55:0);
    S.happy=this.pleasure>0.7?0.5:0;
    S.curious=this.cursorNear?0.4:this.curiosity*0.2;

    // Penalize current state (avoid loops)
    if(S[this.state]!==undefined)S[this.state]*=0.25;
    // Randomness
    for(const k in S)S[k]+=Math.random()*0.12;

    let best='idle',bv=-1;
    for(const[a,v]of Object.entries(S))if(v>bv){bv=v;best=a;}

    if(best!==this.state){this.prevState=this.state;this.state=best;this.stateTime=0;this.stateJustChanged=true;this._onEnter(best);}
  }

  _onEnter(st){
    switch(st){
      case'walking':this.targetX=(Math.random()-0.5)*3.5;this.walkSpeed=0.25+Math.random()*0.25;break;
      case'eating':this.mouthShape='eating';this.hunger=Math.max(0,this.hunger-0.3);break;
      case'sleeping':this.mouthShape='sleepy';this.earMode='flat';this.energy=Math.min(1,this.energy+0.4);break;
      case'chasing_butterfly':this.bflyX=(Math.random()-0.5)*4;this.bflyY=1+Math.random()*1.5;this.bflyPhase=0;this.bflyActive=true;this.arousal=Math.min(1,this.arousal+0.3);break;
      case'following':this.earMode='alert';break;
      case'happy':this.tailWag=1;this.cheekBlush=0.8;break;
      case'scared':this.earMode='flat';this.mouthShape='open';this.arousal=Math.min(1,this.arousal+0.4);break;
      case'yawning':this.mouthShape='yawn';break;
    }
  }

  // Blink system
  updateBlink(dt){
    this.blinkTimer-=dt;
    if(this.blinkTimer<=0&&!this.isBlinking){this.isBlinking=true;this.blinkPhase=0;}
    if(this.isBlinking){
      this.blinkPhase+=dt*8;
      if(this.blinkPhase>=Math.PI){
        this.isBlinking=false;
        this.blinkTimer=this.state==='sleeping'?0.5+Math.random()*1.5:2.5+Math.random()*5;
      }
    }
  }
  getBlinkScale(){return this.isBlinking?Math.max(0.05,Math.cos(this.blinkPhase)):1;}

  onChatMessage(){
    this.arousal=Math.min(1,this.arousal+0.18);this.curiosity=Math.min(1,this.curiosity+0.12);
    this.earMode='alert';
    if(this.state==='sleeping'){this.state='curious';this.stateTime=0;this.stateJustChanged=true;}
  }
}

const puduBrain=new PuduAI();

  /* ══════════════════════════════════════════════════════════════
     MODELO PROCEDURAL 3D HI-RES DE PUDÚ CHILENO (WIREFRAME NEON RETRO)
     ══════════════════════════════════════════════════════════════ */
  let puduGroup = new THREE.Group();
  scene.add(puduGroup);
  let pudu3dModel = null;
  const puduParts = {};

  function wMat(col, op = 0.82) {
    return new THREE.MeshBasicMaterial({
      color: col,
      wireframe: true,
      transparent: true,
      opacity: op
    });
  }

  function sMat(col, op = 0.16, emissiveIntensity = 0.28) {
    return new THREE.MeshPhongMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: emissiveIntensity,
      specular: 0xffffff,
      shininess: 85,
      transparent: true,
      opacity: op,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  function addPart(geo, col, parent, wop = 0.82, sop = 0.16) {
    const g = new THREE.Group();
    const solidMesh = new THREE.Mesh(geo, sMat(col, sop));
    const wireMesh = new THREE.Mesh(geo.clone(), wMat(col, wop));
    g.add(solidMesh);
    g.add(wireMesh);
    parent.add(g);
    return g;
  }

  function addFur(geo, col, parent, scale = 1.05, op = 0.24) {
    const m = new THREE.Mesh(geo.clone(), wMat(col, op));
    if (Array.isArray(scale)) m.scale.set(scale[0], scale[1], scale[2]);
    else m.scale.setScalar(scale);
    m.userData.isFur = true;
    parent.add(m);
    return m;
  }

  function buildProceduralPudu() {
    const root = new THREE.Group();
    root._isProcedural = true;
    root._baseY = -0.2;
    const segW = 48;
    const segH = 36;
    const segCyl = 36;
    const P = {};

    // ── BODY (Cuerpo compacto y muscular de pudú real) ──
    const bodyGeo = new THREE.SphereGeometry(0.56, segW, segH);
    P.body = addPart(bodyGeo, 0x00e5ff, root, 0.72, 0.15);
    P.body.position.set(0, 0.04, 0);
    P.body.scale.set(0.95, 0.86, 1.18);
    addFur(bodyGeo, 0x00ccff, P.body, 1.045, 0.22);
    addFur(bodyGeo, 0x0088bb, P.body, 1.09, 0.11);

    // Pecho / Tórax muscular
    const chestGeo = new THREE.SphereGeometry(0.42, 40, 32);
    P.chest = addPart(chestGeo, 0x00f0ff, root, 0.65, 0.14);
    P.chest.position.set(0, 0.05, 0.28);
    P.chest.scale.set(0.90, 0.88, 0.85);
    addFur(chestGeo, 0x22eeff, P.chest, 1.05, 0.16);

    // Escápulas (hombros) y cuartos traseros musculares
    const scapGeo = new THREE.SphereGeometry(0.24, 32, 24);
    [-1, 1].forEach((side) => {
      const scap = addPart(scapGeo, 0x00d4ff, P.body, 0.55, 0.10);
      scap.position.set(side * 0.34, 0.14, 0.24);
      scap.scale.set(0.55, 1.05, 0.85);
      scap.rotation.z = side * 0.22;
      scap.rotation.x = -0.25;

      const haunch = addPart(scapGeo, 0x00bbff, P.body, 0.55, 0.10);
      haunch.position.set(side * 0.32, 0.08, -0.32);
      haunch.scale.set(0.65, 1.10, 0.95);
      haunch.rotation.x = 0.18;
    });

    // Costillas y columna vertebral visibles en wireframe neon
    P.ribcage = new THREE.Group();
    P.body.add(P.ribcage);
    const ribOffsets = [0.22, 0.12, 0.02, -0.08, -0.18, -0.27];
    ribOffsets.forEach((rz, idx) => {
      const rRadius = 0.45 - Math.abs(idx - 2) * 0.025;
      const ribGeo = new THREE.TorusGeometry(rRadius, 0.009, 10, 40, Math.PI * 1.25);
      const rib = new THREE.Mesh(ribGeo, wMat(0x44ffff, 0.52));
      rib.position.set(0, -0.02, rz);
      rib.rotation.z = -Math.PI * 0.125;
      rib.rotation.x = 0.14;
      P.ribcage.add(rib);
    });
    // Cresta dorsal (espina)
    for (let i = 0; i < 7; i++) {
      const vert = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.024, 0.06, 16),
        wMat(0x88ffff, 0.55)
      );
      vert.position.set(0, 0.53 - Math.abs(i - 3) * 0.015, 0.32 - i * 0.11);
      vert.rotation.x = Math.PI * 0.5;
      P.ribcage.add(vert);
    }

    // Vientre (Belly)
    const bellyGeo = new THREE.SphereGeometry(0.42, 36, 28);
    P.belly = addPart(bellyGeo, 0x33ffee, root, 0.55, 0.10);
    P.belly.position.set(0, -0.13, 0.08);
    P.belly.scale.set(0.88, 0.68, 0.96);

    // Manchas blancas neon características del pudú juvenil
    const spotGeo = new THREE.SphereGeometry(0.068, 16, 12);
    const spotMat = wMat(0xffffff, 0.32);
    [
      [-0.30, 0.18, 0.16], [0.28, 0.22, -0.08], [0.0, 0.36, -0.22],
      [-0.22, 0.06, -0.30], [0.34, 0.08, 0.06], [-0.18, 0.28, -0.04],
      [0.20, 0.16, 0.22]
    ].forEach((pos) => {
      const s = new THREE.Mesh(spotGeo.clone(), spotMat.clone());
      s.position.set(...pos);
      s.scale.set(0.85, 0.55, 0.65);
      P.body.add(s);
    });

    // ── NECK (Cuello estilizado con pelaje) ──
    const neckGeo = new THREE.CylinderGeometry(0.16, 0.24, 0.44, segCyl, 10);
    P.neck = addPart(neckGeo, 0x00ccff, root, 0.78, 0.16);
    P.neck.position.set(0, 0.50, 0.30);
    P.neck.rotation.x = -0.34;
    addFur(neckGeo, 0x00eeff, P.neck, 1.06, 0.20);

    // ── HEAD (Cráneo esculpido + cuencas orbitales reales + hocico) ──
    const headGroup = new THREE.Group();
    root.add(headGroup);
    headGroup.position.set(0, 0.90, 0.56);
    P.head = headGroup;

    const headGeo = new THREE.SphereGeometry(0.38, segW, segH);
    const cranium = addPart(headGeo, 0x00ff88, headGroup, 0.76, 0.16);
    cranium.scale.set(0.96, 0.94, 1.04);
    addFur(headGeo, 0x00dd77, cranium, 1.045, 0.20);
    addFur(headGeo, 0x00aa55, cranium, 1.085, 0.10);

    // Pómulos / arcos cigomáticos para dar volumen real al cráneo
    const cheekBoneGeo = new THREE.SphereGeometry(0.16, 32, 24);
    [-1, 1].forEach((side) => {
      const cb = addPart(cheekBoneGeo, 0x11ff99, headGroup, 0.45, 0.10);
      cb.position.set(side * 0.22, -0.05, 0.18);
      cb.scale.set(0.75, 0.65, 1.05);
    });

    // Hocico (Snout) cónico redondeado de ciervo
    const snoutBridgeGeo = new THREE.CylinderGeometry(0.11, 0.19, 0.34, segCyl, 10);
    const snoutBridge = addPart(snoutBridgeGeo, 0x22ffaa, headGroup, 0.74, 0.16);
    snoutBridge.rotation.x = Math.PI * 0.5;
    snoutBridge.position.set(0, -0.08, 0.34);
    snoutBridge.scale.set(1.05, 1.0, 0.78);

    const snoutTipGeo = new THREE.SphereGeometry(0.125, 36, 28);
    const snoutTip = addPart(snoutTipGeo, 0x33ffbb, headGroup, 0.72, 0.16);
    P.snoutTip = snoutTip;
    snoutTip.position.set(0, -0.085, 0.47);
    snoutTip.scale.set(1.08, 0.78, 0.85);
    addFur(snoutTipGeo, 0x33ffaa, snoutTip, 1.05, 0.16);

    // ── CUENCAS ORBITALES REALES Y OJOS ──
    const eyeX = 0.185;
    const eyeY = 0.095;
    const eyeSocketZ = 0.265;
    const eyeBallZ = 0.282;

    const socketCavGeo = new THREE.SphereGeometry(0.124, 32, 24);
    const socketCavMat = new THREE.MeshPhongMaterial({
      color: 0x020812,
      emissive: 0x001122,
      shininess: 30,
      transparent: true,
      opacity: 0.92
    });
    const socketRimGeo = new THREE.TorusGeometry(0.118, 0.015, 16, 40);

    [-1, 1].forEach((side) => {
      const cav = new THREE.Mesh(socketCavGeo, socketCavMat.clone());
      cav.position.set(side * eyeX, eyeY, eyeSocketZ);
      cav.scale.set(1.02, 0.98, 0.72);
      headGroup.add(cav);

      const rim = addPart(socketRimGeo, 0x00ffaa, headGroup, 0.85, 0.22);
      rim.position.set(side * eyeX, eyeY, eyeSocketZ + 0.045);
      rim.rotation.y = side * 0.26;
      rim.rotation.x = -0.08;
    });

    // Globos oculares hundidos dentro de las cuencas
    const eyeWhiteGeo = new THREE.SphereGeometry(0.105, 36, 28);
    const eyeWhiteMat = new THREE.MeshPhongMaterial({
      color: 0xf4faff,
      emissive: 0x112233,
      emissiveIntensity: 0.35,
      specular: 0xffffff,
      shininess: 100
    });
    P.eyeWhiteL = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    P.eyeWhiteL.position.set(-eyeX, eyeY, eyeBallZ);
    headGroup.add(P.eyeWhiteL);

    P.eyeWhiteR = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat.clone());
    P.eyeWhiteR.position.set(eyeX, eyeY, eyeBallZ);
    headGroup.add(P.eyeWhiteR);

    // Iris (curvado sobre la córnea, con desplazamiento 2D por eyeTargetX/Y)
    const irisGeo = new THREE.SphereGeometry(0.068, 32, 24);
    const irisMat = new THREE.MeshPhongMaterial({
      color: 0x00e5ff,
      emissive: 0x0088aa,
      emissiveIntensity: 0.55,
      shininess: 120
    });
    P.irisL = new THREE.Mesh(irisGeo, irisMat);
    P.irisL.scale.set(1, 1, 0.26);
    P.irisL.position.set(-eyeX, eyeY, eyeBallZ + 0.092);
    headGroup.add(P.irisL);

    P.irisR = new THREE.Mesh(irisGeo, irisMat.clone());
    P.irisR.scale.set(1, 1, 0.26);
    P.irisR.position.set(eyeX, eyeY, eyeBallZ + 0.092);
    headGroup.add(P.irisR);

    // Pupila
    const pupGeo = new THREE.SphereGeometry(0.040, 24, 18);
    const pupMat = new THREE.MeshBasicMaterial({ color: 0x020610 });
    P.pupilL = new THREE.Mesh(pupGeo, pupMat);
    P.pupilL.scale.set(1, 1, 0.20);
    P.pupilL.position.set(-eyeX, eyeY, eyeBallZ + 0.104);
    headGroup.add(P.pupilL);

    P.pupilR = new THREE.Mesh(pupGeo, pupMat.clone());
    P.pupilR.scale.set(1, 1, 0.20);
    P.pupilR.position.set(eyeX, eyeY, eyeBallZ + 0.104);
    headGroup.add(P.pupilR);

    // Brillos especulares húmedos
    const glintGeo = new THREE.SphereGeometry(0.019, 16, 12);
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    P.glintL = new THREE.Mesh(glintGeo, glintMat);
    P.glintL.scale.set(1, 1, 0.25);
    P.glintL.position.set(-eyeX + 0.022, eyeY + 0.022, eyeBallZ + 0.110);
    headGroup.add(P.glintL);

    P.glintR = new THREE.Mesh(glintGeo, glintMat.clone());
    P.glintR.scale.set(1, 1, 0.25);
    P.glintR.position.set(eyeX + 0.022, eyeY + 0.022, eyeBallZ + 0.110);
    headGroup.add(P.glintR);

    const g2Geo = new THREE.SphereGeometry(0.010, 12, 10);
    P.glint2L = new THREE.Mesh(g2Geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    P.glint2L.scale.set(1, 1, 0.25);
    P.glint2L.position.set(-eyeX - 0.018, eyeY - 0.018, eyeBallZ + 0.109);
    headGroup.add(P.glint2L);

    P.glint2R = new THREE.Mesh(g2Geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    P.glint2R.scale.set(1, 1, 0.25);
    P.glint2R.position.set(eyeX - 0.018, eyeY - 0.018, eyeBallZ + 0.109);
    headGroup.add(P.glint2R);

    // Párpados superior e inferior (parpadeo natural)
    const lidGeo = new THREE.SphereGeometry(0.114, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const lidMat = new THREE.MeshPhongMaterial({
      color: 0x00aa66,
      emissive: 0x004422,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide
    });
    P.lidL = new THREE.Mesh(lidGeo, lidMat);
    P.lidL.position.set(-eyeX, eyeY, eyeBallZ);
    P.lidL.scale.set(1, 0.05, 1);
    P.lidL.rotation.x = -0.25;
    headGroup.add(P.lidL);

    P.lidR = new THREE.Mesh(lidGeo, lidMat.clone());
    P.lidR.position.set(eyeX, eyeY, eyeBallZ);
    P.lidR.scale.set(1, 0.05, 1);
    P.lidR.rotation.x = -0.25;
    headGroup.add(P.lidR);

    const lidLowGeo = new THREE.SphereGeometry(0.113, 32, 16, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.52);
    P.lidLowL = new THREE.Mesh(lidLowGeo, lidMat.clone());
    P.lidLowL.position.set(-eyeX, eyeY, eyeBallZ);
    P.lidLowL.scale.set(1, 0.05, 1);
    P.lidLowL.rotation.x = 0.2;
    headGroup.add(P.lidLowL);

    P.lidLowR = new THREE.Mesh(lidLowGeo, lidMat.clone());
    P.lidLowR.position.set(eyeX, eyeY, eyeBallZ);
    P.lidLowR.scale.set(1, 0.05, 1);
    P.lidLowR.rotation.x = 0.2;
    headGroup.add(P.lidLowR);

    // Cejas expresivas
    const browGeo = new THREE.CylinderGeometry(0.009, 0.012, 0.11, 16);
    const browMat = new THREE.MeshPhongMaterial({ color: 0x00ffaa, emissive: 0x006644 });
    P.browL = new THREE.Mesh(browGeo, browMat);
    P.browL.position.set(-eyeX, eyeY + 0.135, eyeBallZ + 0.065);
    P.browL.rotation.z = 0.28;
    headGroup.add(P.browL);

    P.browR = new THREE.Mesh(browGeo, browMat.clone());
    P.browR.position.set(eyeX, eyeY + 0.135, eyeBallZ + 0.065);
    P.browR.rotation.z = -0.28;
    headGroup.add(P.browR);

    // Mejillas sonrojadas
    const cheekGeo = new THREE.SphereGeometry(0.075, 24, 18);
    P.cheekMatL = new THREE.MeshBasicMaterial({ color: 0xff88bb, transparent: true, opacity: 0.55 });
    P.cheekL = new THREE.Mesh(cheekGeo, P.cheekMatL);
    P.cheekL.position.set(-0.25, -0.04, 0.28);
    P.cheekL.scale.set(1.05, 0.58, 0.45);
    headGroup.add(P.cheekL);

    P.cheekMatR = new THREE.MeshBasicMaterial({ color: 0xff88bb, transparent: true, opacity: 0.55 });
    P.cheekR = new THREE.Mesh(cheekGeo, P.cheekMatR);
    P.cheekR.position.set(0.25, -0.04, 0.28);
    P.cheekR.scale.set(1.05, 0.58, 0.45);
    headGroup.add(P.cheekR);

    // Nariz esculpida + brillo
    const noseGeo = new THREE.SphereGeometry(0.045, 32, 24);
    P.nose = new THREE.Mesh(
      noseGeo,
      new THREE.MeshPhongMaterial({ color: 0xff5599, emissive: 0x551133, shininess: 100 })
    );
    P.nose.position.set(0, -0.055, 0.565);
    P.nose.scale.set(1.25, 0.72, 0.82);
    headGroup.add(P.nose);

    const nzHilit = new THREE.Mesh(
      new THREE.SphereGeometry(0.013, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
    );
    nzHilit.position.set(0.015, -0.04, 0.595);
    headGroup.add(nzHilit);

    // Boca (con soporte de morphs simulados vía escala/posición/opacidad)
    P.mouthGroup = new THREE.Group();
    headGroup.add(P.mouthGroup);

    const smMat = new THREE.MeshBasicMaterial({ color: 0xff4488, transparent: true, opacity: 0.85 });
    P.mouthSmile = new THREE.Group();
    const smPts = [[-0.048, -0.125, 0.525], [-0.022, -0.134, 0.535], [0, -0.136, 0.538], [0.022, -0.134, 0.535], [0.048, -0.125, 0.525]];
    smPts.forEach((p) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), smMat.clone());
      m.position.set(...p);
      P.mouthSmile.add(m);
    });
    P.mouthGroup.add(P.mouthSmile);

    P.mouthOpen = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 24, 18),
      new THREE.MeshBasicMaterial({ color: 0x991144, transparent: true, opacity: 0.0 })
    );
    P.mouthOpen.position.set(0, -0.135, 0.52);
    P.mouthOpen.scale.set(1, 0.7, 0.6);
    P.mouthGroup.add(P.mouthOpen);

    P.mouthAngry = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.014, 0.014),
      new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.0 })
    );
    P.mouthAngry.position.set(0, -0.125, 0.53);
    P.mouthGroup.add(P.mouthAngry);

    P.mouthHappy = new THREE.Group();
    const hapPts = [
      [-0.062, -0.12, 0.515], [-0.032, -0.135, 0.532],
      [0, -0.14, 0.538], [0.032, -0.135, 0.532], [0.062, -0.12, 0.515]
    ];
    hapPts.forEach((p) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xff4488, transparent: true, opacity: 0 })
      );
      m.position.set(...p);
      P.mouthHappy.add(m);
    });
    const tongue = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff6688, transparent: true, opacity: 0 })
    );
    tongue.position.set(0.01, -0.15, 0.53);
    tongue.scale.set(1, 0.6, 0.7);
    P.mouthHappy.add(tongue);
    P.mouthGroup.add(P.mouthHappy);

    // ── OREJAS LARGAS Y PUNTIAGUDAS ESCULPIDAS (ConeGeometry + CylinderGeometry) ──
    function makeSculptedEar(side) {
      const earG = new THREE.Group();
      earG.position.set(side * 0.27, 0.27, 0.04);
      earG.rotation.z = side * -0.32;
      earG.rotation.x = 0.12;

      const baseGeo = new THREE.CylinderGeometry(0.068, 0.055, 0.14, 32, 6);
      const base = addPart(baseGeo, 0xffee44, earG, 0.80, 0.18);
      base.position.set(0, 0.07, 0);
      base.scale.set(0.95, 1, 0.45);

      const midGeo = new THREE.CylinderGeometry(0.058, 0.072, 0.17, 32, 6);
      const mid = addPart(midGeo, 0xffee44, earG, 0.82, 0.18);
      mid.position.set(0, 0.21, 0);
      mid.scale.set(0.95, 1, 0.42);
      addFur(midGeo, 0xffdd22, mid, 1.07, 0.22);

      const tipGeo = new THREE.ConeGeometry(0.058, 0.17, 32, 6);
      const tip = addPart(tipGeo, 0xffff66, earG, 0.85, 0.20);
      tip.position.set(0, 0.37, 0);
      tip.scale.set(0.95, 1, 0.40);
      addFur(tipGeo, 0xffee44, tip, 1.08, 0.20);

      // Pabellón interno rosado neon
      const innerMid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.045, 0.16, 24),
        sMat(0xff77bb, 0.42, 0.35)
      );
      innerMid.position.set(0, 0.20, 0.018);
      innerMid.scale.set(0.85, 1, 0.25);
      earG.add(innerMid);

      const innerTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.036, 0.13, 24),
        sMat(0xff77bb, 0.42, 0.35)
      );
      innerTip.position.set(0, 0.33, 0.016);
      innerTip.scale.set(0.85, 1, 0.25);
      earG.add(innerTip);

      return earG;
    }

    P.earL = makeSculptedEar(-1);
    headGroup.add(P.earL);

    P.earR = makeSculptedEar(1);
    headGroup.add(P.earR);

    // ── CUERNITOS (Astas cortas de pudú) ──
    const hornGeo = new THREE.CylinderGeometry(0.011, 0.030, 0.22, 24, 6);
    P.hornL = addPart(hornGeo, 0xffd700, headGroup, 0.88, 0.22);
    P.hornL.position.set(-0.14, 0.36, 0.05);
    P.hornL.rotation.z = 0.20;
    P.hornL.rotation.x = -0.10;

    P.hornR = addPart(hornGeo, 0xffd700, headGroup, 0.88, 0.22);
    P.hornR.position.set(0.14, 0.36, 0.05);
    P.hornR.rotation.z = -0.20;
    P.hornR.rotation.x = -0.10;

    // ── PATAS ARTICULADAS Y PEZUÑAS HENDIDAS ──
    function makeLeg(x, z) {
      const lg = new THREE.Group();
      root.add(lg);
      lg.position.set(x, -0.08, z);

      // Muslo / hombro superior
      const upper = addPart(new THREE.SphereGeometry(0.135, 32, 24), 0xb16bff, lg, 0.78, 0.16);
      upper.position.set(0, -0.12, 0);
      upper.scale.set(0.85, 1.15, 0.95);

      // Segmento medio
      const mid = addPart(new THREE.CylinderGeometry(0.082, 0.062, 0.24, 32, 6), 0x9955ee, lg, 0.80, 0.16);
      mid.position.set(0, -0.32, 0);

      // Caña inferior
      const lower = addPart(new THREE.CylinderGeometry(0.058, 0.048, 0.18, 32, 4), 0x8844dd, lg, 0.82, 0.16);
      lower.position.set(0, -0.49, 0.01);

      // Menudillo (articulación)
      const fetlock = addPart(new THREE.SphereGeometry(0.054, 24, 18), 0xcc88ff, lg, 0.75, 0.18);
      fetlock.position.set(0, -0.57, 0.015);

      // Pezuñas hendidas (dos dedos por pata)
      const hoofGeo = new THREE.CylinderGeometry(0.034, 0.048, 0.085, 24, 4);
      [-0.025, 0.025].forEach((hx) => {
        const hoof = addPart(hoofGeo, 0xffd700, lg, 0.88, 0.24);
        hoof.position.set(hx, -0.63, 0.035);
        hoof.scale.set(0.95, 1, 1.35);
      });
      return lg;
    }

    P.legFL = makeLeg(-0.27, 0.28);
    P.legFR = makeLeg(0.27, 0.28);
    P.legHL = makeLeg(-0.27, -0.30);
    P.legHR = makeLeg(0.27, -0.30);

    // ── COLA ESPONJOSA MULTI-CAPA ──
    const tailGeo = new THREE.SphereGeometry(0.10, 32, 24);
    P.tail = addPart(tailGeo, 0xffeeff, root, 0.80, 0.18);
    P.tail.position.set(0, 0.14, -0.64);
    P.tail.scale.set(0.95, 0.85, 1.15);
    addFur(tailGeo, 0xffccee, P.tail, 1.16, 0.28);
    addFur(tailGeo, 0xff99dd, P.tail, 1.30, 0.16);

    root.position.y = -0.2;
    Object.assign(puduParts, P);
    return root;
  }

  pudu3dModel = buildProceduralPudu();
  pudu3dModel.traverse((o) => { if (o.isMesh) o.renderOrder = 4; });
  puduGroup.add(pudu3dModel);

  /* ══════════════════════════════════════════════════════════════
     ANIMACIÓN FACIAL, EYE-TRACKING TOTAL, MORFOS Y WIREFRAME NEON
     ══════════════════════════════════════════════════════════════ */
  let puduSpeakingActive = false;

  function updateEyes(t) {
    if (!puduParts.pupilL) return;
    const brain = puduBrain;
    const eyeX = 0.185;
    const eyeY = 0.095;
    const eyeBallZ = 0.282;

    // Desplazamiento 2D normalizado dentro de la esclera según cursor
    const nx = THREE.MathUtils.clamp((brain.eyeTargetX || 0) / 50, -1, 1);
    const ny = THREE.MathUtils.clamp(-(brain.eyeTargetY || 0) / 40, -1, 1);
    const tx = nx * 0.036;
    const ty = ny * 0.032;
    const zCurvature = -Math.min(0.012, (tx * tx + ty * ty) * 6.0);

    puduParts.irisL.position.x += ((-eyeX + tx) - puduParts.irisL.position.x) * 0.18;
    puduParts.irisL.position.y += ((eyeY + ty) - puduParts.irisL.position.y) * 0.18;
    puduParts.irisL.position.z = eyeBallZ + 0.092 + zCurvature;

    puduParts.irisR.position.x += ((eyeX + tx) - puduParts.irisR.position.x) * 0.18;
    puduParts.irisR.position.y += ((eyeY + ty) - puduParts.irisR.position.y) * 0.18;
    puduParts.irisR.position.z = eyeBallZ + 0.092 + zCurvature;

    puduParts.pupilL.position.x += ((-eyeX + tx * 1.15) - puduParts.pupilL.position.x) * 0.20;
    puduParts.pupilL.position.y += ((eyeY + ty * 1.15) - puduParts.pupilL.position.y) * 0.20;
    puduParts.pupilL.position.z = eyeBallZ + 0.104 + zCurvature;

    puduParts.pupilR.position.x += ((eyeX + tx * 1.15) - puduParts.pupilR.position.x) * 0.20;
    puduParts.pupilR.position.y += ((eyeY + ty * 1.15) - puduParts.pupilR.position.y) * 0.20;
    puduParts.pupilR.position.z = eyeBallZ + 0.104 + zCurvature;

    if (puduParts.glintL) {
      puduParts.glintL.position.x += ((-eyeX + 0.022 + tx * 0.6) - puduParts.glintL.position.x) * 0.12;
      puduParts.glintL.position.y += ((eyeY + 0.022 + ty * 0.6) - puduParts.glintL.position.y) * 0.12;
    }
    if (puduParts.glintR) {
      puduParts.glintR.position.x += ((eyeX + 0.022 + tx * 0.6) - puduParts.glintR.position.x) * 0.12;
      puduParts.glintR.position.y += ((eyeY + 0.022 + ty * 0.6) - puduParts.glintR.position.y) * 0.12;
    }

    // Parpadeo natural con párpados superior e inferior
    const bs = brain.getBlinkScale();
    const lidClose = 1 - bs;
    const sleepBias = brain.state === 'sleeping' ? 0.85 : 0;
    const upperScale = Math.max(0.04, Math.min(1, lidClose * 0.92 + sleepBias));
    const lowerScale = Math.max(0.04, Math.min(1, lidClose * 0.72 + sleepBias * 0.6));

    puduParts.lidL.scale.y += (upperScale - puduParts.lidL.scale.y) * 0.35;
    puduParts.lidR.scale.y += (upperScale - puduParts.lidR.scale.y) * 0.35;
    if (puduParts.lidLowL) puduParts.lidLowL.scale.y += (lowerScale - puduParts.lidLowL.scale.y) * 0.35;
    if (puduParts.lidLowR) puduParts.lidLowR.scale.y += (lowerScale - puduParts.lidLowR.scale.y) * 0.35;

    // Dilatación pupilar y morfos de cejas según emoción
    const pupScale = brain.arousal > 0.6 ? 1.18 : (brain.stress > 0.5 ? 0.72 : 1.0);
    puduParts.pupilL.scale.set(pupScale, pupScale, 0.20 * pupScale);
    puduParts.pupilR.scale.set(pupScale, pupScale, 0.20 * pupScale);

    let browTargetY = eyeY + 0.135;
    let browTargetRZ = 0.28;
    if (brain.angerLevel > 0.4) {
      browTargetY = eyeY + 0.115;
      browTargetRZ = -0.35;
    } else if (brain.stress > 0.5 || brain.state === 'scared') {
      browTargetY = eyeY + 0.155;
      browTargetRZ = 0.45;
    } else if (brain.pleasure > 0.7 || brain.state === 'happy') {
      browTargetY = eyeY + 0.148;
      browTargetRZ = 0.20;
    }
    puduParts.browL.position.y += (browTargetY - puduParts.browL.position.y) * 0.12;
    puduParts.browR.position.y += (browTargetY - puduParts.browR.position.y) * 0.12;
    puduParts.browL.rotation.z += (browTargetRZ - puduParts.browL.rotation.z) * 0.12;
    puduParts.browR.rotation.z += (-browTargetRZ - puduParts.browR.rotation.z) * 0.12;

    if (brain.pleasure > 0.7) {
      puduParts.irisL.material.color.setHex(0x00ffaa);
      puduParts.irisR.material.color.setHex(0x00ffaa);
    } else if (brain.angerLevel > 0.4) {
      puduParts.irisL.material.color.setHex(0xff4444);
      puduParts.irisR.material.color.setHex(0xff4444);
    } else {
      puduParts.irisL.material.color.setHex(0x00e5ff);
      puduParts.irisR.material.color.setHex(0x00e5ff);
    }
  }

  function stepSpring(val, vel, target, stiffness, damping, dt) {
    const force = (target - val) * stiffness;
    vel += (force - vel * damping) * dt;
    val += vel * dt;
    return [val, vel];
  }

  function updateMouth(t, dt = 0.016) {
    if (!puduParts.mouthSmile) return;
    const safeDt = Math.min(dt || 0.016, 0.05);
    let shape = puduBrain.mouthShape;

    // 1. Determinar visema objetivo (habla activa vs estado emocional)
    let targetV = VISEME_TABLE.REST;
    let isTalking = puduSpeakingActive && puduLipSync.active;

    if (isTalking) {
      const elapsed = performance.now() * 0.001 - puduLipSync.startTime;
      const tl = puduLipSync.timeline;
      let seg = tl[tl.length - 1];
      for (let i = 0; i < tl.length; i++) {
        if (elapsed >= tl[i].t0 && elapsed < tl[i].t1) {
          seg = tl[i];
          break;
        }
      }
      if (elapsed >= (tl[tl.length - 1]?.t1 ?? 0) + 0.25) {
        isTalking = false;
      } else if (seg) {
        targetV = VISEME_TABLE[seg.viseme] || VISEME_TABLE.REST;
        // Micro-asentimiento dulce de cabeza en sílabas acentuadas
        puduLipSync.headBob += ((seg.stress * 0.045) - puduLipSync.headBob) * 0.22;
      }
    } else {
      puduLipSync.headBob *= 0.88;
      if (shape === 'yawn') {
        const yw = 0.5 + 0.5 * Math.sin(t * 2.4);
        targetV = { open: 0.65 + yw * 0.35, width: 1.12, depth: 0.78, tongue: 0.25, snoutZ: 0.01, snoutY: -0.006 };
      } else if (shape === 'eating') {
        const chew = Math.abs(Math.sin(t * 10.5));
        targetV = { open: chew * 0.62, width: 1.05 - chew * 0.12, depth: 0.72, tongue: chew * 0.55, snoutZ: chew * 0.012, snoutY: -chew * 0.004 };
      } else if (shape === 'open') {
        targetV = VISEME_TABLE.A;
      }
    }

    // 2. Integración física elástica (resorte sub-amortiguado para organicidad)
    const k = isTalking ? 260 : 140;
    const d = isTalking ? 21 : 16;
    [puduLipSync.open, puduLipSync.vOpen]     = stepSpring(puduLipSync.open,   puduLipSync.vOpen,   targetV.open,   k, d, safeDt);
    [puduLipSync.width, puduLipSync.vWidth]   = stepSpring(puduLipSync.width,  puduLipSync.vWidth,  targetV.width,  k, d, safeDt);
    [puduLipSync.depth, puduLipSync.vDepth]   = stepSpring(puduLipSync.depth,  puduLipSync.vDepth,  targetV.depth,  k, d, safeDt);
    [puduLipSync.tongue, puduLipSync.vTongue] = stepSpring(puduLipSync.tongue, puduLipSync.vTongue, targetV.tongue, k, d, safeDt);
    [puduLipSync.snoutZ, puduLipSync.vSnoutZ] = stepSpring(puduLipSync.snoutZ, puduLipSync.vSnoutZ, targetV.snoutZ, k, d, safeDt);
    [puduLipSync.snoutY, puduLipSync.vSnoutY] = stepSpring(puduLipSync.snoutY, puduLipSync.vSnoutY, targetV.snoutY, k, d, safeDt);

    const openAmt = Math.max(0, Math.min(1.2, puduLipSync.open));

    // 3. Opacidades cruzadas según apertura real y emoción
    const targets = { smile: 0, open: 0, angry: 0, happy: 0 };
    if (isTalking || shape === 'yawn' || shape === 'open') {
      targets.open = Math.min(0.92, openAmt * 1.05);
      targets.smile = Math.max(0, 0.85 - openAmt * 1.15);
      targets.happy = Math.max(0, (puduLipSync.tongue - 0.15) * 0.9);
    } else if (shape === 'angry') {
      targets.angry = 0.85;
    } else if (shape === 'happy' || shape === 'eating') {
      targets.happy = 0.85;
    } else if (shape === 'worried') {
      targets.smile = 0.45;
    } else if (shape === 'sleepy') {
      targets.smile = 0.35;
    } else {
      targets.smile = 0.85;
    }

    puduParts.mouthSmile.children.forEach((c) => {
      if (c.material) c.material.opacity += (targets.smile - c.material.opacity) * 0.22;
    });
    puduParts.mouthOpen.material.opacity += (targets.open - puduParts.mouthOpen.material.opacity) * 0.25;
    puduParts.mouthAngry.material.opacity += (targets.angry - puduParts.mouthAngry.material.opacity) * 0.16;

    // En mouthHappy, el último hijo es la lengua (tongue)
    const happyKids = puduParts.mouthHappy.children;
    happyKids.forEach((c, idx) => {
      const isTongue = idx === happyKids.length - 1;
      const targetOp = isTongue ? Math.max(targets.happy, puduLipSync.tongue * 0.9) : targets.happy;
      if (c.material) c.material.opacity += (targetOp - c.material.opacity) * 0.22;
      if (isTongue) {
        c.position.y = -0.146 - openAmt * 0.014;
        c.position.z = 0.526 + puduLipSync.tongue * 0.016;
        c.scale.set(
          0.95 + puduLipSync.tongue * 0.15,
          0.52 + puduLipSync.tongue * 0.28,
          0.68 + puduLipSync.tongue * 0.25
        );
      }
    });

    // 4. Transformación 3D de la boca (apertura Y, redondeo X, profundidad Z)
    puduParts.mouthOpen.scale.set(
      0.85 * puduLipSync.width,
      0.22 + openAmt * 0.78,
      puduLipSync.depth
    );
    puduParts.mouthOpen.position.y = -0.132 - openAmt * 0.012;
    puduParts.mouthOpen.position.z = 0.518 + puduLipSync.snoutZ * 0.7;

    const smileScaleX = shape === 'worried'
      ? 0.78
      : (isTalking ? puduLipSync.width : (1.0 + Math.sin(t * 2.2) * 0.04));
    puduParts.mouthSmile.scale.x += (smileScaleX - puduParts.mouthSmile.scale.x) * 0.2;
    puduParts.mouthSmile.scale.y += ((shape === 'worried' ? -0.8 : 1.0) - puduParts.mouthSmile.scale.y) * 0.15;
    puduParts.mouthSmile.position.z = puduLipSync.snoutZ * 0.6;

    puduParts.mouthHappy.scale.set(
      0.92 + (puduLipSync.width - 1) * 0.45,
      0.88 + openAmt * 0.32,
      1.0 + (puduLipSync.depth - 0.6) * 0.35
    );

    // 5. Co-articulación orgánica de hocico (snoutTip), nariz y cabeza (head)
    if (puduParts.snoutTip) {
      puduParts.snoutTip.position.z = 0.47 + puduLipSync.snoutZ;
      puduParts.snoutTip.position.y = -0.085 + puduLipSync.snoutY;
      puduParts.snoutTip.scale.set(
        1.08 + (puduLipSync.width - 1) * 0.08,
        0.78 - openAmt * 0.05,
        0.85 + puduLipSync.snoutZ * 2.2
      );
    }

    if (puduParts.nose) {
      const sniff = Math.sin(t * 4.5) * 0.004 + (Math.sin(t * 13) > 0.92 ? 0.005 : 0);
      puduParts.nose.position.y = -0.055 + sniff + puduLipSync.snoutY * 0.8;
      puduParts.nose.position.z = 0.565 + puduLipSync.snoutZ * 0.9; // acompaña protrusión del hocico
      puduParts.nose.scale.x = 1.25 + Math.sin(t * 3.8) * 0.04;
    }

    if (puduParts.head && isTalking) {
      puduParts.head.rotation.x += (puduLipSync.headBob * 0.65 - puduParts.head.rotation.x) * 0.12;
    }
  }

  function updateEars(t) {
    if (!puduParts.earL) return;
    const mode = puduBrain.earMode;
    let targetLZ = 0.32, targetRZ = -0.32;
    let targetLX = 0.12, targetRX = 0.12;

    if (mode === 'alert') {
      targetLZ = 0.14; targetRZ = -0.14;
      targetLX = 0.24; targetRX = 0.24;
    } else if (mode === 'flat') {
      targetLZ = 0.68; targetRZ = -0.68;
      targetLX = -0.18; targetRX = -0.18;
    }

    // Movimientos independientes y micro-twitches orgánicos por oreja
    const twitchL = Math.sin(t * 1.7) * 0.07 + (Math.sin(t * 7.3) > 0.96 ? 0.16 : 0);
    const twitchR = Math.cos(t * 1.43) * 0.07 + (Math.cos(t * 6.7) > 0.96 ? -0.16 : 0);
    const wiggle = mode === 'wiggle' ? Math.sin(t * 7) * 0.16 : 0;

    puduParts.earL.rotation.z += (targetLZ + twitchL + wiggle - puduParts.earL.rotation.z) * 0.10;
    puduParts.earR.rotation.z += (targetRZ + twitchR - wiggle - puduParts.earR.rotation.z) * 0.10;
    puduParts.earL.rotation.x += (targetLX + Math.sin(t * 1.2) * 0.05 - puduParts.earL.rotation.x) * 0.08;
    puduParts.earR.rotation.x += (targetRX + Math.cos(t * 1.05) * 0.05 - puduParts.earR.rotation.x) * 0.08;
    puduParts.earL.rotation.y += (Math.sin(t * 0.9) * 0.08 - puduParts.earL.rotation.y) * 0.08;
    puduParts.earR.rotation.y += (Math.cos(t * 0.85) * 0.08 - puduParts.earR.rotation.y) * 0.08;
  }

  function updateCheeks() {
    if (!puduParts.cheekMatL) return;
    const target = puduBrain.cheekBlush;
    puduParts.cheekMatL.opacity += (target - puduParts.cheekMatL.opacity) * 0.06;
    puduParts.cheekMatR.opacity += (target - puduParts.cheekMatR.opacity) * 0.06;
    const blushScale = 1.0 + Math.max(0, target - 0.55) * 0.35;
    if (puduParts.cheekL) puduParts.cheekL.scale.set(1.05 * blushScale, 0.58 * blushScale, 0.45);
    if (puduParts.cheekR) puduParts.cheekR.scale.set(1.05 * blushScale, 0.58 * blushScale, 0.45);
  }

  function updateBreathing(t) {
    if (!puduParts.belly || !pudu3dModel) return;
    puduBrain.breathPhase += 0.032;
    const rate = puduBrain.state === 'sleeping' ? 0.8 : (puduBrain.arousal > 0.6 ? 2.4 : 1.45);
    const amp = puduBrain.state === 'sleeping' ? 0.055 : 0.032;
    const breathSin = Math.sin(puduBrain.breathPhase * rate);
    const b = 1 + breathSin * amp;

    puduParts.belly.scale.y = 0.68 * b;
    puduParts.belly.scale.x = 0.88 * (1 + breathSin * amp * 0.6);

    if (puduParts.chest) {
      puduParts.chest.scale.x = 0.90 * (1 + breathSin * amp * 0.85);
      puduParts.chest.scale.y = 0.88 * (1 + breathSin * amp * 0.75);
    }
    if (puduParts.ribcage) {
      puduParts.ribcage.scale.x = 1 + breathSin * amp * 1.15;
      puduParts.ribcage.scale.y = 1 + breathSin * amp * 0.95;
    }
    pudu3dModel.scale.y = 0.985 + breathSin * 0.018;
  }

  const NEON_COLORS = [0x00e5ff, 0xff00ff, 0x00ff88, 0xffff00, 0xff6600, 0x8800ff, 0xff0088];

  function updateNeonPulse(model, time) {
    if (!model) return;
    model.traverse((c) => {
      if (!c.isMesh || c.userData.isFur) return;
      if (c.material && c.material.wireframe) {
        const pulse = 0.5 + 0.4 * Math.sin(time * 6 + c.id * 0.7);
        c.material.opacity = Math.max(0.3, pulse * 0.85);
      } else if (c.material && c.material.transparent && !c.material.wireframe) {
        c.material.opacity = 0.10 + 0.06 * Math.abs(Math.sin(time * 1.2 + c.id));
      }
      if (c.material && c.material.wireframe && Math.random() < 0.002) {
        const gc = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
        const orig = c.material.color.getHex();
        c.material.color.setHex(gc);
        setTimeout(() => { if (c.material) c.material.color.setHex(orig); }, 50);
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     LOCOMOCIÓN, MICRO-SWAYING ORGÁNICO Y MÁQUINA DE ESTADOS
     ══════════════════════════════════════════════════════════════ */
  function animatePuduByState(t, dt) {
    if (!pudu3dModel || !puduParts.head) return;
    const brain = puduBrain;
    const P = puduParts;
    const n2 = noise2D;

    let legFreq = 1.5, legAmp = 0.05;
    if (brain.state === 'walking' || brain.state === 'following' || brain.state === 'chasing_butterfly') { legFreq = 6; legAmp = 0.32; }
    if (brain.state === 'happy' || brain.state === 'playing') { legFreq = 7; legAmp = 0.25; }
    if (brain.state === 'scared') { legFreq = 9; legAmp = 0.4; }
    if (brain.state === 'sleeping') { legFreq = 0.5; legAmp = 0.015; }

    if (P.legFL) P.legFL.rotation.x = Math.sin(t * legFreq) * legAmp;
    if (P.legFR) P.legFR.rotation.x = -Math.sin(t * legFreq) * legAmp;
    if (P.legHL) P.legHL.rotation.x = -Math.sin(t * legFreq + Math.PI * 0.5) * legAmp;
    if (P.legHR) P.legHR.rotation.x = Math.sin(t * legFreq + Math.PI * 0.5) * legAmp;

    // Cola esponjosa que menea de forma orgánica
    const tailSpeed = brain.tailWag > 0.3 ? 9 : 3.2;
    const tailAmp = 0.16 + brain.tailWag * 0.55;
    if (P.tail) {
      P.tail.rotation.z = Math.sin(t * tailSpeed) * tailAmp;
      P.tail.rotation.y = Math.cos(t * tailSpeed * 0.7) * (tailAmp * 0.5);
    }

    // Micro-swaying orgánico de cabeza + Eye-Tracking Total hacia el usuario
    const headBob = brain.state === 'walking' ? Math.abs(Math.sin(t * legFreq)) * 0.04 : Math.sin(t * 1.3) * 0.012;
    P.head.position.y = 0.90 + headBob;

    if (brain.state !== 'sleeping') {
      const targetNormX = THREE.MathUtils.clamp((brain.eyeTargetX || 0) / 50, -1, 1);
      const targetNormY = THREE.MathUtils.clamp((brain.eyeTargetY || 0) / 40, -1, 1);
      const swayY = n2(t * 0.45, 0) * 0.055;
      const swayX = n2(t * 0.35, 5) * 0.032;
      const swayZ = n2(t * 0.28, 12) * 0.045;

      const desiredRotY = targetNormX * 0.38 + swayY;
      const desiredRotX = targetNormY * 0.22 + swayX;

      P.head.rotation.y += (desiredRotY - P.head.rotation.y) * 0.10;
      P.head.rotation.x += (desiredRotX - P.head.rotation.x) * 0.09;
      if (brain.state !== 'curious' && brain.state !== 'scratching') {
        P.head.rotation.z += (swayZ - P.head.rotation.z) * 0.06;
      }
    }

    if (brain.state === 'walking' || brain.state === 'following' || brain.state === 'chasing_butterfly') {
      brain.facingDir = brain.targetX > pudu3dModel.position.x ? 1 : -1;
    }

    let targetBodyRotY = 0;
    if (brain.state === 'walking' || brain.state === 'following' || brain.state === 'chasing_butterfly') {
      targetBodyRotY = brain.facingDir * 0.22;
    }
    if (brain.state !== 'playing' && !puduIsDragging) {
      pudu3dModel.rotation.y += (targetBodyRotY - pudu3dModel.rotation.y) * 0.06;
    }

    switch (brain.state) {
      case 'idle':
        pudu3dModel.rotation.z = n2(t * 0.4, 10) * 0.025;
        break;

      case 'walking': {
        const dx = brain.targetX - pudu3dModel.position.x;
        if (Math.abs(dx) > 0.05) {
          pudu3dModel.position.x += Math.sign(dx) * brain.walkSpeed * dt;
          pudu3dModel.position.y = pudu3dModel._baseY + Math.abs(Math.sin(t * legFreq)) * 0.03;
          pudu3dModel.rotation.z = Math.sin(t * legFreq) * 0.02;
        } else {
          brain.state = 'idle';
          brain.stateTime = 0;
          brain.stateJustChanged = true;
        }
        break;
      }

      case 'eating':
        P.head.position.y = 0.90 + headBob - Math.sin(brain.stateTime * 2) * 0.15;
        P.head.rotation.x = 0.3 + Math.sin(brain.stateTime * 3) * 0.1;
        brain.mouthShape = 'eating';
        if (brain.stateTime > 4) { brain.hunger = Math.max(0, brain.hunger - 0.3); brain.mouthShape = 'happy'; }
        break;

      case 'sleeping': {
        const lieProgress = Math.min(1, brain.stateTime * 0.5);
        pudu3dModel.rotation.z = lieProgress * 0.4;
        pudu3dModel.position.y = pudu3dModel._baseY - lieProgress * 0.15;
        P.head.position.y = 0.90 - lieProgress * 0.25;
        P.head.rotation.x = lieProgress * 0.2;
        brain.blinkTimer = Math.min(brain.blinkTimer, 1.5);
        break;
      }

      case 'sitting':
        if (P.legHL) P.legHL.scale.y = 0.6;
        if (P.legHR) P.legHR.scale.y = 0.6;
        pudu3dModel.position.y = pudu3dModel._baseY - 0.08;
        break;

      case 'following': {
        const fx = (brain.cursorScreenX / window.innerWidth) * 6 - 3;
        brain.targetX = THREE.MathUtils.clamp(fx, -2.4, 2.4);
        const dx2 = brain.targetX - pudu3dModel.position.x;
        if (Math.abs(dx2) > 0.1) {
          pudu3dModel.position.x += Math.sign(dx2) * 0.6 * dt;
          pudu3dModel.position.y = pudu3dModel._baseY + Math.abs(Math.sin(t * 6)) * 0.03;
        }
        break;
      }

      case 'happy':
        pudu3dModel.position.y = pudu3dModel._baseY + Math.abs(Math.sin(t * 5)) * 0.15;
        pudu3dModel.rotation.z = Math.sin(t * 4) * 0.08;
        brain.tailWag = Math.min(1, brain.tailWag + dt * 0.5);
        brain.cheekBlush = 0.85;
        break;

      case 'scared':
        pudu3dModel.position.x += Math.sin(t * 25) * 0.008;
        pudu3dModel.position.y = pudu3dModel._baseY + Math.sin(t * 20) * 0.005;
        P.head.rotation.y = Math.sin(t * 15) * 0.05;
        brain.mouthShape = 'open';
        brain.earMode = 'flat';
        break;

      case 'curious':
        P.head.rotation.z = Math.sin(brain.stateTime * 0.8) * 0.25;
        brain.earMode = 'alert';
        break;

      case 'sneezing': {
        const sp = brain.stateTime;
        if (sp < 0.8) { P.head.rotation.x = -sp * 0.4; }
        else if (sp < 1.0) { P.head.rotation.x = 0.5; brain.mouthShape = 'open'; }
        else { P.head.rotation.x *= 0.85; }
        break;
      }

      case 'yawning': {
        const yp = brain.stateTime;
        if (yp < 1.2) { brain.mouthShape = 'yawn'; P.head.rotation.x = -yp * 0.15; }
        else { brain.mouthShape = 'sleepy'; P.head.rotation.x *= 0.9; }
        break;
      }

      case 'scratching':
        if (P.legHR) {
          P.legHR.rotation.x = -0.8 + Math.sin(t * 8) * 0.4;
          P.legHR.rotation.z = -0.4;
        }
        P.head.rotation.z = 0.2;
        break;

      case 'chasing_butterfly': {
        if (brain.bflyActive) {
          brain.bflyPhase += dt;
          brain.bflyX += Math.sin(brain.bflyPhase * 1.5) * dt * 1.5;
          brain.bflyY = 1.2 + Math.sin(brain.bflyPhase * 2.3) * 0.6;
          brain.targetX = THREE.MathUtils.clamp(brain.bflyX, -2.4, 2.4);
          const dxb = brain.targetX - pudu3dModel.position.x;
          if (Math.abs(dxb) > 0.1) {
            pudu3dModel.position.x += Math.sign(dxb) * 1.1 * dt;
            pudu3dModel.position.y = pudu3dModel._baseY + Math.abs(Math.sin(t * 8)) * 0.08;
          }
          P.head.rotation.x = -0.3;
          brain.earMode = 'alert';
          if (brain.stateTime > 5) { brain.bflyActive = false; }
        }
        break;
      }

      case 'playing':
        pudu3dModel.position.y = pudu3dModel._baseY + Math.abs(Math.sin(t * 4)) * 0.12;
        pudu3dModel.rotation.y += dt * 1.5;
        brain.tailWag = 0.8;
        break;

      case 'angry_leaving':
        if (brain.stateTime < 1) {
          if (P.legFL) P.legFL.rotation.x = Math.sin(brain.stateTime * 12) * 0.5;
          P.head.rotation.y = Math.sin(brain.stateTime * 8) * 0.15;
          brain.mouthShape = 'angry';
          brain.earMode = 'flat';
        } else {
          const runDir = pudu3dModel.position.x > 0 ? 1 : -1;
          pudu3dModel.position.x += runDir * 3 * dt;
          pudu3dModel.position.y = pudu3dModel._baseY + Math.abs(Math.sin(t * 10)) * 0.12;
          if (Math.abs(pudu3dModel.position.x) > 4) {
            brain.state = 'idle';
            brain.stateTime = 0;
            pudu3dModel.position.x = 0;
          }
        }
        break;
    }

    if (brain.state !== 'sitting') {
      if (P.legHL) P.legHL.scale.y += (1 - P.legHL.scale.y) * 0.1;
      if (P.legHR) P.legHR.scale.y += (1 - P.legHR.scale.y) * 0.1;
    }
    if (brain.state !== 'scratching' && P.legHR) {
      P.legHR.rotation.z += (0 - P.legHR.rotation.z) * 0.1;
    }
    if (brain.state !== 'sleeping') {
      pudu3dModel.rotation.z += (0 - pudu3dModel.rotation.z) * 0.05;
    }
  }

  /* ══════════════════════════════════════════════════════════════
     PARTÍCULAS EMOCIONALES 3D Y MARIPOSA PROCEDURAL
     ══════════════════════════════════════════════════════════════ */
  const emotionParticles = [];

  function spawnEmotionParticle(type) {
    if (!puduGroup || !pudu3dModel) return;
    const pos = pudu3dModel.position.clone();
    pos.y += 1.2;
    let geo, mat, count = 1;
    switch (type) {
      case 'heart':
        geo = new THREE.SphereGeometry(0.08, 5, 5);
        mat = new THREE.MeshBasicMaterial({ color: 0xff4488, transparent: true, opacity: 0.9 });
        count = 3;
        break;
      case 'zzz':
        geo = new THREE.BoxGeometry(0.15, 0.08, 0.02);
        mat = new THREE.MeshBasicMaterial({ color: 0x8888ff, transparent: true, opacity: 0.8 });
        count = 2;
        break;
      case 'star':
        geo = new THREE.OctahedronGeometry(0.07, 0);
        mat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.9 });
        count = 4;
        break;
      case 'exclaim':
        geo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4);
        mat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.9 });
        count = 2;
        break;
      case 'sweat':
        geo = new THREE.SphereGeometry(0.05, 5, 5);
        mat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.7 });
        count = 2;
        break;
      case 'angry':
        geo = new THREE.TetrahedronGeometry(0.1, 0);
        mat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.9 });
        count = 3;
        break;
      default:
        geo = new THREE.SphereGeometry(0.06, 5, 5);
        mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    }
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo.clone(), mat.clone());
      m.position.set(pos.x + (Math.random() - 0.5) * 0.6, pos.y + Math.random() * 0.3, pos.z + (Math.random() - 0.5) * 0.3);
      m.userData = { life: 1, decay: 0.02 + Math.random() * 0.015, vy: 0.02 + Math.random() * 0.015, vx: (Math.random() - 0.5) * 0.012 };
      puduGroup.add(m);
      emotionParticles.push(m);
    }
  }

  function updateEmotionParticles() {
    for (let i = emotionParticles.length - 1; i >= 0; i--) {
      const p = emotionParticles[i];
      p.userData.life -= p.userData.decay;
      p.material.opacity = Math.max(0, p.userData.life) * 0.9;
      p.position.y += p.userData.vy;
      p.position.x += p.userData.vx;
      p.rotation.y += 0.05;
      if (p.userData.life <= 0) {
        puduGroup.remove(p);
        emotionParticles.splice(i, 1);
      }
    }
  }

  let emotionParticleTimer = 0;
  function maybeSpawnEmotions(dt) {
    emotionParticleTimer += dt;
    if (emotionParticleTimer < 0.85) return;
    emotionParticleTimer = 0;
    const brain = puduBrain;
    if (brain.isPetting || brain.pleasure > 0.75) spawnEmotionParticle('heart');
    if (brain.state === 'sleeping') spawnEmotionParticle('zzz');
    if (brain.state === 'happy' || brain.state === 'playing') spawnEmotionParticle('star');
    if (brain.state === 'scared') spawnEmotionParticle('exclaim');
    if (brain.stress > 0.5) spawnEmotionParticle('sweat');
    if (brain.angerLevel > 0.5) spawnEmotionParticle('angry');
  }

  let butterflyMesh = null;
  function getButterfly() {
    if (butterflyMesh) return butterflyMesh;
    const g = new THREE.Group();
    const wingGeo = new THREE.CircleGeometry(0.12, 6);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xff88ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    const wL = new THREE.Mesh(wingGeo, wingMat);
    wL.position.x = -0.08;
    wL.rotation.y = 0.3;
    g.add(wL);
    const wR = new THREE.Mesh(wingGeo, wingMat.clone());
    wR.position.x = 0.08;
    wR.rotation.y = -0.3;
    g.add(wR);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.15, 4), new THREE.MeshBasicMaterial({ color: 0x444444 })));
    g._wingL = wL;
    g._wingR = wR;
    butterflyMesh = g;
    return g;
  }

  function updateButterfly(t) {
    const brain = puduBrain;
    if (brain.state === 'chasing_butterfly' && brain.bflyActive) {
      const bf = getButterfly();
      if (!bf.parent) puduGroup.add(bf);
      bf.position.set(brain.bflyX, brain.bflyY, 0.5);
      bf._wingL.rotation.y = 0.3 + Math.sin(t * 12) * 0.5;
      bf._wingR.rotation.y = -0.3 - Math.sin(t * 12) * 0.5;
      bf.visible = true;
    } else if (butterflyMesh) {
      butterflyMesh.visible = false;
    }
  }

  /* ══════════════════════════════════════════════════════════════
     FÍSICA (PUSH / THROW), CARICIAS (PETTING) E INTERACCIÓN
     ══════════════════════════════════════════════════════════════ */
  let puduPhysVx = 0, puduPhysVy = 0, puduPhysVz = 0;
  let puduBeingPushed = false, puduReturnHome = false;
  let puduHomeX = 0, puduHomeY = -0.2, puduHomeZ = 0;
  let puduScale = 145;

  const puduRaycaster = new THREE.Raycaster();

  function isTouchingPudu(cx, cy) {
    if (!puduGroup || !pudu3dModel || !camera) return false;
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((cx - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((cy - rect.top) / rect.height) * 2 + 1;
    puduRaycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);

    const wp = new THREE.Vector3();
    pudu3dModel.getWorldPosition(wp);
    wp.y += 0.45 * puduScale;
    return puduRaycaster.ray.distanceToPoint(wp) < (1.35 * puduScale);
  }

  function updateCursorTracking(cx, cy) {
    puduBrain.cursorScreenX = cx;
    puduBrain.cursorScreenY = cy;
    puduBrain.lastCursorMove = Date.now();
    puduBrain.eyeTargetX = (cx / window.innerWidth - 0.5) * 100;
    puduBrain.eyeTargetY = (cy / window.innerHeight - 0.5) * 80;

    const dx = cx - (puduBrain._lastCX || cx);
    const dy = cy - (puduBrain._lastCY || cy);
    puduBrain.cursorSpeed = Math.hypot(dx, dy) / Math.max(1, window.innerWidth);
    puduBrain._lastCX = cx;
    puduBrain._lastCY = cy;
  }

  function applyPush(cx, cy, velScale = 1.0) {
    if (!pudu3dModel) return;
    puduPhysVx = (Math.random() - 0.5) * 0.12 * velScale;
    puduPhysVy = (0.16 + Math.random() * 0.12) * velScale;
    puduPhysVz = (Math.random() - 0.5) * 0.08;
    puduHomeX = 0;
    puduHomeY = pudu3dModel._baseY || -0.2;
    puduBeingPushed = true;
    puduReturnHome = false;
    pudu3dModel.rotation.y += (Math.random() - 0.5) * 1.6; // Giro responsivo al click
    pudu3dModel.rotation.z = (Math.random() - 0.5) * 0.4;

    const touchType = velScale > 1.2 ? 'rough' : 'neutral';
    puduBrain.registerTouch(touchType);
    if (touchType === 'rough') {
      puduBrain.state = 'scared';
      puduBrain.stateTime = 0;
      spawnEmotionParticle('exclaim');
    } else {
      spawnEmotionParticle('star');
    }
    playPuduMeow(touchType === 'rough' ? 0.6 : 0.9 + Math.random() * 0.3, touchType === 'rough' ? 'normal' : 'chirp');
  }

  function applyDragThrow(dx, dy, duration) {
    if (!pudu3dModel) return;
    const speed = Math.hypot(dx, dy);
    if (speed < 4) return;
    puduPhysVx = (dx / puduScale) * 0.8;
    puduPhysVy = (-dy / puduScale) * 0.8 + 0.05;
    puduPhysVz = (Math.random() - 0.5) * 0.1;
    puduHomeX = 0;
    puduHomeY = pudu3dModel._baseY || -0.2;
    puduBeingPushed = true;
    puduReturnHome = false;
    pudu3dModel.rotation.y += (Math.random() - 0.5) * 1.6; // Giro responsivo al click
    pudu3dModel.rotation.z = (Math.random() - 0.5) * 0.4;

    const force = speed / Math.max(1, duration) * 10;
    const touchType = force > 3 ? 'aggressive' : (force > 1.2 ? 'rough' : 'neutral');
    puduBrain.registerTouch(touchType);
    if (touchType === 'aggressive') {
      puduBrain.state = 'angry_leaving';
      puduBrain.stateTime = 0;
      spawnEmotionParticle('angry');
    } else if (touchType === 'rough') {
      puduBrain.state = 'scared';
      puduBrain.stateTime = 0;
      spawnEmotionParticle('exclaim');
    }
    playPuduMeow(force > 2 ? 0.5 : 0.8, 'chirp');
  }

  let puduIsDragging = false;
  let puduLastPX = null, puduLastPY = null;
  let puduDragStart = null, puduDownTime = 0;

  function onPointerDown(cx, cy) {
    unlockAudio();
    if (!isTouchingPudu(cx, cy)) return false;
    puduIsDragging = true;
    puduLastPX = cx;
    puduLastPY = cy;
    puduDragStart = { x: cx, y: cy };
    puduDownTime = Date.now();
    puduBeingPushed = false;
    puduReturnHome = false;
    canvas.style.cursor = 'grabbing';
    document.body.style.cursor = 'grabbing';
    return true;
  }

  function onPointerMove(cx, cy) {
    updateCursorTracking(cx, cy);

    if (puduIsDragging && isTouchingPudu(cx, cy)) {
      puduBrain.addPetSample(cx, cy);
      if (puduBrain.isPetting) {
        spawnEmotionParticle('heart');
        if (Math.random() < 0.08) {
          playPuduMeow(1.1 + Math.random() * 0.2, 'chirp');
        }
      }
    }

    if (!puduIsDragging) {
      if (isTouchingPudu(cx, cy)) {
        canvas.style.cursor = 'grab';
        document.body.style.cursor = 'grab';
      } else {
        canvas.style.cursor = '';
        if (document.body.style.cursor === 'grab') document.body.style.cursor = '';
      }
      return;
    }

    if (pudu3dModel) {
      const dx = (cx - puduLastPX) / puduScale;
      const dy = -(cy - puduLastPY) / puduScale;
      pudu3dModel.position.x += dx;
      pudu3dModel.position.y += dy;
      puduPhysVx = dx * 0.8;
      puduPhysVy = dy * 0.8;
      pudu3dModel.rotation.z = dx * 1.8;
      pudu3dModel.rotation.y += dx * 2.4; // Giro libre al arrastrar
    }
    puduLastPX = cx;
    puduLastPY = cy;
  }

  function onPointerUp(cx, cy) {
    if (!puduIsDragging) return;
    puduIsDragging = false;
    canvas.style.cursor = '';
    document.body.style.cursor = '';
    const elapsed = Date.now() - puduDownTime;
    const dx = cx - ((puduDragStart && puduDragStart.x) || cx);
    const dy = cy - ((puduDragStart && puduDragStart.y) || cy);
    if (elapsed < 240 && Math.hypot(dx, dy) < 18) {
      applyPush(cx, cy, 1.2);
    } else {
      applyDragThrow(dx, dy, elapsed);
    }
    puduHomeX = 0;
  }

  window.addEventListener('pointerdown', (e) => {
    onPointerDown(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('pointermove', (e) => {
    onPointerMove(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('pointerup', (e) => {
    onPointerUp(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      if (puduIsDragging && e.cancelable) e.preventDefault();
      onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    const t = e.changedTouches ? e.changedTouches[0] : null;
    if (t) onPointerUp(t.clientX, t.clientY);
    else onPointerUp(0, 0);
  }, { passive: true });

  /* ══════════════════════════════════════════════════════════════
     SISTEMA DE VOZ TIERNA Y DIÁLOGO
     ══════════════════════════════════════════════════════════════ */
  let speechTimer = 0;

  /* ---------- Motor de Voz Tierna & Visemas del Pudú ---------- */
  let puduAudioCtx = null;
  let puduVoiceNodes = [];
  let cachedEsVoice = null;

  const VISEME_TABLE = {
    REST: { open: 0.00, width: 1.00, depth: 0.60, tongue: 0.00, snoutZ: 0.000, snoutY: 0.000 },
    A:    { open: 1.00, width: 0.96, depth: 0.78, tongue: 0.75, snoutZ: 0.008, snoutY: -0.005 },
    E:    { open: 0.56, width: 1.24, depth: 0.62, tongue: 0.35, snoutZ: 0.004, snoutY: -0.002 },
    I:    { open: 0.32, width: 1.32, depth: 0.55, tongue: 0.18, snoutZ: 0.002, snoutY:  0.002 },
    O:    { open: 0.82, width: 0.68, depth: 1.05, tongue: 0.12, snoutZ: 0.020, snoutY: -0.003 },
    U:    { open: 0.48, width: 0.52, depth: 1.18, tongue: 0.04, snoutZ: 0.026, snoutY:  0.000 },
    MBP:  { open: 0.00, width: 0.88, depth: 0.48, tongue: 0.00, snoutZ: -0.004, snoutY: 0.003 },
    FV:   { open: 0.22, width: 1.08, depth: 0.56, tongue: 0.08, snoutZ: 0.005, snoutY:  0.001 },
    CONS: { open: 0.38, width: 1.04, depth: 0.64, tongue: 0.22, snoutZ: 0.004, snoutY: -0.001 }
  };

  // Formantes vocálicos dulces (F1, F2 en Hz) para síntesis estilo Animal Crossing
  const FORMANT_VOWELS = {
    A: { f1: 780, f2: 1280, pitchMul: 1.00 },
    E: { f1: 520, f2: 1980, pitchMul: 1.06 },
    I: { f1: 340, f2: 2450, pitchMul: 1.12 },
    O: { f1: 500, f2: 920,  pitchMul: 0.96 },
    U: { f1: 350, f2: 760,  pitchMul: 0.93 }
  };

  const puduLipSync = {
    active: false,
    startTime: 0,
    timeline: [],      // [{ t0, t1, viseme, charIndex, stress }]
    cursorIndex: 0,
    // Estado físico (resorte-amortiguador)
    open: 0,    vOpen: 0,
    width: 1,   vWidth: 0,
    depth: 0.6, vDepth: 0,
    tongue: 0,  vTongue: 0,
    snoutZ: 0,  vSnoutZ: 0,
    snoutY: 0,  vSnoutY: 0,
    headBob: 0
  };

  function getPuduAudioCtx() {
    if (!puduAudioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) puduAudioCtx = new AC();
    }
    if (puduAudioCtx && puduAudioCtx.state === 'suspended') {
      puduAudioCtx.resume().catch(() => {});
    }
    return puduAudioCtx;
  }

  function pickSweetSpanishVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return cachedEsVoice;

    // Ranking curado de voces cálidas/dulces en Chrome, Safari, iOS y Android
    const preferredNames = [
      'paulina', 'dalia', 'sabina', 'mónica', 'monica', 'helena',
      'laura', 'luciana', 'paloma', 'marisol', 'sofia', 'sofía',
      'google español', 'es-cl', 'es-mx', 'es-us', 'es-es'
    ];

    const esVoices = voices.filter((v) =>
      v.lang && (v.lang.toLowerCase().startsWith('es') || v.name.toLowerCase().includes('spanish'))
    );
    if (!esVoices.length) return null;

    let best = esVoices[0];
    let bestScore = -1;
    for (const v of esVoices) {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      let score = 0;
      if (lang.startsWith('es-cl')) score += 40;
      else if (lang.startsWith('es-mx') || lang.startsWith('es-419')) score += 30;
      else if (lang.startsWith('es')) score += 20;

      preferredNames.forEach((kw, idx) => {
        if (name.includes(kw)) score += (60 - idx * 2);
      });
      if (name.includes('natural') || name.includes('neural') || name.includes('premium')) score += 25;
      if (name.includes('male') || name.includes('jorge') || name.includes('diego') || name.includes('pablo')) score -= 35;

      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    cachedEsVoice = best;
    return best;
  }

  if ('speechSynthesis' in window && window.speechSynthesis.addEventListener) {
    window.speechSynthesis.addEventListener('voiceschanged', pickSweetSpanishVoice);
  }

  function charToViseme(ch) {
    const c = ch.toLowerCase();
    if ('aáàä'.includes(c)) return 'A';
    if ('eéèë'.includes(c)) return 'E';
    if ('iíìïy'.includes(c)) return 'I';
    if ('oóòö'.includes(c)) return 'O';
    if ('uúùüw'.includes(c)) return 'U';
    if ('mbp'.includes(c)) return 'MBP';
    if ('fv'.includes(c)) return 'FV';
    if (/[a-zñ]/.test(c)) return 'CONS';
    return 'REST';
  }

  function buildVisemeTimeline(text, rate = 1.06) {
    const timeline = [];
    let t = 0;
    const baseStep = 0.068 / rate;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const v = charToViseme(ch);
      let dur = baseStep;
      let stress = 0.5;

      if (v === 'REST') {
        dur = (ch === ',' || ch === ';') ? 0.19 : ('.!?¡¿'.includes(ch) ? 0.28 : 0.075);
      } else if ('AEIOU'.includes(v)) {
        dur = baseStep * 1.45;
        stress = 'áéíóú'.includes(ch.toLowerCase()) ? 1.0 : 0.78;
      } else if (v === 'MBP') {
        dur = baseStep * 0.85;
        stress = 0.3;
      }

      // Colapsar consonantes repetidas suaves para evitar jitter
      const prev = timeline[timeline.length - 1];
      if (prev && prev.viseme === v && v === 'CONS') {
        prev.t1 += dur * 0.65;
        t = prev.t1;
      } else {
        timeline.push({ t0: t, t1: t + dur, viseme: v, charIndex: i, stress });
        t += dur;
      }
    }
    timeline.push({ t0: t, t1: t + 0.18, viseme: 'REST', charIndex: text.length, stress: 0 });
    return { timeline, totalDuration: t + 0.18 };
  }

  function playPuduChirp(ctx, when, duration = 0.14) {
    if (!isPageInFocus()) return;
    try {
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      sub.type = 'sine';
      osc.frequency.setValueAtTime(520, when);
      osc.frequency.exponentialRampToValueAtTime(860, when + duration * 0.65);
      osc.frequency.exponentialRampToValueAtTime(740, when + duration);

      sub.frequency.setValueAtTime(1040, when);
      sub.frequency.exponentialRampToValueAtTime(1480, when + duration);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, when);
      filter.Q.value = 2.2;

      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.11, when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(when);
      sub.start(when);
      osc.stop(when + duration + 0.02);
      sub.stop(when + duration + 0.02);
      puduVoiceNodes.push(osc, sub);
    } catch (_) {}
  }

  function playPuduAnimalese(text, timeline) {
    if (!isPageInFocus()) return;
    const ctx = getPuduAudioCtx();
    if (!ctx) return;

    const now = ctx.currentTime + 0.02;
    const master = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3400;
    master.gain.value = 0.22;
    lp.connect(master);
    master.connect(ctx.destination);

    // Agrupamos por sílabas vocálicas para que suene dulce y musical, no entrecortado
    let lastPlayTime = -1;
    timeline.forEach((seg, idx) => {
      if (!'AEIOU'.includes(seg.viseme)) return;
      const tStart = now + seg.t0;
      if (tStart - lastPlayTime < 0.075) return; // Máx ~13 sílabas/seg
      lastPlayTime = tStart;

      const fmt = FORMANT_VOWELS[seg.viseme];
      const dur = Math.min(0.14, Math.max(0.075, (seg.t1 - seg.t0) * 1.15));
      const baseF0 = (490 + Math.sin(idx * 1.3) * 45 + seg.stress * 55) * fmt.pitchMul;

      const osc = ctx.createOscillator();
      const vibrato = ctx.createOscillator();
      const vibGain = ctx.createGain();
      const f1 = ctx.createBiquadFilter();
      const f2 = ctx.createBiquadFilter();
      const env = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseF0 * 0.96, tStart);
      osc.frequency.exponentialRampToValueAtTime(baseF0 * 1.05, tStart + dur * 0.7);

      vibrato.frequency.value = 5.5;
      vibGain.gain.value = 8;
      vibrato.connect(vibGain);
      vibGain.connect(osc.frequency);

      f1.type = 'bandpass'; f1.frequency.value = fmt.f1; f1.Q.value = 4.5;
      f2.type = 'bandpass'; f2.frequency.value = fmt.f2; f2.Q.value = 5.5;

      env.gain.setValueAtTime(0.0001, tStart);
      env.gain.linearRampToValueAtTime(0.85, tStart + 0.018);
      env.gain.exponentialRampToValueAtTime(0.0001, tStart + dur);

      osc.connect(f1);
      osc.connect(f2);
      f1.connect(env);
      f2.connect(env);
      env.connect(lp);

      osc.start(tStart);
      vibrato.start(tStart);
      osc.stop(tStart + dur + 0.02);
      vibrato.stop(tStart + dur + 0.02);
      puduVoiceNodes.push(osc, vibrato);
    });
  }

  let mouthEndTimer = 0;

  function stopMouthAnim() {
    clearTimeout(mouthEndTimer);
    mouthEndTimer = 0;
    puduSpeakingActive = false;
    puduLipSync.active = false;
    puduVoiceNodes.forEach((n) => {
      try { n.stop(); } catch (_) {}
    });
    puduVoiceNodes = [];
  }

  function stopAllPuduSpeech() {
    clearTimeout(speechTimer);
    speechTimer = 0;
    stopMouthAnim();
    if (bubbleEl) bubbleEl.classList.remove('active');
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    if (puduAudioCtx && puduAudioCtx.state === 'running') {
      puduAudioCtx.suspend().catch(() => {});
    }
    if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend().catch(() => {});
    }
  }

  /**
   * Voz dulce del Pudú
   * @param {string} text
   * @param {'hybrid'|'pudu'|'tts'} mode - 'hybrid' = trino mágico + TTS dulce; 'pudu' = 100% Web Audio formantes
   */
  function speakPuduVoice(text, mode = 'hybrid') {
    if (!text || !isPageInFocus()) return;
    stopMouthAnim();

    const clean = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[#*_~`]/g, '').trim();
    const { timeline, totalDuration } = buildVisemeTimeline(clean, 1.06);

    if (bubbleEl) {
      bubbleEl.textContent = text;
      bubbleEl.classList.add('active');
      clearTimeout(speechTimer);
      speechTimer = setTimeout(() => {
        bubbleEl.classList.remove('active');
        stopMouthAnim();
      }, Math.max(4500, totalDuration * 1000 + 1200));
    }

    puduSpeakingActive = true;
    puduLipSync.active = true;
    puduLipSync.startTime = performance.now() * 0.001;
    puduLipSync.timeline = timeline;
    puduLipSync.cursorIndex = 0;

    const ctx = getPuduAudioCtx();
    if (ctx) playPuduChirp(ctx, ctx.currentTime + 0.01, 0.13);

    const canTTS = ('speechSynthesis' in window) && mode !== 'pudu';
    if (!canTTS) {
      playPuduAnimalese(clean, timeline);
      mouthEndTimer = setTimeout(stopMouthAnim, totalDuration * 1000 + 150);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = 'es-CL';
      u.pitch = 1.36;   // Rango dulce natural sin distorsión metálica en Safari/Chrome
      u.rate = 1.06;
      u.volume = 0.95;

      const voice = pickSweetSpanishVoice();
      if (voice) u.voice = voice;

      // Sincronización híbrida: onboundary ajusta el reloj si el navegador lo soporta (Chrome desktop)
      u.onboundary = (ev) => {
        if (!puduLipSync.active || typeof ev.charIndex !== 'number') return;
        const match = puduLipSync.timeline.find((s) => s.charIndex >= ev.charIndex);
        if (match) {
          const nowSec = performance.now() * 0.001;
          puduLipSync.startTime = nowSec - match.t0;
        }
      };

      u.onstart = () => {
        if (!isPageInFocus()) {
          stopAllPuduSpeech();
          return;
        }
        puduLipSync.startTime = performance.now() * 0.001;
      };
      u.onend = stopMouthAnim;
      u.onerror = (ev) => {
        if (!isPageInFocus() || (ev && (ev.error === 'canceled' || ev.error === 'interrupted'))) {
          stopMouthAnim();
          return;
        }
        // Fallback inmediato a voz procedural si el TTS falla en móvil
        playPuduAnimalese(clean, timeline);
        mouthEndTimer = setTimeout(stopMouthAnim, totalDuration * 1000);
      };

      if (!isPageInFocus()) {
        stopAllPuduSpeech();
        return;
      }
      window.speechSynthesis.speak(u);
    } catch (_) {
      playPuduAnimalese(clean, timeline);
    }
  }

  // Desbloqueo de AudioContext en iOS/Safari/Chrome tras primer gesto del usuario
  ['pointerdown', 'touchstart', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, () => { getPuduAudioCtx(); }, { once: true, passive: true });
  });

  /* ---------- Sincronización de proyección y cámara ---------- */
  function syncCameraProjection(W, H, ex, ey) {
    camera.position.set(ex, ey, EYE_D);
    camera.rotation.set(0, 0, 0);
    camera.updateMatrixWorld(true);

    const near = 10;
    const far = EYE_D + 2600;
    const s = near / EYE_D;
    camera.projectionMatrix.makePerspective(
      (-W / 2 - ex) * s,
      ( W / 2 - ex) * s,
      ( H / 2 - ey) * s,
      (-H / 2 - ey) * s,
      near,
      far
    );
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  function resize(forceRebuild = false) {
    const rect = canvas.getBoundingClientRect();
    const cw = Math.round(rect.width) || window.innerWidth;
    const ch = Math.round(rect.height) || window.innerHeight;
    if (!cw || !ch) return;

    const sizeChanged = cw !== viewportW || ch !== viewportH;
    viewportW = cw;
    viewportH = ch;
    if (sizeChanged) {
      renderer.setSize(cw, ch, false);
      syncCameraProjection(cw, ch, 0, 0);
    }

    for (const card of cards) {
      const el = doc.querySelector(card.sel);
      if (el) {
        const r = el.getBoundingClientRect();
        const nw = Math.round(r.width);
        const nh = Math.round(r.height);
        if (nw && nh && (forceRebuild || nw !== card.w || nh !== card.h)) {
          card.w = nw;
          card.h = nh;
          buildCard(card);
        }
      }
    }
  }

  /* ---------- Actualización del Pudú y su Física ---------- */
  function updatePudu(dt, t, W, H, ex, ey) {
    if (!puduGroup || !pudu3dModel) return;

    const isMobile = W < 900;
    puduScale = isMobile ? 135 : 160;
    const puduBaseY = isMobile ? H * 0.165 : H * 0.145;

    // AI think & updates
    puduBrain.updateBlink(dt);
    puduBrain.think(dt);

    animatePuduByState(t, dt);
    updateEyes(t);
    updateMouth(t, dt);
    updateEars(t);
    updateCheeks();
    updateBreathing(t);

    maybeSpawnEmotions(dt);
    updateEmotionParticles();
    updateButterfly(t);

    // Física de empuje / lanzamiento
    if (puduBeingPushed) {
      puduPhysVy -= 0.005;
      puduPhysVx *= 0.94;
      puduPhysVy *= 0.94;
      puduPhysVz *= 0.94;
      pudu3dModel.position.x += puduPhysVx;
      pudu3dModel.position.y += puduPhysVy;
      pudu3dModel.position.z += puduPhysVz;
      const floor = pudu3dModel._baseY || -0.2;
      if (pudu3dModel.position.y < floor) {
        pudu3dModel.position.y = floor;
        puduPhysVy = Math.abs(puduPhysVy) * 0.45;
        puduPhysVx *= 0.82;
        if (Math.abs(puduPhysVy) < 0.015 && Math.abs(puduPhysVx) < 0.012) {
          puduBeingPushed = false;
          puduReturnHome = true;
        }
      }
      pudu3dModel.rotation.z += (puduPhysVx * 0.8 - pudu3dModel.rotation.z) * 0.12;
    } else if (puduReturnHome) {
      const dx = puduHomeX - pudu3dModel.position.x;
      pudu3dModel.position.x += dx * 0.035;
      pudu3dModel.rotation.z *= 0.92;
      if (Math.abs(dx) < 0.05) {
        puduReturnHome = false;
        pudu3dModel.position.x = puduHomeX;
        pudu3dModel.rotation.z = 0;
      }
    }

    // Posición del contenedor en pantalla y luz acoplada
    puduGroup.position.set(0, puduBaseY, -40);
    puduGroup.scale.set(puduScale, puduScale, puduScale);

    puduGlowLight.position.set(
      pudu3dModel.position.x * puduScale,
      puduBaseY + (pudu3dModel.position.y + 0.4) * puduScale,
      60
    );

    // Proyección del bocadillo de diálogo sobre la boca
    if (bubbleEl && bubbleEl.classList.contains('active')) {
      puduGroup.updateMatrixWorld(true);
      const mouthPos = new THREE.Vector3();
      puduParts.head.getWorldPosition(mouthPos);
      mouthPos.y += 0.45 * puduScale;

      const p = mouthPos.clone().project(camera);
      if (p.z < 1) {
        const sx = THREE.MathUtils.clamp((p.x * 0.5 + 0.5) * W, 90, W - 90);
        const sy = THREE.MathUtils.clamp((-(p.y * 0.5) + 0.5) * H - 30, 50, H - 50);
        bubbleEl.style.left = `${Math.round(sx)}px`;
        bubbleEl.style.top = `${Math.round(sy)}px`;
      }
    }
  }

    /* ══════════════════════════════════════════════════════════════
     FÍSICA DE VUELO Y ACTUALIZACIÓN 3D DE TARJETAS (BARSALITSUNI)
     ══════════════════════════════════════════════════════════════ */
  function easeFlight(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function easeReturn(x) {
    const c4 = (2 * Math.PI) / 3;
    return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
  }

  function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function getFlightParams(u, v, q) {
    const dx = clamp(u * 34, -34, 34);
    const dy = clamp(86 + v * 14, 70, 104);
    const rx = clamp(-v * 15, -18, 18);
    const ry = clamp(u * 20, -24, 24);
    const rz = clamp(u * 8 + v * 4, -12, 12);

    const kfs = [
      { offset: 0.00, dx: 0,         dy: 0,         dz: 0,   rx: 0,         ry: 0,         rz: 0,         scale: 1.00, opacity: 1.00 },
      { offset: 0.14, dx: dx * 0.18, dy: 8,         dz: 42,  rx: rx * 0.25, ry: ry * 0.25, rz: rz * 0.20, scale: 0.97, opacity: 1.00 },
      { offset: 0.52, dx: dx * 0.58, dy: dy * 0.48, dz: 230, rx: rx * 0.65, ry: ry * 0.65, rz: rz * 0.60, scale: 0.86, opacity: 0.86 },
      { offset: 0.82, dx: dx,        dy: dy,        dz: 520, rx: rx,        ry: ry,        rz: rz,        scale: 0.68, opacity: 0.28 },
      { offset: 1.00, dx: dx * 1.05, dy: dy * 1.03, dz: 720, rx: rx * 1.10, ry: ry * 1.10, rz: rz * 1.10, scale: 0.54, opacity: 0.03 }
    ];

    if (q <= 0) return kfs[0];
    if (q >= 1) return kfs[kfs.length - 1];

    let k = 0;
    for (let i = 0; i < kfs.length - 1; i++) {
      if (q >= kfs[i].offset && q <= kfs[i + 1].offset) {
        k = i;
        break;
      }
    }

    const kfA = kfs[k];
    const kfB = kfs[k + 1];
    const f = (q - kfA.offset) / (kfB.offset - kfA.offset);

    return {
      dx: lerp(kfA.dx, kfB.dx, f),
      dy: lerp(kfA.dy, kfB.dy, f),
      dz: lerp(kfA.dz, kfB.dz, f),
      rx: lerp(kfA.rx, kfB.rx, f),
      ry: lerp(kfA.ry, kfB.ry, f),
      rz: lerp(kfA.rz, kfB.rz, f),
      scale: lerp(kfA.scale, kfB.scale, f),
      opacity: lerp(kfA.opacity, kfB.opacity, f)
    };
  }

  function triggerCardFlight(card, e) {
    const el = doc.querySelector(card.sel);
    if (!el || card.flight.active) return;
    const r = el.getBoundingClientRect();
    const cx = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : r.left + r.width / 2);
    const cy = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : r.top + r.height / 2);

    card.baseCx = (r.left + r.width / 2) - viewportW / 2;
    card.baseCy = -((r.top + r.height / 2) - viewportH / 2);

    const u = clamp(((cx - r.left) / r.width - 0.5) * 2, -1, 1);
    const v = clamp(((cy - r.top) / r.height - 0.5) * 2, -1, 1);

    card.flight.active = true;
    card.flight.returning = false;
    card.flight.startTime = performance.now();
    card.flight.u = u;
    card.flight.v = v;
    card.flight.returnFrom = null;

    setTimeout(() => {
      const url = el.getAttribute('href');
      if (url) {
        window.open(url, el.getAttribute('target') || '_self');
      }
    }, FLIGHT_MS * 0.75);

    if (card.flight.returnTimer) clearTimeout(card.flight.returnTimer);
    card.flight.returnTimer = setTimeout(() => {
      if (card.flight.active && !card.flight.returning && doc.visibilityState !== 'hidden') {
        returnCardFlight(card);
      }
    }, FLIGHT_MS + 800);
  }

  function returnCardFlight(card) {
    if (!card.flight.active || card.flight.returning) return;
    card.targetPress = 0;
    card.hovered = false;
    card.flight.returning = true;
    card.flight.returnStartTime = performance.now();
    card.flight.returnFrom = {
      x: card.group.position.x,
      y: card.group.position.y,
      z: card.group.position.z,
      rx: card.group.rotation.x,
      ry: card.group.rotation.y,
      rz: card.group.rotation.z,
      scale: card.group.scale.x,
      opacity: card.faceMesh ? card.faceMesh.material.opacity : 1.0
    };
  }

  function returnAllFlyingCards() {
    cards.forEach((card) => {
      card.targetPress = 0;
      card.hovered = false;
      if (card.flight.active && !card.flight.returning) {
        returnCardFlight(card);
      }
    });
  }

  function updateCard(card, dt, W, H, ex, ey) {
    const el = doc.querySelector(card.sel);
    if (!el || !card.group) return;

    card.group.visible = true;

    const baseRotX = (ey / EYE_D) * 0.22;
    const baseRotY = -(ex / EYE_D) * 0.22;

    if (card.flight.active) {
      const now = performance.now();
      if (!card.flight.returning) {
        const elapsed = now - card.flight.startTime;
        const p = Math.min(1, elapsed / FLIGHT_MS);
        const q = easeFlight(p);
        const st = getFlightParams(card.flight.u, card.flight.v, q);

        const fx = card.baseCx + st.dx;
        const fy = card.baseCy + st.dy;
        const fz = -st.dz;
        card.group.position.set(fx, fy, fz);

        const rotX = baseRotX + (st.rx * Math.PI) / 180;
        const rotY = baseRotY + (st.ry * Math.PI) / 180;
        const rotZ = (st.rz * Math.PI) / 180;
        card.group.rotation.set(rotX, rotY, rotZ);

        card.group.scale.set(st.scale, st.scale, st.scale);

        if (card.faceMesh) card.faceMesh.material.opacity = st.opacity * 0.98;
        card.glassMaterial.opacity = st.opacity * 0.78;
      } else {
        const elapsed = now - card.flight.returnStartTime;
        const p = Math.min(1, elapsed / RETURN_MS);
        const ease = easeReturn(p);

        const from = card.flight.returnFrom;
        const fx = lerp(from.x, card.baseCx, ease);
        const fy = lerp(from.y, card.baseCy, ease);
        const fz = lerp(from.z, 0, ease);
        card.group.position.set(fx, fy, fz);

        const rotX = lerp(from.rx, baseRotX, ease);
        const rotY = lerp(from.ry, baseRotY, ease);
        const rotZ = lerp(from.rz, 0, ease);
        card.group.rotation.set(rotX, rotY, rotZ);

        const sc = lerp(from.scale, 1, ease);
        card.group.scale.set(sc, sc, sc);

        const op = lerp(from.opacity, 0.98, ease);
        if (card.faceMesh) card.faceMesh.material.opacity = op;
        card.glassMaterial.opacity = (op / 0.98) * 0.78;

        if (p >= 1) {
          card.flight.active = false;
          card.flight.returning = false;
        }
      }
      return;
    }

    const r = el.getBoundingClientRect();
    const cx = (r.left + r.width / 2) - W / 2;
    const cy = -((r.top + r.height / 2) - H / 2);

    card.baseCx = cx;
    card.baseCy = cy;

    card.press += (card.targetPress - card.press) * 0.24;
    card.group.position.set(cx, cy, -card.press * 12);
    card.group.scale.set(1, 1, 1);
    card.group.rotation.set(baseRotX, baseRotY, 0);

    if (card.faceMesh) card.faceMesh.material.opacity = 0.98;
    card.glassMaterial.opacity = 0.78;
  }

  /* ---------- Audio Sync Stub ---------- */
  const audioSync = { active: false, energy: 0, bass: 0 };
  function updateAudioEnergy(dt, t) {
    if (!audioSync.active) {
      audioSync.energy = 0;
      audioSync.bass = 0;
    }
  }

  /* ---------- Render Loop ---------- */
  let lastFrameTime = performance.now();

  function render(now) {
    requestAnimationFrame(render);
    if (doc.hidden) {
      lastFrameTime = now;
      return;
    }

    const W = viewportW;
    const H = viewportH;
    if (!W || !H) return;

    const dt = Math.min((now - lastFrameTime) * 0.001, 0.1);
    lastFrameTime = now;
    const t = now * 0.001;

    // Carousel tick
    if (typeof window.__carouselTick === 'function') window.__carouselTick(now);

    updateAudioEnergy(dt, t);

    const eye = window.PhysicalUI && window.PhysicalUI.eye
      ? window.PhysicalUI.eye()
      : [0, 0];

    const ex = Math.max(-MAX_EYE, Math.min(MAX_EYE, eye[0] * PARALLAX));
    const ey = Math.max(-MAX_EYE, Math.min(MAX_EYE, -eye[1] * PARALLAX));

    syncCameraProjection(W, H, ex, ey);

    // Movimiento natural y armónico del fondo con acelerómetro/giroscopio y mouse
    const bgStageEl = doc.querySelector('.bg-stage');
    if (bgStageEl) {
      const bgShiftX = (-ex * 0.16).toFixed(2);
      const bgShiftY = (-ey * 0.12).toFixed(2);
      bgStageEl.style.transform = `translate3d(${bgShiftX}px, ${bgShiftY}px, 0)`;
    }

    eyeLight.position.set(ex * 1.2, ey * 1.2, EYE_D * 0.6);

    // 1 Single God Ray: detrás del pudú, barriendo de total izquierda a total derecha
    const nEx = THREE.MathUtils.clamp(ex / 120, -1, 1);
    const nEy = THREE.MathUtils.clamp(ey / 120, -1, 1);

    if (godRayGroup) {
      const sunSweep = THREE.MathUtils.clamp(Math.sin(t * 0.24) * 0.35 + nEx * 0.85, -1, 1);
      const halfSpanX = Math.max(W * 0.56, 360);
      godRayGroup.position.x = sunSweep * halfSpanX;
      godRayGroup.position.y = Math.max(H * 0.44, 280) + nEy * 70;
      godRayGroup.position.z = -300;
      godRayGroup.rotation.z = -sunSweep * 0.68;
      godRayGroup.rotation.x = 0.14 + nEy * 0.14;

      // Escalar ancho del haz para cubrir de extremo a extremo
      const beamScaleX = Math.max(1.0, W / 1100);
      beamMesh.scale.set(beamScaleX, 1.0, beamScaleX);

      beamUniforms.uTime.value += dt;
      beamUniforms.uMouseOffset.value.set(sunSweep, nEy);
      beamUniforms.uAspect.value = W / Math.max(H, 1);
      flareUniforms.uTime.value += dt;

      // Proyectar centro del pudú y origen del sol para el truco de oclusión/halo detrás del pudú
      if (pudu3dModel) {
        const pCenter = new THREE.Vector3();
        pudu3dModel.getWorldPosition(pCenter);
        pCenter.y += 0.18 * puduScale;
        pCenter.project(camera);
        beamUniforms.uPuduScreen.value.set(pCenter.x * 0.5 + 0.5, pCenter.y * 0.5 + 0.5);
        beamUniforms.uPuduRadius.value = THREE.MathUtils.clamp((puduScale * 0.72) / Math.max(H, 1), 0.06, 0.22);
      }
      const lOrigin = godRayGroup.position.clone().project(camera);
      beamUniforms.uLightScreen.value.set(lOrigin.x * 0.5 + 0.5, lOrigin.y * 0.5 + 0.5);

      // Respiración de la luz e iluminación dinámica de tarjetas y contorno del pudú
      const rayPulse = 1.0 + Math.sin(t * 1.8) * 0.08 + (audioSync.active ? audioSync.energy * 0.4 : 0);
      godRayLight.intensity = 9.5 * rayPulse;
      godRayLight.position.x = sunSweep * halfSpanX * 0.75;
      godRayLight.position.y = 120 + nEy * 60;

      // Mantener la corona mirando hacia la cámara
      flareMesh.quaternion.copy(camera.quaternion);
      const parentQuatInv = godRayGroup.quaternion.clone().invert();
      flareMesh.quaternion.premultiply(parentQuatInv);

      // Posicionamiento de fantasmas de lente
      if (typeof ghostMeshA !== 'undefined' && ghostMeshA) {
        ghostMeshA.position.set(-sunSweep * (W * 0.18), -nEy * 80 - 60, -240);
      }
      if (typeof ghostMeshB !== 'undefined' && ghostMeshB) {
        ghostMeshB.position.set(-sunSweep * (W * 0.28), -nEy * 130 - 100, -220);
      }
    }

    // Actualización del Pudú interactivo
    updateNeonPulse(puduGroup, t);
    updatePudu(dt, t, W, H, ex, ey);

    // Actualización de tarjetas físicas
    for (const card of cards) {
      updateCard(card, dt, W, H, ex, ey);
    }

    renderer.render(scene, camera);
  }

  /* ---------- Interacciones y Enlaces ---------- */
  function setup() {
    resize(true);
    window.addEventListener('resize', () => resize(false), { passive: true });
    window.addEventListener('scroll', () => {
      // Re-verificar tamaños y posiciones de tarjetas tras scroll
      for (const card of cards) {
        const el = doc.querySelector(card.sel);
        if (el) {
          const r = el.getBoundingClientRect();
          const nw = Math.round(r.width);
          const nh = Math.round(r.height);
          if (nw > 0 && nh > 0 && (Math.abs(card.w - nw) > 4 || Math.abs(card.h - nh) > 4)) {
            card.w = nw;
            card.h = nh;
            buildCard(card);
          }
        }
      }
    }, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => resize(false), { passive: true });
      window.visualViewport.addEventListener('scroll', () => resize(false), { passive: true });
    }

    doc.documentElement.classList.add('has-glass-3d');

    /* =========================================================
       CAROUSEL PHYSICS — auto-scroll + touch inertia + loop
       ========================================================= */
    (function initCarousel() {
      const viewport = doc.getElementById('carouselViewport');
      const track    = doc.getElementById('carouselTrack');
      if (!viewport || !track) return;

      const AUTO_SPEED = 25; // px/sec
      const FRICTION   = 0.93; // per-frame decay when releasing
      let offset    = 0;
      let velocity  = 0; // starts at 0, accelerates to AUTO_SPEED
      let dragging  = false;
      let dragX     = 0;
      let dragT     = 0;
      let velCapture = 0;
      let dragDelta  = 0;
      let halfWidth  = 0; // half of track content (3 original cards)
      let lastCarouselTime = performance.now();

      function getHalfWidth() {
        // 3 original + 3 clones → half = width of 3 originals + gap
        const cards3 = Array.from(track.querySelectorAll('.mode-card:not(.carousel-clone)'));
        if (!cards3.length) return track.scrollWidth / 2;
        const last = cards3[cards3.length - 1];
        const first = cards3[0];
        const gap = parseFloat(getComputedStyle(track).gap) || 24;
        return last.offsetLeft + last.offsetWidth - first.offsetLeft + gap;
      }

      function applyTransform() {
        track.style.transform = `translateX(${-offset}px)`;
      }

      // Update carousel every frame (called from render loop via window event)
      window.__carouselTick = function(now) {
        const dt = Math.min((now - lastCarouselTime) / 1000, 0.05);
        lastCarouselTime = now;
        if (!halfWidth) halfWidth = getHalfWidth();

        if (!dragging) {
          // Smoothly approach AUTO_SPEED from whatever velocity we have
          if (Math.abs(velocity) > AUTO_SPEED * 1.5) {
            velocity *= FRICTION;
          } else {
            velocity += (AUTO_SPEED - velocity) * 0.04;
          }
          offset += velocity * dt;
        }

        // Seamless loop: when we've scrolled one "set" width, snap back
        if (halfWidth > 0 && offset >= halfWidth) offset -= halfWidth;
        if (offset < 0) offset += halfWidth;

        applyTransform();
      };

      // Pointer drag
      viewport.addEventListener('pointerdown', (e) => {
        dragging  = true;
        dragX     = e.clientX;
        dragT     = performance.now();
        dragDelta = 0;
        velCapture = 0;
        velocity  = 0;
        viewport.setPointerCapture(e.pointerId);
      }, { passive: true });

      viewport.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx  = dragX - e.clientX;
        const dt  = (performance.now() - dragT) / 1000 || 0.016;
        velCapture = dx / dt;
        dragDelta += Math.abs(dx);
        offset    = Math.max(0, offset + dx);
        dragX     = e.clientX;
        dragT     = performance.now();
        applyTransform();
      }, { passive: true });

      function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        // Apply fling velocity (capped)
        velocity = Math.sign(velCapture) * Math.min(Math.abs(velCapture), 1200);
        // Suppress click if significant drag occurred
        if (dragDelta > 8 && e && e.target) {
          const capture = (ev) => { ev.preventDefault(); ev.stopImmediatePropagation(); };
          e.target.addEventListener('click', capture, { once: true, capture: true });
        }
      }

      viewport.addEventListener('pointerup',     endDrag, { passive: true });
      viewport.addEventListener('pointercancel', endDrag, { passive: true });

      // Recalculate halfWidth on resize
      window.addEventListener('resize', () => { halfWidth = 0; }, { passive: true });
    })();

    /* =========================================================
       FLOATING WORDS — spawn animated text near Pudú's mouth
       ========================================================= */
    function spawnFloatingWord(text) {
      const puduEl = doc.querySelector('.pudu-stage-zone') || doc.querySelector('#pudu3d-speech-bubble');
      if (!puduEl) return;
      const rect = puduEl.getBoundingClientRect();
      const words = text.split(/\s+/).filter(Boolean);
      words.forEach((word, i) => {
        const el = doc.createElement('div');
        el.className = 'floating-word';
        el.textContent = word;
        el.style.left   = `${rect.left + rect.width * 0.5 + (i - words.length / 2) * 32}px`;
        el.style.top    = `${Math.max(rect.top, 60)}px`;
        el.style.animationDelay = `${i * 0.12}s`;
        doc.body.appendChild(el);
        setTimeout(() => el.remove(), 2600 + i * 120);
      });
    }

    cards.forEach((card) => {
      const el = doc.querySelector(card.sel);
      if (!el) return;

      el.addEventListener('pointerenter', () => {
        card.hovered = true;
        speakPuduVoice(card.speech);
        spawnFloatingWord(card.speech);
      });

      el.addEventListener('pointerdown', (e) => {
        card.targetPress = 1;
        triggerCardFlight(card, e);
      }, { passive: true });

      el.addEventListener('pointerup', () => { card.targetPress = 0; }, { passive: true });
      el.addEventListener('pointercancel', () => { card.targetPress = 0; }, { passive: true });
      el.addEventListener('pointerleave', () => {
        card.hovered = false;
        card.targetPress = 0;
      }, { passive: true });

      el.addEventListener('click', (e) => {
        e.preventDefault();
        triggerCardFlight(card, e);
      });
    });

    // Al volver a la pestaña principal, cualquier botón que haya volado regresa suavemente a su lugar
    doc.addEventListener('visibilitychange', () => {
      if (doc.visibilityState === 'visible') {
        lastFrameTime = performance.now();
        returnAllFlyingCards();
      }
    });
    window.addEventListener('focus', () => {
      lastFrameTime = performance.now();
      returnAllFlyingCards();
    });
    window.addEventListener('pageshow', () => {
      lastFrameTime = performance.now();
      returnAllFlyingCards();
    });

    // Saludo inicial
    setTimeout(() => {
      const greeting = '¡Elige una experiencia!';
      speakPuduVoice(greeting);
      spawnFloatingWord(greeting);
    }, 1200);

    render(performance.now());
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', setup);
  } else {
    setTimeout(setup, 0);
  }
})();
