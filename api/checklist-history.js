const { list } = require('@vercel/blob');

const PAGES = new Set(['windows-client', 'windows-server', 'linux']);

function historyPathFor(page) {
  return `checklist-history/${page}.json`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const page = (req.query && req.query.page || '').toString();
  if (!PAGES.has(page)) {
    return res.status(400).json({ error: 'Invalid page.' });
  }

  try {
    const path = historyPathFor(page);
    const { blobs } = await list({ prefix: path, limit: 1 });
    const entry = blobs.find((b) => b.pathname === path);
    res.setHeader('Cache-Control', 'no-store');
    if (!entry) {
      return res.status(200).json({ history: [] });
    }
    const r = await fetch(entry.url);
    if (!r.ok) return res.status(200).json({ history: [] });
    const history = await r.json();
    // Only expose metadata + data needed to preview/restore; keep response light
    // by omitting nothing for now (checklist data itself isn't huge).
    return res.status(200).json({ history: Array.isArray(history) ? history : [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load checklist history.' });
  }
};
