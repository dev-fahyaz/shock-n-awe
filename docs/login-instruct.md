# Accept a login from the central dashboard

Do this on your site so the dashboard can open it the same way it opens Shock and Awe. The user is already signed in on the dashboard. Your site sets its own session. Do not ask them to type a password again.

Use the **same Supabase project** as the dashboard. Only users you accept (Shock and Awe uses `app_users.role = admin`) get in.

## Env

| Name | Use |
|---|---|
| `HANDOFF_SECRET` | Shared secret. The dashboard sends it. If it is unset, refuse mint with **501**. |
| `DASHBOARD_URL` | The dashboard’s public `http:` or `https:` URL. Show **Return to dashboard** when it is set. Hide the link when it is missing or not a real http(s) URL. |

## Two routes

### 1. Mint — the dashboard’s server calls this

`POST /api/auth/handoff`

```
Authorization: Bearer <HANDOFF_SECRET>
Content-Type: application/json
```

Also accept the secret as `x-handoff-secret`.

Body:

```json
{
  "access_token": "<jwt, starts with eyJ>",
  "refresh_token": "<refresh token>"
}
```

That pair is `session.access_token` and `session.refresh_token` from `supabase.auth.getSession()` on the dashboard. It is not the `sb-*-auth-token` cookie.

What to do:

1. Wrong or missing secret → **401**.
2. Body is not that pair → **400**.
3. Call Supabase `getUser(access_token)`. Invalid token → **401**.
4. User is not allowed on your site → **403**. Do not issue a code.
5. Otherwise store the two tokens under a random code (`crypto.randomBytes(32)` hex), **60 seconds**, **one use**.
6. Reply **200**: `{ "ok": true, "code": "<code>", "expires_in": 60 }`.

Do not log the tokens or the code.

### 2. Consume — the user’s browser is sent here

The dashboard redirects the browser (it does not `fetch` this):

```
GET /api/auth/consume?code=<code>&next=/your-home
```

What to do:

1. Look up the code and delete it. Missing, reused, or older than 60 seconds → redirect to your `/login`.
2. `setSession({ access_token, refresh_token })` so **your** origin gets the auth cookies.
3. Check the user is still allowed. If not, sign out and redirect to `/login`.
4. Redirect **303** to `next` if it is a path on your site (`/…`, not `//…`). Otherwise your home page.

`next` is only a path on your origin. The dashboard will pass something like `/setup` for Shock and Awe; you choose your own landing path and tell them what to put in `next`.

## Keep your own sign-in

Leave email/password (or whatever you already have) on `/login`. The code path is only for “open this app” from the dashboard.

## Return to dashboard

On the signed-in screens (and on `/login` if they bounced there), a link labeled **Return to dashboard** goes to `DASHBOARD_URL`. Public pages that outsiders see do not show it.
