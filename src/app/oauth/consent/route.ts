import 'server-only'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getHydraOAuth2Api } from '@/core/server/auth/ory/hydra-admin'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

// Hydra consent-provider endpoint.
//
// In normal operation this handler should never run: the OAuth2 client
// registration sets `skip_consent: true`, which makes Hydra auto-accept
// consent server-side and bypass the browser redirect entirely. We keep
// the handler implemented anyway so:
//   - a misconfigured client (no skip_consent) still completes the flow
//     instead of dead-ending at 404,
//   - operators have a single place to plug in real consent UI later
//     without re-shaping route paths.
//
// The implementation grants the full set of scopes Hydra asked for. This
// matches "machine-trusted client" semantics — appropriate for a
// first-party dashboard, never for a third-party app.
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('consent_challenge')
  if (!challenge) {
    return new NextResponse('missing consent_challenge', { status: 400 })
  }

  const hydra = getHydraOAuth2Api()

  try {
    const consentRequest = await hydra.getOAuth2ConsentRequest({
      consentChallenge: challenge,
    })

    const { redirect_to } = await hydra.acceptOAuth2ConsentRequest({
      consentChallenge: challenge,
      acceptOAuth2ConsentRequest: {
        // Echo back exactly what Hydra asked for. Granting a superset
        // would let a client silently widen its scope on every login.
        grant_scope: consentRequest.requested_scope ?? [],
        grant_access_token_audience:
          consentRequest.requested_access_token_audience ?? [],
        // Remember so subsequent flows for the same subject+client skip
        // this round-trip; lines up with the 3600s remember_for in the
        // login handler.
        remember: true,
        remember_for: 3600,
      },
    })

    l.info(
      {
        key: 'oauth_consent:accepted',
        context: {
          client_id: consentRequest.client?.client_id,
          subject: consentRequest.subject,
          grant_scope: consentRequest.requested_scope,
        },
      },
      'auto-accepted Hydra consent challenge'
    )

    return NextResponse.redirect(redirect_to)
  } catch (error) {
    l.error(
      {
        key: 'oauth_consent:accept_failed',
        error: serializeErrorForLog(error),
      },
      'failed to accept Hydra consent challenge'
    )
    return new NextResponse('failed to accept consent challenge', {
      status: 502,
    })
  }
}
