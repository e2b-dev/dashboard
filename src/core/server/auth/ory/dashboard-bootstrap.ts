import 'server-only'

import { ADMIN_AUTH_HEADERS } from '@/configs/api'
import { api } from '@/core/shared/clients/api'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import type { components as DashboardApiComponents } from '@/core/shared/contracts/dashboard-api.types'
import { repoErrorFromHttp } from '@/core/shared/errors'
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
  const claims = readBootstrapClaims(input)
  if (!claims) return false

  return bootstrapOryUserWithClaims(claims, input.provider)
}

export async function bootstrapOryUser(
  input: BootstrapOryUserInput
): Promise<boolean> {
  const claims = readBootstrapClaims(input)
  if (!claims) return false

  return bootstrapOryUserWithClaims(claims, input.provider)
}

function readBootstrapClaims(
  input: BootstrapOryUserInput
): OryBootstrapClaims | null {
  const accessClaims = decodeJwtClaims<OryTokenClaims>(input.accessToken)
  const idClaims = input.idToken
    ? decodeJwtClaims<OryTokenClaims>(input.idToken)
    : null
  const oidcIssuer =
    readStringClaim(accessClaims, 'iss') ?? readStringClaim(idClaims, 'iss')
  const oidcUserId = readStringClaim(accessClaims, 'sub')
  const oidcUserEmail =
    readStringClaim(accessClaims, 'email') ?? readStringClaim(idClaims, 'email')
  const oidcUserName =
    readDisplayName(accessClaims) ?? readDisplayName(idClaims)

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

async function bootstrapOryUserWithClaims(
  claims: OryBootstrapClaims,
  provider?: string
): Promise<boolean> {
  try {
    const adminToken = process.env.DASHBOARD_API_ADMIN_TOKEN
    if (!adminToken) {
      l.error(
        {
          key: 'auth_events:bootstrap_user:missing_admin_token',
          context: { provider },
        },
        'DASHBOARD_API_ADMIN_TOKEN is not configured'
      )
      return false
    }

    const signupMetadata = await readOrySignupMetadataCookie()
    const body = {
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

    const { error, response } = await api.POST('/admin/users/bootstrap', {
      body,
      headers: ADMIN_AUTH_HEADERS(adminToken),
    })

    if (!response.ok || error) {
      const repoError = repoErrorFromHttp(
        response.status,
        error?.message ?? 'Failed to bootstrap user',
        error
      )
      l.error(
        {
          key: 'auth_events:bootstrap_user:error',
          context: {
            provider,
            error_status: response.status,
            has_oidc_issuer: body.oidc_issuer !== '',
            has_oidc_user_id: body.oidc_user_id !== '',
            has_oidc_user_email: body.oidc_user_email !== '',
            has_oidc_user_name: body.oidc_user_name !== null,
          },
        },
        `bootstrap_user failed: ${repoError.message}`
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
