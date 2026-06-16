/**
 * Phase 0 spike — silent server-side OAuth2 grant from a Kratos session.
 *
 * THROWAWAY DIAGNOSTIC. Proves (or disproves) the make-or-break assumption of
 * the "drop Auth.js" migration: that once a Kratos session exists, the
 * dashboard can mint a backend-acceptable Hydra access token entirely
 * server-side (no browser, no user-facing redirect), carrying the same
 * iss/sub/email/name/aud the backend validates today.
 *
 * MECHANISM (learned from the first spike run):
 *   `prompt=none` does NOT work — in Ory Network a Kratos session cookie is not
 *   a Hydra "login session" (the Account Experience normally bridges them in
 *   the browser login-UI step, which prompt=none forbids → login_required).
 *   Instead the dashboard plays the OAuth2 login+consent PROVIDER itself:
 *     1. whoami(cookie)            -> validate session, get subject + traits
 *     2. GET /oauth2/auth          -> 302 to ...?login_challenge=…
 *     3. admin acceptLogin(subject)-> redirect_to (resume authorize)
 *     4. follow                    -> 302 to ...?consent_challenge=…
 *     5. admin acceptConsent(scope,audience,claims) -> redirect_to
 *     6. follow                    -> 302 to redirect_uri?code=…
 *     7. POST /oauth2/token        -> access_token (JWT)
 *   Admin calls use ORY_PROJECT_API_TOKEN. No consent-skip config required.
 *
 * It does NOT touch app code and is safe to delete once the spike concludes.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * HOW TO GET A KRATOS SESSION COOKIE (staging):
 *   1. Log in to the staging dashboard in a browser.
 *   2. DevTools -> Application -> Cookies -> find the `ory_session_*` cookie
 *      on the auth domain (e.g. auth.e2b-staging.dev). Copy its FULL
 *      `name=value` pair.
 *   3. Export it:  export ORY_KRATOS_SESSION_COOKIE='ory_session_xxx=abc...'
 *      (You can paste several cookies separated by '; ' if needed.)
 *
 * REQUIRED ENV:
 *   ORY_SDK_URL                 e.g. https://auth.e2b-staging.dev
 *   ORY_OAUTH2_CLIENT_ID
 *   ORY_OAUTH2_CLIENT_SECRET
 *   ORY_KRATOS_SESSION_COOKIE   the cookie pair from the steps above
 * OPTIONAL ENV:
 *   ORY_OAUTH2_AUDIENCE         requested `audience` param (matches the app)
 *   SPIKE_REDIRECT_URI          default: https://e2b-staging.dev/api/auth/oauth/callback/ory
 *   SPIKE_SCOPE                 default: "openid offline_access email profile"
 *   SPIKE_BACKEND_VERIFY_URL    if set, GET this URL with the minted token as
 *                               Bearer to confirm the backend accepts it
 *
 * RUN:
 *   bun scripts/spike-silent-oauth-grant.ts
 */

import { createHash, randomBytes } from 'node:crypto'

// ── env ─────────────────────────────────────────────────────────────────────
const SDK_URL = required('ORY_SDK_URL').replace(/\/$/, '')
const CLIENT_ID = required('ORY_OAUTH2_CLIENT_ID')
const CLIENT_SECRET = required('ORY_OAUTH2_CLIENT_SECRET')
const SESSION_COOKIE = required('ORY_KRATOS_SESSION_COOKIE')
// Admin token: Ory Network co-locates the admin API on the SDK host. Used to
// accept the login + consent challenges (the dashboard is the login provider).
const ADMIN_URL = (process.env.ORY_HYDRA_ADMIN_URL ?? SDK_URL).replace(/\/$/, '')
const PROJECT_API_TOKEN = required('ORY_PROJECT_API_TOKEN')
const AUDIENCE = process.env.ORY_OAUTH2_AUDIENCE
const REDIRECT_URI =
  process.env.SPIKE_REDIRECT_URI ??
  'https://e2b-staging.dev/api/auth/oauth/callback/ory'
