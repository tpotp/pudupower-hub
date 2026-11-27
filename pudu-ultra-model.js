import * as THREE from './vendor/three/three.module.js';

export function createUltraPuduTextures(isEco = false) {
  const size = isEco ? 256 : 512;
  const ac = document.createElement('canvas'); ac.width = ac.height = size; const actx = ac.getContext('2d');
  const bc = document.createElement('canvas'); bc.width = bc.height = size; const bctx = bc.getContext('2d');
  const rc = document.createElement('canvas'); rc.width = rc.height = size; const rctx = rc.getContext('2d');

  // Calibrated Valdivian Southern Pudu pelage base (worked together with anatomical vertex shading):
  // Deep chestnut-umber dorsum (#3c1a0e–#5a2612) -> warm rufous flanks (#8b4420–#ab5d2e) -> soft tawny-beige belly (#d9af8b–#ebd4bf)
  const grad = actx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0.00, '#5a2612');
  grad.addColorStop(0.20, '#723419');
  grad.addColorStop(0.46, '#9c4f26');
  grad.addColorStop(0.72, '#b96c3b');
  grad.addColorStop(0.88, '#dcb48f');
  grad.addColorStop(1.00, '#ebd4bf');
  actx.fillStyle = grad;
  actx.fillRect(0, 0, size, size);

  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);
  rctx.fillStyle = '#cfcfcf';
  rctx.fillRect(0, 0, size, size);

  // Fine agouti-ticked guard hair micro-strokes with rufous/umber/ochre band variation
  const strokes = isEco ? 8500 : 38000;
  const scale = size / 512;
  for (let i = 0; i < strokes; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const ny = y / size;
    const len = (4.0 + Math.random() * 9.5) * scale;
    const ang = (Math.random() - 0.5) * 0.22;
    const r = Math.random();

    if (ny < 0.35) {
      actx.strokeStyle = r < 0.38
        ? 'rgba(42,16,8,0.48)'
        : r < 0.74
          ? 'rgba(98,42,18,0.42)'
          : 'rgba(164,84,40,0.30)';
    } else if (ny < 0.78) {
      actx.strokeStyle = r < 0.24
        ? 'rgba(68,28,12,0.38)'
        : r < 0.64
          ? 'rgba(155,78,36,0.38)'
          : 'rgba(202,118,62,0.30)';
    } else {
      actx.strokeStyle = r < 0.28
        ? 'rgba(186,136,96,0.34)'
        : r < 0.72
          ? 'rgba(224,188,154,0.38)'
          : 'rgba(242,222,200,0.34)';
    }

    actx.lineWidth = (0.65 + Math.random() * 0.70) * scale;
    actx.beginPath();
    actx.moveTo(x, y);
    actx.lineTo(x + Math.sin(ang) * len, y + Math.cos(ang) * len);
    actx.stroke();

    const b = Math.floor(68 + Math.random() * 168);
    bctx.strokeStyle = `rgba(${b},${b},${b},0.46)`;
    bctx.lineWidth = 0.85 * scale;
    bctx.beginPath();
    bctx.moveTo(x, y);
    bctx.lineTo(x + Math.sin(ang) * len, y + Math.cos(ang) * len);
    bctx.stroke();

    const rg = Math.floor(172 + Math.random() * 68);
    rctx.strokeStyle = `rgba(${rg},${rg},${rg},0.36)`;
    rctx.lineWidth = 0.85 * scale;
    rctx.beginPath();
    rctx.moveTo(x, y);
    rctx.lineTo(x + Math.sin(ang) * len, y + Math.cos(ang) * len);
    rctx.stroke();
  }

  const map = new THREE.CanvasTexture(ac);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const bumpMap = new THREE.CanvasTexture(bc);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  const roughnessMap = new THREE.CanvasTexture(rc);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  return { map, bumpMap, roughnessMap };
}

