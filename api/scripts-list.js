const { list } = require('@vercel/blob');

const INDEX_PATH = 'submissions/index.json';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { blobs } = await list({ prefix: INDEX_PATH, limit: 1 });
    const entry = blobs.find((b) => b.pathname === INDEX_PATH);
    if (!entry) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ scripts: [] });
    }
    const r = await fetch(entry.url);
    const idx = r.ok ? await r.json() : [];
    const scripts = idx
      .slice()
      .reverse()
      .map(({ ip, ...rest }) => rest);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ scripts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load submissions.' });
  }
};
