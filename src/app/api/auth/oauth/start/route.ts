import { type NextRequest, NextResponse } from 'next/server'
import { AUTH_URLS } from '@/configs/urls'
import {
  normalizeOryReturnTo,
  readOryAuthIntent,
  shouldCaptureOrySignupMetadata,
} from '@/core/server/auth/ory/build-start-url'
import { buildOryAuthorizationRequest } from '@/core/server/auth/ory/oauth-client'
import {
  E2B_OAUTH_FLOW_COOKIE,
  OAUTH_CALLBACK_PATH,
  oryFlowCookieOptions,
  serializeOryFlowState,
} from '@/core/server/auth/ory/oauth-flow'
import {
  encodeOrySignupMetadata,
  ORY_SIGNUP_METADATA_COOKIE,
  readOrySignupMetadataFromHeaders,
  signupMetadataCookieOptions,
} from '@/core/server/auth/ory/signup-metadata'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

// Server-side entry point for the Ory OAuth2 flow. Builds the authorization URL
// (PKCE S256, state, nonce), stashes the verifier/state/nonce in a short-lived
// httpOnly cookie for the callback, and redirects the browser to Hydra.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const intent = readOryAuthIntent(request.nextUrl.searchParams.get('intent'))

  if (!intent) {
    return new NextResponse('Invalid Ory auth intent', { status: 400 })
  }

  const returnTo = normalizeOryReturnTo(
    request.nextUrl.searchParams.get('returnTo')
  )
  const redirectUri = new URL(OAUTH_CALLBACK_PATH, origin).toString()

  let authorization: Awaited<ReturnType<typeof buildOryAuthorizationRequest>>
  try {
    authorization = await buildOryAuthorizationRequest(intent, redirectUri)
  } catch (error) {
    l.error(
      {
        key: 'oauth_start:authorization_request_failed',
        error: serializeErrorForLog(error),
      },
      'failed to build the Ory authorization request'
    )
    return NextResponse.redirect(new URL(AUTH_URLS.SIGN_IN, origin))
  }

  const response = NextResponse.redirect(authorization.url)

  response.cookies.set(
    E2B_OAUTH_FLOW_COOKIE,
    serializeOryFlowState({
      state: authorization.state,
      nonce: authorization.nonce,
      codeVerifier: authorization.codeVerifier,
      returnTo,
    }),
    oryFlowCookieOptions()
  )

  if (shouldCaptureOrySignupMetadata(intent)) {
    const signupMetadata = encodeOrySignupMetadata(
      readOrySignupMetadataFromHeaders(request.headers)
    )
    if (signupMetadata) {
      response.cookies.set(
        ORY_SIGNUP_METADATA_COOKIE,
        signupMetadata,
        signupMetadataCookieOptions()
      )
    }
  }

  return response
}
