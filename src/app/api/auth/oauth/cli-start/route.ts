import { type NextRequest, NextResponse } from 'next/server'
import {
  buildCliAuthorizationRequest,
  CLI_OAUTH_CALLBACK_PATH,
  CLI_OAUTH_FLOW_COOKIE,
  type CliAuthorizationRequest,
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

  let authorization: CliAuthorizationRequest
  try {
    authorization = await buildCliAuthorizationRequest(redirectUri)
  } catch (error) {
    return NextResponse.redirect(
      `${next}?${new URLSearchParams({
        error: `Failed to start OAuth flow: ${error instanceof Error ? error.message : String(error)}`,
      }).toString()}`
    )
  }

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
