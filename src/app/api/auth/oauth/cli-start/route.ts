import { type NextRequest, NextResponse } from 'next/server'
import {
  buildCliAuthorizationRequest,
  CLI_OAUTH_CALLBACK_PATH,
  CLI_OAUTH_FLOW_COOKIE,
  cliFlowCookieOptions,
  sealCliFlowState,
} from '@/core/server/auth/ory/cli-oauth'
import { isLoopbackUrl } from '@/core/shared/schemas/url'

// Initiates the CLI OAuth flow with the public client. The browser is
// redirected to Hydra; if a Kratos session is active, Hydra issues an
// authorization code immediately (SSO, no login prompt).
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next')

  if (!next || !isLoopbackUrl(next)) {
    return new NextResponse('Invalid redirect URL', { status: 400 })
  }

  const redirectUri = `${request.nextUrl.origin}${CLI_OAUTH_CALLBACK_PATH}`

  const authorization = await buildCliAuthorizationRequest(redirectUri)

  const sealedFlow = await sealCliFlowState({
    state: authorization.state,
    codeVerifier: authorization.codeVerifier,
    next,
  })

  const response = NextResponse.redirect(authorization.url)
  response.cookies.set(
    CLI_OAUTH_FLOW_COOKIE,
    sealedFlow,
    cliFlowCookieOptions()
  )

  return response
}
