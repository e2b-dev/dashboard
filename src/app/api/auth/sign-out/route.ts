import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/core/server/auth'

// Sign-out lives in a plain route handler — NOT the auth()-wrapped tRPC route.
// The Auth.js route wrapper re-issues a refreshed JWT session cookie at the end
// of every request, which would clobber the session-cookie deletion that
// signOut() emits, leaving the user logged in. Here nothing re-wraps the
// request, so the deletion sticks. The client hard-navigates to this route, so
// the logout overlay stays up until the document unloads (no soft RSC redirect
// re-rendering the signed-out dashboard underneath it).
export async function GET(request: NextRequest) {
  const { redirectTo } = await auth.signOut({ origin: request.nextUrl.origin })
  return NextResponse.redirect(new URL(redirectTo, request.nextUrl.origin))
}
