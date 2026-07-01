// OAuth callback relay for preview deployments. Ory does not allow wildcard
// redirect URIs, so previews — whose host is dynamic per branch — cannot
// register their own callback. Instead we register ONE stable callback on a
// fixed host (ORY_OAUTH_RELAY_ORIGIN) and point Hydra there for every preview,
// encoding the originating preview origin in the sealed OAuth `state`. The fixed
// host bounces the browser (carrying code/state/iss) back to the preview's real
// callback, which finishes the PKCE exchange using the same registered
// redirect_uri string — the token request only requires the redirect_uri to
// match the authorize-time value, not to be where the code was delivered.
//
// The PKCE verifier lives in a host-only cookie on the preview and never reaches
// the relay. `state` is sealed with the shared cookie crypto (E2B_SESSION_SECRET,
// identical across the fixed host and previews), so the target is tamper-proof.
//
// No next/headers import here so this stays importable from edge middleware
// (signout.ts pulls it in for the post-logout path).

import { EncryptJWT, jwtDecrypt } from 'jose'
import { isLoopbackUrl } from '@/core/shared/schemas/url'
import { CONTENT_ENCRYPTION, deriveKey, KEY_ALGORITHM } from './cookie-crypto'
import { OAUTH_CALLBACK_PATH } from './oauth-flow'

export const OAUTH_RELAY_PATH = '/api/auth/oauth/relay'
export const OAUTH_LOGOUT_RELAY_PATH = '/api/auth/oauth/logout-relay'

// The fixed host whose relay endpoints are registered in Hydra. Set on preview
// deployments only; unset on staging/production/local, where the flow stays
// host-direct and behaves exactly as before.
export function readRelayOrigin(): string | undefined {
  const value = process.env.ORY_OAUTH_RELAY_ORIGIN
  if (!value) return undefined
  return value.replace(/\/$/, '')
}

export function resolvePublicOrigin(requestOrigin: string): string {
  return process.env.APP_URL?.replace(/\/$/, '') ?? requestOrigin
}

// Relay mode applies only when a fixed origin is configured AND differs from the
// request origin. On the fixed host itself (and everywhere relay is unset) the
// request resolves to its own callback, i.e. today's behavior.
export function resolveOryRedirectUri(requestOrigin: string): {
  redirectUri: string
  relayTarget?: string
} {
  const relay = readRelayOrigin()
  if (relay && relay !== requestOrigin) {
    return {
      redirectUri: new URL(OAUTH_RELAY_PATH, relay).toString(),
      relayTarget: requestOrigin,
    }
  }

  return { redirectUri: new URL(OAUTH_CALLBACK_PATH, requestOrigin).toString() }
}

// Carries the originating preview origin through Hydra in the OAuth `state`
// (login) or RP-logout `state`. The random `r` gives the login state CSRF
// entropy beyond the per-seal random IV.
export async function sealRelayState(target: string): Promise<string> {
  return new EncryptJWT({ t: target, r: crypto.randomUUID() })
    .setProtectedHeader({ alg: KEY_ALGORITHM, enc: CONTENT_ENCRYPTION })
    .setIssuedAt()
    .encrypt(await deriveKey())
}

export async function openRelayState(
  value: string | null | undefined
): Promise<string | null> {
  if (!value) return null

  try {
    const { payload } = await jwtDecrypt(value, await deriveKey())
    return typeof payload.t === 'string' ? payload.t : null
  } catch {
    return null
  }
}

// Open-redirect guard: a relay target must be a first-party origin. Production
// requires HTTPS under NEXT_PUBLIC_E2B_DOMAIN (e.g. `*.e2b-staging.dev`); local
// dev also accepts loopback so the relay path can be exercised across ports.
export function isAllowedRelayTarget(target: string): boolean {
  let url: URL
  try {
    url = new URL(target)
  } catch {
    return false
  }

  if (url.protocol === 'http:' && isLoopbackUrl(target)) {
    return process.env.NODE_ENV !== 'production'
  }

  if (url.protocol !== 'https:') return false

  const base = process.env.NEXT_PUBLIC_E2B_DOMAIN
  if (!base) return false

  return url.hostname === base || url.hostname.endsWith(`.${base}`)
}
