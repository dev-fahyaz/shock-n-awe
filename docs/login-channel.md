# Open Shock and Awe from your dashboard

Use this when the user is already signed in on your site and chooses Shock and Awe. Your **server** talks to Shock and Awe, then you **send the browser** there. Do not put session tokens in the page or in a form.

You and Shock and Awe must share the same Supabase project. The signed-in user must be an admin on Shock and Awe, or the open will fail.

## What you store

| Your env | Value |
|---|---|
| `SCENE_ENGINE_URL` | Public origin of Shock and Awe, e.g. `https://scenes.example.com` (HTTPS, no port if 443 is in front) |
| `HANDOFF_SECRET` | Shared secret you were given. Server only — never ship it to the browser |

## Login router

On “open Shock and Awe”:

1. Confirm the user has a Supabase session on **your** server (`getSession()`). If not, send them to your login.
2. From that session, take `access_token` and `refresh_token` (the JWT pair, not an `sb-*-auth-token` cookie).
3. From **your server**, `POST` to `{SCENE_ENGINE_URL}/api/auth/handoff`.
4. If you get a `code`, **redirect the user’s browser** to `{SCENE_ENGINE_URL}/api/auth/consume?code=…&next=/setup`. Do that in the same response. Do not `fetch` consume from your origin.
5. They arrive in Shock and Awe Setup, signed in.

### Mint

```
POST {SCENE_ENGINE_URL}/api/auth/handoff
Authorization: Bearer <HANDOFF_SECRET>
Content-Type: application/json
```

```json
{
  "access_token": "<session.access_token>",
  "refresh_token": "<session.refresh_token>"
}
```

`200`: `{ "ok": true, "code": "<string>", "expires_in": 60 }` — use `code` immediately in the redirect.

| Status | What to do |
|---|---|
| 400 | Tokens missing or not a session pair — check `getSession()` |
| 401 | Wrong secret, or the access token is not valid |
| 403 | This user is not an admin on Shock and Awe — do not send them there |
| 4xx/5xx | Do not redirect; keep them on your dashboard |

### Redirect the browser

```
{SCENE_ENGINE_URL}/api/auth/consume?code=<code>&next=/setup
```

`next=/setup` is the usual landing. If the code is not accepted, they will see Shock and Awe’s sign-in page.

## Example (your server route)

```js
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  return Response.redirect('/login');
}

const mint = await fetch(`${process.env.SCENE_ENGINE_URL}/api/auth/handoff`, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${process.env.HANDOFF_SECRET}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  }),
});

const body = await mint.json();
if (!mint.ok || !body.code) {
  return Response.redirect('/login');
}

const dest = new URL('/api/auth/consume', process.env.SCENE_ENGINE_URL);
dest.searchParams.set('code', body.code);
dest.searchParams.set('next', '/setup');
return Response.redirect(dest.toString(), 302);
```
