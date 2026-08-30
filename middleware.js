// Site-wide access-code gate.
// Runs on every request before static files / API routes are served.
// Visitors must submit the correct access code once; a session cookie
// (no Max-Age/Expires, so it clears when the browser closes) then lets
// them through for the rest of the browser session.

const config = {
  runtime: 'nodejs',
};

const ACCESS_CODE = 'M5FS-K33W-8GG8';
const COOKIE_NAME = 'cp_access';
const COOKIE_VALUE = 'granted';

// Paths that must always be reachable so the gate page itself can load
// (its own request, and any static assets it needs).
const ALWAYS_ALLOWED = new Set(['/favicon.ico']);

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  });
  return out;
}

function gatePage(error) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Access Required · CyberPatriot Checklist</title>
<style>
  :root {
    --bg: #f4f6f8;
    --card: #ffffff;
    --text: #1b1f24;
    --accent: #2563eb;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #0f1115; --card: #171a21; --text: #e6e9ee; }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
  }
  .card {
    background: var(--card);
    border-radius: 12px;
    padding: 32px 28px;
    width: 100%;
    max-width: 380px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    text-align: center;
  }
  h1 { font-size: 1.25rem; margin: 0 0 8px; }
  p.sub { margin: 0 0 20px; opacity: 0.75; font-size: 0.9rem; }
  input[type="text"] {
    width: 100%;
    padding: 12px 14px;
    font-size: 1rem;
    border-radius: 8px;
    border: 1px solid rgba(127,127,127,0.35);
    background: transparent;
    color: var(--text);
    text-align: center;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  input[type="text"]:focus { outline: none; border-color: var(--accent); }
  button {
    margin-top: 14px;
    width: 100%;
    padding: 12px 14px;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: #fff;
    cursor: pointer;
  }
  button:hover { opacity: 0.9; }
  .error {
    margin: 0 0 16px;
    color: #dc2626;
    font-size: 0.9rem;
  }
</style>
</head>
<body>
  <div class="card">
    <h1>🔒 Access Required</h1>
    <p class="sub">Enter the access code to continue.</p>
    ${error ? '<p class="error">Incorrect code. Please try again.</p>' : ''}
    <form method="POST" action="/">
      <input type="text" name="code" placeholder="XXXX-XXXX-XXXX" autofocus autocomplete="off" required>
      <button type="submit">Unlock</button>
    </form>
  </div>
</body>
</html>`;
}

async function middleware(request) {
  const url = new URL(request.url);

  if (ALWAYS_ALLOWED.has(url.pathname)) {
    return new Response(null, { status: 204 });
  }

  const cookies = parseCookies(request.headers.get('cookie'));
  const hasAccess = cookies[COOKIE_NAME] === COOKIE_VALUE;

  // Handle code submission (posted from the gate page above, action="/").
  if (request.method === 'POST' && !hasAccess) {
    let submittedCode = '';
    try {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const body = await request.text();
        submittedCode = new URLSearchParams(body).get('code') || '';
      } else if (contentType.includes('application/json')) {
        const body = await request.json();
        submittedCode = body?.code || '';
      }
    } catch {
      submittedCode = '';
    }

    if (submittedCode.trim().toUpperCase() === ACCESS_CODE) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/',
          // No Max-Age/Expires -> browser session cookie, cleared on close.
          'Set-Cookie': `${COOKIE_NAME}=${COOKIE_VALUE}; Path=/; HttpOnly; SameSite=Lax`,
        },
      });
    }

    return new Response(gatePage(true), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (!hasAccess) {
    return new Response(gatePage(false), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Access granted: continue to normal routing (static file or API route).
  return undefined;
}

module.exports = middleware;
module.exports.config = config;
