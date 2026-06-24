import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/core/server/auth'
import {
  buildTokenEndpoint,
  CLI_OAUTH_CALLBACK_PATH,
  CLI_OAUTH_FLOW_COOKIE,
  exchangeCliCallback,
  openCliFlowState,
  readCliOAuthEnv,
} from '@/core/server/auth/ory/cli-oauth'
import { isLoopbackUrl } from '@/core/shared/schemas/url'

// Hydra redirects here with ?code after SSO. We exchange the code (validating
// state + PKCE), then redirect to the CLI's localhost with the tokens.
// The user must have an active Kratos session — Hydra used SSO to issue the
// code without a login prompt.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin

  const flow = await openCliFlowState(
    request.cookies.get(CLI_OAUTH_FLOW_COOKIE)?.value
  )

  if (!flow || !isLoopbackUrl(flow.next)) {
    return finalize(
      new NextResponse('Invalid or expired flow state', { status: 400 }),
      origin
    )
  }

  const authContext = await getAuthContext()
  if (!authContext) {
    return finalize(
      new NextResponse('Not authenticated', { status: 401 }),
      origin
    )
  }

  const env = readCliOAuthEnv()
  const redirectUri = `${origin}${CLI_OAUTH_CALLBACK_PATH}`

  let tokens: Awaited<ReturnType<typeof exchangeCliCallback>>
  try {
    tokens = await exchangeCliCallback({
      currentUrl: new URL(request.url),
      expectedState: flow.state,
      codeVerifier: flow.codeVerifier,
      redirectUri,
    })
  } catch (error) {
    return finalize(
      new NextResponse(
        `Token exchange failed: ${error instanceof Error ? error.message : String(error)}`,
        { status: 502 }
      ),
      origin
    )
  }

  const tokenEndpoint = buildTokenEndpoint(env.issuer.href)

  const params = new URLSearchParams({
    email: authContext.user.email ?? '',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? '',
    oryTokenEndpoint: tokenEndpoint,
    cliClientId: env.clientId,
  })

  return finalize(
    NextResponse.redirect(`${flow.next}?${params.toString()}`),
    origin
  )
}

function finalize(response: NextResponse, _origin: string): NextResponse {
  response.cookies.delete(CLI_OAUTH_FLOW_COOKIE)
  return response
}
