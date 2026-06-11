import 'server-only'

import { ResponseError } from '@ory/client-fetch'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { getOryOAuth2Api } from './client'
import { readOryError } from './ory-error'

export async function revokeOryOAuthSessionsForSubject(
  subject: string
): Promise<void> {
  const clientId = process.env.ORY_OAUTH2_CLIENT_ID

  if (!clientId) {
    l.error(
      { key: 'auth_provider:revoke_oauth_sessions:missing_client_id' },
      'failed to revoke Ory OAuth sessions because ORY_OAUTH2_CLIENT_ID is missing'
    )
    return
  }

  // Independent Hydra revocations; run concurrently. Each call logs and
  // swallows its own errors.
  await Promise.all([
    revokeConsentSessions(subject, clientId),
    revokeLoginSessions(subject),
  ])
}

async function revokeConsentSessions(
  subject: string,
  clientId: string
): Promise<void> {
  try {
    await getOryOAuth2Api().revokeOAuth2ConsentSessions({
      subject,
      client: clientId,
    })
  } catch (error) {
    await logOAuthRevocationError('consent', subject, error)
  }
}

async function revokeLoginSessions(subject: string): Promise<void> {
  try {
    await getOryOAuth2Api().revokeOAuth2LoginSessions({ subject })
  } catch (error) {
    await logOAuthRevocationError('login', subject, error)
  }
}

async function logOAuthRevocationError(
  stage: 'consent' | 'login',
  subject: string,
  error: unknown
): Promise<void> {
  const ory = error instanceof ResponseError ? await readOryError(error) : null

  l.error(
    {
      key: 'auth_provider:revoke_oauth_sessions:error',
      user_id: subject,
      context: { stage, ory },
      error: serializeErrorForLog(error),
    },
    `failed to revoke Ory OAuth ${stage} sessions`
  )
}
