import { type NextRequest, NextResponse } from 'next/server'
import { PROTECTED_URLS } from '@/configs/urls'

export function GET(request: NextRequest) {
  const redirectUrl = new URL(PROTECTED_URLS.DASHBOARD, request.url)
  redirectUrl.search = request.nextUrl.search
  redirectUrl.searchParams.set('tab', 'byoc')

  return NextResponse.redirect(redirectUrl)
}
