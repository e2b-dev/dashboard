import { type NextRequest, NextResponse } from 'next/server'
import {
  normalizeOryReturnTo,
  readOryAuthIntent,
  shouldCaptureOrySignupMetadata,
} from '@/core/server/auth/ory/build-start-url'
import { buildOryAuthorizationRequest } from '@/core/server/auth/ory/oauth-client'
import {
  E2B_OAUTH_FLOW_COOKIE,
  ORY_RECOVER_PATH,
  oryFlowCookieOptions,
  sealOryFlowState,
} from '@/core/server/auth/ory/oauth-flow'
import {
  resolveOryRedirectUri,
  sealRelayState,
} from '@/core/server/auth/ory/oauth-relay'
import { ORY_SIGNUP_METADATA_COOKIE } from '@/core/server/auth/ory/session-cookie'
import {
  encodeOrySignupMetadata,
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
  const { redirectUri, relayTarget } = resolveOryRedirectUri(origin)

  let authorization: Awaited<ReturnType<typeof buildOryAuthorizationRequest>>
  try {
    // Relay mode carries the preview origin in a sealed state; direct mode keeps
    // the original two-arg call so staging/production behavior is unchanged.
    authorization = relayTarget
      ? await buildOryAuthorizationRequest(intent, redirectUri, {
          state: await sealRelayState(relayTarget),
        })
      : await buildOryAuthorizationRequest(intent, redirectUri)
  } catch (error) {
    l.error(
      {
        key: 'oauth_start:authorization_request_failed',
        error: serializeErrorForLog(error),
      },
      'failed to build the Ory authorization request'
    )
    return NextResponse.redirect(
      new URL(`${ORY_RECOVER_PATH}?error=oauth_start_failed`, origin)
    )
  }

  let sealedFlow: string
  try {
    sealedFlow = await sealOryFlowState({
      state: authorization.state,
      nonce: authorization.nonce,
      codeVerifier: authorization.codeVerifier,
      returnTo,
    })
  } catch (error) {
    l.error(
      {
        key: 'oauth_start:seal_flow_failed',
        error: serializeErrorForLog(error),
      },
      'failed to seal the Ory flow-state cookie'
    )
    return NextResponse.redirect(
      new URL(`${ORY_RECOVER_PATH}?error=oauth_start_failed`, origin)
    )
  }

  const response = NextResponse.redirect(authorization.url)

  response.cookies.set(
    E2B_OAUTH_FLOW_COOKIE,
    sealedFlow,
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
