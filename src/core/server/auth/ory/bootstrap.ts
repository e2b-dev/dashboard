import 'server-only'

import { ADMIN_AUTH_HEADERS } from '@/configs/api'
import { api } from '@/core/shared/clients/api'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { repoErrorFromHttp } from '@/core/shared/errors'

type BootstrapOryUserInput = {
  accessToken: string
  idToken?: string
  provider?: string
}

type OryTokenClaims = {
  iss?: unknown
  sub?: unknown
  email?: unknown
  name?: unknown
  given_name?: unknown
  preferred_username?: unknown
}

export async function bootstrapOryUser(
  input: BootstrapOryUserInput
): Promise<void> {
  try {
    const accessClaims = decodeJwtClaims(input.accessToken)
    const idClaims = input.idToken ? decodeJwtClaims(input.idToken) : null
    const oidcUserId = readRequiredStringClaim(accessClaims, 'sub')
    // Local-dev fallback: when self-hosted Hydra is configured with
    // `skip_consent: true`, identity claims (email / name) never get a
    // chance to be injected — Hydra v2.2 only supports propagating them
    // via the consent step's `session.id_token`, which we skip. Fall
    // back to ORY_LOCAL_LOGIN_EMAIL / ORY_LOCAL_LOGIN_NAME from the
    // environment so bootstrap can still succeed. These env vars are
    // intentionally unset in production: real deployments delegate
    // login to an IdP that supplies the claims.
    const oidcUserEmail =
      readStringClaim(accessClaims, 'email') ??
      readStringClaim(idClaims, 'email') ??
      process.env.ORY_LOCAL_LOGIN_EMAIL ??
      null
    const oidcUserName =
      readDisplayName(accessClaims) ??
      readDisplayName(idClaims) ??
      process.env.ORY_LOCAL_LOGIN_NAME ??
      null

    if (!oidcUserId || !oidcUserEmail) {
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
            has_sub: !!oidcUserId,
            has_email: !!oidcUserEmail,
            has_name: !!oidcUserName,
          },
        },
        'Ory access token is missing required bootstrap claims'
      )
      return
    }

    const adminToken = process.env.DASHBOARD_API_ADMIN_TOKEN
    if (!adminToken) {
      l.error(
        {
          key: 'auth_events:bootstrap_user:missing_admin_token',
          context: { provider: input.provider },
        },
        'DASHBOARD_API_ADMIN_TOKEN is not configured'
      )
      return
    }

    const body = {
      oidc_user_id: oidcUserId,
      oidc_user_email: oidcUserEmail,
      oidc_user_name: oidcUserName,
    }

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
            provider: input.provider,
            error_status: response.status,
            has_oidc_user_id: body.oidc_user_id !== '',
            has_oidc_user_email: body.oidc_user_email !== '',
            has_oidc_user_name: body.oidc_user_name !== null,
          },
        },
        `bootstrap_user failed: ${repoError.message}`
      )
    }
  } catch (error) {
    l.error(
      {
        key: 'auth_events:bootstrap_user:exception',
        context: {
          provider: input.provider,
        },
        error: serializeErrorForLog(error),
      },
      'bootstrap_user threw unexpected exception'
    )
  }
}

function decodeJwtClaims(token: string): OryTokenClaims | null {
  const [, payload] = token.split('.')
  if (!payload) return null

  try {
    return JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    ) as OryTokenClaims
  } catch {
    return null
  }
}

function readRequiredStringClaim(
  claims: OryTokenClaims | null,
  name: keyof OryTokenClaims
): string | null {
  return readStringClaim(claims, name)
}

function readStringClaim(
  claims: OryTokenClaims | null,
  name: keyof OryTokenClaims
): string | null {
  const value = claims?.[name]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function readDisplayName(claims: OryTokenClaims | null): string | null {
  return (
    readStringClaim(claims, 'name') ??
    readStringClaim(claims, 'given_name') ??
    readStringClaim(claims, 'preferred_username')
  )
}

function tokenFormat(token: string): 'jwt' | 'opaque' | 'empty' {
  if (!token) return 'empty'
  return token.split('.').length === 3 ? 'jwt' : 'opaque'
}
