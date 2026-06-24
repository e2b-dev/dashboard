import 'server-only'

import { cookies } from 'next/headers'
import { BASE_URL } from '@/configs/urls'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { normalizeOryReturnTo } from './build-start-url'
import { E2B_SESSION_COOKIE, openSessionCookie } from './session-cookie'
import { buildOryLogoutUrl, ORY_POST_LOGOUT_PATH } from './signout'

// RP-initiated logout: hand Hydra the id_token so it ends its own OAuth2 session
// and (since it delegates login to Kratos) the Kratos session, then returns to
// post_logout_redirect_uri. The sign-out route clears e2b_session on the
// redirect it emits.
//
// `returnTo` (a relative path) only steers the no-id_token fallback — e.g. a
// recovery sign-out from /settings, which never had a Hydra session. The Hydra
// path can't use it: post_logout_redirect_uri must be a pre-registered URI.
export async function completeOrySignOut(
  origin = BASE_URL,
  returnTo?: string
): Promise<string> {
  const fallbackPath = normalizeOryReturnTo(returnTo) ?? ORY_POST_LOGOUT_PATH
  const fallback = new URL(fallbackPath, origin).toString()

  let idToken: string | undefined
  try {
    const cookieStore = await cookies()
    const tokens = await openSessionCookie(
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

  const logoutUrl = await buildOryLogoutUrl({ idToken, origin })
  return logoutUrl?.toString() ?? fallback
}
