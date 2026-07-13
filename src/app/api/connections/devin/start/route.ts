import 'server-only'

import { randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { AUTH_URLS, getPublicAppOrigin, PROTECTED_URLS } from '@/configs/urls'
import {
  createDevinOAuthAttempt,
  getDevinOAuthConnectUrl,
  getDevinOAuthCookieName,
  getDevinOAuthCookieOptions,
  isDevinOAuthConfigured,
  readDevinOAuthAttempt,
} from '@/core/modules/devin-outposts/oauth.server'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import { TeamSlugSchema } from '@/core/shared/schemas/team'

export async function POST(request: NextRequest) {
  const teamSlug = request.nextUrl.searchParams.get('teamSlug') ?? ''
  const publicOrigin = getPublicAppOrigin(request.nextUrl.origin)
  const connectionPath = TeamSlugSchema.safeParse(teamSlug).success
    ? PROTECTED_URLS.CONNECTION_DEVIN(teamSlug)
    : PROTECTED_URLS.DASHBOARD
  const authContext = await getAuthContext()

  if (!hasSameOrigin(request, publicOrigin)) {
    return new NextResponse(null, { status: 403 })
  }

  if (!authContext) {
    const signInUrl = new URL(AUTH_URLS.SIGN_IN, publicOrigin)
    signInUrl.searchParams.set('returnTo', connectionPath)
    return NextResponse.redirect(signInUrl)
  }

  const teamIdResult = await getTeamIdFromSlug(
    teamSlug,
    authContext.accessToken
  )
  if (!teamIdResult.ok) {
    return redirectToConnection(publicOrigin, connectionPath, 'dashboard')
  }
  if (!teamIdResult.data) {
    return redirectToConnection(publicOrigin, connectionPath, 'access')
  }
  if (!isDevinOAuthConfigured(publicOrigin)) {
    return redirectToConnection(publicOrigin, connectionPath, 'config')
  }

  const activeAttempt = readDevinOAuthAttempt(
    request.cookies.get(getDevinOAuthCookieName())?.value
  )
  if (activeAttempt) {
    const isSameAttempt =
      activeAttempt.returnOrigin === publicOrigin &&
      activeAttempt.teamId === teamIdResult.data &&
      activeAttempt.teamSlug === teamSlug &&
      activeAttempt.userId === authContext.user.id
    if (!isSameAttempt) {
      const activePath = PROTECTED_URLS.CONNECTION_DEVIN(activeAttempt.teamSlug)
      return redirectToConnection(publicOrigin, activePath, 'in_progress')
    }

    const response = NextResponse.redirect(
      getDevinOAuthConnectUrl(activeAttempt),
      303
    )
    response.headers.set('Cache-Control', 'no-store')
    return response
  }

  const operationId = randomUUID()

  try {
    const { attemptCookie, connectUrl } = createDevinOAuthAttempt({
      operationId,
      returnOrigin: publicOrigin,
      teamId: teamIdResult.data,
      teamSlug,
      userId: authContext.user.id,
    })
    const response = NextResponse.redirect(connectUrl, 303)
    response.cookies.set(
      getDevinOAuthCookieName(),
      attemptCookie,
      getDevinOAuthCookieOptions()
    )
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch {
    return redirectToConnection(publicOrigin, connectionPath, 'config')
  }
}

function redirectToConnection(origin: string, path: string, status: string) {
  const url = new URL(path, origin)
  url.searchParams.set('devinOAuth', status)
  return NextResponse.redirect(url, 303)
}

function hasSameOrigin(request: NextRequest, publicOrigin: string) {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(publicOrigin).origin
  } catch {
    return false
  }
}
