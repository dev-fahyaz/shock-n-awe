#!/usr/bin/env node
/**
 * Hit POST /api/auth/login. Password login, then JWT channel, then optional
 * one-time code handoff. Does not print cookie, token, or code values.
 *
 *   node scripts/test-login.mjs --email you@example.com --password secret
 *   node scripts/test-login.mjs --token "$ACCESS_TOKEN" --refresh "$REFRESH_TOKEN"
 *
 * With HANDOFF_SECRET or --handoff-secret, password mode also POST /api/auth/handoff
 * then GET /api/auth/consume?code=
 */

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

const base = (
  arg('base') ||
  process.env.SCENE_ENGINE_URL ||
  'http://localhost:5000'
).replace(/\/$/, '');

const email = arg('email');
const password = arg('password');
const token = arg('token');
const refresh = arg('refresh');
const handoffSecret = arg('handoff-secret') || process.env.HANDOFF_SECRET;

function looksLikeJwt(value) {
  return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(value || '');
}

function fromBase64Url(input) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString(
    'utf8',
  );
}

function tokensFromRecord(value) {
  if (!value || typeof value !== 'object') return null;
  const nested = value.session && typeof value.session === 'object' ? value.session : value;
  const access = String(nested.access_token ?? '').trim();
  const refreshToken = String(nested.refresh_token ?? '').trim();
  if (!looksLikeJwt(access) || !refreshToken) return null;
  return { access_token: access, refresh_token: refreshToken };
}

