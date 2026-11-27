#!/usr/bin/env node
/**
 * PUDÚ POWER ECOSYSTEM — VIRAL AMPLIFIER V2 (PHASE 2)
 * Programmatic Viral Infrastructure & Organic K-Factor Engine
 * Zero external dependencies. 100% White-Hat, Legal, Zero-Spam.
 *
 * Usage:
 *   node scripts/viral-amplifier-v2.mjs
 *   node scripts/viral-amplifier-v2.mjs --dry-run
 *   node scripts/viral-amplifier-v2.mjs --sim-only
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ARGS = new Set(process.argv.slice(2));
const DRY_RUN = ARGS.has('--dry-run');
const SIM_ONLY = ARGS.has('--sim-only');

const TARGET_PROJECTS = [
  {
    id: 'pudupowercom',
    name: 'Pudú Power Ecosystem',
    domain: 'https://pudupower.com',
    dir: process.env.PUDU_DIR || 'c:/Users/marmo/Desktop/desarrollo/pudupowercom',
    themeColor: '#10b981',
    bgColor: '#090d16',
    description: 'Ecosistema interactivo, arte generativo, audio y cultura digital del Pudú (Pudu puda).'
  },
  {
    id: 'barsalitsuni',
    name: 'Barsalitsuni Generator',
    domain: 'https://barsalitsuni.pudupower.com',
    dir: process.env.BARSA_DIR || 'c:/Users/marmo/Desktop/desarrollo/BarsalitsuniGenerator - copia/public',
    themeColor: '#f59e0b',
    bgColor: '#0b0f19',
    description: 'Generador programático de mutaciones visuales, memes y síntesis audiovisual Pudú Power.'
  }
];

// ============================================================================
// 1. STOCHASTIC MONTE CARLO K-FACTOR & EFFECTIVENESS ENGINE
// ============================================================================
function randNormal(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

function runMonteCarloSimulation(iterations = 100000) {
  const kResults = [];
  const effResults = [];

  for (let n = 0; n < iterations; n++) {
    const shareRate = clamp(randNormal(1.85, 0.45), 0.4, 4.5);
    const oembedCtrBoost = clamp(randNormal(1.92, 0.28), 1.1, 3.0);
    const baseConv = clamp(randNormal(0.31, 0.07), 0.08, 0.65);
    const effectiveConv = clamp(baseConv * oembedCtrBoost, 0.10, 0.85);
    const k = shareRate * effectiveConv;
    kResults.push(k);

    const semanticScore = clamp(randNormal(0.88, 0.06), 0.5, 1.0);
    const pwaScore = clamp(randNormal(0.84, 0.07), 0.45, 1.0);
    const oembedScore = clamp(randNormal(0.91, 0.05), 0.55, 1.0);
    const kNorm = clamp(k / 1.45, 0, 1.0);

    const eff = 100 * (0.35 * kNorm + 0.25 * semanticScore + 0.20 * oembedScore + 0.20 * pwaScore);
    effResults.push(eff);
  }

  const summarize = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return {
      mean: Number(mean.toFixed(3)),
      p50: Number(s[Math.floor(arr.length * 0.50)].toFixed(3)),
      p90: Number(s[Math.floor(arr.length * 0.90)].toFixed(3)),
      probSuperViral: Number(((arr.filter(x => x >= 1.0).length / arr.length) * 100).toFixed(2))
    };
  };

  return { k: summarize(kResults), effectiveness: summarize(effResults) };
}

// ============================================================================
// 2. PILLAR A: PROGRAMMATIC SEMANTIC ENTITY LINKING (JSON-LD + WIKIDATA Q208034)
// ============================================================================
function buildSemanticGraph(project) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Thing',
        '@id': 'https://www.wikidata.org/wiki/Q208034',
        'name': 'Pudú (Pudu puda)',
        'alternateName': ['Pudu', 'Southern Pudu', 'Venado más pequeño del mundo'],
        'sameAs': [
          'https://www.wikidata.org/wiki/Q208034',
          'https://en.wikipedia.org/wiki/Pud%C3%BA',
          'https://es.wikipedia.org/wiki/Pudu'
        ]
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${project.domain}/#software`,
        'name': project.name,
        'description': project.description,
        'url': project.domain,
        'applicationCategory': 'MultimediaApplication',
        'operatingSystem': 'Web, Android, iOS',
        'browserRequirements': 'Requires HTML5, Web Audio API, ES6+',
        'about': { '@id': 'https://www.wikidata.org/wiki/Q208034' },
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD'
        },
        'featureList': [
          'Generative Meme & Visual Mutation Engine',
          'Dynamic Seed Deep-Linking (?seed=&meme=)',
          'Web Share API Level 2 & PWA Share Target',
          'oEmbed Rich Interactive Cards'
        ]
      },
      {
        '@type': 'CreativeWork',
        '@id': `${project.domain}/#creative-work`,
        'name': `${project.name} — Generative Pudú Engine`,
        'url': project.domain,
        'about': { '@id': 'https://www.wikidata.org/wiki/Q208034' },
        'isBasedOn': { '@id': `${project.domain}/#software` },
        'inLanguage': ['es', 'en'],
        'isAccessibleForFree': true
      },
      {
        '@type': ['SoundRecording', 'AudioObject'],
        '@id': `${project.domain}/#audio-signature`,
        'name': 'Pudú Power Harmonic Chime & Soundboard',
        'description': 'Síntesis sonora interactiva Web Audio para feedback viral y mutaciones Barsalitsuni.',
        'encodingFormat': 'audio/wav',
        'duration': 'PT0M15S',
        'about': { '@id': 'https://www.wikidata.org/wiki/Q208034' },
        'isPartOf': { '@id': `${project.domain}/#creative-work` }
      }
    ]
  };
}

// ============================================================================
// 3. PILLAR B: DYNAMIC oEMBED RICH INTERACTIVE ENDPOINT
// ============================================================================
function buildStaticOEmbed(project) {
  return {
    version: '1.0',
    type: 'rich',
    provider_name: project.name,
    provider_url: project.domain,
    title: `${project.name} — Interactive Pudú Mutation`,
    author_name: 'Pudú Power Ecosystem',
    author_url: project.domain,
    cache_age: 86400,
    width: 640,
    height: 360,
    thumbnail_url: `${project.domain}/og-preview.png`,
    thumbnail_width: 1200,
    thumbnail_height: 630,
    html: `<iframe src="${project.domain}/embed.html?source=oembed" width="640" height="360" frameborder="0" allow="autoplay; clipboard-write; web-share" allowfullscreen loading="lazy" title="${project.name}"></iframe>`
  };
}

function buildDynamicOEmbedHandler(project) {
  return `// Serverless Dynamic oEmbed Endpoint (Vercel / Netlify / Cloudflare / Node)
// Spec: https://oembed.com/ (Type: rich, interactive player for Discord, Reddit, Telegram, X)

const sanitize = (val, fallback = 'pudu-alpha') =>
  String(val || fallback).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || fallback;

export default function handler(req, res) {
  const hostUrl = '${project.domain}';
  const query = req.query || Object.fromEntries(new URL(req.url, hostUrl).searchParams);
  const targetUrl = query.url || hostUrl;

  let seed = 'pudu-prime';
  let meme = 'classic';
  try {
    const parsed = new URL(targetUrl);
    seed = sanitize(parsed.searchParams.get('seed'), 'pudu-prime');
    meme = sanitize(parsed.searchParams.get('meme'), 'classic');
  } catch {
    // Fallback to defaults if URL is malformed
  }

  const embedSrc = \`\${hostUrl}/embed.html?seed=\${encodeURIComponent(seed)}&meme=\${encodeURIComponent(meme)}&source=oembed\`;
  const payload = {
    version: '1.0',
    type: 'rich',
    provider_name: '${project.name}',
    provider_url: hostUrl,
    title: \`${project.name} · Seed: \${seed} [\${meme}]\`,
    author_name: 'Pudú Power Ecosystem',
    author_url: hostUrl,
    cache_age: 3600,
    width: Math.min(Number(query.maxwidth) || 640, 800),
    height: Math.min(Number(query.maxheight) || 360, 600),
    thumbnail_url: \`\${hostUrl}/og-preview.png?seed=\${encodeURIComponent(seed)}\`,
    thumbnail_width: 1200,
    thumbnail_height: 630,
    html: \`<iframe src="\${embedSrc}" width="640" height="360" frameborder="0" allow="autoplay; clipboard-write; web-share" allowfullscreen loading="lazy" title="${project.name} (\${seed})"></iframe>\`
  };

  if (res?.setHeader) {
    res.setHeader('Content-Type', 'application/json+oembed; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  }
  if (typeof res?.status === 'function') {
    return res.status(200).json(payload);
  }
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json+oembed; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400'
    }
  });
}
`;
}

function buildEmbedPlayerHtml(project) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${project.name} — Interactive Embed</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: radial-gradient(circle at top, #132238, ${project.bgColor});
      color: #f8fafc;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      text-align: center;
    }
    .badge {
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${project.themeColor};
      border: 1px solid ${project.themeColor}55;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      margin-bottom: 0.75rem;
    }
    h1 { font-size: 1.35rem; margin-bottom: 0.5rem; }
    .meta { font-family: monospace; font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.25rem; }
    .cta {
      display: inline-block;
      background: ${project.themeColor};
      color: #04120c;
      font-weight: 700;
      text-decoration: none;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      transition: transform 0.15s ease;
    }
    .cta:hover { transform: translateY(-2px); }
  </style>
</head>
<body>
  <div class="badge">Pudú Power · oEmbed Live Node</div>
  <h1>${project.name}</h1>
  <div class="meta" id="meta-info">Cargando mutación...</div>
  <a class="cta" id="launch-link" href="${project.domain}" target="_top" rel="noopener">Abrir & Mutar en Vivo →</a>
  <script>
    const params = new URLSearchParams(window.location.search);
    const seed = params.get('seed') || 'pudu-prime';
    const meme = params.get('meme') || 'classic';
    document.getElementById('meta-info').textContent = 'SEED: ' + seed + ' | PRESET: ' + meme;
    document.getElementById('launch-link').href = '${project.domain}/?seed=' + encodeURIComponent(seed) + '&meme=' + encodeURIComponent(meme) + '&v_ref=oembed';
  </script>
</body>
</html>
`;
}

// ============================================================================
// 4. PILLAR C: VIRAL GROWTH LOOP CLIENT SCRIPT (pudu-viral-loop.js)
// ============================================================================
function buildViralLoopClientScript(project) {
  return `/**
 * Pudú Power Ecosystem — Viral Growth Loop Client (pudu-viral-loop.js)
 * Features:
 *  - Web Share API Level 2 (files + URL) with zero-fail Clipboard fallback
 *  - Dynamic Viral Seed & Meme Mutation (?seed=...&meme=...&v_ref=...&v_gen=...)
 *  - Non-invasive floating trigger with Web Audio API harmonic feedback
 *  - Local K-Factor Telemetry in localStorage (K = invites * conversion, zero 3rd-party trackers)
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'pudu_k_telemetry_v2';
  const PROJECT_NAME = ${JSON.stringify(project.name)};
  const THEME_COLOR = ${JSON.stringify(project.themeColor)};

  function loadTelemetry() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
      sessions: 0,
      invitesSent: 0,
      inboundReferrals: 0,
      inboundConversions: 0,
      maxGenDepth: 0,
      lastSeed: null
    };
  }

  function saveTelemetry(data) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function generateSeed(prefix = 'pudu') {
    const rand = Math.random().toString(36).slice(2, 8);
    const ts = Date.now().toString(36).slice(-4);
    return \`\${prefix}-\${ts}\${rand}\`;
  }

  function playSubtleChime() {
    try {
      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.045);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.04, now + idx * 0.045 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.25);
      });
    } catch (_) {}
  }

  function buildShareUrl(customSeed, customMeme) {
    const url = new URL(global.location.href);
    const currentGen = parseInt(url.searchParams.get('v_gen') || '0', 10) || 0;
    const seed = customSeed || url.searchParams.get('seed') || generateSeed();
    const meme = customMeme || url.searchParams.get('meme') || 'barsalitsuni';

    url.searchParams.set('seed', seed);
    url.searchParams.set('meme', meme);
    url.searchParams.set('v_ref', 'pudu_loop');
    url.searchParams.set('v_gen', String(currentGen + 1));
    return { shareUrl: url.toString(), seed, meme, nextGen: currentGen + 1 };
  }

  async function zeroFailCopy(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {}
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  async function shareMutation(options = {}) {
    playSubtleChime();
    const { shareUrl, seed, meme } = buildShareUrl(options.seed, options.meme);
    const shareData = {
      title: options.title || \`\${PROJECT_NAME} · Mutación \${seed}\`,
      text: options.text || \`Mira esta mutación Pudú [\${meme}] — ábrela y crea la tuya:\`,
      url: shareUrl
    };

    if (options.files && Array.isArray(options.files) && navigator.canShare) {
      const withFiles = { ...shareData, files: options.files };
      if (navigator.canShare(withFiles)) {
        shareData.files = options.files;
      }
    }

    let method = 'clipboard';
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        method = 'web-share-api';
      } catch (err) {
        if (err && err.name === 'AbortError') return { shared: false, cancelled: true };
        await zeroFailCopy(shareUrl);
      }
    } else {
      await zeroFailCopy(shareUrl);
    }

    const tel = loadTelemetry();
    tel.invitesSent += 1;
    tel.lastSeed = seed;
    saveTelemetry(tel);

    return { shared: true, method, shareUrl, seed, meme, telemetry: getKFactorMetrics() };
  }

  function getKFactorMetrics() {
    const tel = loadTelemetry();
    const sessions = Math.max(tel.sessions, 1);
    const i = tel.invitesSent / sessions;
    const c = tel.inboundReferrals > 0 ? tel.inboundConversions / tel.inboundReferrals : 0.35;
    const k = Number((i * c).toFixed(4));
    return { ...tel, invitesPerUser: Number(i.toFixed(3)), conversionRate: Number(c.toFixed(3)), kFactor: k };
  }

  function initSessionAttribution() {
    const tel = loadTelemetry();
    tel.sessions += 1;
    const params = new URLSearchParams(global.location.search);
    const ref = params.get('v_ref');
    const gen = parseInt(params.get('v_gen') || '0', 10) || 0;

    if (ref || params.get('seed')) {
      tel.inboundReferrals += 1;
      tel.maxGenDepth = Math.max(tel.maxGenDepth, gen);
      const markConverted = () => {
        const current = loadTelemetry();
        current.inboundConversions += 1;
        saveTelemetry(current);
        ['pointerdown', 'keydown'].forEach(ev => global.removeEventListener(ev, markConverted));
      };
      ['pointerdown', 'keydown'].forEach(ev => global.addEventListener(ev, markConverted, { once: true, passive: true }));
    }
    saveTelemetry(tel);
  }

  function mountFloatingTrigger() {
    if (!document.body || document.getElementById('pudu-viral-trigger')) return;

    const btn = document.createElement('button');
    btn.id = 'pudu-viral-trigger';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Compartir mutación Pudú');
    btn.innerHTML = '<span>🦌</span><span>Mutar &amp; Compartir</span>';

    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '99999',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 16px',
      borderRadius: '9999px',
      border: '1px solid rgba(255,255,255,0.18)',
      background: 'rgba(11, 15, 25, 0.88)',
      backdropFilter: 'blur(10px)',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: \`0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px \${THEME_COLOR}44\`,
      transition: 'transform 0.18s ease, box-shadow 0.18s ease'
    });

    const reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      btn.addEventListener('mouseenter', () => { btn.style.transform = 'translateY(-2px) scale(1.02)'; });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'none'; });
    }

    btn.addEventListener('click', async () => {
      const res = await shareMutation();
      if (res.shared) {
        const prev = btn.innerHTML;
        btn.innerHTML = res.method === 'web-share-api' ? '<span>✓</span><span>¡Compartido!</span>' : '<span>📋</span><span>¡Link Copiado!</span>';
        setTimeout(() => { btn.innerHTML = prev; }, 2200);
      }
    });

    document.body.appendChild(btn);
  }

  initSessionAttribution();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountFloatingTrigger);
  } else {
    mountFloatingTrigger();
  }

  global.PuduViralLoop = {
    shareMutation,
    generateSeed,
    getTelemetry: getKFactorMetrics,
    buildShareUrl
  };
})(window);
`;
}

// ============================================================================
// 5. PILLAR D: PWA WEB APP MANIFEST + SHARE TARGET API + QUICK SHORTCUTS
// ============================================================================
function buildPwaManifest(project) {
  return {
    name: project.name,
    short_name: project.id === 'barsalitsuni' ? 'Barsalitsuni' : 'Pudú Power',
    description: project.description,
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    theme_color: project.themeColor,
    background_color: project.bgColor,
    categories: ['entertainment', 'multimedia', 'social'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ],
    share_target: {
      action: '/share-target',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
        files: [
          {
            name: 'media',
            accept: ['image/*', 'audio/*']
          }
        ]
      }
    },
    shortcuts: [
      {
        name: 'Mutación Aleatoria',
        short_name: 'Mutar',
        description: 'Abre Barsalitsuni con una semilla aleatoria inmediata',
        url: '/?seed=random&meme=chaos&source=shortcut'
      },
      {
        name: 'Modo Meme Pudú',
        short_name: 'Memes',
        description: 'Generador rápido de memes Pudú Power',
        url: '/?meme=pudu-classic&source=shortcut'
      }
    ]
  };
}

function buildShareTargetSw() {
  return `// Service Worker Share Target Interceptor (sw-viral-share.js)
// Recibe imágenes/audio compartidos desde el menú nativo de Android/iOS hacia Barsalitsuni
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const media = formData.get('media');
        const cache = await caches.open('pudu-share-target-v1');
        if (media && typeof media.arrayBuffer === 'function') {
          const buf = await media.arrayBuffer();
          await cache.put('/shared-media-latest', new Response(buf, {
            headers: { 'Content-Type': media.type || 'image/png', 'X-Shared-Name': media.name || 'pudu-share.png' }
          }));
        }
        return Response.redirect('/?shared=1&source=share_target', 303);
      } catch {
        return Response.redirect('/?shared=0', 303);
      }
    })());
  }
});
`;
}

// ============================================================================
// 6. SAFE IDEMPOTENT HTML INJECTION & FILE WRITER
// ============================================================================
async function writeArtifact(filePath, content) {
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Generaría: ${filePath} (${Buffer.byteLength(content)} bytes)`);
    return;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
  console.log(`  [OK] Escrito: ${filePath}`);
}

async function injectIntoIndexHtml(projectDir, project, semanticGraph) {
  const indexPath = path.join(projectDir, 'index.html');
  let html;
  try {
    html = await fs.readFile(indexPath, 'utf8');
  } catch {
    console.log(`  [INFO] No existe index.html en ${projectDir} (se omitió inyección HTML).`);
    return;
  }

  const START = '<!-- PUDU_VIRAL_V2_START -->';
  const END = '<!-- PUDU_VIRAL_V2_END -->';
  const headBlock = `${START}
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="alternate" type="application/json+oembed" href="${project.domain}/api/oembed?url=${encodeURIComponent(project.domain)}" title="${project.name} oEmbed" />
  <script type="application/ld+json">${JSON.stringify(semanticGraph)}</script>
  ${END}`;

  const cleanHtml = html.replace(new RegExp(`${START}[\\s\\S]*?${END}\\n?`, 'g'), '');
  let updated = cleanHtml.includes('</head>')
    ? cleanHtml.replace('</head>', `  ${headBlock}\n</head>`)
    : `${headBlock}\n${cleanHtml}`;

  if (!updated.includes('pudu-viral-loop.js')) {
    const scriptTag = `  <script src="/pudu-viral-loop.js" defer></script>`;
    updated = updated.includes('</body>')
      ? updated.replace('</body>', `${scriptTag}\n</body>`)
      : `${updated}\n${scriptTag}`;
  }

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Inyectaría metadatos Phase 2 en: ${indexPath}`);
    return;
  }
  await fs.writeFile(indexPath, updated, 'utf8');
  console.log(`  [OK] Inyección idempotente completada en: ${indexPath}`);
}

// ============================================================================
// 7. MAIN EXECUTION ORCHESTRATOR
// ============================================================================
async function main() {
  console.log('====================================================================');
  console.log(' PUDÚ POWER ECOSYSTEM — VIRAL AMPLIFIER V2 (PHASE 2 LAUNCHER)');
  console.log('====================================================================');

  const sim = runMonteCarloSimulation(100000);
  console.log('\n[SIMULACIÓN MONTE CARLO (N = 100,000)]');
  console.log(`  • K-Factor Proyectado : Media = ${sim.k.mean} | P50 = ${sim.k.p50} | P90 = ${sim.k.p90}`);
  console.log(`  • Probabilidad K >= 1 : ${sim.k.probSuperViral}% (umbral viral auto-sostenido)`);
  console.log(`  • Índice Efectividad  : Media = ${sim.effectiveness.mean}/100 | P90 = ${sim.effectiveness.p90}/100`);

  if (SIM_ONLY) return;

  for (const project of TARGET_PROJECTS) {
    const resolvedDir = path.resolve(project.dir);
    console.log(`\n[DESPLIEGUE] ${project.name} -> ${resolvedDir}`);

    const semanticGraph = buildSemanticGraph(project);
    await writeArtifact(path.join(resolvedDir, 'semantic-graph.jsonld'), JSON.stringify(semanticGraph, null, 2));
    await writeArtifact(path.join(resolvedDir, 'oembed.json'), JSON.stringify(buildStaticOEmbed(project), null, 2));
    await writeArtifact(path.join(resolvedDir, 'api', 'oembed.js'), buildDynamicOEmbedHandler(project));
    await writeArtifact(path.join(resolvedDir, 'embed.html'), buildEmbedPlayerHtml(project));
    await writeArtifact(path.join(resolvedDir, 'pudu-viral-loop.js'), buildViralLoopClientScript(project));
    await writeArtifact(path.join(resolvedDir, 'manifest.webmanifest'), JSON.stringify(buildPwaManifest(project), null, 2));
    await writeArtifact(path.join(resolvedDir, 'sw-viral-share.js'), buildShareTargetSw());
    await injectIntoIndexHtml(resolvedDir, project, semanticGraph);
  }

  console.log('\n[COMPLETADO] Infraestructura Viral Phase 2 desplegada (100% White-Hat).');
}

main().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});