const SCOPE = process.env.SPIKE_SCOPE ?? 'openid offline_access email profile'
const BACKEND_VERIFY_URL = process.env.SPIKE_BACKEND_VERIFY_URL

const MAX_HOPS = 10

function required(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`✗ missing required env var: ${name}`)
    process.exit(2)
  }
  return v
}

function fail(reason: string, detail?: unknown): never {
  console.error(`\n✗ SPIKE FAILED: ${reason}`)
  if (detail !== undefined) console.error(detail)
  console.error(
    '\n→ The silent grant does not work as-is. Likely causes: consent not ' +
      'skipped for this client (set skip_consent / trusted first-party in ' +
      'Terraform — Phase 6), login_required (session cookie not accepted), ' +
      'PKCE/CSRF mismatch, or redirect_uri not registered. If unfixable, fall ' +
      'back to the Ory session tokenizer (needs backend sign-off).'
  )
  process.exit(1)
}

// ── tiny cookie jar (same-host chain) ────────────────────────────────────────
const jar = new Map<string, string>()
for (const pair of SESSION_COOKIE.split(/;\s*/)) {
  const eq = pair.indexOf('=')
  if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
}
function cookieHeader(): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}
function absorbSetCookie(res: Response): void {
  // Bun/undici expose getSetCookie(); fall back to the folded header.
  const raw =
    (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ??
    (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : [])
  for (const sc of raw) {
    const first = sc.split(';')[0]
    const eq = first.indexOf('=')
    if (eq > 0) jar.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim())
  }
}

// ── PKCE + state ─────────────────────────────────────────────────────────────
const codeVerifier = base64url(randomBytes(32))
const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest())
const state = base64url(randomBytes(16))
const nonce = base64url(randomBytes(16))

function base64url(buf: Buffer): string {
  return buf.toString('base64url')
}

function decodeJwt(token: string): Record<string, unknown> | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

// ── whoami: validate the Kratos session, get subject + identity traits ───────
type WhoamiSession = {
  identity?: {
    id?: string
    traits?: { email?: string; name?: { first?: string; last?: string } | string }
  }
}

async function whoami(): Promise<{ subject: string; email?: string; name?: string }> {
  const res = await fetch(`${SDK_URL}/sessions/whoami`, {
    headers: { cookie: cookieHeader(), accept: 'application/json' },
  })
  if (!res.ok) {
    fail(
      `whoami failed (${res.status}) — the Kratos session cookie is not valid/active`,
      (await res.text().catch(() => '')).slice(0, 400)
    )
  }
  const session = (await res.json()) as WhoamiSession
  const subject = session.identity?.id
  if (!subject) fail('whoami returned no identity.id (cannot determine subject)')
  const traits = session.identity?.traits
  const name =
    typeof traits?.name === 'string'
      ? traits.name
      : [traits?.name?.first, traits?.name?.last].filter(Boolean).join(' ') || undefined
  return { subject, email: traits?.email, name }
}

// ── admin: accept login / consent (dashboard is the OAuth2 provider) ──────────
async function adminPut(path: string, query: string, body: unknown): Promise<{ redirect_to: string }> {
  const res = await fetch(`${ADMIN_URL}${path}?${query}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${PROJECT_API_TOKEN}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as
    | { redirect_to?: string; error?: string; error_description?: string }
    | null
  if (!res.ok || !json?.redirect_to) {
    fail(`admin ${path} failed (${res.status})`, json)
  }
  return { redirect_to: json.redirect_to }
}

async function adminGet(path: string, query: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${ADMIN_URL}${path}?${query}`, {
    headers: { authorization: `Bearer ${PROJECT_API_TOKEN}`, accept: 'application/json' },
  })
  if (!res.ok) {
    fail(`admin GET ${path} failed (${res.status})`, (await res.text().catch(() => '')).slice(0, 400))
  }
  return (await res.json()) as Record<string, unknown>
}

