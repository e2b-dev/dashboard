import 'server-only'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth, signOut } from '@/auth'
import { AUTH_URLS } from '@/configs/urls'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const signInUrl = new URL(AUTH_URLS.SIGN_IN, origin)

  let idToken: string | undefined
  try {
    const session = await auth()
    idToken = session?.idToken
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

  const sdkUrl = process.env.ORY_SDK_URL
  if (!idToken || !sdkUrl) {
    return NextResponse.redirect(signInUrl)
  }

  const hydraLogout = new URL(
    `${sdkUrl.replace(/\/$/, '')}/oauth2/sessions/logout`
  )
  hydraLogout.searchParams.set('id_token_hint', idToken)
  hydraLogout.searchParams.set('post_logout_redirect_uri', signInUrl.toString())

  return NextResponse.redirect(hydraLogout.toString())
}
