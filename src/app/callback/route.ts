import 'server-only'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { BASE_URL, PROTECTED_URLS } from '@/configs/urls'
import {
  DevinOAuthError,
  exchangeDevinConnectionCode,
  getDevinOAuthCookieName,
  getDevinOAuthCookieOptions,
  readDevinOAuthAttempt,
} from '@/core/modules/devin-outposts/oauth.server'
import {
  DevinWorkerLaunchError,
  findStartedDevinWorker,
  launchDevinWorker,
} from '@/core/modules/devin-outposts/worker.server'
import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import { l } from '@/core/shared/clients/logger/logger'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  const fallbackOrigin = fallbackCallbackOrigin(request)
  const attempt = readDevinOAuthAttempt(
    request.cookies.get(getDevinOAuthCookieName())?.value
  )
  const fallbackPath = attempt
    ? PROTECTED_URLS.CONNECTION_DEVIN(attempt.teamSlug)
    : PROTECTED_URLS.DASHBOARD

  if (!attempt) {
    return finish(
      connectionRedirect(fallbackOrigin, fallbackPath, 'invalid_state')
    )
  }

  const connectionPath = PROTECTED_URLS.CONNECTION_DEVIN(attempt.teamSlug)
  const authContext = await getAuthContext()
  if (!authContext || authContext.user.id !== attempt.userId) {
    return finish(
      connectionRedirect(attempt.returnOrigin, connectionPath, 'session')
    )
  }

  const teamIdResult = await getTeamIdFromSlug(
    attempt.teamSlug,
    authContext.accessToken
  )
  if (!teamIdResult.ok) {
    return finish(
      connectionRedirect(attempt.returnOrigin, connectionPath, 'dashboard')
    )
  }
  if (!teamIdResult.data) {
    return finish(
      connectionRedirect(attempt.returnOrigin, connectionPath, 'access')
    )
  }
  if (teamIdResult.data !== attempt.teamId) {
    return finish(
      connectionRedirect(attempt.returnOrigin, connectionPath, 'access')
    )
  }

  const connectionsEnabled = await featureFlags.isEnabled(
    'connectionsEnabled',
    {
      user: {
        id: authContext.user.id,
        email: authContext.user.email ?? undefined,
      },
      team: { id: teamIdResult.data },
    }
  )
  if (!connectionsEnabled) {
    return finish(new NextResponse(null, { status: 404 }))
  }

  const workerInput = {
    accessToken: authContext.accessToken,
    operationId: attempt.operationId,
    teamId: attempt.teamId,
    userId: authContext.user.id,
  }

  try {
    const existingSandboxId = await findStartedDevinWorker(workerInput)
    if (existingSandboxId) {
      return finish(
        terminalRedirect(
          attempt.returnOrigin,
          attempt.teamSlug,
          existingSandboxId
        )
      )
    }
  } catch (error) {
    l.warn(
      {
        key: 'devin:oauth_worker_recovery_failed',
        context: {
          error_name: error instanceof Error ? error.name : 'unknown',
        },
        team_id: attempt.teamId,
        user_id: authContext.user.id,
      },
      '[Devin] Could not inspect an existing OAuth worker'
    )
    return preserve(
      connectionRedirect(attempt.returnOrigin, connectionPath, 'launch')
    )
  }

  const codes = request.nextUrl.searchParams.getAll('code')
  const providerErrors = request.nextUrl.searchParams.getAll('error')
  const code = codes.length === 1 ? codes[0] : undefined
  if (!code || code.length > 4096) {
    const explicitlyDenied =
      providerErrors.length === 1 && providerErrors[0] === 'access_denied'
    return preserve(
      connectionRedirect(
        attempt.returnOrigin,
        connectionPath,
        explicitlyDenied ? 'denied' : 'provider'
      )
    )
  }

  let codeExchanged = false
  try {
    const token = await exchangeDevinConnectionCode(code, attempt)
    codeExchanged = true
    const worker = await launchDevinWorker({
      ...workerInput,
      apiUrl: token.apiUrl,
      outpostsToken: token.accessToken,
      poolId: token.poolId,
    })
    return finish(
      terminalRedirect(attempt.returnOrigin, attempt.teamSlug, worker.sandboxId)
    )
  } catch (error) {
    const status =
      error instanceof DevinOAuthError && error.kind === 'invalid_grant'
        ? 'expired'
        : error instanceof DevinWorkerLaunchError
          ? 'launch'
          : 'provider'
    l.warn(
      {
        key: 'devin:oauth_callback_failed',
        context: { kind: status },
        team_id: teamIdResult.data,
        user_id: authContext.user.id,
      },
      '[Devin] OAuth connection did not complete'
    )
    const redirect = connectionRedirect(
      attempt.returnOrigin,
      connectionPath,
      status
    )
    return codeExchanged || status === 'expired'
      ? finish(redirect)
      : preserve(redirect)
  }
}

function terminalRedirect(origin: string, teamSlug: string, sandboxId: string) {
  return NextResponse.redirect(
    new URL(PROTECTED_URLS.SANDBOX_TERMINAL(teamSlug, sandboxId), origin)
  )
}

function connectionRedirect(origin: string, path: string, status: string) {
  const url = new URL(path, origin)
  url.searchParams.set('devinOAuth', status)
  return NextResponse.redirect(url)
}

function finish(response: NextResponse) {
  response.cookies.set(getDevinOAuthCookieName(), '', {
    ...getDevinOAuthCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  })
  return secureResponse(response)
}

function preserve(response: NextResponse) {
  return secureResponse(response)
}

function secureResponse(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}

function fallbackCallbackOrigin(request: NextRequest) {
  const hostname = request.nextUrl.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return new URL(BASE_URL).origin
  }
  return request.nextUrl.origin
}
