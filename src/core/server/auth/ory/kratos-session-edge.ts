import type { NextRequest } from 'next/server'
import { cookieHeaderWithoutAppOwned } from './session-cookie'

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
  const cookie = cookieHeaderWithoutAppOwned(request.cookies.getAll())
  if (!sdkUrl || !cookie) return false

  try {
    const response = await fetch(
      `${sdkUrl.replace(/\/$/, '')}/sessions/whoami`,
      { headers: { cookie, accept: 'application/json' } }
    )
    if (!response.ok) return false
    const session = (await response.json()) as {
      active?: boolean
      identity?: { external_id?: string | null }
    }
    return session.active === true && !!session.identity?.external_id
  } catch {
    return false
  }
}
