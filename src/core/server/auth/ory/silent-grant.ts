import 'server-only'

import { createHash, randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { cache } from 'react'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { getOryOAuth2Api } from './client'
import { decodeJwtClaims } from './jwt-claims'

// Mints the backend's Hydra access token from the caller's Kratos session,
// entirely server-side and with no user-facing redirect. Validated in Phase 0
// (scripts/spike-silent-oauth-grant.ts): the dashboard plays the OAuth2 login +
// consent provider for its own first-party client, using the project admin
// token to accept the login/consent challenges for the session's subject.
//
// SECURITY: only ever mint for the `subject` that whoami resolved from the
// request's own validated session cookie. Never accept an arbitrary subject.

export type SilentGrantInput = {
  subject: string
  email?: string
  name?: string
}

export type SilentGrantResult = {
  accessToken: string
  // unix seconds; the caller re-mints once we cross it (minus skew).
  expiresAt: number
}

const SCOPE = 'openid offline_access email profile'
const MAX_HOPS = 10

function sdkUrl(): string {
  const url = process.env.ORY_SDK_URL
  if (!url) throw new Error('ORY_SDK_URL is not configured')
  return url.replace(/\/$/, '')
}

// A registered redirect_uri for the dashboard OAuth2 client. We never navigate
// to it — the authorization code is read from the redirect Location header
// server-side — so any registered value works regardless of the visiting origin
// (this is why ephemeral previews need no per-origin redirect_uri).
function redirectUri(): string {
  const domain = process.env.NEXT_PUBLIC_E2B_DOMAIN
  if (!domain) throw new Error('NEXT_PUBLIC_E2B_DOMAIN is not configured')
  return `https://${domain}/api/auth/oauth/callback/ory`
}

// Cookie jar carried across the authorize redirect chain (Hydra sets CSRF
// cookies on /oauth2/auth that must be echoed back on the resume hops).
class CookieJar {
  private jar = new Map<string, string>()

  constructor(seed: string | null | undefined) {
    for (const pair of (seed ?? '').split(/;\s*/)) {
      const eq = pair.indexOf('=')
      if (eq > 0)
        this.jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
    }
  }

  header(): string {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  }

  absorb(res: Response): void {
    const list =
      (
        res.headers as unknown as { getSetCookie?: () => string[] }
      ).getSetCookie?.() ??
      (res.headers.get('set-cookie')
        ? [res.headers.get('set-cookie') as string]
        : [])
    for (const sc of list) {
      const first = sc.split(';')[0] ?? ''
      const eq = first.indexOf('=')
      if (eq > 0)
        this.jar.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim())
    }
  }
}

function base64url(buf: Buffer): string {
  return buf.toString('base64url')
}

async function driveAuthorizeForCode(
  input: SilentGrantInput,
  jar: CookieJar,
  codeChallenge: string,
  state: string,
  nonce: string
): Promise<string | null> {
  const clientId = process.env.ORY_OAUTH2_CLIENT_ID
  const audience = process.env.ORY_OAUTH2_AUDIENCE
  if (!clientId) throw new Error('ORY_OAUTH2_CLIENT_ID is not configured')

  const authorize = new URL(`${sdkUrl()}/oauth2/auth`)
  authorize.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: SCOPE,
    redirect_uri: redirectUri(),
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    ...(audience ? { audience } : {}),
  }).toString()

  const oauth2 = getOryOAuth2Api()
  const target = new URL(redirectUri())
  let next = authorize.toString()

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const res = await fetch(next, {
      method: 'GET',
      redirect: 'manual',
      headers: { cookie: jar.header(), accept: 'text/html,*/*' },
    })
    jar.absorb(res)

    const location = res.headers.get('location')
    if (!location) return null
    const loc = new URL(location, next)

    const loginChallenge = loc.searchParams.get('login_challenge')
    if (loginChallenge) {
      const { redirect_to } = await oauth2.acceptOAuth2LoginRequest({
        loginChallenge,
        acceptOAuth2LoginRequest: { subject: input.subject, remember: false },
      })
      next = redirect_to
      continue
    }

    const consentChallenge = loc.searchParams.get('consent_challenge')
    if (consentChallenge) {
      const reqInfo = await oauth2.getOAuth2ConsentRequest({ consentChallenge })
      const claims = { email: input.email, name: input.name }
      const { redirect_to } = await oauth2.acceptOAuth2ConsentRequest({
        consentChallenge,
        acceptOAuth2ConsentRequest: {
          grant_scope: reqInfo.requested_scope ?? SCOPE.split(' '),
          grant_access_token_audience: reqInfo.requested_access_token_audience,
          remember: false,
          session: { access_token: claims, id_token: claims },
        },
      })
      next = redirect_to
      continue
    }

    if (loc.origin === target.origin && loc.pathname === target.pathname) {
      if (loc.searchParams.get('error')) return null
      if (loc.searchParams.get('state') !== state) return null
      return loc.searchParams.get('code')
    }

    next = loc.toString()
  }

  return null
}

async function exchangeCode(
  code: string,
  codeVerifier: string
): Promise<SilentGrantResult | null> {
  const clientId = process.env.ORY_OAUTH2_CLIENT_ID
  const clientSecret = process.env.ORY_OAUTH2_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(`${sdkUrl()}/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      code_verifier: codeVerifier,
    }).toString(),
  })
  if (!res.ok) return null

  const json = (await res.json().catch(() => null)) as {
    access_token?: string
    expires_in?: number
  } | null
  if (!json?.access_token) return null

  const claims = decodeJwtClaims<{ exp?: number }>(json.access_token)
  const expiresAt =
    claims?.exp ?? Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600)

  return { accessToken: json.access_token, expiresAt }
}

// Per-request memoized so a single render that reads the token several times
// mints it once. Cross-request caching/refresh is layered in the provider.
export const mintBackendToken = cache(
  async (input: SilentGrantInput): Promise<SilentGrantResult | null> => {
    try {
      const cookieHeader = (await headers()).get('cookie')
      if (!cookieHeader) return null

      const jar = new CookieJar(cookieHeader)
      const codeVerifier = base64url(randomBytes(32))
      const codeChallenge = base64url(
        createHash('sha256').update(codeVerifier).digest()
      )
      const state = base64url(randomBytes(16))
      const nonce = base64url(randomBytes(16))

      const code = await driveAuthorizeForCode(
        input,
        jar,
        codeChallenge,
        state,
        nonce
      )
      if (!code) return null

      return await exchangeCode(code, codeVerifier)
    } catch (error) {
      l.error(
        {
          key: 'ory_silent_grant:error',
          error: serializeErrorForLog(error),
        },
        'failed to mint backend token from Kratos session'
      )
      return null
    }
  }
)