function paintAnatomicalShade(geo, options = {}) {
  const {
    topHex = 0xd6b096,
    midHex = 0xf8e8da,
    botHex = 0xfef5eb,
    dorsalDark = 0.34,
    rufousFront = 0.0,
    bellyLight = 0.24
  } = options;
  const pos = geo.attributes.position;
  let minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), z = pos.getZ(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const spanY = Math.max(0.001, maxY - minY);
  const spanZ = Math.max(0.001, maxZ - minZ);
  const colors = new Float32Array(pos.count * 3);
  const cTop = new THREE.Color(topHex);
  const cMid = new THREE.Color(midHex);
  const cBot = new THREE.Color(botHex);
  const cDorsal = new THREE.Color(0x6d361f);
  const cRufous = new THREE.Color(0xd97f45);
  const cBelly = new THREE.Color(0xfff4e6);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ty = THREE.MathUtils.clamp((y - minY) / spanY, 0, 1);
    const tz = THREE.MathUtils.clamp((z - minZ) / spanZ, 0, 1);
    if (ty < 0.44) c.copy(cBot).lerp(cMid, ty / 0.44);
    else c.copy(cMid).lerp(cTop, (ty - 0.44) / 0.56);

    const dorsalMask = Math.max(0, ty - 0.56) / 0.44 * Math.exp(-(x * x) / 0.0055);
    c.lerp(cDorsal, THREE.MathUtils.clamp(dorsalMask * dorsalDark * 2.4, 0, 0.56));

    if (bellyLight > 0) {
      const bellyMask = Math.max(0, 0.36 - ty) / 0.36 * Math.exp(-(x * x) / 0.0080);
      c.lerp(cBelly, THREE.MathUtils.clamp(bellyMask * bellyLight * 2.2, 0, 0.52));
    }
    if (rufousFront > 0) c.lerp(cRufous, tz * rufousFront);

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function createLatheLimb(pointsBottomToTop, segs = 16) {
  const sorted = [...pointsBottomToTop].sort((a, b) => a[1] - b[1]);
  const geo = new THREE.LatheGeometry(sorted.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  geo.computeVertexNormals();
  return geo;
}

function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function buildUltraPuduModel({ activeProfile, isEcoHardware, contactShadowTex, furShellMeshes }) {
  const furTex = createUltraPuduTextures(isEcoHardware);
  const furUniforms = { uTime: { value: 0 }, uWindAmp: { value: 1.0 } };

  const puduUnifiedMat = activeProfile.physMat
    ? new THREE.MeshPhysicalMaterial({
        map: furTex.map,
        bumpMap: furTex.bumpMap,
        bumpScale: 0.019,
        roughnessMap: furTex.roughnessMap,
        vertexColors: true,
        roughness: 0.84,
        specularIntensity: 0.38,
        specularColor: new THREE.Color(0xdba072),
        sheen: 0.92,
        sheenRoughness: 0.42,
        sheenColor: new THREE.Color(0xe6b58a),
        side: THREE.FrontSide
      })
    : new THREE.MeshStandardMaterial({
        map: furTex.map,
        bumpMap: isEcoHardware ? null : furTex.bumpMap,
        bumpScale: 0.017,
        vertexColors: true,
        roughness: 0.85,
        side: THREE.FrontSide
      });

  function createFurShellMaterial(shellT, thickness = 0.012) {
    const mat = new THREE.MeshStandardMaterial({
      map: furTex.map,
      vertexColors: true,
      roughness: 0.89,
      alphaTest: 0.43,
      side: THREE.FrontSide
    });
    mat.customProgramCacheKey = () => `pudu_ultra_fur_${thickness.toFixed(4)}`;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uShellT = { value: shellT };
      shader.uniforms.uShellThickness = { value: shellT * thickness };
      shader.uniforms.uTime = furUniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uShellThickness;\nuniform float uTime;\nvarying vec2 vFurUv;\nvarying vec3 vFurViewPos;\nvarying vec3 vFurNormal;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFurUv = uv;\nvec3 comb = normalize(normal + vec3(0.0, -0.18, -0.32));\nfloat flutter = sin(uTime * 3.1 + position.x * 24.0 + position.z * 18.0) * 0.0007 * uShellThickness * 60.0;\ntransformed += comb * (uShellThickness + flutter);')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvFurViewPos = -mvPosition.xyz;\nvFurNormal = normalize(normalMatrix * objectNormal);');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uShellT;\nvarying vec2 vFurUv;\nvarying vec3 vFurViewPos;\nvarying vec3 vFurNormal;\nfloat furHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }')
        .replace('#include <alphatest_fragment>', 'vec2 grid = vFurUv * vec2(265.0, 165.0);\nvec2 cell = floor(grid);\nvec2 f = fract(grid) - 0.5;\nfloat strand = furHash(cell) * 0.72 + (1.0 - length(f * vec2(1.0, 0.72)) * 1.75) * 0.36;\nif (strand < uShellT * 0.82) discard;')
        .replace('#include <color_fragment>', '#include <color_fragment>\nfloat rim = pow(clamp(1.0 - abs(dot(normalize(vFurNormal), normalize(vFurViewPos))), 0.0, 1.0), 2.5);\ndiffuseColor.rgb *= mix(0.76, 1.12, uShellT);\ndiffuseColor.rgb += vec3(0.16, 0.09, 0.05) * rim * uShellT;');
    };
    return mat;
  }

  const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xd49d85, roughness: 0.86 });
  const earTuftMat = new THREE.MeshStandardMaterial({ color: 0xebd4bf, roughness: 0.94 });
  const glandMat = new THREE.MeshStandardMaterial({ color: 0x18100c, roughness: 0.38 });
  const hoofMat = new THREE.MeshStandardMaterial({ color: 0x4a3428, roughness: 0.58, metalness: 0.02 });
  const noseMat = activeProfile.physMat
    ? new THREE.MeshPhysicalMaterial({ color: 0x140f0e, roughness: 0.16, clearcoat: 0.92, clearcoatRoughness: 0.10 })
    : new THREE.MeshStandardMaterial({ color: 0x140f0e, roughness: 0.16 });
  const nostrilMat = new THREE.MeshStandardMaterial({ color: 0x050303, roughness: 0.94 });
  const eyeIrisMat = new THREE.MeshStandardMaterial({ color: 0x1b0c05, roughness: 0.10 });
  const eyeCorneaMat = activeProfile.physMat
    ? new THREE.MeshPhysicalMaterial({
        color: 0x090503, roughness: 0.02, metalness: 0.0,
        clearcoat: 1.0, clearcoatRoughness: 0.02, reflectivity: 1.0, envMapIntensity: 1.85
      })
    : new THREE.MeshStandardMaterial({ color: 0x0a0604, roughness: 0.04, metalness: 0.1 });
  const eyeGlintMat = new THREE.MeshBasicMaterial({ color: 0xfff8ee, transparent: true, opacity: 0.78 });
  const antlerMat = new THREE.MeshStandardMaterial({
    color: 0xd2c2aa,
    roughness: 0.56,
    bumpMap: furTex.bumpMap,
    bumpScale: 0.005
  });

  const root = new THREE.Group();
  const slopeGroup = new THREE.Group();
  root.add(slopeGroup);
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 0.275, 0);
  slopeGroup.add(bodyGroup);

  // Southern Pudu (Pudu puda) torso:
  // Compact ~35 cm shoulder-height Valdivian forest cervid: wedge-shaped front, flat shoulder/hip integration,
  // characteristic arched back ("roach back") with croup slightly higher than withers for navigating dense Chusquea thickets.
  const torsoGeo = new THREE.SphereGeometry(0.136, isEcoHardware ? 24 : 40, isEcoHardware ? 18 : 30);
  const tp = torsoGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    let x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i);
    const zn = z / 0.136;
    const yn = y / 0.136;
    z *= 1.72;

    // Streamlined wedge-like chest/shoulders tapering smoothly forward; gently rounded, non-bulging hindquarters
    const ribTaper = zn > 0
      ? (0.88 - 0.22 * zn * zn)
      : (0.89 + 0.06 * Math.sin(-zn * Math.PI * 0.74));
    x *= ribTaper * (yn < -0.15 ? 0.84 : 0.96);

    // Subtle low withers, distinct arched dorsal spine ("roach back"), and elevated croup
    const withers = Math.exp(-Math.pow(zn - 0.45, 2) / 0.14) * 0.007 * Math.max(0, yn);
    const spineArch = Math.exp(-Math.pow(zn + 0.08, 2) / 0.36) * 0.013 * Math.max(0, yn);
    const croup = Math.exp(-Math.pow(zn + 0.52, 2) / 0.24) * 0.025 * Math.max(0, yn);
    const bellyTuck = Math.exp(-Math.pow(zn + 0.14, 2) / 0.20) * 0.017 * Math.max(0, -yn);
    const brisket = Math.exp(-Math.pow(zn - 0.58, 2) / 0.16) * 0.013 * Math.max(0, -yn);

    y = y * 0.92 + withers + spineArch + croup + bellyTuck - brisket;
    if (y < 0) y *= 0.88;
    tp.setXYZ(i, x, y, z);
  }
  torsoGeo.computeVertexNormals();
  paintAnatomicalShade(torsoGeo, {
    topHex: 0xc29274,
    midHex: 0xf7e4d2,
    botHex: 0xfeefdf,
    dorsalDark: 0.36,
    bellyLight: 0.28
  });
  const torso = new THREE.Mesh(torsoGeo, puduUnifiedMat);
  torso.castShadow = activeProfile.shadows;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  // Sleek, naturally blended sternum/chest (tawny-beige to warm rufous transition)
  const chestGeo = paintAnatomicalShade(new THREE.SphereGeometry(0.076, 16, 14), {
    topHex: 0xdfac8c,
    midHex: 0xf6dfc9,
    botHex: 0xfef1e2,
    bellyLight: 0.28
  });
  chestGeo.scale(0.76, 1.08, 0.94);
  const chestMesh = new THREE.Mesh(chestGeo, puduUnifiedMat);
  chestMesh.position.set(0, -0.008, 0.144);
  chestMesh.castShadow = activeProfile.shadows;
  bodyGroup.add(chestMesh);

  const maxShells = isEcoHardware ? 0 : 6;
  for (let s = 1; s <= maxShells; s++) {
    const shell = new THREE.Mesh(torsoGeo, createFurShellMaterial(s / maxShells, 0.013));
    shell.userData.shellIndex = s;
    shell.visible = s <= activeProfile.furShells;
    bodyGroup.add(shell);
    furShellMeshes.push(shell);
  }

  // Neck: compact, agile, tapering smoothly from brisket/shoulders to the small conical cranium
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 0.030, 0.138);
  bodyGroup.add(neckPivot);
  const neckGeo = paintAnatomicalShade(createLatheLimb([
    [0.088, -0.026], [0.080, 0.014], [0.064, 0.070], [0.050, 0.130], [0.043, 0.168]
  ], isEcoHardware ? 14 : 22), {
    topHex: 0xd7ab8f,
    midHex: 0xf7e3d0,
    botHex: 0xfceee0,
    rufousFront: 0.20,
    bellyLight: 0.22
  });
  const neckMesh = new THREE.Mesh(neckGeo, puduUnifiedMat);
  neckMesh.rotation.x = 0.56;
  neckMesh.castShadow = activeProfile.shadows;
  neckMesh.receiveShadow = true;
  neckPivot.add(neckMesh);
  if (!isEcoHardware) {
    for (let s = 1; s <= 3; s++) {
      const ns = new THREE.Mesh(neckGeo, createFurShellMaterial(s / 4, 0.0095));
      ns.rotation.x = 0.56;
      ns.userData.shellIndex = s;
      ns.visible = s <= activeProfile.furShells;
      neckPivot.add(ns);
      furShellMeshes.push(ns);
    }
  }

  // Short stubby tail characteristic of Pudu puda
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.064, -0.218);
  const tailGeo = paintAnatomicalShade(new THREE.SphereGeometry(0.024, 12, 10), {
    topHex: 0x99654a,
    midHex: 0xe6cbb6,
    botHex: 0xfef4ea
  });
  tailGeo.scale(0.76, 0.74, 1.48);
  tailGeo.translate(0, -0.007, -0.015);
  const tailMesh = new THREE.Mesh(tailGeo, puduUnifiedMat);
  tailMesh.rotation.x = 0.62;
  tailMesh.castShadow = activeProfile.shadows;
  tailGroup.add(tailMesh);
  bodyGroup.add(tailGroup);

  // Head: small, conical, natural forehead with clean wedge muzzle and zero artificial bumps
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.128, 0.080);
  neckPivot.add(headPivot);

  const headGeo = new THREE.SphereGeometry(0.076, isEcoHardware ? 22 : 34, isEcoHardware ? 18 : 26);
  const hp = headGeo.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    let x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    const zn = z / 0.076;
    if (zn > 0) {
      const muzzleTaper = 1.0 - Math.pow(zn, 0.88) * 0.60;
      x *= muzzleTaper * 0.91;
      y *= (1.0 - zn * 0.48) * 0.90;
      z *= 1.56;
      y -= zn * 0.017;
    } else {
      x *= 0.92;
      y *= 0.92;
      z *= 1.08;
    }
    hp.setXYZ(i, x, y, z);
  }
  headGeo.computeVertexNormals();
  paintAnatomicalShade(headGeo, {
    topHex: 0xb68265,
    midHex: 0xf5e0cd,
    botHex: 0xfbeada,
    dorsalDark: 0.22,
    rufousFront: 0.20
  });
  const headMesh = new THREE.Mesh(headGeo, puduUnifiedMat);
  headMesh.castShadow = activeProfile.shadows;
  headMesh.receiveShadow = true;
  headPivot.add(headMesh);
  if (!isEcoHardware) {
    for (let s = 1; s <= 2; s++) {
      const hs = new THREE.Mesh(headGeo, createFurShellMaterial(s / 4, 0.0055));
      hs.userData.shellIndex = s;
      hs.visible = s <= activeProfile.furShells;
      headPivot.add(hs);
      furShellMeshes.push(hs);
    }
  }

  // Articulated lower jaw + soft beige-cream chin
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, -0.032, 0.042);
  const jawGeo = paintAnatomicalShade(new THREE.SphereGeometry(0.029, 14, 10), {
    topHex: 0xe2c7af,
    midHex: 0xf6e6d6,
    botHex: 0xfff5ea
  });
  jawGeo.scale(0.80, 0.42, 1.54);
  jawGeo.translate(0, -0.003, 0.032);
  jawPivot.add(new THREE.Mesh(jawGeo, puduUnifiedMat));
  headPivot.add(jawPivot);

  // Wet black leathery rhinarium + philtrum + delicate nostrils
  const noseGroup = new THREE.Group();
  noseGroup.position.set(0, -0.0150, 0.1180);
  const noseGeo = new THREE.SphereGeometry(0.0155, 16, 12);
  noseGeo.scale(1.10, 0.84, 0.86);
  const noseMesh = new THREE.Mesh(noseGeo, noseMat);
  noseGroup.add(noseMesh);
  const philtrum = new THREE.Mesh(new THREE.BoxGeometry(0.0018, 0.010, 0.0050), nostrilMat);
  philtrum.position.set(0, -0.0070, 0.0115);
  noseGroup.add(philtrum);
  const nostrilMeshes = [];
  for (const side of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 8, 8), nostrilMat);
    nostril.scale.set(0.70, 1.14, 0.68);
    nostril.position.set(side * 0.0068, -0.001, 0.0112);
    noseGroup.add(nostril);
    nostrilMeshes.push(nostril);
  }
  headPivot.add(noseGroup);

  // Detailed lifelike cervid eyes: amber/hazel iris ring, horizontal oval pupil, dual corneal glints & orbital rim
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050302 });
  const irisAmberMat = new THREE.MeshStandardMaterial({ color: 0x6e3d1d, roughness: 0.18 });
  const eyeGlintSubMat = new THREE.MeshBasicMaterial({ color: 0x9ac4b8, transparent: true, opacity: 0.45 });


  const eyelids = [];
  for (const side of [-1, 1]) {
    const eyeX = side * 0.0405, eyeY = 0.0145, eyeZ = 0.0455;

    // Dark scleral / orbital socket rim
    const socketRim = new THREE.Mesh(new THREE.TorusGeometry(0.0148, 0.0016, 6, 14), glandMat);
    socketRim.position.set(eyeX, eyeY, eyeZ);
    socketRim.rotation.y = side * 0.28;
    headPivot.add(socketRim);

    // Warm hazel-amber outer iris ring
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0144, 16, 12), irisAmberMat);
    iris.position.set(eyeX, eyeY, eyeZ);
    iris.scale.set(0.86, 1.0, 1.02);
    headPivot.add(iris);

    // Horizontal elongated oval deer pupil
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0078, 10, 8), pupilMat);
    pupil.scale.set(1.18, 0.52, 0.85); // Elongated horizontal pupil
    pupil.position.set(eyeX + side * 0.0015, eyeY, eyeZ + 0.0118);
    pupil.rotation.y = side * 0.26;
    headPivot.add(pupil);

    // Ultra-clear reflective cornea
    const cornea = new THREE.Mesh(new THREE.SphereGeometry(0.0150, 16, 12), eyeCorneaMat);
    cornea.position.copy(iris.position);
    cornea.scale.copy(iris.scale);
    headPivot.add(cornea);

    // Primary bright sky glint (upper forward)
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 8, 8), eyeGlintMat);
    glint.position.set(eyeX + side * 0.0028, eyeY + 0.0052, eyeZ + 0.0132);
    headPivot.add(glint);

    // Secondary subtle ground/vegetation bounce glint (lower backward)
    const glintSub = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 6, 6), eyeGlintSubMat);
    glintSub.position.set(eyeX - side * 0.0020, eyeY - 0.0038, eyeZ + 0.0125);
    headPivot.add(glintSub);

    // Anatomical eyelid
    const lidGeo = paintAnatomicalShade(
      new THREE.SphereGeometry(0.0160, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.50),
      { topHex: 0x996449, midHex: 0xb87e5e, botHex: 0x764933 }
    );
    const lid = new THREE.Mesh(lidGeo, puduUnifiedMat);
    lid.position.copy(iris.position);
    lid.scale.set(0.88, 1.0, 1.02);
    lid.rotation.x = -1.04;
    headPivot.add(lid);
    eyelids.push(lid);

    // Preorbital tear-gland slit in front of eye
    const glandGeo = typeof THREE.CapsuleGeometry === 'function'
      ? new THREE.CapsuleGeometry(0.0016, 0.0095, 4, 6)
      : new THREE.CylinderGeometry(0.0016, 0.0016, 0.0115, 6);
    const gland = new THREE.Mesh(glandGeo, glandMat);
    gland.position.set(side * 0.0325, 0.0080, 0.061);
    gland.rotation.set(0.96, side * 0.25, side * 0.42);
    headPivot.add(gland);
  }

  // Rounded Southern Pudu ears with concave inner pinna and pale cream-beige interior pelage
  const ears = [];
  for (const side of [-1, 1]) {
    const earPivot = new THREE.Group();
    earPivot.position.set(side * 0.044, 0.052, -0.021);
    earPivot.rotation.set(-0.14, side * 0.36, -side * 0.52);

    const outerGeo = new THREE.SphereGeometry(0.034, 16, 14);
    const op = outerGeo.attributes.position;
    for (let i = 0; i < op.count; i++) {
      let x = op.getX(i), y = op.getY(i), z = op.getZ(i);
      const yn = THREE.MathUtils.clamp((y + 0.034) / 0.068, 0, 1);
      x *= 0.90 * (1.0 - yn * 0.14);
      y *= 1.18;
      z *= 0.35;
      if (z > 0) z *= 0.30;
      op.setXYZ(i, x, y, z);
    }
    outerGeo.computeVertexNormals();
    outerGeo.translate(0, 0.033, 0);
    paintAnatomicalShade(outerGeo, { topHex: 0xeac2a8, midHex: 0xf7e3d1, botHex: 0xb68265 });
    const outer = new THREE.Mesh(outerGeo, puduUnifiedMat);
    outer.castShadow = activeProfile.shadows;
    earPivot.add(outer);

    const innerGeo = new THREE.SphereGeometry(0.023, 12, 10);
    innerGeo.scale(0.78, 1.08, 0.15);
    innerGeo.translate(0, 0.032, 0.0062);
    earPivot.add(new THREE.Mesh(innerGeo, innerEarMat));

    for (let t = -1; t <= 1; t++) {
      const tuftGeo = new THREE.SphereGeometry(0.0080, 8, 8);
      tuftGeo.scale(0.64, 1.35, 0.26);
      const tuft = new THREE.Mesh(tuftGeo, earTuftMat);
      tuft.position.set(t * 0.0042 - side * 0.002, 0.019 + Math.abs(t) * 0.002, 0.0080);
      tuft.rotation.z = -t * 0.24 - side * 0.12;
      earPivot.add(tuft);
    }

    headPivot.add(earPivot);
    ears.push(earPivot);
  }

  // Clean, unbranched simple spike antlers emerging cleanly from the frontal bone
  const antlersGroup = new THREE.Group();
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.0185, 0.053, -0.007),
      new THREE.Vector3(side * 0.0205, 0.075, -0.011),
      new THREE.Vector3(side * 0.0230, 0.100, -0.020),
      new THREE.Vector3(side * 0.0210, 0.124, -0.025)
    ]);
    const aGeo = new THREE.TubeGeometry(curve, 14, 0.0048, 10, false);
    const ap = aGeo.attributes.position;
    for (let i = 0; i < ap.count; i++) {
      const t = THREE.MathUtils.clamp((ap.getY(i) - 0.053) / 0.071, 0, 1);
      const c = curve.getPointAt(t);
      const taper = Math.max(0.14, 1.0 - Math.pow(t, 0.88) * 0.86);
      ap.setXYZ(
        i,
        c.x + (ap.getX(i) - c.x) * taper,
        ap.getY(i),
        c.z + (ap.getZ(i) - c.z) * taper
      );
    }
    aGeo.computeVertexNormals();
    const aMesh = new THREE.Mesh(aGeo, antlerMat);
    aMesh.castShadow = activeProfile.shadows;
    antlersGroup.add(aMesh);
  }
  headPivot.add(antlersGroup);

  // Delicate, pointed cloven hoof half-claw (charcoal/ebony keratin)
  function createClovenHoofToeGeo(toeSide) {
    const geo = new THREE.SphereGeometry(0.0052, 12, 10);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const yn = THREE.MathUtils.clamp((0.0052 - y) / 0.0104, 0, 1); // 0 top coronet -> 1 sole
      // Flat inner interdigital cleft face toward x = 0
      if (x * toeSide < 0) x *= 0.30;
      else x *= 0.78;

      // Delicate forward-pointing ungulate taper
      const widthTaper = 1.0 - yn * 0.28;
      x *= widthTaper;
      z = z * (1.48 - yn * 0.30) + yn * 0.0032;
      y *= 1.46;
      if (y < -0.0066) y = -0.0066 + (y + 0.0066) * 0.24;
      p.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // Slender, graceful, continuous single-mesh skinned cervid limbs:
  // Smooth flat scapula/hip insertion tucked cleanly into the flank, pencil-thin cannons,
  // refined non-bulbous joints, and delicate cloven hooves.
  function createUngulateLeg(isFront, side) {
    const hipX = side * (isFront ? 0.050 : 0.053);
    const hipY = isFront ? -0.008 : 0.012;
    const hipZ = isFront ? 0.116 : -0.138;

    const upperLen = isFront ? 0.095 : 0.112;
    const midLen = isFront ? 0.088 : 0.096;
    const cannonLen = isFront ? 0.062 : 0.068;

    const yKnee = -upperLen;
    const yAnkle = -(upperLen + midLen);
    const yFetlock = -(upperLen + midLen + cannonLen);
    const yCoronet = yFetlock - 0.0155;
    const totalFurLen = -yCoronet;

    const hipPivot = new THREE.Bone();
    hipPivot.position.set(hipX, hipY, hipZ);
    bodyGroup.add(hipPivot);

    const kneePivot = new THREE.Bone();
    kneePivot.position.set(0, -upperLen, 0);
    hipPivot.add(kneePivot);

    const anklePivot = new THREE.Bone();
    anklePivot.position.set(0, -midLen, 0);
    kneePivot.add(anklePivot);

    const fetlockPivot = new THREE.Bone();
    fetlockPivot.position.set(0, -cannonLen, 0);
    anklePivot.add(fetlockPivot);

    // Flat, smooth shoulder/hip integration & ultra-slender miniature deer limb profile (NO bodybuilder bulge):
    // [y, rx, rzF, rzB, cx, cz]
    const tuckX = -side * 0.012;
    const stations = isFront
      ? [
          [0.028, 0.0020, 0.0020, 0.0020, tuckX, 0.000],
          [0.020, 0.0088, 0.0102, 0.0108, tuckX * 0.85, 0.000],
          [0.004, 0.0094, 0.0108, 0.0114, tuckX * 0.45, 0.000], // Smooth flat scapula flush into ribcage
          [-0.022, 0.0084, 0.0096, 0.0102, tuckX * 0.15, -0.001],
          [yKnee * 0.52, 0.0072, 0.0082, 0.0088, 0.0, -0.001],
          [yKnee * 0.84, 0.0062, 0.0070, 0.0074, 0.0, 0.000],
          [yKnee, 0.0055, 0.0062, 0.0065, 0.0, 0.0005], // Slender elbow / upper forearm transition
          [yKnee - midLen * 0.24, 0.0048, 0.0054, 0.0058, 0.0, 0.000],
          [yKnee - midLen * 0.58, 0.0044, 0.0049, 0.0052, 0.0, 0.000],
          [yKnee - midLen * 0.86, 0.0041, 0.0045, 0.0048, 0.0, 0.000],
          [yAnkle, 0.0040, 0.0044, 0.0046, 0.0, 0.000], // Ultra-slender carpus ("knee")
          [yAnkle - cannonLen * 0.50, 0.0036, 0.0040, 0.0042, 0.0, 0.000], // Delicate pencil-thin metacarpal cannon
          [yFetlock, 0.0036, 0.0040, 0.0044, 0.0, 0.0004], // Delicate fetlock
          [yFetlock - 0.008, 0.0035, 0.0038, 0.0042, 0.0, 0.0018], // Fine pastern
          [yCoronet, 0.0034, 0.0038, 0.0040, 0.0, 0.0030], // Coronet band
          [yCoronet - 0.0025, 0.0015, 0.0015, 0.0015, 0.0, 0.0032]
        ]
      : [
          [0.032, 0.0020, 0.0020, 0.0020, tuckX, -0.002],
          [0.022, 0.0102, 0.0116, 0.0122, tuckX * 0.85, -0.002],
          [0.004, 0.0108, 0.0122, 0.0130, tuckX * 0.45, -0.002], // Smooth flat hip flush with croup (NO bulging muscles)
          [-0.026, 0.0096, 0.0110, 0.0118, tuckX * 0.15, -0.002],
          [yKnee * 0.54, 0.0084, 0.0095, 0.0104, 0.0, -0.001],
          [yKnee * 0.84, 0.0072, 0.0080, 0.0088, 0.0, 0.000],
          [yKnee, 0.0062, 0.0070, 0.0075, 0.0, 0.001], // Refined slender stifle
          [yKnee - midLen * 0.25, 0.0054, 0.0062, 0.0068, 0.0, 0.0008], // Slender gaskin
          [yKnee - midLen * 0.58, 0.0048, 0.0054, 0.0058, 0.0, -0.0008],
          [yKnee - midLen * 0.86, 0.0043, 0.0048, 0.0052, 0.0, -0.001],
          [yAnkle, 0.0042, 0.0048, 0.0054, 0.0, -0.001], // Fine angular hock/tarsus
          [yAnkle - cannonLen * 0.50, 0.0037, 0.0042, 0.0044, 0.0, 0.000], // Delicate pencil-thin metatarsal cannon
          [yFetlock, 0.0037, 0.0042, 0.0046, 0.0, 0.0004], // Delicate fetlock
          [yFetlock - 0.008, 0.0035, 0.0038, 0.0042, 0.0, 0.0018], // Fine pastern
          [yCoronet, 0.0034, 0.0038, 0.0040, 0.0, 0.0030], // Coronet band
          [yCoronet - 0.0025, 0.0015, 0.0015, 0.0015, 0.0, 0.0032]
        ];

    const splineData = stations.map((s) => ({
      y: s[0], rx: s[1], rzF: s[2], rzB: s[3], cx: s[4], cz: s[5]
    }));
    const ringCount = isEcoHardware ? 26 : 38;
    const radialSegs = isEcoHardware ? 12 : 18;

    const yCurve = new THREE.CatmullRomCurve3(splineData.map((d, idx) => new THREE.Vector3(idx / (splineData.length - 1), d.y, 0)));
    const rCurve = new THREE.CatmullRomCurve3(splineData.map((d) => new THREE.Vector3(d.rx, d.rzF, d.rzB)));
    const cCurve = new THREE.CatmullRomCurve3(splineData.map((d) => new THREE.Vector3(d.cx, d.cz, 0)));

    const positions = [];
    const uvs = [];
    const colors = [];
    const skinIndices = [];
    const skinWeights = [];
    const indices = [];

    // 100% unified with body pelage: warm rufous-chestnut tint, zero black/espresso contrast
    const cHip = new THREE.Color(0xf6dfc9);
    const cKnee = new THREE.Color(0xdfac8c);
    const cAnkle = new THREE.Color(0xd97f45);
    const cCoronet = new THREE.Color(0xc29274);
    const tmpCol = new THREE.Color();

    const wKnee = 0.022;
    const wAnkle = 0.018;
    const wFetlock = 0.011;

    for (let r = 0; r <= ringCount; r++) {
      const v = r / ringCount;
      const y = yCurve.getPointAt(v).y;
      const rPt = rCurve.getPointAt(v);
      const cPt = cCurve.getPointAt(v);

      const rx = Math.max(0.0014, rPt.x);
      const rzF = Math.max(0.0014, rPt.y);
      const rzB = Math.max(0.0014, rPt.z);
      const cx = cPt.x;
      const cz = cPt.y;

      const tGrad = THREE.MathUtils.clamp(-y / totalFurLen, 0, 1);
      if (tGrad < 0.36) tmpCol.copy(cHip).lerp(cKnee, tGrad / 0.36);
      else if (tGrad < 0.74) tmpCol.copy(cKnee).lerp(cAnkle, (tGrad - 0.36) / 0.38);
      else tmpCol.copy(cAnkle).lerp(cCoronet, (tGrad - 0.74) / 0.26);

      const t1 = smoothstep(yKnee + wKnee, yKnee - wKnee, y);
      const t2 = smoothstep(yAnkle + wAnkle, yAnkle - wAnkle, y);
      const t3 = smoothstep(yFetlock + wFetlock, yFetlock - wFetlock, y);
      let w0 = 1.0 - t1;
      let w1 = t1 * (1.0 - t2);
      let w2 = t2 * (1.0 - t3);
      let w3 = t3;
      const wSum = w0 + w1 + w2 + w3 || 1.0;
      w0 /= wSum; w1 /= wSum; w2 /= wSum; w3 /= wSum;

      for (let s = 0; s <= radialSegs; s++) {
        const u = s / radialSegs;
        const theta = u * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const x = cx + cosT * rx;
        const z = cz + 0.5 * (rzF - rzB) + sinT * 0.5 * (rzF + rzB);

        positions.push(x, y, z);
        // Sample flank fur grain consistently at warm rufous band matching body
        uvs.push(u, 0.46);
        colors.push(tmpCol.r, tmpCol.g, tmpCol.b);
        skinIndices.push(0, 1, 2, 3);
        skinWeights.push(w0, w1, w2, w3);
      }
    }

    const rowStride = radialSegs + 1;
    for (let r = 0; r < ringCount; r++) {
      for (let s = 0; s < radialSegs; s++) {
        const a = r * rowStride + s;
        const b = (r + 1) * rowStride + s;
        const c = (r + 1) * rowStride + (s + 1);
        const d = r * rowStride + (s + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const legGeo = new THREE.BufferGeometry();
    legGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    legGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    legGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    legGeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    legGeo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    legGeo.setIndex(indices);
    legGeo.computeVertexNormals();

    const legMesh = new THREE.SkinnedMesh(legGeo, puduUnifiedMat);
    legMesh.position.copy(hipPivot.position);
    legMesh.castShadow = activeProfile.shadows;
    legMesh.receiveShadow = true;
    legMesh.frustumCulled = false;
    bodyGroup.add(legMesh);

    bodyGroup.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton([hipPivot, kneePivot, anklePivot, fetlockPivot]);
    legMesh.bind(skeleton);

    // Subtle tiny rear dewclaws tucked cleanly behind the slender fetlock
    for (const dSide of [-1, 1]) {
      const dew = new THREE.Mesh(new THREE.ConeGeometry(0.0014, 0.0052, 6), hoofMat);
      dew.position.set(dSide * 0.0034, -0.0025, -0.0062);
      dew.rotation.x = -0.68;
      fetlockPivot.add(dew);
    }

    // Tiny, delicate cloven hooves in charcoal-ebony keratin (#1c1613)
    const hoofGroup = new THREE.Group();
    hoofGroup.position.set(0, -0.0165, 0.0056);
    for (const toeSide of [-1, 1]) {
      const toeGeo = createClovenHoofToeGeo(toeSide);
      const toe = new THREE.Mesh(toeGeo, hoofMat);
      toe.rotation.x = 0.14;
      toe.rotation.z = -toeSide * 0.025;
      toe.position.set(toeSide * 0.0033, -0.0030, 0.0018);
      toe.castShadow = activeProfile.shadows;
      hoofGroup.add(toe);
    }
    fetlockPivot.add(hoofGroup);

    const hoofAnchor = new THREE.Object3D();
    hoofAnchor.position.set(0, -0.0285, 0.0085);
    fetlockPivot.add(hoofAnchor);

    return { hipPivot, kneePivot, anklePivot, fetlockPivot, hoofAnchor, isFront, side };
  }

  const legs = {
    fl: createUngulateLeg(true, 1),
    fr: createUngulateLeg(true, -1),
    bl: createUngulateLeg(false, 1),
    br: createUngulateLeg(false, -1)
  };

  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.70),
    new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.76 })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.025;
  root.add(contactShadow);

  const hitMesh = new THREE.Mesh(new THREE.SphereGeometry(0.30, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hitMesh.position.set(0, 0.27, 0.04);
  root.add(hitMesh);

  return {
    root, slopeGroup, bodyGroup, neckPivot, headPivot, jawPivot,
    tailGroup, ears, eyelids, antlersGroup, legs, hitMesh,
    noseMesh, nostrilMeshes, chestMesh, contactShadow, furUniforms
  };
}