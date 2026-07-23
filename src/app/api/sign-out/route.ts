import { NextResponse } from 'next/server'
import { clearApiKeyCookie, isUsingEnvApiKey } from '@/core/server/auth'

/**
 * Clears the api-key cookie and returns to the key form. A plain route
 * handler (hard navigation) so the cookie is mutated server-side before the
 * next render. No-op in env-key mode — the deployment is permanently
 * authenticated.
 */
export async function GET(request: Request) {
  if (!isUsingEnvApiKey()) {
    await clearApiKeyCookie()
  }

  return NextResponse.redirect(new URL('/', request.url))
}
