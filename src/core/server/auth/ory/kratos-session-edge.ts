import type { NextRequest } from 'next/server'
import { APP_OWNED_COOKIES } from './session-cookie'

// Edge-safe Kratos session check for the middleware gate. getServerKratosSession()
// reads next/headers and can't run in the edge runtime, so we hit Kratos
// directly with the request's cookies. This gates redirects only —
// authoritative enforcement happens server-side in getAuthContext.
//
// Targets the INTERNAL Kratos URL: fetching the public NEXT_PUBLIC_ORY_SDK_URL
// loops back out through E2B's ingress into the dashboard and 429s.
//
// external_id is required so this gate agrees with getAuthContext: a session
// without it is half-provisioned and getAuthContext rejects it, so we must too,
// otherwise the user loops between /sign-in and /dashboard.
export async function isKratosSessionActive(
  request: NextRequest
): Promise<boolean> {
  const sdkUrl =
    process.env.ORY_KRATOS_PUBLIC_URL_INTERNAL ?? 'http://localhost:4433'
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
