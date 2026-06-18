import 'server-only'

import { createAdminUsersRepository } from '@/core/modules/users/admin-repository.server'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import type { components as DashboardApiComponents } from '@/core/shared/contracts/dashboard-api.types'
import { decodeJwtClaims, readStringClaim, tokenFormat } from './jwt-claims'
import { readOrySignupMetadataCookie } from './signup-metadata'

type BootstrapOryUserInput = {
  accessToken: string
  idToken?: string
  provider?: string
}

type OryBootstrapClaims = {
  oidcIssuer: string
  oidcUserId: string
  oidcUserEmail: string
  oidcUserName: string | null
}

type OryTokenClaims = {
  iss?: unknown
  sub?: unknown
  email?: unknown
  name?: unknown
  given_name?: unknown
  preferred_username?: unknown
}

export async function ensureOryUserBootstrapped(
  input: BootstrapOryUserInput
): Promise<boolean> {
  const body = await createOryUserBootstrapRequest(input)
  if (!body) return false

  return bootstrapOryUserWithRequest(body, input.provider)
}

export async function createOryUserBootstrapRequest(
  input: BootstrapOryUserInput
): Promise<
  | DashboardApiComponents['schemas']['AdminAuthProviderUserBootstrapRequest']
  | null
> {
  const claims = readBootstrapClaims(input)
  if (!claims) return null

  const signupMetadata = await readOrySignupMetadataCookie()

  return {
    oidc_issuer: claims.oidcIssuer,
    oidc_user_id: claims.oidcUserId,
    oidc_user_email: claims.oidcUserEmail,
    oidc_user_name: claims.oidcUserName,
    ...(signupMetadata?.signup_ip
      ? { signup_ip: signupMetadata.signup_ip }
      : {}),
    ...(signupMetadata?.signup_user_agent
      ? { signup_user_agent: signupMetadata.signup_user_agent }
      : {}),
  } satisfies DashboardApiComponents['schemas']['AdminAuthProviderUserBootstrapRequest']
}

// Profile claims (issuer/email/name) prefer the cryptographically validated
// id_token, falling back to the access token. The OIDC subject, however, stays
// sourced from the access token — it is the bearer token dashboard-api receives
// and validates, and is the stable key for the (issuer, user_id) mapping.
function readBootstrapClaims(
  input: BootstrapOryUserInput
): OryBootstrapClaims | null {
  const idClaims = input.idToken
    ? decodeJwtClaims<OryTokenClaims>(input.idToken)
    : null
  const accessClaims = decodeJwtClaims<OryTokenClaims>(input.accessToken)
  const oidcIssuer =
    readStringClaim(idClaims, 'iss') ?? readStringClaim(accessClaims, 'iss')
  const oidcUserId =
    readStringClaim(accessClaims, 'sub') ?? readStringClaim(idClaims, 'sub')
  const oidcUserEmail =
    readStringClaim(idClaims, 'email') ?? readStringClaim(accessClaims, 'email')
  const oidcUserName =
    readDisplayName(idClaims) ?? readDisplayName(accessClaims)

  if (!oidcIssuer || !oidcUserId || !oidcUserEmail) {
    l.error(
      {
        key: 'auth_events:bootstrap_user:missing_claims',
        context: {
          provider: input.provider,
          access_token_format: tokenFormat(input.accessToken),
          id_token_format: input.idToken
            ? tokenFormat(input.idToken)
            : 'missing',
          has_access_claims: !!accessClaims,
          has_id_claims: !!idClaims,
          has_iss: !!oidcIssuer,
          has_sub: !!oidcUserId,
          has_email: !!oidcUserEmail,
          has_name: !!oidcUserName,
        },
      },
      'Ory access token is missing required bootstrap claims'
    )
    return null
  }

  return {
    oidcIssuer,
    oidcUserId,
    oidcUserEmail,
    oidcUserName,
  }
}

async function bootstrapOryUserWithRequest(
  body: DashboardApiComponents['schemas']['AdminAuthProviderUserBootstrapRequest'],
  provider?: string
): Promise<boolean> {
  try {
    const bootstrapResult =
      await createAdminUsersRepository().bootstrapAuthProviderUser(body)

    if (!bootstrapResult.ok) {
      l.error(
        {
          key: 'auth_events:bootstrap_user:error',
          context: {
            provider,
            has_oidc_issuer: body.oidc_issuer !== '',
            has_oidc_user_id: body.oidc_user_id !== '',
            has_oidc_user_email: body.oidc_user_email !== '',
            has_oidc_user_name: body.oidc_user_name !== null,
          },
        },
        `bootstrap_user failed: ${bootstrapResult.error.message}`
      )
      return false
    }

    return true
  } catch (error) {
    l.error(
      {
        key: 'auth_events:bootstrap_user:exception',
        context: {
          provider,
        },
        error: serializeErrorForLog(error),
      },
      'bootstrap_user threw unexpected exception'
    )
    return false
  }
}

function readDisplayName(claims: OryTokenClaims | null): string | null {
  return (
    readStringClaim(claims, 'name') ??
    readStringClaim(claims, 'given_name') ??
    readStringClaim(claims, 'preferred_username')
  )
}
