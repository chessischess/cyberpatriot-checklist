const { list, del } = require('@vercel/blob');

const INDEX_PATH = 'submissions/index.json';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers['x-admin-token'];
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Invalid admin token.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  const id = body && body.id;
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid id.' });
  }

  try {
    const { blobs } = await list({ prefix: `submissions/${id}/` });
    if (blobs.length) {
      await del(blobs.map((b) => b.url));
    }

    const idxRes = await list({ prefix: INDEX_PATH, limit: 1 });
    const idxEntry = idxRes.blobs.find((b) => b.pathname === INDEX_PATH);
    if (idxEntry) {
      const r = await fetch(idxEntry.url);
      const idx = r.ok ? await r.json() : [];
      const next = idx.filter((e) => e.id !== id);
      const { put } = require('@vercel/blob');
      await put(INDEX_PATH, JSON.stringify(next, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete submission.' });
  }
};
