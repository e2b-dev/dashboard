import 'server-only'

import { createHash } from 'node:crypto'
import { mintBackendToken } from './silent-grant'

// Cross-request cache for the backend Hydra token minted by the silent grant,
// which is an expensive multi-hop server-to-Ory exchange. Safe because callers
// always re-validate the live Kratos session (whoami) before this is consulted,
// and the key is bound to the server-validated session id, so a request can
// only ever read the token minted for its own session.

// Re-mint before the token's own expiry so we never hand the backend one that
// dies mid-flight.
const EXPIRY_SKEW_SECONDS = 60

// Bounds worst-case memory; oldest entries evicted first.
const MAX_ENTRIES = 5000

type CacheEntry = { accessToken: string; expiresAt: number }

const tokenCache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<CacheEntry | null>>()

function cacheKey(sessionId: string, subject: string): string {
  // ':' can't appear in either Ory UUID, so distinct pairs never collide.
  return createHash('sha256').update(`${sessionId}:${subject}`).digest('hex')
}

function isFresh(entry: CacheEntry, nowSeconds: number): boolean {
  return entry.expiresAt - EXPIRY_SKEW_SECONDS > nowSeconds
}

function evictIfFull(): void {
  while (tokenCache.size > MAX_ENTRIES) {
    const oldest = tokenCache.keys().next().value
    if (oldest === undefined) break
    tokenCache.delete(oldest)
  }
}

type BackendTokenInput = {
  // From the validated whoami session — never client-supplied.
  sessionId: string
  subject: string
  email?: string
  name?: string
}

// Returns a cached token, or mints one. null = unauthenticated (callers must
// treat it as such).
export async function getBackendToken(
  input: BackendTokenInput
): Promise<string | null> {
  const { sessionId, subject, email, name } = input
  if (!sessionId || !subject) return null

  const key = cacheKey(sessionId, subject)
  const nowSeconds = Math.floor(Date.now() / 1000)

  const cached = tokenCache.get(key)
  if (cached && isFresh(cached, nowSeconds)) return cached.accessToken
  if (cached) tokenCache.delete(key)

  // Coalesce concurrent mints for the same session into one exchange.
  let pending = inFlight.get(key)
  if (!pending) {
    pending = mintBackendToken({ subject, email, name }).then((result) =>
      result
        ? { accessToken: result.accessToken, expiresAt: result.expiresAt }
        : null
    )
    inFlight.set(key, pending)
  }

  let entry: CacheEntry | null
  try {
    entry = await pending
  } finally {
    inFlight.delete(key)
  }

  if (!entry) return null

  tokenCache.set(key, entry)
  evictIfFull()
  return entry.accessToken
}

// Test-only: reset module state between cases.
export function __resetBackendTokenCacheForTests(): void {
  tokenCache.clear()
  inFlight.clear()
}
