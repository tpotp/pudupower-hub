/**
 * Pudu 3D Wireframe Post-Render Companion (pudu-wireframe-invite.js)
 * 100% self-contained, zero external dependencies, Shadow DOM isolated, Canvas 2D 3D wireframe.
 *
 * Usage:
 *   window.showPuduWireframeInvite('ytp' | 'barsalitsuni' | 'simulator');
 *   // or:
 *   window.dispatchEvent(new CustomEvent('pudu:render-complete', { detail: { app: 'ytp' } }));
 */
(() => {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__PUDU_WIREFRAME_INVITE_LOADED__) return;
  window.__PUDU_WIREFRAME_INVITE_LOADED__ = true;

  const APPS = {
    ytp: {
      id: 'ytp',
      url: 'https://ytp.pudupower.com/',
      icon: '💩',
      accent: '#00ffaa',
      name: {
        es: 'Pudu Poop Maker',
        en: 'Pudu Poop Maker',
        pt: 'Pudu Poop Maker'
      },
      desc: {
        es: 'Generador YTP & caos sonoro en WebCodecs',
        en: 'Real-time YTP & sonic chaos in WebCodecs',
        pt: 'Gerador YTP e caos sonoro em WebCodecs'
      }
    },
    barsalitsuni: {
      id: 'barsalitsuni',
      url: 'https://barsalitsuni.pudupower.com/',
      icon: '🌌',
      accent: '#ff0055',
      name: {
        es: 'Barsalitsuni 3D',
        en: 'Barsalitsuni 3D',
        pt: 'Barsalitsuni 3D'
      },
      desc: {
        es: 'Sintetizador visual 3D & Seam Carving WASM',
        en: '3D visual synth & WASM Seam Carving',
        pt: 'Sintetizador visual 3D e Seam Carving WASM'
      }
    },
    simulator: {
      id: 'simulator',
      url: 'https://simulator.pudupower.com/',
      icon: '🦌',
      accent: '#ffb703',
      name: {
        es: 'PuduWorld 3D',
        en: 'PuduWorld 3D',
        pt: 'PuduWorld 3D'
      },
      desc: {
        es: 'Simulador 3D multijugador del bosque valdiviano',
        en: '3D multiplayer Valdivian forest simulator',
        pt: 'Simulador 3D multijogador da floresta valdiviana'
      }
    }
  };

  const I18N = {
    es: {
      badge: 'RENDER COMPLETADO · PUDÚ WIREFRAME',
      title: '¡Ichipi! Tu creación está lista ⚡',
      subtitle: 'El Pudú 3D te invita a seguir explorando el ecosistema de The Power of the Pudú:',
      hubBtn: '🏠 Volver al Menú Principal (pudupower.com)',
      tryAlso: 'Prueba también nuestras otras herramientas:',
      closeLabel: 'Cerrar invitación'
    },
    en: {
      badge: 'RENDER COMPLETE · PUDU WIREFRAME',
      title: 'Ichipi! Your creation is ready ⚡',
      subtitle: 'The 3D Pudu invites you to keep exploring The Power of the Pudu ecosystem:',
      hubBtn: '🏠 Back to Main Hub (pudupower.com)',
      tryAlso: 'Try our other tools too:',
      closeLabel: 'Close invite'
    },
    pt: {
      badge: 'RENDER CONCLUÍDO · PUDÚ WIREFRAME',
      title: 'Ichipi! Sua criação está pronta ⚡',
      subtitle: 'O Pudú 3D convida você a continuar explorando o ecossistema The Power of the Pudu:',
      hubBtn: '🏠 Voltar ao Menu Principal (pudupower.com)',
      tryAlso: 'Experimente também nossas outras ferramentas:',
      closeLabel: 'Fechar convite'
    }
  };

  function detectLang() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const q = (params.get('lang') || '').toLowerCase().slice(0, 2);
      if (q === 'es' || q === 'en' || q === 'pt') return q;

      const stored = (window.localStorage?.getItem('pudu_lang') || '').toLowerCase().slice(0, 2);
      if (stored === 'es' || stored === 'en' || stored === 'pt') return stored;
    } catch (_) {
      // ignore storage/URL errors
    }
    const nav = ((navigator.language || (navigator.languages && navigator.languages[0]) || 'en') + '').toLowerCase();
    if (nav.startsWith('es')) return 'es';
    if (nav.startsWith('pt')) return 'pt';
    return 'en';
  }

  // ─── 3D Pudú Wireframe Geometry (vertices [x,y,z], edges [i,j,colorGroup]) ───
  // Coordinate system: +X = forward (snout), +Y = up, +Z = right side
  function buildPuduMesh() {
    const V = [];
    const E = [];
    const addV = (x, y, z) => {
      V.push([x, y, z]);
      return V.length - 1;
    };
    const addE = (a, b, grp = 'body') => E.push([a, b, grp]);
    const connectLoop = (indices, grp = 'body') => {
      for (let i = 0; i < indices.length; i++) {
        addE(indices[i], indices[(i + 1) % indices.length], grp);
      }
    };
    const bridgeLoops = (l1, l2, grp = 'body') => {
      for (let i = 0; i < l1.length; i++) {
        addE(l1[i], l2[i], grp);
      }
    };

    // 1. Torso (3 octagonal rings: rump, mid, chest)
    const ring = (x, cy, ry, rz) => [
      addV(x, cy + ry, 0),
      addV(x, cy + ry * 0.65, rz * 0.72),
      addV(x, cy, rz),
      addV(x, cy - ry * 0.7, rz * 0.68),
      addV(x, cy - ry, 0),
      addV(x, cy - ry * 0.7, -rz * 0.68),
      addV(x, cy, -rz),
      addV(x, cy + ry * 0.65, -rz * 0.72)
    ];

    const rRump = ring(-0.78, 0.08, 0.34, 0.28);
    const rMid = ring(-0.1, 0.05, 0.42, 0.34);
    const rChest = ring(0.58, 0.12, 0.38, 0.30);

    connectLoop(rRump);
    connectLoop(rMid);
    connectLoop(rChest);
    bridgeLoops(rRump, rMid);
    bridgeLoops(rMid, rChest);

    // Tail stub
    const tailTip = addV(-1.05, 0.28, 0);
    addE(rRump[0], tailTip);
    addE(rRump[1], tailTip);
    addE(rRump[7], tailTip);

    // 2. Neck & Head
    const rNeck = [
      addV(0.68, 0.56, 0),
      addV(0.72, 0.42, 0.18),
      addV(0.78, 0.24, 0),
      addV(0.72, 0.42, -0.18)
    ];
    connectLoop(rNeck);
    addE(rChest[0], rNeck[0]);
    addE(rChest[1], rNeck[1]);
    addE(rChest[7], rNeck[3]);
    addE(rChest[2], rNeck[2]);
    addE(rChest[6], rNeck[2]);

    // Head cranium
    const hTop = addV(0.84, 0.88, 0);
    const hBackL = addV(0.64, 0.78, -0.19);
    const hBackR = addV(0.64, 0.78, 0.19);
    const hCheekL = addV(0.92, 0.58, -0.21);
    const hCheekR = addV(0.92, 0.58, 0.21);
    const hJaw = addV(0.92, 0.46, 0);
    const hBrowL = addV(1.04, 0.75, -0.14);
    const hBrowR = addV(1.04, 0.75, 0.14);

    // Snout & nose
    const sTop = addV(1.26, 0.64, 0);
    const sL = addV(1.24, 0.54, -0.09);
    const sR = addV(1.24, 0.54, 0.09);
    const sBot = addV(1.22, 0.48, 0);
    const nose = addV(1.34, 0.57, 0);

    addE(rNeck[0], hBackL);
    addE(rNeck[0], hBackR);
    addE(rNeck[3], hCheekL);
    addE(rNeck[1], hCheekR);
    addE(rNeck[2], hJaw);

    addE(hTop, hBackL);
    addE(hTop, hBackR);
    addE(hTop, hBrowL);
    addE(hTop, hBrowR);
    addE(hBackL, hCheekL);
    addE(hBackR, hCheekR);
    addE(hCheekL, hJaw);
    addE(hCheekR, hJaw);
    addE(hBrowL, hCheekL);
    addE(hBrowR, hCheekR);
    addE(hBrowL, hBrowR);

    addE(hBrowL, sTop);
    addE(hBrowR, sTop);
    addE(hCheekL, sL);
    addE(hCheekR, sR);
    addE(hJaw, sBot);
    addE(sTop, sL);
    addE(sTop, sR);
    addE(sL, sBot);
    addE(sR, sBot);
    addE(sTop, nose, 'accent');
    addE(sL, nose, 'accent');
    addE(sR, nose, 'accent');
    addE(sBot, nose, 'accent');

    // 3. Rounded Pudú Ears (left & right)
    [-1, 1].forEach((side) => {
      const eBase = side < 0 ? hBackL : hBackR;
      const eTip = addV(0.56, 1.12, side * 0.34);
      const eOut = addV(0.54, 0.96, side * 0.38);
      const eIn = addV(0.68, 1.04, side * 0.20);
      addE(eBase, eOut, 'ear');
      addE(eBase, eIn, 'ear');
      addE(eOut, eTip, 'ear');
      addE(eIn, eTip, 'ear');
      addE(hTop, eIn, 'ear');
    });

    // 4. Little Pudú Spike Antlers (cuernitos!)
    [-1, 1].forEach((side) => {
      const aBase = addV(0.84, 0.87, side * 0.08);
      const aMid = addV(0.79, 1.05, side * 0.12);
      const aTip = addV(0.74, 1.22, side * 0.14);
      addE(hTop, aBase, 'antler');
      addE(aBase, aMid, 'antler');
      addE(aMid, aTip, 'antler');
    });

    // 5. Four Little Legs (patitas)
    const legs = [
      { x: 0.44, z: 0.20 },   // front-right
      { x: 0.44, z: -0.20 },  // front-left
      { x: -0.58, z: 0.20 },  // back-right
      { x: -0.58, z: -0.20 }  // back-left
    ];
    legs.forEach(({ x, z }) => {
      const hipF = addV(x + 0.08, -0.22, z);
      const hipB = addV(x - 0.08, -0.22, z);
      const knee = addV(x + 0.02, -0.56, z * 1.05);
      const hoofF = addV(x + 0.06, -0.90, z * 1.04);
      const hoofB = addV(x - 0.05, -0.90, z * 1.04);
      addE(hipF, hipB, 'leg');
      addE(hipF, knee, 'leg');
      addE(hipB, knee, 'leg');
      addE(knee, hoofF, 'leg');
      addE(knee, hoofB, 'leg');
      addE(hoofF, hoofB, 'accent');
    });

    return { vertices: V, edges: E };
  }

  const MESH = buildPuduMesh();

  let hostEl = null;
  let shadow = null;
  let rafId = null;
  let keyHandler = null;

  function stopAnimation() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function closeInvite() {
    stopAnimation();
    if (keyHandler) {
      window.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    if (hostEl && hostEl.parentNode) {
      const card = shadow?.querySelector('.pudu-invite-card');
      if (card) {
        card.classList.remove('visible');
        setTimeout(() => {
          hostEl?.remove();
          hostEl = null;
          shadow = null;
        }, 260);
      } else {
        hostEl.remove();
        hostEl = null;
        shadow = null;
      }
    }
  }

  function normalizeAppKey(app) {
    const key = String(app || '').toLowerCase().trim();
    if (key === 'ytp' || key === 'puduloco' || key === 'poop') return 'ytp';
    if (key === 'barsalitsuni' || key === 'barsa') return 'barsalitsuni';
    if (key === 'simulator' || key === 'puduworld' || key === 'sim') return 'simulator';
    return '';
  }

  function startWireframeCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angleY = 0.6;
    let t = 0;

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth || 160;
      const cssH = canvas.clientHeight || 140;
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      t += 0.025;
      angleY += 0.022;
      const angleX = Math.sin(t * 0.7) * 0.14 + 0.12;
      const bobY = Math.sin(t * 1.4) * 0.04;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const scale = Math.min(cssW, cssH) * 0.42;
      const cx = cssW * 0.5;
      const cy = cssH * 0.52;
      const camDist = 3.4;

      const projected = MESH.vertices.map(([vx, vy, vz]) => {
        // Rotate around Y
        const x1 = vx * cosY - vz * sinY;
        const z1 = vx * sinY + vz * cosY;
        // Rotate around X
        const y2 = (vy + bobY) * cosX - z1 * sinX;
        const z2 = (vy + bobY) * sinX + z1 * cosX;

        const p = camDist / (camDist - z2);
        return [cx + x1 * scale * p, cy - y2 * scale * p, z2];
      });

      const colors = {
        body: '#00ffaa',
        ear: '#5effc8',
        leg: '#00d992',
        antler: '#ffb703',
        accent: '#ff0055'
      };

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < MESH.edges.length; i++) {
        const [a, b, grp] = MESH.edges[i];
        const pa = projected[a];
        const pb = projected[b];
        const depth = (pa[2] + pb[2]) * 0.5;
        const alpha = Math.max(0.35, Math.min(1, 0.72 + depth * 0.25));
        const col = colors[grp] || colors.body;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = col;
        ctx.lineWidth = grp === 'antler' ? 1.8 : 1.35;
        ctx.shadowColor = col;
        ctx.shadowBlur = grp === 'antler' ? 10 : 7;
        ctx.beginPath();
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
        ctx.stroke();
        ctx.restore();
      }

      // Draw glowing vertices
      ctx.save();
      ctx.fillStyle = '#eafff8';
      ctx.shadowColor = '#00ffaa';
      ctx.shadowBlur = 6;
      for (let i = 0; i < projected.length; i++) {
        const [px, py] = projected[i];
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
  }

  function showPuduWireframeInvite(currentApp) {
    const activeKey = normalizeAppKey(currentApp);
    const lang = detectLang();
    const copy = I18N[lang] || I18N.en;

    // Remove previous instance if open
    if (hostEl) {
      stopAnimation();
      hostEl.remove();
      hostEl = null;
    }

    hostEl = document.createElement('div');
    hostEl.id = 'pudu-wireframe-invite-host';
    hostEl.setAttribute('data-current-app', activeKey || 'unknown');
    hostEl.setAttribute('data-lang', lang);

    shadow = hostEl.attachShadow({ mode: 'open' });

    const otherApps = Object.values(APPS).filter((app) => app.id !== activeKey);

    const otherButtonsHtml = otherApps
      .map(
        (app) => `
      <a class="pudu-tool-btn" href="${app.url}" target="_blank" rel="noopener noreferrer" data-app="${app.id}" style="--accent:${app.accent}">
        <span class="pudu-tool-icon" aria-hidden="true">${app.icon}</span>
        <span class="pudu-tool-meta">
          <strong>${app.name[lang] || app.name.en}</strong>
          <small>${app.desc[lang] || app.desc.en}</small>
        </span>
        <span class="pudu-tool-arrow" aria-hidden="true">↗</span>
      </a>`
      )
      .join('');

    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 2147483640;
          font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
          pointer-events: none;
        }
        @media (max-width: 540px) {
          :host {
            right: 10px;
            left: 10px;
            bottom: 10px;
          }
        }
        .pudu-invite-card {
          pointer-events: auto;
          width: min(390px, calc(100vw - 20px));
          background: linear-gradient(155deg, rgba(7, 15, 11, 0.96) 0%, rgba(10, 22, 16, 0.95) 100%);
          border: 1px solid rgba(0, 255, 170, 0.45);
          border-radius: 20px;
          padding: 16px;
          color: #f4f7f5;
          box-shadow: 0 22px 55px rgba(0, 0, 0, 0.85), 0 0 28px rgba(0, 255, 170, 0.22);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transform: translateY(28px) scale(0.95);
          opacity: 0;
          transition: transform 0.34s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease;
          box-sizing: border-box;
        }
        .pudu-invite-card.visible {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
        .pudu-top {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pudu-canvas-wrap {
          flex: 0 0 118px;
          height: 104px;
          border-radius: 14px;
          background: radial-gradient(circle at 50% 50%, rgba(0, 255, 170, 0.14), rgba(4, 9, 7, 0.92));
          border: 1px solid rgba(0, 255, 170, 0.28);
          overflow: hidden;
          position: relative;
        }
        canvas.pudu-wire-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
        .pudu-header {
          flex: 1;
          min-width: 0;
        }
        .pudu-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #00ffaa;
          background: rgba(0, 255, 170, 0.12);
          border: 1px solid rgba(0, 255, 170, 0.32);
          padding: 2px 8px;
          border-radius: 999px;
          margin-bottom: 6px;
        }
        .pudu-title {
          margin: 0 0 4px;
          font-size: 15px;
          font-weight: 800;
          line-height: 1.25;
          color: #ffffff;
        }
        .pudu-subtitle {
          margin: 0;
          font-size: 12px;
          line-height: 1.4;
          color: rgba(235, 245, 240, 0.78);
        }
        .pudu-close {
          position: absolute;
          top: 10px;
          right: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #d0dbd5;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 13px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
        }
        .pudu-close:hover {
          background: rgba(255, 0, 85, 0.25);
          color: #ffffff;
        }
        .pudu-hub-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 12px;
          padding: 10px 14px;
          border-radius: 12px;
          background: linear-gradient(90deg, rgba(0, 255, 170, 0.2), rgba(255, 183, 3, 0.16));
          border: 1px solid rgba(0, 255, 170, 0.55);
          color: #ffffff;
          text-decoration: none;
          font-size: 12.5px;
          font-weight: 800;
          letter-spacing: 0.03em;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .pudu-hub-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(0, 255, 170, 0.25);
        }
        .pudu-divider {
          margin: 11px 0 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(255, 183, 3, 0.9);
        }
        .pudu-tools {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .pudu-tool-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 11px;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
          text-decoration: none;
          transition: border-color 0.2s, background 0.2s, transform 0.18s;
        }
        .pudu-tool-btn:hover {
          border-color: var(--accent, #00ffaa);
          background: rgba(0, 255, 170, 0.09);
          transform: translateX(3px);
        }
        .pudu-tool-icon {
          font-size: 20px;
          flex-shrink: 0;
        }
        .pudu-tool-meta {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }
        .pudu-tool-meta strong {
          font-size: 12.5px;
          color: #ffffff;
        }
        .pudu-tool-meta small {
          font-size: 11px;
          color: rgba(230, 240, 235, 0.7);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pudu-tool-arrow {
          font-size: 14px;
          color: var(--accent, #00ffaa);
          font-weight: 700;
        }
      </style>
      <aside class="pudu-invite-card" role="dialog" aria-label="${copy.title}">
        <button type="button" class="pudu-close" aria-label="${copy.closeLabel}">✕</button>
        <div class="pudu-top">
          <div class="pudu-canvas-wrap">
            <canvas class="pudu-wire-canvas" aria-hidden="true"></canvas>
          </div>
          <div class="pudu-header">
            <span class="pudu-badge">${copy.badge}</span>
            <h4 class="pudu-title">${copy.title}</h4>
            <p class="pudu-subtitle">${copy.subtitle}</p>
          </div>
        </div>
        <a class="pudu-hub-btn" href="https://pudupower.com/" target="_blank" rel="noopener noreferrer">
          ${copy.hubBtn}
        </a>
        <div class="pudu-divider">${copy.tryAlso}</div>
        <div class="pudu-tools">${otherButtonsHtml}</div>
      </aside>
    `;

    document.body.appendChild(hostEl);

    const card = shadow.querySelector('.pudu-invite-card');
    const closeBtn = shadow.querySelector('.pudu-close');
    const canvas = shadow.querySelector('.pudu-wire-canvas');

    closeBtn?.addEventListener('click', closeInvite);
    keyHandler = (e) => {
      if (e.key === 'Escape') closeInvite();
    };
    window.addEventListener('keydown', keyHandler);

    if (canvas) startWireframeCanvas(canvas);
    requestAnimationFrame(() => {
      card?.classList.add('visible');
    });

    return hostEl;
  }

  window.showPuduWireframeInvite = showPuduWireframeInvite;
  window.hidePuduWireframeInvite = closeInvite;

  window.addEventListener('pudu:render-complete', (ev) => {
    const detail = ev?.detail;
    const app = typeof detail === 'string' ? detail : detail?.app;
    showPuduWireframeInvite(app);
  });
})();
