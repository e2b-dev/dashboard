import { type NextRequest, NextResponse } from 'next/server'
import { PROTECTED_URLS } from '@/configs/urls'
import { resolvePublicOrigin } from '@/core/server/auth/ory/oauth-relay'

export function GET(request: NextRequest) {
  const origin = resolvePublicOrigin(request.nextUrl.origin)
  const redirectUrl = new URL(PROTECTED_URLS.DASHBOARD, origin)
  redirectUrl.search = request.nextUrl.search
  redirectUrl.searchParams.set('tab', 'terminal')

  return NextResponse.redirect(redirectUrl)
}
