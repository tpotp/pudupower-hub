/**
 * Pudú 3D Floating Badge / Embeddable Widget (https://pudupower.com/widget/pudu-badge.js)
 * Zero-dependency, Shadow DOM isolated, dofollow backlink magnet.
 * Uso: <script src="https://pudupower.com/widget/pudu-badge.js" data-theme="neon" data-pos="bottom-right" defer></script>
 */
(() => {
  if (window.__PUDU_BADGE_LOADED__) return;
  window.__PUDU_BADGE_LOADED__ = true;

  const scriptEl = document.currentScript;
  const pos = scriptEl?.getAttribute('data-pos') || 'bottom-right';
  const theme = scriptEl?.getAttribute('data-theme') || 'neon';
  const hostOrigin = encodeURIComponent(window.location.hostname || 'external');
  const targetHref = `https://pudupower.com/?utm_source=pudu_badge&utm_medium=embed_widget&utm_campaign=backlink_loop&utm_content=${hostOrigin}`;

  const host = document.createElement('div');
  host.id = 'pudu-power-widget-host';
  const shadow = host.attachShadow({ mode: 'open' });

  const posStyle = pos === 'bottom-left' ? 'left: 18px; right: auto;' : 'right: 18px; left: auto;';
  const accent = theme === 'gold' ? '#ffb703' : '#00ffaa';

  shadow.innerHTML = `
    <style>
      .pudu-wrap {
        position: fixed;
        bottom: 18px;
        ${posStyle}
        z-index: 2147483000;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .pudu-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px 8px 10px;
        border-radius: 999px;
        background: rgba(7, 11, 9, 0.92);
        border: 1.5px solid ${accent};
        color: #f4f7f5;
        text-decoration: none;
        box-shadow: 0 10px 28px rgba(0,0,0,0.6), 0 0 16px ${accent}44;
        backdrop-filter: blur(10px);
        transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease;
        perspective: 400px;
      }
      .pudu-card:hover {
        transform: translateY(-3px) scale(1.03);
        box-shadow: 0 14px 34px rgba(0,0,0,0.75), 0 0 24px ${accent}88;
      }
      .pudu-3d-orb {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 20px;
        background: radial-gradient(circle at 30% 30%, ${accent}55, #0a140e 75%);
        border: 1px solid ${accent}88;
        animation: puduSpin3D 5s infinite ease-in-out;
        transform-style: preserve-3d;
      }
      @keyframes puduSpin3D {
        0%, 100% { transform: rotateY(-14deg) rotateX(6deg); }
        50% { transform: rotateY(14deg) rotateX(-6deg); }
      }
      .pudu-meta {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
      }
      .pudu-title {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: ${accent};
        text-transform: uppercase;
      }
      .pudu-sub {
        font-size: 10px;
        color: rgba(244,247,245,0.8);
      }
    </style>
    <div class="pudu-wrap">
      <a class="pudu-card" href="${targetHref}" target="_blank" rel="noopener" title="Explora The Power of the Pudú — Hub 3D &amp; Metal Progresivo">
        <span class="pudu-3d-orb" aria-hidden="true">🦌</span>
        <span class="pudu-meta">
          <span class="pudu-title">Pudú Power 3D</span>
          <span class="pudu-sub">WebGL · YTP · Metal</span>
        </span>
      </a>
    </div>
  `;

  document.body.appendChild(host);
})();
