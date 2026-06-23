import * as oauth from 'oauth4webapi'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { absoluteExpiry, readOryOAuthEnv } from './oauth-client'
import type { SessionTokens } from './session-cookie'

// Refresh the Hydra access token. Runs in the edge middleware, so it talks to
// the token endpoint directly (no discovery, no JWKS round-trip) and parses the
// response by hand. The refreshed id_token is not re-validated here — it was
// validated at the callback and only feeds the RP-logout hint.

// Refresh slightly before expiry so a token never dies mid-request downstream.
const REFRESH_SKEW_SECONDS = 60

export type TokenRefreshResult =
  | { status: 'refreshed'; tokens: SessionTokens }
  // The refresh token is unusable (rotated out / revoked / expired). The caller
  // clears the cookie and re-mints from the live Kratos session.
  | { status: 'dead' }
  // Transient failure (network/5xx/misconfig). Keep the current token and retry
  // on the next request rather than forcing a re-auth on a blip.
  | { status: 'unchanged' }

export function isAccessTokenExpiring(
  expiresAt: number,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  return nowSeconds >= expiresAt - REFRESH_SKEW_SECONDS
}

export async function refreshSessionTokens(
  current: SessionTokens
): Promise<TokenRefreshResult> {
  if (!current.refreshToken) return { status: 'dead' }

  let env: ReturnType<typeof readOryOAuthEnv>
  try {
    env = readOryOAuthEnv()
  } catch (error) {
    l.error(
      {
        key: 'auth_provider:refresh_token:misconfigured',
        error: serializeErrorForLog(error),
      },
      'Ory refresh cannot run because the OAuth client env is missing'
    )
    return { status: 'unchanged' }
  }

  const as: oauth.AuthorizationServer = {
    issuer: env.issuer.href,
    token_endpoint: `${env.issuer.href.replace(/\/$/, '')}/oauth2/token`,
  }
  const client: oauth.Client = { client_id: env.clientId }
  const clientAuth = oauth.ClientSecretBasic(env.clientSecret)

  try {
    const response = await oauth.refreshTokenGrantRequest(
      as,
      client,
      clientAuth,
      current.refreshToken,
      env.insecure ? { [oauth.allowInsecureRequests]: true } : undefined
    )

    if (!response.ok) {
      if (await isInvalidGrant(response)) return { status: 'dead' }

      l.warn(
        {
          key: 'auth_provider:refresh_token:rejected',
          context: { status: response.status },
        },
        `Ory refresh_token rejected (${response.status})`
      )
      return { status: 'unchanged' }
    }

    const body = (await response.json()) as Record<string, unknown>
    if (typeof body.access_token !== 'string') {
      l.warn(
        { key: 'auth_provider:refresh_token:no_access_token' },
        'Ory refresh response had no access_token'
      )
      return { status: 'unchanged' }
    }

    return {
      status: 'refreshed',
      tokens: {
        accessToken: body.access_token,
        refreshToken:
          typeof body.refresh_token === 'string'
            ? body.refresh_token
            : current.refreshToken,
        idToken:
          typeof body.id_token === 'string' ? body.id_token : current.idToken,
        expiresAt: absoluteExpiry(
          typeof body.expires_in === 'number' ? body.expires_in : undefined
        ),
      },
    }
  } catch (error) {
    l.error(
      {
        key: 'auth_provider:refresh_token:exception',
        error: serializeErrorForLog(error),
      },
      'Ory refresh_token threw'
    )
    return { status: 'unchanged' }
  }
}

async function isInvalidGrant(response: Response): Promise<boolean> {
  try {
    const body = (await response.clone().json()) as { error?: unknown }
    return body.error === 'invalid_grant'
  } catch {
    return false
  }
}
