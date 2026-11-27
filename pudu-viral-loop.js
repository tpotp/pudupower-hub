/**
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
  const PROJECT_NAME = "Pudú Power Ecosystem";
  const THEME_COLOR = "#10b981";

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
    return `${prefix}-${ts}${rand}`;
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
      title: options.title || `${PROJECT_NAME} · Mutación ${seed}`,
      text: options.text || `Mira esta mutación Pudú [${meme}] — ábrela y crea la tuya:`,
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
      boxShadow: `0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px ${THEME_COLOR}44`,
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
