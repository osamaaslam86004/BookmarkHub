// Vercel serverless function: checks bookmark URLs and returns real HTTP status codes.
// POST /api/check  { "urls": ["https://…", …] }  ->  { "results": [{ "url", "status", "ms", "final"? }] }
const dns = require('dns').promises, net = require('net');
const UA = 'Mozilla/5.0 (compatible; BookmarkHub/1.0; link-check)';

// SSRF guard: refuse loopback, private, link-local and mapped-IPv6 targets (checked on every redirect hop).
const priv = ip => net.isIPv4(ip)
  ? /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(ip)
  : /^(::1?$|fc|fd|fe80|::ffff:)/i.test(ip);

async function safe(u) {
  const x = new URL(u);
  if (!/^https?:$/.test(x.protocol)) throw new Error('unsupported scheme');
  const { address } = await dns.lookup(x.hostname);
  if (priv(address)) throw new Error('blocked address');
  return x;
}

async function probe(u) {
  const t = Date.now();
  try {
    let url = u;
    for (let hop = 0; hop < 5; hop++) {
      const x = await safe(url);
      const req = m => fetch(x, { method: m, redirect: 'manual', signal: AbortSignal.timeout(4000),
        headers: { 'user-agent': UA, accept: '*/*', ...(m === 'GET' && { range: 'bytes=0-0' }) } });
      let res = await req('HEAD');
      if (res.status >= 400) { res.body?.cancel?.(); res = await req('GET'); }   // many servers reject HEAD
      res.body?.cancel?.();
      const loc = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && loc) { url = new URL(loc, x).href; continue; }
      return { url: u, status: res.status, ms: Date.now() - t, ...(url !== u && { final: url }) };
    }
    return { url: u, status: 0, error: 'too many redirects' };
  } catch (e) {
    return { url: u, status: 0, error: String(e.message || e) };
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const site = req.headers['sec-fetch-site'];
  if (site && !['same-origin', 'none'].includes(site)) return res.status(403).json({ error: 'same-origin only' });
  const q = (req.body?.urls || []).filter(u => typeof u === 'string' && u.length < 2048).slice(0, 15), results = [];
  await Promise.all(Array.from({ length: 8 }, async () => { for (let u; (u = q.shift()); ) results.push(await probe(u)); }));
  res.setHeader('cache-control', 'no-store');
  res.json({ results });
};
