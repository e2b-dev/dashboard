import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import {
  OAUTH_CALLBACK_PATH,
  ORY_RECOVER_PATH,
} from '@/core/server/auth/ory/oauth-flow'
import {
  isAllowedRelayTarget,
  openRelayState,
  publicOrigin,
} from '@/core/server/auth/ory/oauth-relay'
import { l } from '@/core/shared/clients/logger/logger'

// Fixed-host relay for preview deployments. Hydra is configured with this host's
// /api/auth/oauth/relay as the single registered redirect_uri; previews encode
// their own origin in the sealed `state`. We bounce the browser — carrying
// code/state/iss (and any error) verbatim — to the originating preview's real
// callback, which finishes the PKCE exchange (its verifier never left that
// origin). See oauth-relay.ts. Never touches cookies.
export async function GET(request: NextRequest) {
  // Public https origin behind E2B's ingress, not the internal localhost bind.
  const origin = publicOrigin(request)
  const state = request.nextUrl.searchParams.get('state')
  const target = await openRelayState(state)

  if (!target || !isAllowedRelayTarget(target)) {
    l.warn(
      {
        key: 'oauth_relay:invalid_target',
        context: { hasState: Boolean(state) },
      },
      'Ory relay hit without a valid sealed target'
    )
    return NextResponse.redirect(new URL(ORY_RECOVER_PATH, origin))
  }

  const destination = new URL(OAUTH_CALLBACK_PATH, target)
  destination.search = request.nextUrl.search
  return NextResponse.redirect(destination)
}
