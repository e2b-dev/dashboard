import type { NextRequest } from 'next/server'
import { l } from '@/core/shared/clients/logger/logger'
import { APP_OWNED_COOKIES } from './session-cookie'

// Edge-safe Kratos session check for the middleware gate. getServerSession()
// reads next/headers and can't run in the edge runtime, so we hit Kratos
// directly with the request's cookies. This gates redirects only —
// authoritative enforcement happens server-side in getAuthContext.
//
// external_id is required so this gate agrees with getAuthContext: a session
// without it is half-provisioned and getAuthContext rejects it, so we must too,
// otherwise the user loops between /sign-in and /dashboard.
export async function isKratosSessionActive(
  request: NextRequest
): Promise<boolean> {
  const sdkUrl = process.env.NEXT_PUBLIC_ORY_SDK_URL ?? process.env.ORY_SDK_URL
  const cookie = request.cookies
    .getAll()
    .filter((c) => !APP_OWNED_COOKIES.has(c.name))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
  if (!sdkUrl || !cookie) return false

  try {
    const response = await fetch(
      `${sdkUrl.replace(/\/$/, '')}/sessions/whoami`,
      { headers: { cookie, accept: 'application/json' } }
    )
    if (!response.ok) {
      l.debug(
        {
          key: 'sso_debug:edge:whoami_failed',
          context: { status: response.status, sdk_url: sdkUrl },
        },
        'SSO debug: edge whoami returned non-OK status'
      )
      return false
    }
    const session = (await response.json()) as {
      active?: boolean
      identity?: {
        id?: string
        external_id?: string | null
        organization_id?: string | null
      }
    }
    l.debug(
      {
        key: 'sso_debug:edge:whoami_response',
        context: {
          active: session.active,
          identity_id: session.identity?.id,
          organization_id: session.identity?.organization_id ?? null,
          has_external_id: !!session.identity?.external_id,
        },
      },
      'SSO debug: edge whoami response'
    )
    return session.active === true && !!session.identity?.external_id
  } catch (error) {
    l.debug(
      {
        key: 'sso_debug:edge:whoami_error',
        error: error instanceof Error ? error.message : String(error),
      },
      'SSO debug: edge whoami threw'
    )
    return false
  }
}
