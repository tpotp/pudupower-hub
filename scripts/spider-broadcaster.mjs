#!/usr/bin/env node
/**
 * spider-broadcaster.mjs
 * Araña de propagación, sindicación y calentamiento de caché web 100% legal,
 * abierta, sin registro y compatible con Node.js 18/20/22+ (ESM, cero dependencias).
 *
 * Uso:
 *   node spider-broadcaster.mjs
 *   INDEXNOW_KEY=<tu_clave_32_hex> node spider-broadcaster.mjs
 *   node spider-broadcaster.mjs --generate-feed
 */

import { writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  siteName: 'The Power of the Pudú',
  host: 'pudupower.com',
  feedUrl: 'https://pudupower.com/feed.xml',
  sitemapUrl: 'https://pudupower.com/sitemap.xml',
  timeoutMs: 12000,
  politeDelayMs: 600,
  archiveDelayMs: 1500,

  // 5 hosts del ecosistema para DNS DoH Cache Warming
  hosts: [
    'pudupower.com',
    'ytp.pudupower.com',
    'barsalitsuni.pudupower.com',
    'simulator.pudupower.com',
    'cdn.pudupower.com',
  ],

  // 5 URLs principales del ecosistema
  urls: [
    'https://pudupower.com/',
    'https://ytp.pudupower.com/',
    'https://barsalitsuni.pudupower.com/',
    'https://simulator.pudupower.com/',
    'https://pudupower.com/about.html',
  ],

  // URLs específicas para Wayback Machine
  archiveUrls: [
    'https://pudupower.com/',
    'https://ytp.pudupower.com/',
    'https://barsalitsuni.pudupower.com/',
    'https://simulator.pudupower.com/',
  ],

  // IndexNow endpoints oficiales
  indexNowEndpoints: [
    { name: 'IndexNow.org', url: 'https://api.indexnow.org/indexnow' },
    { name: 'Bing', url: 'https://www.bing.com/indexnow' },
    { name: 'Yandex', url: 'https://yandex.com/indexnow' },
    { name: 'Seznam', url: 'https://search.seznam.cz/indexnow' },
  ],

  // XML-RPC Ping endpoints universales
  xmlRpcEndpoints: [
    { name: 'Ping-O-Matic', url: 'https://rpc.pingomatic.com/' },
    { name: 'Weblogs.com', url: 'http://rpc.weblogs.com/RPC2' },
    { name: 'blo.gs', url: 'http://ping.blo.gs/' },
  ],

  // WebSub / PubSubHubbub hubs
  webSubHubs: [
    { name: 'Google PubSubHubbub', url: 'https://pubsubhubbub.appspot.com/' },
    { name: 'Superfeedr', url: 'https://pubsubhubbub.superfeedr.com/' },
    { name: 'WebSubHub', url: 'https://websubhub.com/hub' },
  ],

  // Bots oficiales para Social Preview Cache Warming
  socialBots: [
    { name: 'Twitterbot', ua: 'Twitterbot/1.0' },
    { name: 'Discordbot', ua: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' },
    { name: 'TelegramBot', ua: 'TelegramBot (like TwitterBot)' },
    { name: 'WhatsApp', ua: 'WhatsApp/2.23.20.0 A' },
    { name: 'Google-InspectionTool', ua: 'Mozilla/5.0 (compatible; Google-InspectionTool/1.0; +http://www.google.com/bot.html)' },
    { name: 'LinkedInBot', ua: 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)' },
  ],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const escapeXml = (str) =>
  String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

async function safeFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? CONFIG.timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: options.redirect ?? 'follow',
    });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, statusText: res.statusText, headers: res.headers, text };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      statusText: err?.name === 'AbortError' ? 'TIMEOUT' : (err?.cause?.code || err?.message || 'NETWORK_ERROR'),
      headers: new Headers(),
      text: '',
    };
  } finally {
    clearTimeout(timer);
  }
}

// 1. Global DNS Cache Warming (DoH: Cloudflare 1.1.1.1 & Google 8.8.8.8)
async function warmDnsDoH() {
  console.log('\n[1/5] Global DNS Cache Warming (DoH Cloudflare 1.1.1.1 & Google 8.8.8.8)');
  const resolvers = [
    { name: 'Cloudflare 1.1.1.1', base: 'https://cloudflare-dns.com/dns-query' },
    { name: 'Google 8.8.8.8', base: 'https://dns.google/resolve' },
  ];
  const types = ['A', 'AAAA'];
  const stats = { ok: 0, fail: 0 };

  for (const host of CONFIG.hosts) {
    for (const resolver of resolvers) {
      for (const type of types) {
        const url = `${resolver.base}?name=${encodeURIComponent(host)}&type=${type}`;
        const res = await safeFetch(url, { headers: { Accept: 'application/dns-json' } });
        if (res.ok) {
          let answers = 0;
          try {
            const data = JSON.parse(res.text);
            answers = Array.isArray(data.Answer) ? data.Answer.length : 0;
          } catch {}
          console.log(`  OK   ${resolver.name.padEnd(18)} ${type.padEnd(4)} ${host} (${answers} records)`);
          stats.ok++;
        } else {
          console.log(`  FAIL ${resolver.name.padEnd(18)} ${type.padEnd(4)} ${host} -> ${res.status || res.statusText}`);
          stats.fail++;
        }
      }
    }
  }
  return stats;
}

