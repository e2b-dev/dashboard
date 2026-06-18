import 'server-only'

import { cookies } from 'next/headers'
import { BASE_URL } from '@/configs/urls'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { E2B_SESSION_COOKIE, openOrySession } from './session-cookie'
import { buildOryLogoutUrl, ORY_POST_LOGOUT_PATH } from './signout'

// RP-initiated logout: hand Hydra the id_token so it ends its own OAuth2 session
// and (since it delegates login to Kratos) the Kratos session, then returns to
// post_logout_redirect_uri. The sign-out route clears e2b_session on the
// redirect it emits. Falls back to home if there's no id_token to present.
export async function completeOrySignOut(origin = BASE_URL): Promise<string> {
  const fallback = new URL(ORY_POST_LOGOUT_PATH, origin).toString()

  let idToken: string | undefined
  try {
    const cookieStore = await cookies()
    const tokens = await openOrySession(
      cookieStore.get(E2B_SESSION_COOKIE)?.value
    )
    idToken = tokens?.idToken
  } catch (error) {
    l.warn(
      {
        key: 'oauth_signout:read_session:error',
        error: serializeErrorForLog(error),
      },
      'failed to read e2b_session before sign-out'
    )
  }

  if (!idToken) return fallback

  return buildOryLogoutUrl({ idToken, origin })?.toString() ?? fallback
}
