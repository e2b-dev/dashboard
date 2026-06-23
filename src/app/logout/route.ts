import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import {
  getOryFrontendApi,
  getOryOAuth2Api,
} from '@/core/server/auth/ory/client'
import { ORY_POST_LOGOUT_PATH } from '@/core/server/auth/ory/signout'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

// The dashboard is Hydra's logout provider: RP-initiated logout
// (/oauth2/sessions/logout) redirects here with a logout_challenge. We accept
// the challenge to get Hydra's continuation URL, then send the browser through
// Kratos' own logout first so the ory_kratos_session cookie is cleared before
// Hydra finalizes. Without that hop the OAuth2 session ends but the identity
// session survives, and the next sign-in skips straight to the password step.
export async function GET(request: NextRequest) {
  const home = new URL(ORY_POST_LOGOUT_PATH, request.nextUrl.origin)
  const logoutChallenge = request.nextUrl.searchParams.get('logout_challenge')

  if (!logoutChallenge) {
    return NextResponse.redirect(home)
  }

  let continueTo: string
  try {
    const { redirect_to } = await getOryOAuth2Api().acceptOAuth2LogoutRequest({
      logoutChallenge,
    })
    continueTo = redirect_to
  } catch (error) {
    l.error(
      {
        key: 'oauth_logout:accept_failed',
        error: serializeErrorForLog(error),
      },
      'failed to accept Hydra logout request'
    )
    return NextResponse.redirect(home)
  }

  // Clear the Kratos identity session, then return to Hydra's continuation URL
  // (its return_to must be in Kratos' allowed_return_urls) so Hydra finalizes
  // the OAuth2 logout and honors post_logout_redirect_uri.
  try {
    const { logout_url } = await getOryFrontendApi().createBrowserLogoutFlow({
      cookie: request.headers.get('cookie') ?? undefined,
      returnTo: continueTo,
    })
    return NextResponse.redirect(logout_url)
  } catch (error) {
    // No live Kratos session (already signed out) or the flow couldn't be
    // minted — let Hydra finalize anyway so logout still completes.
    l.warn(
      {
        key: 'oauth_logout:kratos_flow_failed',
        error: serializeErrorForLog(error),
      },
      'could not start Kratos logout; finalizing Hydra logout without it'
    )
    return NextResponse.redirect(continueTo)
  }
}
