#!/usr/bin/env node
/**
 * Hit POST /api/auth/login. Password login, then the same session as a
 * universal-channel JWT handoff. Does not print cookie or token values.
 *
 *   node scripts/test-login.mjs --email you@example.com --password secret
 *   node scripts/test-login.mjs --token "$ACCESS_TOKEN" --refresh "$REFRESH_TOKEN"
 *
 * Do not pass the sb-*-auth-token cookie as --token. That cookie wraps JSON
 * { access_token, refresh_token }. The channel must send those two fields
 * from supabase.auth.getSession().
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
    let name = nv.slice(0, eq).trim();
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

if (!((email && password) || (token && refresh) || token)) {
  console.error(`Usage:
  node scripts/test-login.mjs --email you@example.com --password secret
  node scripts/test-login.mjs --token "$ACCESS_TOKEN" --refresh "$REFRESH_TOKEN"

The other app must send the JWT pair from getSession(), not the auth cookie:
  { "access_token": session.access_token, "refresh_token": session.refresh_token }

Optional: --base http://localhost:5000  (or SCENE_ENGINE_URL)`);
  process.exit(1);
}

let session = null;

if (email && password) {
  const passwordResult = await postLogin({ email, password }, 'password');
  if (!passwordResult.res.ok) process.exit(1);
  session = sessionFromSetCookies(passwordResult.cookies);
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

  const setup = await fetch(`${base}/setup`, {
    redirect: 'manual',
    headers: { cookie: cookieHeader(channel.cookies) },
  });
  const loc = setup.headers.get('location') || '';
  console.log('--- setup with channel cookies ---');
  console.log(`GET ${base}/setup`);
  console.log(`status ${setup.status}${loc ? ` location ${loc}` : ''}`);
  if (setup.status >= 300 && /\/login(\?|$)/.test(loc)) {
    fail('Channel cookies did not bypass /login.');
  }
  if (setup.status === 401 || setup.status === 403) {
    fail('Channel cookies were rejected.');
  }
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
}
