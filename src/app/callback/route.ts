import 'server-only'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { BASE_URL, getPublicAppOrigin, PROTECTED_URLS } from '@/configs/urls'
import {
  DevinOAuthError,
  exchangeDevinConnectionCode,
  getDevinOAuthCookieName,
  getDevinOAuthCookieOptions,
  readDevinOAuthAttempt,
} from '@/core/modules/devin-outposts/oauth.server'
import {
  claimPreparedDevinWorker,
  cleanupPreparedDevinWorker,
  DevinWorkerLaunchError,
  hasPersistedDevinConnection,
  persistPreparedDevinConnection,
  startPersistedDevinWorker,
} from '@/core/modules/devin-outposts/worker.server'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import { l } from '@/core/shared/clients/logger/logger'

export const maxDuration = 60

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
    await cleanupAttemptSandbox(authContext.accessToken, attempt)
    return finish(
      connectionRedirect(attempt.returnOrigin, connectionPath, 'dashboard')
    )
  }
  if (!teamIdResult.data) {
    await cleanupAttemptSandbox(authContext.accessToken, attempt)
    return finish(
      connectionRedirect(attempt.returnOrigin, connectionPath, 'access')
    )
  }
  if (teamIdResult.data !== attempt.teamId) {
    await cleanupAttemptSandbox(authContext.accessToken, attempt)
    return finish(
      connectionRedirect(attempt.returnOrigin, connectionPath, 'access')
    )
  }

  const workerInput = {
    accessToken: authContext.accessToken,
    operationId: attempt.operationId,
    sandboxId: attempt.sandboxId,
    teamId: attempt.teamId,
    userId: authContext.user.id,
  }
  let claim: 'busy' | 'claimed' | 'started'
  try {
    claim = await claimPreparedDevinWorker(workerInput)
  } catch (error) {
    l.warn(
      {
        key: 'devin:oauth_callback_claim_failed',
        context: {
          error_name: error instanceof Error ? error.name : 'unknown',
          reason:
            error instanceof Error &&
            /^sandbox_[a-z_]+(?:_\d{3})?$/.test(error.message)
              ? error.message
              : 'unknown',
        },
        sandbox_id: attempt.sandboxId,
        team_id: attempt.teamId,
        user_id: authContext.user.id,
      },
      '[Devin] Could not claim the prepared worker callback'
    )
    return preserve(
      connectionRedirect(attempt.returnOrigin, connectionPath, 'launch')
    )
  }
  if (claim === 'started') {
    return finish(
      terminalRedirect(
        attempt.returnOrigin,
        attempt.teamSlug,
        attempt.sandboxId
      )
    )
  }
  if (claim === 'busy') {
    return preserve(
      connectionRedirect(attempt.returnOrigin, connectionPath, 'in_progress')
    )
  }

  let credentialsPersisted = false
  try {
    credentialsPersisted = await hasPersistedDevinConnection(workerInput)
  } catch (error) {
    l.warn(
      {
        key: 'devin:oauth_persisted_state_check_failed',
        context: {
          error_name: error instanceof Error ? error.name : 'unknown',
        },
        sandbox_id: attempt.sandboxId,
        team_id: attempt.teamId,
        user_id: authContext.user.id,
      },
      '[Devin] Could not inspect persisted worker state'
    )
    return preserve(
      connectionRedirect(attempt.returnOrigin, connectionPath, 'launch')
    )
  }

  const codes = request.nextUrl.searchParams.getAll('code')
  const providerErrors = request.nextUrl.searchParams.getAll('error')
  const code = codes.length === 1 ? codes[0] : undefined
  if (!credentialsPersisted && (!code || code.length > 4096)) {
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

  let exchangeCompleted = false
  try {
    if (!credentialsPersisted) {
      const token = await exchangeDevinConnectionCode(code as string, attempt)
      exchangeCompleted = true
      try {
        await persistPreparedDevinConnection({
          ...workerInput,
          apiUrl: token.apiUrl,
          outpostsToken: token.accessToken,
          poolId: token.poolId,
        })
        credentialsPersisted = true
      } catch {
        credentialsPersisted = await hasPersistedDevinConnection(workerInput)
        if (!credentialsPersisted) throw new DevinWorkerLaunchError()
      }
    }
    const worker = await startPersistedDevinWorker(workerInput, {
      cleanupOnFailure: false,
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
    return credentialsPersisted || exchangeCompleted || status === 'expired'
      ? preserve(
          connectionRedirect(attempt.returnOrigin, connectionPath, status)
        )
      : finish(connectionRedirect(attempt.returnOrigin, connectionPath, status))
  }
}

function terminalRedirect(origin: string, teamSlug: string, sandboxId: string) {
  return NextResponse.redirect(
    new URL(PROTECTED_URLS.SANDBOX_TERMINAL(teamSlug, sandboxId), origin)
  )
}

async function cleanupAttemptSandbox(
  accessToken: string,
  attempt: { sandboxId: string; teamId: string }
) {
  await cleanupPreparedDevinWorker({
    accessToken,
    sandboxId: attempt.sandboxId,
    teamId: attempt.teamId,
  }).catch(() => undefined)
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
  return getPublicAppOrigin(request.nextUrl.origin)
}