// ── drive authorize, accepting login + consent via the admin API ─────────────
async function authorizeForCode(subject: string, email?: string, name?: string): Promise<string> {
  const authorizeUrl = new URL(`${SDK_URL}/oauth2/auth`)
  authorizeUrl.search = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: SCOPE,
    redirect_uri: REDIRECT_URI,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    ...(AUDIENCE ? { audience: AUDIENCE } : {}),
  }).toString()

  let next = authorizeUrl.toString()

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const res = await fetch(next, {
      method: 'GET',
      redirect: 'manual',
      headers: { cookie: cookieHeader(), accept: 'text/html,*/*' },
    })
    absorbSetCookie(res)

    const location = res.headers.get('location')
    console.log(`  hop ${hop}: ${res.status} -> ${truncate(location)}`)

    if (!location) {
      const body = await res.text().catch(() => '')
      fail(`authorize returned ${res.status} with no Location`, body.slice(0, 800))
    }

    const loc = new URL(location, next)

    // login challenge → we are the login provider: accept for the subject.
    const loginChallenge = loc.searchParams.get('login_challenge')
    if (loginChallenge) {
      console.log('    ↳ accepting login challenge as subject', subject)
      const { redirect_to } = await adminPut(
        '/admin/oauth2/auth/requests/login/accept',
        `login_challenge=${encodeURIComponent(loginChallenge)}`,
        { subject, remember: false, acr: '0' }
      )
      next = redirect_to
      continue
    }

    // consent challenge → grant the requested scope/audience and inject claims.
    const consentChallenge = loc.searchParams.get('consent_challenge')
    if (consentChallenge) {
      const reqInfo = await adminGet(
        '/admin/oauth2/auth/requests/consent',
        `consent_challenge=${encodeURIComponent(consentChallenge)}`
      )
      const grantScope = (reqInfo.requested_scope as string[]) ?? SCOPE.split(' ')
      const grantAudience =
        (reqInfo.requested_access_token_audience as string[]) ??
        (AUDIENCE ? [AUDIENCE] : [])
      console.log('    ↳ accepting consent; scope', grantScope, 'aud', grantAudience)
      const claims = { email, name }
      const { redirect_to } = await adminPut(
        '/admin/oauth2/auth/requests/consent/accept',
        `consent_challenge=${encodeURIComponent(consentChallenge)}`,
        {
          grant_scope: grantScope,
          grant_access_token_audience: grantAudience,
          remember: false,
          session: { access_token: claims, id_token: claims },
        }
      )
      next = redirect_to
      continue
    }

    // reached our redirect_uri — pull the code.
    if (sameRedirectTarget(loc)) {
      const err = loc.searchParams.get('error')
      if (err) {
        fail(
          `Hydra returned error at redirect_uri: ${err} / ${loc.searchParams.get('error_description') ?? ''}`
        )
      }
      const code = loc.searchParams.get('code')
      if (!code) fail('redirect_uri reached but no ?code= present', location)
      if (loc.searchParams.get('state') !== state) {
        fail('state mismatch on the authorization code redirect', location)
      }
      return code
    }

    // any other same-host hop: keep following.
    next = loc.toString()
  }

  fail(`exceeded ${MAX_HOPS} redirect hops without reaching the redirect_uri`)
}

function sameRedirectTarget(u: URL): boolean {
  const target = new URL(REDIRECT_URI)
  return u.origin === target.origin && u.pathname === target.pathname
}

function truncate(s: string | null): string {
  if (!s) return '(no location)'
  return s.length > 120 ? `${s.slice(0, 120)}…` : s
}

