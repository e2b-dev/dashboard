import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import {
  isAllowedRelayTarget,
  openRelayState,
} from '@/core/server/auth/ory/oauth-relay'
import { ORY_POST_LOGOUT_PATH } from '@/core/server/auth/ory/signout'
import { l } from '@/core/shared/clients/logger/logger'

// Fixed-host post-logout relay (mirror of the login relay). Hydra returns here
// after ending the session, with the sealed `state` carrying the preview origin;
// we bounce the browser back to that preview's home. The sign-out route already
// cleared the cookies on the preview before the Hydra hop, so this is a pure
// redirect. See oauth-relay.ts.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const target = await openRelayState(request.nextUrl.searchParams.get('state'))

  if (!target || !isAllowedRelayTarget(target)) {
    l.warn(
      { key: 'oauth_logout_relay:invalid_target' },
      'Ory logout relay hit without a valid sealed target'
    )
    return NextResponse.redirect(new URL(ORY_POST_LOGOUT_PATH, origin))
  }

  return NextResponse.redirect(new URL(ORY_POST_LOGOUT_PATH, target))
}
