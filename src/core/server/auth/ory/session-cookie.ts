import { EncryptJWT, jwtDecrypt } from 'jose'

// The single encrypted cookie that carries the Hydra OIDC tokens for API
// access. Kratos owns the session; this cookie is never the auth gate — it is
// read by getAuthContext for the access token and refreshed by the middleware.
// No next/headers import here so the module stays usable from edge middleware.

export const E2B_SESSION_COOKIE = 'e2b_session'

// Persist across browser restarts. The cookie only caches tokens — a stale or
// expired cookie is re-minted from the live Kratos session, so the lifetime is
// intentionally generous and not the security boundary.
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

const KEY_ALGORITHM = 'dir'
const CONTENT_ENCRYPTION = 'A256GCM'

export type OrySessionTokens = {
  accessToken: string
  refreshToken?: string
  idToken?: string
  // Absolute access-token expiry, epoch seconds.
  expiresAt: number
}

export type OrySessionCookieOptions = {
  httpOnly: true
  sameSite: 'lax'
  path: '/'
  secure: boolean
  maxAge: number
  domain?: string
}

export type OrySessionCookieDeleteOptions = {
  name: typeof E2B_SESSION_COOKIE
  path: '/'
  domain?: string
}

// Cache the derived key per secret value so rotating E2B_SESSION_SECRET (and
// test env stubbing) takes effect without a stale key lingering.
let cached: { secret: string; key: Promise<Uint8Array> } | null = null

function deriveKey(): Promise<Uint8Array> {
  const secret = process.env.E2B_SESSION_SECRET
  if (!secret) {
    return Promise.reject(new Error('E2B_SESSION_SECRET is not configured'))
  }

  if (cached?.secret === secret) return cached.key

  const key = crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(secret))
    .then((digest) => new Uint8Array(digest))

  cached = { secret, key }
  return key
}

export async function sealOrySession(
  tokens: OrySessionTokens
): Promise<string> {
  return new EncryptJWT({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    idToken: tokens.idToken,
    expiresAt: tokens.expiresAt,
  })
    .setProtectedHeader({ alg: KEY_ALGORITHM, enc: CONTENT_ENCRYPTION })
    .setIssuedAt()
    .encrypt(await deriveKey())
}

export async function openOrySession(
  value: string | undefined | null
): Promise<OrySessionTokens | null> {
  if (!value) return null

  try {
    const { payload } = await jwtDecrypt(value, await deriveKey())
    return parseTokens(payload)
  } catch {
    return null
  }
}

export function orySessionCookieOptions(
  host?: string | null
): OrySessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // Vercel deployments (preview + production) build with NODE_ENV=production
    // and serve over HTTPS; local `next dev` is plain-HTTP loopback.
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    domain: resolveSessionCookieDomain(host),
  }
}

// Deleting a domain-scoped cookie requires the same domain attribute, so the
// clear paths must pass these options rather than the bare cookie name.
export function orySessionCookieDeleteOptions(
  host?: string | null
): OrySessionCookieDeleteOptions {
  return {
    name: E2B_SESSION_COOKIE,
    path: '/',
    domain: resolveSessionCookieDomain(host),
  }
}

// Scope the cookie to the parent domain (e.g. `.e2b-staging.dev`) so it is
// shared across every subdomain of the deployment environment instead of being
// pinned to the exact host. Hosts that don't belong to NEXT_PUBLIC_E2B_DOMAIN
// (localhost, Vercel preview URLs) get a host-only cookie — a `.dev` domain
// attribute there would be rejected by the browser.
export function resolveSessionCookieDomain(
  host: string | null | undefined
): string | undefined {
  const base = process.env.NEXT_PUBLIC_E2B_DOMAIN
  if (!base || !host) return undefined

  const hostname = host.split(':')[0] ?? host
  if (hostname === base || hostname.endsWith(`.${base}`)) {
    return `.${base}`
  }

  return undefined
}

function parseTokens(
  payload: Record<string, unknown>
): OrySessionTokens | null {
  const { accessToken, refreshToken, idToken, expiresAt } = payload
  if (typeof accessToken !== 'string' || typeof expiresAt !== 'number') {
    return null
  }

  return {
    accessToken,
    refreshToken: typeof refreshToken === 'string' ? refreshToken : undefined,
    idToken: typeof idToken === 'string' ? idToken : undefined,
    expiresAt,
  }
}
