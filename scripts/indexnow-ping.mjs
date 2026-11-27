// scripts/indexnow-ping.mjs
// Pings IndexNow (Bing, Yandex, IndexNow.org) for instant indexing
const HOST = 'pudupower.com';
const KEY = 'pudu-indexnow-key-2026';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const URLS = [
  'https://pudupower.com/',
  'https://pudupower.com/about.html',
  'https://pudupower.com/contact.html',
  'https://ytp.pudupower.com/',
  'https://barsalitsuni.pudupower.com/',
  'https://simulator.pudupower.com/'
];

async function pingIndexNow(endpoint) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: KEY_LOCATION,
        urlList: URLS
      })
    });
    console.log(`[${endpoint}] -> HTTP ${res.status}`);
  } catch (err) {
    console.error(`[${endpoint}] -> Error: ${err.message}`);
  }
}

console.log('Sending IndexNow pings for pudupower.com...');
await Promise.all([
  pingIndexNow('https://api.indexnow.org/indexnow'),
  pingIndexNow('https://www.bing.com/indexnow'),
  pingIndexNow('https://yandex.com/indexnow')
]);
console.log('IndexNow ping sequence completed.');
