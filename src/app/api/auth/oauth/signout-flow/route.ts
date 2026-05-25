import 'server-only'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth, signOut } from '@/auth'
import {
  buildLogoutState,
  getLogoutFinalUrl,
  ORY_POST_LOGOUT_CALLBACK_PATH,
  type OrySignOutOptions,
} from '@/core/server/auth/ory/signout'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

function getSignOutOptions(request: NextRequest): OrySignOutOptions {
  const messageType = request.nextUrl.searchParams.get('messageType')
  const message = request.nextUrl.searchParams.get('message')

  return {
    returnTo: request.nextUrl.searchParams.get('returnTo') ?? undefined,
    message:
      (messageType === 'error' ||
        messageType === 'success' ||
        messageType === 'message') &&
      message
        ? { type: messageType, value: message }
        : undefined,
  }
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const signOutOptions = getSignOutOptions(request)
  const state = buildLogoutState(signOutOptions)
  const postLogoutRedirect = new URL(ORY_POST_LOGOUT_CALLBACK_PATH, origin)

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
    return NextResponse.redirect(getLogoutFinalUrl(signOutOptions, origin))
  }

  const hydraLogout = new URL(
    `${sdkUrl.replace(/\/$/, '')}/oauth2/sessions/logout`
  )
  hydraLogout.searchParams.set('id_token_hint', idToken)
  hydraLogout.searchParams.set(
    'post_logout_redirect_uri',
    postLogoutRedirect.toString()
  )
  if (state) {
    hydraLogout.searchParams.set('state', state)
  }

  return NextResponse.redirect(hydraLogout.toString())
}