// 2. IndexNow Pings (Bing, IndexNow.org, Yandex, Seznam)
async function pingIndexNow() {
  console.log('\n[2/5] IndexNow Open Search Engine Pings');
  const key = process.env.INDEXNOW_KEY || 'pudu-indexnow-key-2026';
  const keyLocation = `https://${CONFIG.host}/${key}.txt`;
  const payload = JSON.stringify({
    host: CONFIG.host,
    key,
    keyLocation,
    urlList: [
      'https://pudupower.com/',
      'https://pudupower.com/about.html',
      'https://pudupower.com/contact.html',
      'https://pudupower.com/feed.xml',
      'https://pudupower.com/sitemap.xml',
    ],
  });

  const stats = { ok: 0, warn: 0, fail: 0 };
  for (const ep of CONFIG.indexNowEndpoints) {
    const res = await safeFetch(ep.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: payload,
    });
    if (res.status >= 200 && res.status < 300) {
      console.log(`  OK   ${ep.name.padEnd(14)} HTTP ${res.status}`);
      stats.ok++;
    } else if (res.status === 403 || res.status === 422) {
      console.log(`  WARN ${ep.name.padEnd(14)} HTTP ${res.status} (sube ${key}.txt a la raíz para verificar propiedad)`);
      stats.warn++;
    } else {
      console.log(`  FAIL ${ep.name.padEnd(14)} ${res.status || res.statusText}`);
      stats.fail++;
    }
    await sleep(CONFIG.politeDelayMs);
  }
  return stats;
}

// 3. XML-RPC Pings Universales (Ping-O-Matic, Weblogs.com, blo.gs)
async function pingXmlRpc() {
  console.log('\n[3/5] XML-RPC Universal Aggregator Pings');
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<methodCall>
  <methodName>weblogUpdates.extendedPing</methodName>
  <params>
    <param><value>${escapeXml(CONFIG.siteName)}</value></param>
    <param><value>${escapeXml(CONFIG.urls[0])}</value></param>
    <param><value>${escapeXml(CONFIG.urls[0])}</value></param>
    <param><value>${escapeXml(CONFIG.feedUrl)}</value></param>
  </params>
</methodCall>`;

  const stats = { ok: 0, fail: 0 };
  for (const ep of CONFIG.xmlRpcEndpoints) {
    const res = await safeFetch(ep.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: xmlBody,
    });
    if (res.ok) {
      const flerror = res.text.includes('<name>flerror</name>') && res.text.includes('<boolean>0</boolean>');
      console.log(`  OK   ${ep.name.padEnd(14)} HTTP ${res.status}${flerror ? ' (flerror=0)' : ''}`);
      stats.ok++;
    } else {
      console.log(`  FAIL ${ep.name.padEnd(14)} ${res.status || res.statusText}`);
      stats.fail++;
    }
    await sleep(CONFIG.politeDelayMs);
  }
  return stats;
}

// 4. WebSub / PubSubHubbub Real-Time Syndication
async function pingWebSub() {
  console.log('\n[4/5] WebSub / PubSubHubbub Hubs');
  const stats = { ok: 0, fail: 0 };
  const body = new URLSearchParams({
    'hub.mode': 'publish',
    'hub.url': CONFIG.feedUrl,
  }).toString();

  for (const hub of CONFIG.webSubHubs) {
    const res = await safeFetch(hub.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (res.status >= 200 && res.status < 300) {
      console.log(`  OK   ${hub.name.padEnd(22)} HTTP ${res.status}`);
      stats.ok++;
    } else {
      console.log(`  FAIL ${hub.name.padEnd(22)} ${res.status || res.statusText}`);
      stats.fail++;
    }
    await sleep(CONFIG.politeDelayMs);
  }
  return stats;
}

// 5. Archival Permanent Backlinks (Wayback Machine Save Page Now)
async function triggerWaybackArchive() {
  console.log('\n[5/5] Archival Permanent Backlinks (Wayback Machine)');
  const stats = { ok: 0, fail: 0 };
  for (const targetUrl of CONFIG.archiveUrls) {
    const saveUrl = `https://web.archive.org/save/${targetUrl}`;
    const res = await safeFetch(saveUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'SpiderBroadcaster/1.0 (+https://pudupower.com/)',
      },
      timeoutMs: 15000,
    });
    const contentLocation = res.headers.get('content-location') || res.headers.get('location') || '';
    if (res.ok || res.status === 302) {
      console.log(`  OK   ${targetUrl} -> HTTP ${res.status}${contentLocation ? ` (${contentLocation})` : ''}`);
      stats.ok++;
    } else {
      console.log(`  WARN ${targetUrl} -> ${res.status || res.statusText}`);
      stats.fail++;
    }
    await sleep(CONFIG.archiveDelayMs);
  }
  return stats;
}

