import 'server-only'

import { ResponseError } from '@ory/client-fetch'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { getOryFrontendApi, getOryIdentityApi } from './client'
import { readOryError } from './ory-error'

// Ory uses optimistic locking on identity rows; concurrent writes (e.g. our
// admin DELETE racing with Hydra's RP-initiated logout cleanup during the
// same signout flow) return 429 with reason "Conflicting concurrent
// requests". Retrying after a short backoff lets the in-flight write
// settle so ours can proceed.
const REVOKE_MAX_ATTEMPTS = 3
const REVOKE_BACKOFF_MS = 150

/**
 * Revokes a single Kratos session by its session id (admin DELETE
 * /admin/sessions/{id}).
 *
 * This is the server-side equivalent of the browser self-service logout: it
 * ends only the current session, preserving single sign-out semantics. We call
 * it on sign-out because Hydra's /oauth2/sessions/logout skips the dashboard
 * /logout -> Kratos bridge whenever Hydra holds no active authentication
 * session (the production default, where the login is accepted with
 * remember=false), which would otherwise leave the Kratos identity session
 * alive and surface "Reauthenticate as <last user>" on the next sign-in.
 */
export async function revokeKratosSession(sessionId: string): Promise<void> {
  await revokeWithRetries('revoke_kratos_session', () =>
    getOryIdentityApi().disableSession({ id: sessionId })
  )
}

/**
 * Revokes every Kratos identity session for the given identity (admin DELETE
 * /admin/identities/{id}/sessions).
 *
 * Used after a credential change, where signing out every device is the
 * intended "sign out of identity provider" behavior. The OIDC `sid` claim from
 * Hydra is Hydra's own OAuth2 session id, not a Kratos session id, so
 * single-session targeting isn't available on that path.
 */
export async function revokeKratosSessionsForIdentity(
  identityId: string
): Promise<void> {
  await revokeWithRetries('revoke_kratos_sessions', () =>
    getOryIdentityApi().deleteIdentitySessions({ id: identityId })
  )
}

/**
 * Revokes every Kratos session for the current identity EXCEPT the one the
 * forwarded session cookie belongs to (Kratos public DELETE /sessions, i.e.
 * `disableMyOtherSessions`).
 *
 * Used after an in-session password change so the user stays signed in on the
 * device they made the change from while every other device is signed out of
 * the dashboard. Cookie-authenticated rather than admin-PAT: "current" is
 * defined by the forwarded session, so it targets exactly this device. The
 * admin API has no all-except-current variant (deleteIdentitySessions includes
 * the current session).
 */
export async function disableOtherKratosSessions(
  cookie: string
): Promise<void> {
  await revokeWithRetries('disable_other_kratos_sessions', () =>
    getOryFrontendApi().disableMyOtherSessions({ cookie })
  )
}

async function revokeWithRetries(
  operation: string,
  run: () => Promise<unknown>
): Promise<void> {
  for (let attempt = 1; attempt <= REVOKE_MAX_ATTEMPTS; attempt++) {
    try {
      await run()
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
          key: `auth_provider:${operation}:error`,
          context: { ory: oryDetails, attempt },
          error: serializeErrorForLog(error),
        },
        'failed to revoke Kratos session(s); user may see reauth UX on next sign-in'
      )
      return
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
