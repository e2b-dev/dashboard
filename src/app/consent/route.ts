import 'server-only'

import type { Identity } from '@ory/client-fetch'
import { type NextRequest, NextResponse } from 'next/server'
import {
  getOryIdentityApi,
  getOryOAuth2Api,
} from '@/core/server/auth/ory/client'
import type { OryIdentityTraits } from '@/core/server/auth/ory/identity'
import { readOryOAuthEnv } from '@/core/server/auth/ory/oauth-client'
import { ORY_POST_LOGOUT_PATH } from '@/core/server/auth/ory/signout'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

// The dashboard is Hydra's consent provider. skip_consent only suppresses the
// consent SCREEN — Hydra still redirects here with a consent_challenge, and the
// provider must accept it AND fold the identity's profile traits into the
// id_token. Hydra holds no identity data of its own, so without this the issued
// tokens carry sub/iss but no email/name and user bootstrap rejects the login.
export async function GET(request: NextRequest) {
  const home = new URL(ORY_POST_LOGOUT_PATH, request.nextUrl.origin)
  const consentChallenge = request.nextUrl.searchParams.get('consent_challenge')

  if (!consentChallenge) {
    return NextResponse.redirect(home)
  }

  try {
    const oauth2 = getOryOAuth2Api()
    const consent = await oauth2.getOAuth2ConsentRequest({ consentChallenge })

    const { clientId } = readOryOAuthEnv()
    if (consent.client?.client_id !== clientId) {
      l.warn(
        {
          key: 'oauth_consent:unexpected_client',
          clientId: consent.client?.client_id,
        },
        'refusing to auto-consent for unexpected OAuth client'
      )
      return NextResponse.redirect(home)
    }

    const grantScope = consent.requested_scope ?? []

    const idTokenClaims = consent.subject
      ? await profileClaimsForSubject(consent.subject, grantScope)
      : {}

    const { redirect_to } = await oauth2.acceptOAuth2ConsentRequest({
      consentChallenge,
      acceptOAuth2ConsentRequest: {
        grant_scope: grantScope,
        grant_access_token_audience:
          consent.requested_access_token_audience ?? [],
        session: { id_token: idTokenClaims },
      },
    })
    return NextResponse.redirect(redirect_to)
  } catch (error) {
    l.error(
      {
        key: 'oauth_consent:accept_failed',
        error: serializeErrorForLog(error),
      },
      'failed to accept Hydra consent request'
    )
    return NextResponse.redirect(home)
  }
}

// The OIDC profile claims come from the Kratos identity named by the consent
// subject (its UUID); email is gated on the email scope, name on profile —
// matching the scopes the dashboard client requests.
async function profileClaimsForSubject(
  subject: string,
  grantScope: string[]
): Promise<Record<string, unknown>> {
  let identity: Identity
  try {
    identity = await getOryIdentityApi().getIdentity({ id: subject })
  } catch (error) {
    l.warn(
      {
        key: 'oauth_consent:identity_lookup_failed',
        error: serializeErrorForLog(error),
      },
      'could not load identity for consent; issuing token without profile claims'
    )
    return {}
  }

  const traits = (identity.traits ?? {}) as Partial<OryIdentityTraits>
  const claims: Record<string, unknown> = {}

  if (grantScope.includes('email') && traits.email) {
    claims.email = traits.email
  }

  if (grantScope.includes('profile')) {
    const name = traits.name?.trim()
    if (name) claims.name = name
  }

  return claims
}