// 6. Social Preview Cache Warming & Crawler Trigger
async function warmSocialPreviews() {
  console.log('\n[6/6] Social Preview Cache Warming & Crawler Trigger');
  const stats = { ok: 0, fail: 0 };
  for (const targetUrl of CONFIG.urls) {
    for (const bot of CONFIG.socialBots) {
      const res = await safeFetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': bot.ua,
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      if (res.ok) {
        const hasOg = /property=["']og:title["']/i.test(res.text);
        console.log(`  OK   ${bot.name.padEnd(22)} ${targetUrl} (HTTP ${res.status}, OG=${hasOg ? 'yes' : 'no'})`);
        stats.ok++;
      } else {
        console.log(`  FAIL ${bot.name.padEnd(22)} ${targetUrl} -> ${res.status || res.statusText}`);
        stats.fail++;
      }
      await sleep(250);
    }
  }
  return stats;
}

// Generador opcional de feed.xml (RSS 2.0 + Atom + WebSub)
async function ensureFeedXml(force = false) {
  const feedPath = join(__dirname, 'feed.xml');
  if (!force) {
    try {
      await access(feedPath);
      return;
    } catch {}
  }
  const nowRfc822 = new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(CONFIG.siteName)} — Metal Progresivo Chileno &amp; Hub 3D</title>
    <link>https://pudupower.com/</link>
    <description>Hub oficial interactivo de The Power of the Pudú (Santiago, Chile).</description>
    <language>es-CL</language>
    <lastBuildDate>${nowRfc822}</lastBuildDate>
    <atom:link href="${CONFIG.feedUrl}" rel="self" type="application/rss+xml" />
    <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" />
    <atom:link href="https://pubsubhubbub.superfeedr.com/" rel="hub" />
    <item>
      <title>The Power of the Pudú — Hub Interactivo 3D</title>
      <link>https://pudupower.com/</link>
      <guid isPermaLink="true">https://pudupower.com/</guid>
      <pubDate>${nowRfc822}</pubDate>
      <description>Ecosistema web 3D gratuito en Three.js, WebGL y WebCodecs.</description>
    </item>
    <item>
      <title>Pudu Poop Maker — Generador YTP Online</title>
      <link>https://ytp.pudupower.com/</link>
      <guid isPermaLink="true">https://ytp.pudupower.com/</guid>
      <pubDate>${nowRfc822}</pubDate>
      <description>Generador de videos YouTube Poop en el navegador con WebCodecs.</description>
    </item>
    <item>
      <title>Barsalitsuni 3D — Sintetizador Visual</title>
      <link>https://barsalitsuni.pudupower.com/</link>
      <guid isPermaLink="true">https://barsalitsuni.pudupower.com/</guid>
      <pubDate>${nowRfc822}</pubDate>
      <description>Sintetizador visual 3D experimental y Seam Carving.</description>
    </item>
    <item>
      <title>PuduWorld — Pudú Simulator 3D</title>
      <link>https://simulator.pudupower.com/</link>
      <guid isPermaLink="true">https://simulator.pudupower.com/</guid>
      <pubDate>${nowRfc822}</pubDate>
      <description>Simulador 3D interactivo de The Power of the Pudú.</description>
    </item>
  </channel>
</rss>
`;
  await writeFile(feedPath, xml, 'utf8');
  console.log(`Generado: ${feedPath}`);
}

async function main() {
  const forceFeed = process.argv.includes('--generate-feed');
  console.log('============================================================');
  console.log(' spider-broadcaster.mjs — Sindicación y Warming Web Abierto ');
  console.log('============================================================');

  await ensureFeedXml(forceFeed);

  const dnsStats = await warmDnsDoH();
  const indexNowStats = await pingIndexNow();
  const xmlRpcStats = await pingXmlRpc();
  const webSubStats = await pingWebSub();
  const archiveStats = await triggerWaybackArchive();
  const socialStats = await warmSocialPreviews();

  console.log('\n====================== RESUMEN FINAL =======================');
  console.log(`DNS DoH:          ok=${dnsStats.ok}, fail=${dnsStats.fail}`);
  console.log(`IndexNow:         ok=${indexNowStats.ok}, warn=${indexNowStats.warn}, fail=${indexNowStats.fail}`);
  console.log(`XML-RPC:          ok=${xmlRpcStats.ok}, fail=${xmlRpcStats.fail}`);
  console.log(`WebSub Hubs:      ok=${webSubStats.ok}, fail=${webSubStats.fail}`);
  console.log(`Wayback Archive:  ok=${archiveStats.ok}, fail=${archiveStats.fail}`);
  console.log(`Social Crawlers:  ok=${socialStats.ok}, fail=${socialStats.fail}`);
  console.log('============================================================');
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exitCode = 1;
});
