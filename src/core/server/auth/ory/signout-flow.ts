import 'server-only'

import { cookies } from 'next/headers'
import { BASE_URL } from '@/configs/urls'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { normalizeOryReturnTo } from './build-start-url'
import { E2B_SESSION_COOKIE, openSessionCookie } from './session-cookie'
import { buildOryLogoutUrl, ORY_POST_LOGOUT_PATH } from './signout'

// Resolves the post-logout landing for the sign-out route.
//
// An explicit internal `returnTo` (reauth "Recover Account" → /recovery,
// /settings sign-out → /sign-in) names where to go next. Hydra's RP-logout
// can't honor it — post_logout_redirect_uri must be a pre-registered URI, so it
// always lands on ORY_POST_LOGOUT_PATH and the path is dropped. signOut() has
// already revoked the tokens + Kratos session (production accepts login with
// remember=false, so Hydra holds no session of its own to end) and the route
// clears the cookies, so we skip the Hydra round-trip and 302 straight to the
// requested path.
//
// The default full sign-out passes no `returnTo` and falls through to Hydra's
// RP-initiated logout: the id_token lets Hydra end its OAuth2 session and the
// delegated Kratos session, then return to post_logout_redirect_uri.
export async function completeOrySignOut(
  origin = BASE_URL,
  returnTo?: string
): Promise<string> {
  const target = normalizeOryReturnTo(returnTo)
  if (target) return new URL(target, origin).toString()

  const home = new URL(ORY_POST_LOGOUT_PATH, origin).toString()

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

  if (!idToken) return home

  const logoutUrl = await buildOryLogoutUrl({ idToken, origin })
  return logoutUrl?.toString() ?? home
}
