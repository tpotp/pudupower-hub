// Cloudflare Pages Function: /api/oembed
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get('url') || 'https://pudupower.com/';
  const format = (url.searchParams.get('format') || 'json').toLowerCase();

  const data = {
    version: '1.0',
    type: 'rich',
    provider_name: 'The Power of the Pudú',
    provider_url: 'https://pudupower.com/',
    title: 'The Power of the Pudú — Interactive 3D Hub & WebGL Metal Tools',
    author_name: 'The Power of the Pudú (Santiago, Chile)',
    author_url: 'https://pudupower.com/',
    width: 1200,
    height: 675,
    thumbnail_url: 'https://cdn.pudupower.com/art/pudu-portada-desktop.webp',
    thumbnail_width: 1200,
    thumbnail_height: 630,
    html: '<iframe src="https://pudupower.com/?embed=1" width="100%" height="675" frameborder="0" allow="autoplay; fullscreen; webgl" allowfullscreen></iframe>'
  };

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600'
  };

  if (format === 'xml') {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<oembed>
  <version>1.0</version>
  <type>rich</type>
  <provider_name>The Power of the Pudú</provider_name>
  <provider_url>https://pudupower.com/</provider_url>
  <title>${data.title}</title>
  <width>1200</width>
  <height>675</height>
  <thumbnail_url>${data.thumbnail_url}</thumbnail_url>
  <html><![CDATA[${data.html}]]></html>
</oembed>`;
    return new Response(xml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml; charset=utf-8' }
    });
  }

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
  });
}
