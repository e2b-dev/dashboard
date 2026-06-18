import type { NextRequest } from 'next/server'

// Edge-safe Kratos session check for the middleware gate. getServerSession()
// reads next/headers and can't run in the edge runtime, so we hit Kratos
// directly with the request's cookies. This gates redirects only —
// authoritative enforcement happens server-side in getAuthContext.
export async function isKratosSessionActive(
  request: NextRequest
): Promise<boolean> {
  const sdkUrl = process.env.NEXT_PUBLIC_ORY_SDK_URL ?? process.env.ORY_SDK_URL
  const cookie = request.headers.get('cookie')
  if (!sdkUrl || !cookie) return false

  try {
    const response = await fetch(
      `${sdkUrl.replace(/\/$/, '')}/sessions/whoami`,
      { headers: { cookie, accept: 'application/json' } }
    )
    if (!response.ok) return false
    const session = (await response.json()) as { active?: boolean }
    return session.active === true
  } catch {
    return false
  }
}
