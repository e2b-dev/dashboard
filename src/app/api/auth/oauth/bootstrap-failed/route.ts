import 'server-only'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { signOut } from '@/auth'
import {
  buildOryLogoutUrl,
  ORY_BOOTSTRAP_FAILURE_ID_TOKEN_COOKIE,
  ORY_POST_LOGOUT_PATH,
} from '@/core/server/auth/ory/signout'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const idToken = request.cookies.get(
    ORY_BOOTSTRAP_FAILURE_ID_TOKEN_COOKIE
  )?.value

  try {
    await signOut({ redirect: false })
  } catch (error) {
    l.warn(
      {
        key: 'oauth_bootstrap_failed:authjs_sign_out:error',
        error: serializeErrorForLog(error),
      },
      'Auth.js signOut() failed after Ory bootstrap failure'
    )
  }

  const logoutUrl = idToken ? buildOryLogoutUrl({ idToken, origin }) : null

  if (!logoutUrl) {
    l.error(
      {
        key: 'oauth_bootstrap_failed:missing_logout_context',
        context: {
          has_id_token: !!idToken,
          has_ory_sdk_url: !!process.env.ORY_SDK_URL,
        },
      },
      'Could not perform Ory logout after bootstrap failure'
    )
  }

  const response = NextResponse.redirect(
    logoutUrl ?? new URL(ORY_POST_LOGOUT_PATH, origin)
  )
  response.cookies.delete(ORY_BOOTSTRAP_FAILURE_ID_TOKEN_COOKIE)
  return response
}
