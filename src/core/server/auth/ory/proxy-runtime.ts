import { createOryMiddleware } from '@ory/nextjs/middleware'
import type { NextRequest, NextResponse } from 'next/server'
import oryConfig from '@/ory.config'

// The paths @ory/nextjs proxies to the Ory SDK from our own origin. Mirrors the
// internal match list in createOryMiddleware: anything else falls through. We
// keep our own copy so the proxy.ts router only invokes the proxy for these.
const ORY_PROXY_PREFIXES = [
  '/self-service',
  '/sessions/whoami',
  '/ui',
  '/.well-known/ory',
  '/.ory',
]

export function isOryProxyPath(pathname: string): boolean {
  return ORY_PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// Proxies Kratos self-service + whoami through the dashboard origin, rewriting
// the SDK base URL to the visiting origin (and Set-Cookie to the visiting host).
// This is what makes the flow stay on a preview deployment.
export const oryProxyMiddleware: (
  request: NextRequest
) => Promise<NextResponse> = createOryMiddleware({
  project: oryConfig.project,
})

// Edge-safe session check for the middleware auth gate. getServerSession() from
// @ory/nextjs/app relies on next/headers and cannot run in middleware, so we
// hit whoami directly with the request cookies. Used only for redirect gating;
// real per-request enforcement happens server-side in the auth provider.
export async function isOrySessionActiveInProxy(
  request: NextRequest
): Promise<boolean> {
  const sdkUrl = process.env.NEXT_PUBLIC_ORY_SDK_URL ?? process.env.ORY_SDK_URL
  const cookie = request.headers.get('cookie')
  if (!sdkUrl || !cookie) return false

  try {
    const res = await fetch(`${sdkUrl.replace(/\/$/, '')}/sessions/whoami`, {
      headers: { cookie, accept: 'application/json' },
    })
    if (!res.ok) return false
    const session = (await res.json()) as { active?: boolean }
    return session.active === true
  } catch {
    return false
  }
}