function tokensFromCookieValue(raw) {
  let value = String(raw || '').trim();
  if (!value) return null;
  try {
    value = decodeURIComponent(value);
  } catch {
    /* already decoded */
  }
  if (value.startsWith('base64-')) {
    try {
      value = fromBase64Url(value.slice('base64-'.length));
    } catch {
      return null;
    }
  }
  if (value.startsWith('{')) {
    try {
      return tokensFromRecord(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return null;
}

function setCookieHeaders(res) {
  if (typeof res.headers.getSetCookie === 'function') return res.headers.getSetCookie();
  const one = res.headers.get('set-cookie');
  return one ? [one] : [];
}

function cookieNames(headers) {
  return headers
    .map(c => String(c).split('=')[0])
    .filter(Boolean);
}

function cookieHeader(setCookies) {
  const map = new Map();
  for (const header of setCookies) {
    const nv = String(header).split(';')[0];
    const eq = nv.indexOf('=');
    if (eq < 0) continue;
    map.set(nv.slice(0, eq).trim(), nv.slice(eq + 1));
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function sessionFromSetCookies(setCookies) {
  const chunks = new Map();
  for (const header of setCookies) {
    const nv = String(header).split(';')[0];
    const eq = nv.indexOf('=');
    if (eq < 0) continue;
    const name = nv.slice(0, eq).trim();
    let value = nv.slice(eq + 1);
    try {
      value = decodeURIComponent(value);
    } catch {
      /* keep */
    }
    const m = name.match(/^(sb-.+-auth-token)(?:\.(\d+))?$/);
    if (!m) continue;
    const idx = m[2] ? Number(m[2]) : 0;
    if (!chunks.has(m[1])) chunks.set(m[1], []);
    chunks.get(m[1])[idx] = value;
  }
  for (const parts of chunks.values()) {
    const joined = parts.filter(Boolean).join('');
    const session = tokensFromCookieValue(joined);
    if (session) return session;
  }
  return null;
}

function previewJwt(jwt) {
  return `${jwt.slice(0, 12)}… (${jwt.length} chars)`;
}

async function postLogin(body, label) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  let parsed = await res.text();
  try {
    parsed = JSON.stringify(JSON.parse(parsed), null, 2);
  } catch {
    /* leave as text */
  }
  const cookies = setCookieHeaders(res);
  console.log(`--- ${label} ---`);
  console.log(`POST ${base}/api/auth/login`);
  console.log(`status ${res.status}`);
  console.log(parsed);
  console.log(`set-cookie names: ${cookieNames(cookies).join(', ') || '(none)'}`);
  return { res, parsed, cookies };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function assertSetup(cookies, label) {
  const setup = await fetch(`${base}/setup`, {
    redirect: 'manual',
    headers: { cookie: cookieHeader(cookies) },
  });
  const loc = setup.headers.get('location') || '';
  console.log(`--- ${label} ---`);
  console.log(`GET ${base}/setup`);
  console.log(`status ${setup.status}${loc ? ` location ${loc}` : ''}`);
  if (setup.status >= 300 && /\/login(\?|$)/.test(loc)) {
    fail('Cookies did not bypass /login.');
  }
  if (setup.status === 401 || setup.status === 403) {
    fail('Cookies were rejected.');
  }
}

async function testHandoff(session) {
  if (!handoffSecret) {
    console.log('--- one-time code ---');
    console.log('skip (set HANDOFF_SECRET or --handoff-secret to exercise mint + consume)');
    return;
  }
  const mint = await fetch(`${base}/api/auth/handoff`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${handoffSecret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }),
  });
  let mintBody = {};
  try {
    mintBody = await mint.json();
  } catch {
    fail('Handoff mint did not return JSON.');
  }
  console.log('--- one-time code mint ---');
  console.log(`POST ${base}/api/auth/handoff`);
  console.log(`status ${mint.status}`);
  console.log(
    mint.ok
      ? `{ ok: true, code: (${String(mintBody.code || '').length} chars), expires_in: ${mintBody.expires_in} }`
      : JSON.stringify({ ok: mintBody.ok, error: mintBody.error }),
  );
  if (!mint.ok || !mintBody.code) fail('Handoff mint failed.');

  const consumeUrl = `${base}/api/auth/consume?code=${encodeURIComponent(mintBody.code)}&next=/setup`;
  const consume = await fetch(consumeUrl, { redirect: 'manual' });
  const cookies = setCookieHeaders(consume);
  const loc = consume.headers.get('location') || '';
  console.log('--- one-time code consume ---');
  console.log(`GET ${base}/api/auth/consume?code=…`);
  console.log(`status ${consume.status}${loc ? ` location ${loc}` : ''}`);
  console.log(`set-cookie names: ${cookieNames(cookies).join(', ') || '(none)'}`);
  if (consume.status !== 303 || loc !== '/setup') {
    fail(`Consume did not 303 to a relative /setup (location ${loc || '(none)'}).`);
  }
  if (loc.includes('0.0.0.0')) {
    fail('Consume advertised 0.0.0.0.');
  }
  if (!cookieNames(cookies).length) {
    fail('Consume set no cookies.');
  }
  await assertSetup(cookies, 'setup with consume cookies');
}

if (!((email && password) || (token && refresh) || token)) {
  console.error(`Usage:
  node scripts/test-login.mjs --email you@example.com --password secret
  node scripts/test-login.mjs --token "$ACCESS_TOKEN" --refresh "$REFRESH_TOKEN"

Hub channel (see docs/login-channel.md): mint a code on the server, then
redirect the browser to /api/auth/consume?code=…

Optional: --base http://localhost:5000  --handoff-secret  (or SCENE_ENGINE_URL / HANDOFF_SECRET)`);
  process.exit(1);
}

if (email && password) {
  const passwordResult = await postLogin({ email, password }, 'password');
  if (!passwordResult.res.ok) process.exit(1);
  const session = sessionFromSetCookies(passwordResult.cookies);
  if (!session) {
    fail(
      'Password login did not yield a decodable session cookie. Cannot test the JWT channel.',
    );
  }
  console.log(
    `cookie wraps a session; access_token is ${previewJwt(session.access_token)} (not the cookie string)`,
  );

  const channel = await postLogin(
    { access_token: session.access_token, refresh_token: session.refresh_token },
    'channel (JWT + refresh, not the cookie blob)',
  );
  if (!channel.res.ok) process.exit(1);
  if (!cookieNames(channel.cookies).length) {
    fail('Channel login returned 200 but set no cookies — /setup would still redirect to /login.');
  }
  await assertSetup(channel.cookies, 'setup with channel cookies');
  await testHandoff(session);
} else {
  let access = token;
  let refreshToken = refresh;
  if (token && !looksLikeJwt(token)) {
    const decoded = tokensFromCookieValue(token);
    if (!decoded) {
      fail(
        'That --token is not a JWT (does not start with eyJ). Do not pass the sb-*-auth-token cookie. Use session.access_token and session.refresh_token from getSession().',
      );
    }
    console.log(
      `Decoded a cookie/session blob. Using access_token ${previewJwt(decoded.access_token)}`,
    );
    access = decoded.access_token;
    refreshToken = decoded.refresh_token;
  }
  if (!refreshToken) {
    fail(
      'Channel login needs refresh_token as well so this origin can set cookies and skip /login.',
    );
  }
  const channel = await postLogin(
    { access_token: access, refresh_token: refreshToken },
    'channel',
  );
  if (!channel.res.ok) process.exit(1);
  await testHandoff({ access_token: access, refresh_token: refreshToken });
}
