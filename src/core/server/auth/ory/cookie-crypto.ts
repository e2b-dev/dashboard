// Shared symmetric encryption for the Ory auth cookies (e2b_session and
// e2b_oauth_flow). Both seal their payload as a JWE keyed off E2B_SESSION_SECRET.
// No next/headers import so this stays usable from edge middleware.

export const KEY_ALGORITHM = 'dir'
export const CONTENT_ENCRYPTION = 'A256GCM'

// Cache the derived key per secret value so rotating E2B_SESSION_SECRET (and
// test env stubbing) takes effect without a stale key lingering.
let cached: { secret: string; key: Promise<Uint8Array> } | null = null

export function deriveKey(): Promise<Uint8Array> {
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