// ── exchange code -> tokens ──────────────────────────────────────────────────
async function exchangeCode(code: string) {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${SDK_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }).toString(),
  })

  const json = (await res.json().catch(() => null)) as {
    access_token?: string
    id_token?: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
    error?: string
    error_description?: string
  } | null

  if (!res.ok || !json?.access_token) {
    fail(`token exchange failed (${res.status})`, json)
  }
  return json
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Phase 0 spike — silent OAuth2 grant from a Kratos session\n')
  console.log(`  sdk_url      : ${SDK_URL}`)
  console.log(`  client_id    : ${CLIENT_ID}`)
  console.log(`  redirect_uri : ${REDIRECT_URI}`)
  console.log(`  scope        : ${SCOPE}`)
  console.log(`  audience     : ${AUDIENCE ?? '(none)'}`)
  console.log(`  cookies sent : ${[...jar.keys()].join(', ')}\n`)

  console.log('→ validating Kratos session (whoami)…')
  const { subject, email, name } = await whoami()
  console.log(`✓ session valid — subject ${subject}, email ${email ?? '—'}\n`)

  console.log('→ driving authorize + admin login/consent accept…')
  const code = await authorizeForCode(subject, email, name)
  console.log(`\n✓ got authorization code (${code.slice(0, 8)}…) with no UI redirect`)

  const tokens = await exchangeCode(code)
  console.log('✓ token exchange succeeded\n')

  const access = tokens.access_token as string
  const isJwt = access.split('.').length === 3
  console.log(`  token_type     : ${tokens.token_type}`)
  console.log(`  expires_in     : ${tokens.expires_in}s`)
  console.log(`  refresh_token  : ${tokens.refresh_token ? 'present' : 'absent'}`)
  console.log(`  access_token   : ${isJwt ? 'JWT' : 'opaque'}`)

  if (isJwt) {
    const claims = (decodeJwt(access) ?? {}) as Record<string, unknown>
    const idClaims = (tokens.id_token ? decodeJwt(tokens.id_token) : null) as
      | Record<string, unknown>
      | null
    console.log('\n  FULL access_token claims:\n', JSON.stringify(claims, null, 2))
    if (idClaims) {
      console.log('\n  FULL id_token claims:\n', JSON.stringify(idClaims, null, 2))
    }
    // The app (dashboard-bootstrap) reads email/name from access OR id token,
    // and Ory may nest custom claims under `ext`. Check all those locations.
    const ext = (claims.ext as Record<string, unknown> | undefined) ?? {}
    const has = (k: string) =>
      claims[k] != null || ext[k] != null || (idClaims?.[k] != null)
    console.log('\n  backend contract resolution (access | ext | id):')
    for (const k of ['iss', 'sub', 'email', 'name', 'aud']) {
      console.log(
        `    ${k.padEnd(6)}: ${has(k) ? '✓' : '✗'}  ` +
          `[${JSON.stringify(claims[k]) ?? '—'} | ${JSON.stringify(ext[k]) ?? '—'} | ${JSON.stringify(idClaims?.[k]) ?? '—'}]`
      )
    }
    const required = ['iss', 'sub', 'email', 'aud']
    const missing = required.filter((k) => !has(k))
    if (missing.length) {
      fail(
        `minted token is missing backend-required claims anywhere: ${missing.join(', ')}`,
        'Adjust the consent session payload / JWT access-token template so the contract matches.'
      )
    }
  } else {
    console.log(
      '\n  ⚠ access_token is opaque, not a JWT. The backend reads JWT claims today — ' +
        'enable JWT access tokens for this client, or this approach needs adjustment.'
    )
  }

  if (BACKEND_VERIFY_URL) {
    console.log(`\n→ verifying backend accepts the token: GET ${BACKEND_VERIFY_URL}`)
    const res = await fetch(BACKEND_VERIFY_URL, {
      headers: { authorization: `Bearer ${access}` },
    })
    console.log(`  backend responded: ${res.status}`)
    if (!res.ok) {
      fail(
        `backend rejected the minted token (${res.status})`,
        (await res.text().catch(() => '')).slice(0, 600)
      )
    }
    console.log('  ✓ backend accepted the minted token')
  }

  console.log(
    '\n✓✓ SPIKE PASSED — a Kratos session yields a backend-acceptable Hydra ' +
      'token server-side, no user-facing redirect. Proceed to Phase 1.'
  )
  if (!BACKEND_VERIFY_URL) {
    console.log(
      '   (Set SPIKE_BACKEND_VERIFY_URL to also confirm the backend accepts it.)'
    )
  }
}

main().catch((e) => fail('unexpected error', e))
