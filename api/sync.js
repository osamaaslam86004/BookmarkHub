// Vercel function: stores one end-to-end encrypted blob per sync id in Redis (Upstash, via Vercel Marketplace).
// The server only ever sees an opaque id and ciphertext.
// Needs KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = async (cmd) => {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
};

// Compare-and-set: write only when the client's baseRev matches, so two devices can't silently overwrite each other.
const CAS = `local cur=tonumber(redis.call('HGET',KEYS[1],'rev') or '0')
if cur~=tonumber(ARGV[1]) then return {0,cur} end
redis.call('HSET',KEYS[1],'rev',cur+1,'blob',ARGV[2]) return {1,cur+1}`;

module.exports = async (req, res) => {
  res.setHeader("cache-control", "no-store");
  if (!URL_ || !TOKEN)
    return res.status(501).json({ error: "KV store not configured" });

  const site = req.headers["sec-fetch-site"];
  if (site && !["same-origin", "none"].includes(site))
    return res.status(403).json({ error: "same-origin only" });

  const id = req.headers["x-sync-id"];
  if (!/^[0-9a-f]{64}$/.test(id || ""))
    return res.status(400).json({ error: "bad id" });
  const key = "bh:" + id;

  try {
    if (req.method === "GET") {
      const [rev, blob] = await redis(["HMGET", key, "rev", "blob"]);
      return res.json({ rev: +rev || 0, blob: blob || null });
    }
    if (req.method === "PUT") {
      const { baseRev, blob } = req.body || {};
      if (typeof blob !== "string" || blob.length > 900000)
        return res.status(413).json({ error: "payload too large" });
      const [ok, rev] = await redis([
        "EVAL",
        CAS,
        "1",
        key,
        String(+baseRev || 0),
        blob,
      ]);
      if (ok) return res.json({ rev });
      const [r2, b2] = await redis(["HMGET", key, "rev", "blob"]); // someone else wrote first: hand back their version
      return res.status(409).json({ rev: +r2 || 0, blob: b2 || null });
    }
    res.status(405).json({ error: "GET or PUT only" });
  } catch {
    res.status(502).json({ error: "store error" });
  }
};