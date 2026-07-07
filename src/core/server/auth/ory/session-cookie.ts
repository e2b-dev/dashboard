import { EncryptJWT, jwtDecrypt } from 'jose'
import { CONTENT_ENCRYPTION, deriveKey, KEY_ALGORITHM } from './cookie-crypto'

// The single encrypted cookie that carries the Hydra OIDC tokens for API
// access. Kratos owns the session; this cookie is never the auth gate — it is
// read by getAuthContext for the access token and refreshed by the middleware.
// No next/headers import here so the module stays usable from edge middleware.

export const E2B_SESSION_COOKIE = 'e2b_session'

export const ORY_SIGNUP_METADATA_COOKIE = 'e2b-ory-signup-metadata'

// Cookies the dashboard owns — never forwarded across the Ory trust boundary.
// e2b_session may be chunked (e2b_session.0/.1/…), so the chunk names are
// app-owned too and must be stripped alongside the bare name.
function isAppOwnedCookie(name: string): boolean {
  return (
    name === ORY_SIGNUP_METADATA_COOKIE ||
    name === E2B_SESSION_COOKIE ||
    sessionChunkIndex(name) !== null
  )
}

// Serializes a cookie list into a `Cookie` header for forwarding to Ory, with
// the app-owned cookies stripped. Takes the cookie list rather than reading
// next/headers so it stays edge-safe and serves both the middleware
// (NextRequest cookies) and server components (next/headers cookies).
export function cookieHeaderWithoutAppOwned(
  cookieList: ReadonlyArray<{ name: string; value: string }>
): string {
  return cookieList
    .filter((cookie) => !isAppOwnedCookie(cookie.name))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')
}

// Persist across browser restarts. The cookie only caches tokens — a stale or
// expired cookie is re-minted from the live Kratos session, so the lifetime is
// intentionally generous and not the security boundary.
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export type SessionTokens = {
  accessToken: string
  refreshToken?: string
  idToken?: string
  // Absolute access-token expiry, epoch seconds.
  expiresAt: number
}

export type SessionCookieOptions = {
  httpOnly: true
  sameSite: 'lax'
  path: '/'
  secure: boolean
  maxAge: number
  domain?: string
}

export type SessionCookieDeleteOptions = {
  name: string
  path: '/'
  domain?: string
}

export async function sealSessionCookie(
  tokens: SessionTokens
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

export async function openSessionCookie(
  value: string | undefined | null
): Promise<SessionTokens | null> {
  if (!value) return null

  try {
    const { payload } = await jwtDecrypt(value, await deriveKey())
    return parseTokens(payload)
  } catch {
    return null
  }
}

// The browser caps a single cookie at ~4096 bytes including its name and
// attributes. The sealed value is ASCII (base64url JWE), so 3800 bytes of value
// leaves headroom for `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=…;
// Domain=…` and keeps every chunk under the cap.
const MAX_SESSION_COOKIE_CHUNK = 3800

const SESSION_CHUNK_PREFIX = `${E2B_SESSION_COOKIE}.`

// Numeric chunk index for `e2b_session.N`, or null for anything that isn't a
// session chunk (including the bare `e2b_session`).
function sessionChunkIndex(name: string): number | null {
  if (!name.startsWith(SESSION_CHUNK_PREFIX)) return null
  const suffix = name.slice(SESSION_CHUNK_PREFIX.length)
  if (!/^\d+$/.test(suffix)) return null
  return Number(suffix)
}

export type SessionCookieChunk = { name: string; value: string }

// The cookies to write plus the names to expire so the browser jar matches the
// new value. On every write the other shape's leftovers are expired (bare↔chunked
// transitions, or a shrink from N chunks to fewer) so no orphan cookies linger.
export type SessionCookieReconciliation = {
  write: SessionCookieChunk[]
  expire: string[]
}

// Splits the sealed value into the cookies to write. Values within one chunk
// keep the bare `e2b_session` name (backward compatible with cookies already in
// the wild); larger values fan out to `e2b_session.0`, `e2b_session.1`, … the
// way authjs chunks its session cookie.
export function splitSessionCookie(value: string): SessionCookieChunk[] {
  if (value.length <= MAX_SESSION_COOKIE_CHUNK) {
    return [{ name: E2B_SESSION_COOKIE, value }]
  }

  const chunks: SessionCookieChunk[] = []
  for (let start = 0, index = 0; start < value.length; index++) {
    chunks.push({
      name: `${SESSION_CHUNK_PREFIX}${index}`,
      value: value.slice(start, start + MAX_SESSION_COOKIE_CHUNK),
    })
    start += MAX_SESSION_COOKIE_CHUNK
  }
  return chunks
}

// Reassembles the sealed value from whatever cookie shape is present. Prefers
// numbered chunks (sorted by index); falls back to a bare `e2b_session`. Never
// mixes the two shapes, so a stale bare cookie sitting beside fresh chunks can't
// corrupt the value.
export function joinSessionCookie(
  cookieList: ReadonlyArray<{ name: string; value: string }>
): string | undefined {
  const chunks = cookieList
    .map((cookie) => ({
      index: sessionChunkIndex(cookie.name),
      value: cookie.value,
    }))
    .filter(
      (chunk): chunk is { index: number; value: string } => chunk.index !== null
    )
    .sort((a, b) => a.index - b.index)

  if (chunks.length > 0) {
    return chunks.map((chunk) => chunk.value).join('')
  }

  return cookieList.find((cookie) => cookie.name === E2B_SESSION_COOKIE)?.value
}

// Every e2b_session cookie name currently in the jar — bare or chunked — so the
// clear paths can expire all of them, not just the bare name.
export function sessionCookieNames(
  cookieList: ReadonlyArray<{ name: string; value: string }>
): string[] {
  return cookieList
    .filter(
      (cookie) =>
        cookie.name === E2B_SESSION_COOKIE ||
        sessionChunkIndex(cookie.name) !== null
    )
    .map((cookie) => cookie.name)
}

// Reconciles the browser jar to a new sealed value: the chunks to write plus the
// stale names to expire so the previous shape never outlives the new one.
export function reconcileSessionCookies(
  value: string,
  existing: ReadonlyArray<{ name: string; value: string }>
): SessionCookieReconciliation {
  const write = splitSessionCookie(value)
  const writeNames = new Set(write.map((chunk) => chunk.name))
  const expire = sessionCookieNames(existing).filter(
    (name) => !writeNames.has(name)
  )
  return { write, expire }
}

export function sessionCookieOptions(
  host?: string | null
): SessionCookieOptions {
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
// clear paths must pass these options rather than the bare cookie name. Defaults
// to the bare name; chunked clears pass each `e2b_session.N` name explicitly.
export function sessionCookieDeleteOptions(
  host?: string | null,
  name: string = E2B_SESSION_COOKIE
): SessionCookieDeleteOptions {
  return {
    name,
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

function parseTokens(payload: Record<string, unknown>): SessionTokens | null {
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
