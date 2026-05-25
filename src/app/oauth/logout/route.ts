import 'server-only'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getHydraOAuth2Api } from '@/core/server/auth/ory/hydra-admin'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

// Hydra logout-provider endpoint.
//
// Hydra redirects the browser here with `?logout_challenge=...` after the
// dashboard initiates RP-initiated logout (POST /oauth2/sessions/logout
// in src/app/api/auth/oauth/signout-flow/route.ts). We accept the
// challenge unconditionally — in single-user dev mode there is no
// "confirm sign out?" UI to show, and the dashboard has already cleared
// its own Auth.js session before redirecting to Hydra.
//
// Modeled on the logout half of ory/hydra-login-consent-node.
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('logout_challenge')
  if (!challenge) {
    return new NextResponse('missing logout_challenge', { status: 400 })
  }

  const hydra = getHydraOAuth2Api()

  try {
    const { redirect_to } = await hydra.acceptOAuth2LogoutRequest({
      logoutChallenge: challenge,
    })

    l.info(
      { key: 'oauth_logout:accepted' },
      'auto-accepted Hydra logout challenge'
    )

    return NextResponse.redirect(redirect_to)
  } catch (error) {
    l.error(
      {
        key: 'oauth_logout:accept_failed',
        error: serializeErrorForLog(error),
      },
      'failed to accept Hydra logout challenge'
    )
    return new NextResponse('failed to accept logout challenge', {
      status: 502,
    })
  }
}
