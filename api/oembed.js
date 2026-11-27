// Serverless Dynamic oEmbed Endpoint (Vercel / Netlify / Cloudflare / Node)
// Spec: https://oembed.com/ (Type: rich, interactive player for Discord, Reddit, Telegram, X)

const sanitize = (val, fallback = 'pudu-alpha') =>
  String(val || fallback).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || fallback;

export default function handler(req, res) {
  const hostUrl = 'https://pudupower.com';
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

  const embedSrc = `${hostUrl}/embed.html?seed=${encodeURIComponent(seed)}&meme=${encodeURIComponent(meme)}&source=oembed`;
  const payload = {
    version: '1.0',
    type: 'rich',
    provider_name: 'Pudú Power Ecosystem',
    provider_url: hostUrl,
    title: `Pudú Power Ecosystem · Seed: ${seed} [${meme}]`,
    author_name: 'Pudú Power Ecosystem',
    author_url: hostUrl,
    cache_age: 3600,
    width: Math.min(Number(query.maxwidth) || 640, 800),
    height: Math.min(Number(query.maxheight) || 360, 600),
    thumbnail_url: `${hostUrl}/og-preview.png?seed=${encodeURIComponent(seed)}`,
    thumbnail_width: 1200,
    thumbnail_height: 630,
    html: `<iframe src="${embedSrc}" width="640" height="360" frameborder="0" allow="autoplay; clipboard-write; web-share" allowfullscreen loading="lazy" title="Pudú Power Ecosystem (${seed})"></iframe>`
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
