import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { PROTECTED_URLS } from '@/configs/urls'
import { ensureOryUserBootstrapped } from '@/core/server/auth/ory/dashboard-bootstrap'
import { exchangeOryCallback } from '@/core/server/auth/ory/oauth-client'
import {
  E2B_OAUTH_FLOW_COOKIE,
  OAUTH_CALLBACK_PATH,
  openOryFlowState,
} from '@/core/server/auth/ory/oauth-flow'
import {
  E2B_SESSION_COOKIE,
  orySessionCookieOptions,
  sealOrySession,
} from '@/core/server/auth/ory/session-cookie'
import {
  buildOryLogoutUrl,
  ORY_POST_LOGOUT_PATH,
} from '@/core/server/auth/ory/signout'
import { ORY_SIGNUP_METADATA_COOKIE } from '@/core/server/auth/ory/signup-metadata'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

// Failures land on the recover route, whose one-shot guard retries the flow
// once (via /sign-in → /start, which mints a fresh flow cookie) before bailing
// to home — so a stale/invalid callback can't loop.
const ORY_RECOVER_PATH = '/api/auth/oauth/recover'

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
      redirectUri: new URL(OAUTH_CALLBACK_PATH, origin).toString(),
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
      ? buildOryLogoutUrl({ idToken: tokens.idToken, origin })
      : null
    return finalize(
      NextResponse.redirect(logoutUrl ?? new URL(ORY_POST_LOGOUT_PATH, origin))
    )
  }

  const sealed = await sealOrySession({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    idToken: tokens.idToken,
    expiresAt: tokens.expiresAt,
  })

  const destination = flow.returnTo ?? PROTECTED_URLS.DASHBOARD
  const response = finalize(NextResponse.redirect(new URL(destination, origin)))
  response.cookies.set(
    E2B_SESSION_COOKIE,
    sealed,
    orySessionCookieOptions(request.nextUrl.host)
  )
  return response
}

// Clears the one-shot transient cookies on every exit path.
function finalize(response: NextResponse): NextResponse {
  response.cookies.delete(E2B_OAUTH_FLOW_COOKIE)
  response.cookies.delete(ORY_SIGNUP_METADATA_COOKIE)
  return response
}
