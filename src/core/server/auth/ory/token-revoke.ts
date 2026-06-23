import * as oauth from 'oauth4webapi'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { readOryOAuthEnv } from './oauth-client'
import type { SessionTokens } from './session-cookie'

// Best-effort RFC 7009 revocation against Hydra's public /oauth2/revoke. We
// revoke the refresh token only: it is the durable credential (offline access),
// and revoking it at Hydra also invalidates the access token minted from that
// grant. Access tokens are short-lived bearer tokens — not sessions — so there
// is nothing to gain from revoking them separately. Failures are logged and
// swallowed: sign-out must never hinge on the revoke succeeding.
export async function revokeSessionTokens(
  tokens: SessionTokens
): Promise<void> {
  if (!tokens.refreshToken) return

  let env: ReturnType<typeof readOryOAuthEnv>
  try {
    env = readOryOAuthEnv()
  } catch (error) {
    l.error(
      {
        key: 'auth_provider:revoke_token:misconfigured',
        error: serializeErrorForLog(error),
      },
      'Ory token revoke cannot run because the OAuth client env is missing'
    )
    return
  }

  const as: oauth.AuthorizationServer = {
    issuer: env.issuer.href,
    revocation_endpoint: `${env.issuer.href.replace(/\/$/, '')}/oauth2/revoke`,
  }
  const client: oauth.Client = { client_id: env.clientId }
  const clientAuth = oauth.ClientSecretBasic(env.clientSecret)

  try {
    const response = await oauth.revocationRequest(
      as,
      client,
      clientAuth,
      tokens.refreshToken,
      env.insecure ? { [oauth.allowInsecureRequests]: true } : undefined
    )
    await oauth.processRevocationResponse(response)
  } catch (error) {
    l.warn(
      {
        key: 'auth_provider:revoke_token:failed',
        error: serializeErrorForLog(error),
      },
      'Ory refresh token revocation failed'
    )
  }
}
