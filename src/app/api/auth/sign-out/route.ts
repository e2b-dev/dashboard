import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { signOut } from '@/core/server/auth'

// Sign-out is a plain GET route handler the client hard-navigates to. signOut()
// returns the same-origin Kratos self-service logout URL; redirecting there as a
// real document navigation lets Kratos clear its session cookie and bounce back.
// The hard navigation also keeps the logout overlay up until the document
// unloads (no soft RSC redirect re-rendering the signed-out dashboard under it).
export async function GET(request: NextRequest) {
  const { redirectTo } = await signOut({ origin: request.nextUrl.origin })
  return NextResponse.redirect(new URL(redirectTo, request.nextUrl.origin))
}
