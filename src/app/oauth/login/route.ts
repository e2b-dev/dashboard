import 'server-only'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getHydraOAuth2Api } from '@/core/server/auth/ory/hydra-admin'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

// Hydra login-provider endpoint.
//
// Hydra redirects the browser here with `?login_challenge=...` whenever an
// OAuth2 authorization flow starts and the user is not already
// authenticated against Hydra's *own* session cookie. The handler must:
//   1. fetch the login request from Hydra's admin API (validates the
//      challenge and tells us if Hydra already has a session for this
//      subject — `skip === true`),
//   2. accept the request with a subject identifier,
//   3. redirect the browser to the URL Hydra returns.
//
// This implementation auto-accepts every challenge as a fixed dev subject
// (`ORY_LOCAL_LOGIN_SUBJECT`). It is intended for local/dev deployments
// only: in production the login UI is owned by a real IdP (Kratos / Ory
// Network) and the dashboard is not registered as Hydra's login provider.
//
// Modeled on ory/hydra-login-consent-node `src/routes/login.ts`.
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('login_challenge')
  if (!challenge) {
    return new NextResponse('missing login_challenge', { status: 400 })
  }

  const subject = process.env.ORY_LOCAL_LOGIN_SUBJECT
  if (!subject) {
    l.error(
      { key: 'oauth_login:misconfigured' },
      'ORY_LOCAL_LOGIN_SUBJECT must be set when the dashboard acts as Hydra login provider'
    )
    return new NextResponse('login provider is not configured', {
      status: 500,
    })
  }

  const hydra = getHydraOAuth2Api()

  try {
    // Pre-fetch the login request. We don't strictly need its body to
    // accept (the challenge alone is enough), but the round-trip lets us
    // surface "challenge expired / not found" as a 404 from Hydra before
    // we try to accept it, and gives us `skip` for forward-compat (today
    // we accept either way, but logging the branch is useful).
    const loginRequest = await hydra.getOAuth2LoginRequest({
      loginChallenge: challenge,
    })

    const { redirect_to } = await hydra.acceptOAuth2LoginRequest({
      loginChallenge: challenge,
      acceptOAuth2LoginRequest: {
        // Subject == OIDC `sub` claim. Stable per "user" — in this
        // single-user dev mode there is only one possible value.
        subject,
        // Remember the Hydra session for an hour so subsequent OAuth2
        // flows hit the `skip` fast path and don't bounce through this
        // handler again until expiry.
        remember: true,
        remember_for: 3600,
      },
    })

    l.info(
      {
        key: 'oauth_login:accepted',
        context: {
          subject,
          skip: loginRequest.skip,
          client_id: loginRequest.client?.client_id,
        },
      },
      'auto-accepted Hydra login challenge'
    )

    return NextResponse.redirect(redirect_to)
  } catch (error) {
    l.error(
      {
        key: 'oauth_login:accept_failed',
        error: serializeErrorForLog(error),
      },
      'failed to accept Hydra login challenge'
    )
    return new NextResponse('failed to accept login challenge', { status: 502 })
  }
}
