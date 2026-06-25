import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/core/server/auth'
import {
  buildRevokeEndpoint,
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
      redirectWithParams(flow.next, { error: 'Not authenticated' }),
      origin
    )
  }

  let env: ReturnType<typeof readCliOAuthEnv>
  try {
    env = readCliOAuthEnv()
  } catch (error) {
    return finalize(
      redirectWithParams(flow.next, {
        error: `OAuth configuration error: ${error instanceof Error ? error.message : String(error)}`,
      }),
      origin
    )
  }
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
      redirectWithParams(flow.next, {
        error: `Token exchange failed: ${error instanceof Error ? error.message : String(error)}`,
      }),
      origin
    )
  }

  const tokenEndpoint = buildTokenEndpoint(env.issuer.href)
  const revokeEndpoint = buildRevokeEndpoint(env.issuer.href)

  return finalize(
    redirectWithParams(flow.next, {
      email: authContext.user.email ?? '',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? '',
      tokenEndpoint: tokenEndpoint,
      revokeEndpoint: revokeEndpoint,
      clientId: env.clientId,
    }),
    origin
  )
}

function redirectWithParams(
  next: string,
  params: Record<string, string>
): NextResponse {
  const url = new URL(next)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return NextResponse.redirect(url)
}

function finalize(response: NextResponse, _origin: string): NextResponse {
  response.cookies.delete(CLI_OAUTH_FLOW_COOKIE)
  return response
}
