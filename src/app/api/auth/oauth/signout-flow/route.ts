import 'server-only'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { ORY_POST_LOGOUT_PATH } from '@/core/server/auth/ory/signout'

export function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  return NextResponse.redirect(new URL(ORY_POST_LOGOUT_PATH, origin))
}
