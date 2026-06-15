import 'server-only'

import { auth, signOut } from '@/auth'
import { BASE_URL } from '@/configs/urls'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { readOrySessionFields } from './authjs-session-boundary'
import { revokeKratosSessionsForIdentity } from './kratos-session'
import { revokeOryOAuthSessionsForSubject } from './oauth-session'
import { ORY_POST_LOGOUT_PATH } from './signout'

export async function completeOrySignOut(origin = BASE_URL): Promise<string> {
  let identityId: string | undefined
  let userId: string | undefined
  try {
    const session = await auth()
    const serverFields = readOrySessionFields(session)
    userId = session?.user?.id
    // The Kratos identity id resolved at sign-in — NOT the OIDC subject (which
    // is the E2B user id) — so we revoke the right identity's Kratos sessions.
    identityId = serverFields?.identityId
  } catch (error) {
    l.warn(
      {
        key: 'oauth_signout:read_session:error',
        error: serializeErrorForLog(error),
      },
      'failed to read Auth.js session before sign-out'
    )
  }

  try {
    await signOut({ redirect: false })
  } catch (error) {
    l.warn(
      {
        key: 'oauth_signout:authjs_sign_out:error',
        error: serializeErrorForLog(error),
      },
      'Auth.js signOut() failed'
    )
  }

  // Hydra OAuth and Kratos session revocations are independent admin calls;
  // run them concurrently to keep the sign-out action fast. Both helpers
  // log-and-swallow their own errors, and the Kratos helper retries 429
  // contention, so Promise.all never rejects here.
  await Promise.all([
    userId ? revokeOryOAuthSessionsForSubject(userId) : null,
    identityId ? revokeKratosSessionsForIdentity(identityId) : null,
  ])

  return new URL(ORY_POST_LOGOUT_PATH, origin).toString()
}
