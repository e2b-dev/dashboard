import 'server-only'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth, signOut } from '@/auth'
import { revokeKratosSessionsForIdentity } from '@/core/server/auth/ory/kratos-session'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

// lands users on the marketing root instead of /sign-in so they don't get
// bounced straight back to the Ory-hosted login UI after signing out.
const ORY_POST_LOGOUT_PATH = '/'

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const postLogoutUrl = new URL(ORY_POST_LOGOUT_PATH, origin)

  let idToken: string | undefined
  let identityId: string | undefined
  try {
    const session = await auth()
    idToken = session?.idToken
    // The Kratos identity id resolved at sign-in — NOT the OIDC subject (which
    // is the E2B user id) — so we revoke the right identity's Kratos sessions.
    identityId = session?.identityId
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

  if (identityId) {
    await revokeKratosSessionsForIdentity(identityId)
  }

  const sdkUrl = process.env.ORY_SDK_URL
  if (!idToken || !sdkUrl) {
    return NextResponse.redirect(postLogoutUrl)
  }

  const hydraLogout = new URL(
    `${sdkUrl.replace(/\/$/, '')}/oauth2/sessions/logout`
  )
  hydraLogout.searchParams.set('id_token_hint', idToken)
  hydraLogout.searchParams.set(
    'post_logout_redirect_uri',
    postLogoutUrl.toString()
  )

  return NextResponse.redirect(hydraLogout.toString())
}
