import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { PROTECTED_URLS } from '@/configs/urls'
import { ensureOryUserBootstrapped } from '@/core/server/auth/ory/dashboard-bootstrap'
import { exchangeOryCallback } from '@/core/server/auth/ory/oauth-client'
import {
  E2B_OAUTH_FLOW_COOKIE,
  ORY_RECOVER_PATH,
  openOryFlowState,
} from '@/core/server/auth/ory/oauth-flow'
import { resolveOryRedirectUri } from '@/core/server/auth/ory/oauth-relay'
import {
  E2B_SESSION_COOKIE,
  ORY_SIGNUP_METADATA_COOKIE,
  sealSessionCookie,
  sessionCookieOptions,
} from '@/core/server/auth/ory/session-cookie'
import {
  buildOryLogoutUrl,
  ORY_POST_LOGOUT_PATH,
} from '@/core/server/auth/ory/signout'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { relativeUrlSchema } from '@/core/shared/schemas/url'

// Hydra redirects here with ?code after Kratos created the session. We exchange
// the code (validating state/nonce/PKCE), provision the dashboard user from the
// id_token, then seal the OIDC tokens into e2b_session. Kratos already owns the
// session at this point — this cookie only carries tokens for API access.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const flow = await openOryFlowState(
    request.cookies.get(E2B_OAUTH_FLOW_COOKIE)?.value
  )

  if (!flow) {
    l.warn(
      { key: 'oauth_callback:missing_flow_state' },
      'Ory callback hit without a valid flow-state cookie'
    )
    return finalize(NextResponse.redirect(new URL(ORY_RECOVER_PATH, origin)))
  }

  let tokens: Awaited<ReturnType<typeof exchangeOryCallback>>
  try {
    tokens = await exchangeOryCallback({
      // A genuine global URL — oauth4webapi rejects NextURL (not `instanceof URL`).
      currentUrl: new URL(request.url),
      expectedState: flow.state,
      expectedNonce: flow.nonce,
      codeVerifier: flow.codeVerifier,
      // Must be byte-identical to the authorize-time value (the registered
      // relay URI on previews), not the host the code was delivered to.
      redirectUri: resolveOryRedirectUri(origin).redirectUri,
    })
  } catch (error) {
    l.error(
      {
        key: 'oauth_callback:exchange_failed',
        error: serializeErrorForLog(error),
      },
      'Ory authorization code exchange failed'
    )
    return finalize(NextResponse.redirect(new URL(ORY_RECOVER_PATH, origin)))
  }

  const bootstrapped = await ensureOryUserBootstrapped({
    accessToken: tokens.accessToken,
    idToken: tokens.idToken,
    provider: 'ory',
  })

  if (!bootstrapped) {
    l.error(
      { key: 'oauth_callback:bootstrap_failed' },
      'dashboard bootstrap failed; ending the Ory session without a dashboard cookie'
    )
    // Don't strand the user with a half-provisioned login: end the Ory + Kratos
    // session via RP-logout (falling back to home if no id_token is available).
    const logoutUrl = tokens.idToken
      ? await buildOryLogoutUrl({ idToken: tokens.idToken, origin })
      : null
    return finalize(
      NextResponse.redirect(logoutUrl ?? new URL(ORY_POST_LOGOUT_PATH, origin))
    )
  }

  const sealed = await sealSessionCookie({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    idToken: tokens.idToken,
    expiresAt: tokens.expiresAt,
  })

  // Re-validate here too: the flow cookie is read back as a raw string, and
  // `new URL()` would otherwise escape the origin on a crafted returnTo.
  const parsedReturnTo = relativeUrlSchema.safeParse(flow.returnTo)
  const destination = parsedReturnTo.success
    ? parsedReturnTo.data
    : PROTECTED_URLS.DASHBOARD
  const response = finalize(NextResponse.redirect(new URL(destination, origin)))
  response.cookies.set(
    E2B_SESSION_COOKIE,
    sealed,
    sessionCookieOptions(request.nextUrl.host)
  )
  return response
}

// Clears the one-shot transient cookies on every exit path.
function finalize(response: NextResponse): NextResponse {
  response.cookies.delete(E2B_OAUTH_FLOW_COOKIE)
  response.cookies.delete(ORY_SIGNUP_METADATA_COOKIE)
  return response
}
