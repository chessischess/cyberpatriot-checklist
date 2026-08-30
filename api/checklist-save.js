const { put } = require('@vercel/blob');

const PAGES = new Set(['windows-client', 'windows-server', 'linux']);
const MAX_SECTIONS = 60;
const MAX_ITEMS_PER_SECTION = 200;
const MAX_STEPS_PER_ITEM = 60;
const MAX_TITLE_LEN = 300;
const MAX_TEXT_LEN = 4000;
const MAX_NOTE_LEN = 2000;

function pathFor(page) {
  return `checklist-overrides/${page}.json`;
}

// very small in-memory throttle per warm function instance; not a real
// distributed rate limiter, just a speed bump against trivial spam bursts
const recentIps = new Map();
function tooFast(ip) {
  const now = Date.now();
  const last = recentIps.get(ip);
  recentIps.set(ip, now);
  for (const [k, t] of recentIps) {
    if (now - t > 10 * 60 * 1000) recentIps.delete(k);
  }
  return last && now - last < 2 * 1000;
}

function isStr(v) {
  return typeof v === 'string';
}

// Validates and normalizes the DATA array shape produced by the checklist UI:
// [{ title, note?, items: [{ t, d? }] }]
function normalizeData(data) {
  if (!Array.isArray(data)) throw new Error('Checklist data must be an array of sections.');
  if (data.length > MAX_SECTIONS) throw new Error(`Too many sections (max ${MAX_SECTIONS}).`);

  return data.map((section, sIdx) => {
    if (!section || typeof section !== 'object') {
      throw new Error(`Section ${sIdx + 1} is invalid.`);
    }
    if (!isStr(section.title) || !section.title.trim() || section.title.length > MAX_TITLE_LEN) {
      throw new Error(`Section ${sIdx + 1} needs a title (max ${MAX_TITLE_LEN} characters).`);
    }
    if (section.note !== undefined && section.note !== null) {
      if (!isStr(section.note) || section.note.length > MAX_NOTE_LEN) {
        throw new Error(`Section ${sIdx + 1} note is too long (max ${MAX_NOTE_LEN} characters).`);
      }
    }
    if (!Array.isArray(section.items)) {
      throw new Error(`Section ${sIdx + 1} items must be an array.`);
    }
    if (section.items.length > MAX_ITEMS_PER_SECTION) {
      throw new Error(`Section ${sIdx + 1} has too many items (max ${MAX_ITEMS_PER_SECTION}).`);
    }

    const items = section.items.map((rawItem, iIdx) => {
      const item = isStr(rawItem) ? { t: rawItem, d: null } : rawItem;
      if (!item || typeof item !== 'object' || !isStr(item.t) || !item.t.trim() || item.t.length > MAX_TEXT_LEN) {
        throw new Error(`Section ${sIdx + 1}, item ${iIdx + 1} needs text (max ${MAX_TEXT_LEN} characters).`);
      }
      let d = null;
      if (item.d !== undefined && item.d !== null) {
        if (!Array.isArray(item.d)) throw new Error(`Section ${sIdx + 1}, item ${iIdx + 1} steps must be an array.`);
        if (item.d.length > MAX_STEPS_PER_ITEM) {
          throw new Error(`Section ${sIdx + 1}, item ${iIdx + 1} has too many steps (max ${MAX_STEPS_PER_ITEM}).`);
        }
        d = item.d.map((step, stIdx) => {
          if (!isStr(step) || step.length > MAX_TEXT_LEN) {
            throw new Error(`Section ${sIdx + 1}, item ${iIdx + 1}, step ${stIdx + 1} is invalid.`);
          }
          return step;
        });
        if (!d.length) d = null;
      }
      return d ? { t: item.t, d } : { t: item.t };
    });

    const out = { title: section.title, items };
    if (section.note) out.note = section.note;
    return out;
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .toString()
    .split(',')[0]
    .trim();

  if (tooFast(ip)) {
    return res.status(429).json({ error: 'Saving too frequently, please wait a moment and try again.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { page, data } = body;
  if (!PAGES.has(page)) {
    return res.status(400).json({ error: 'Invalid page.' });
  }

  let normalized;
  try {
    normalized = normalizeData(data);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Invalid checklist data.' });
  }

  try {
    const payload = { data: normalized, updatedAt: new Date().toISOString() };
    await put(pathFor(page), JSON.stringify(payload, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return res.status(200).json({ ok: true, updatedAt: payload.updatedAt });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save checklist.' });
  }
};
