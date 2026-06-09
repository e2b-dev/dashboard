import 'server-only'

import { ResponseError } from '@ory/client-fetch'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { getOryIdentityApi } from './client'
import { readOryError } from './ory-error'

/**
 * Revokes every Kratos identity session for the given identity.
 *
 * Hydra's /oauth2/sessions/logout only ends the OAuth2 session; the Kratos
 * identity cookie on the Ory domain is independent and is what causes the
 * Account Experience to show "Reauthenticate as <last user>" on the next
 * sign-in instead of a fresh provider chooser.
 *
 * We can't surgically target a single session because the OIDC `sid` claim
 * from Hydra is Hydra's own OAuth2 session id, not a Kratos session id, and
 * we don't have access to the user's Kratos cookie from this side. Revoking
 * all identity sessions matches the expected "sign out of identity provider"
 * semantics anyway.
 */
// Ory uses optimistic locking on identity rows; concurrent writes (e.g. our
// admin DELETE racing with Hydra's RP-initiated logout cleanup during the
// same signout flow) return 429 with reason "Conflicting concurrent
// requests". Retrying after a short backoff lets the in-flight write
// settle so ours can proceed.
const REVOKE_MAX_ATTEMPTS = 3
const REVOKE_BACKOFF_MS = 150

export async function revokeKratosSessionsForIdentity(
  identityId: string
): Promise<void> {
  for (let attempt = 1; attempt <= REVOKE_MAX_ATTEMPTS; attempt++) {
    try {
      await getOryIdentityApi().deleteIdentitySessions({ id: identityId })
      return
    } catch (error) {
      if (error instanceof ResponseError && error.response.status === 404) {
        return
      }

      const isContention =
        error instanceof ResponseError && error.response.status === 429
      const lastAttempt = attempt === REVOKE_MAX_ATTEMPTS

      if (isContention && !lastAttempt) {
        await sleep(REVOKE_BACKOFF_MS * attempt)
        continue
      }

      const oryDetails =
        error instanceof ResponseError ? await readOryError(error) : null

      l.error(
        {
          key: 'auth_provider:revoke_kratos_sessions:error',
          context: { ory: oryDetails, attempt },
          error: serializeErrorForLog(error),
        },
        'failed to revoke Kratos sessions; user may see reauth UX on next sign-in'
      )
      return
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
