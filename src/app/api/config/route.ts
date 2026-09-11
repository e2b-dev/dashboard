import { NextResponse } from 'next/server'
import { resolveBrowserRuntimeConfig } from '@/core/server/runtime-config'

// Resolved from the environment and the request host on every call, so this
// must never be prerendered or cached.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const config = resolveBrowserRuntimeConfig(request.headers, request.url)

  // Unauthenticated and readable by anyone who can reach the dashboard, so
  // this payload must never grow a secret.
  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
