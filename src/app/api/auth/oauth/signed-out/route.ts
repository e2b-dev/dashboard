import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  getLogoutFinalUrl,
  parseLogoutState,
} from '@/core/server/auth/ory/signout'

export async function GET(request: NextRequest) {
  const options = parseLogoutState(request.nextUrl.searchParams.get('state'))

  return NextResponse.redirect(
    getLogoutFinalUrl(options, request.nextUrl.origin)
  )
}
