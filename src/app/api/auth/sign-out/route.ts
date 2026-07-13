import 'server-only'

import { type NextRequest, NextResponse } from 'next/server'
import { getPublicAppOrigin } from '@/configs/urls'
import { signOut } from '@/core/server/auth'

// Sign-out lives in a plain route handler, deliberately NOT wrapped by the
// Auth.js `auth()` helper. When sign-out runs inside an auth()-wrapped request,
// the wrapper re-issues a refreshed JWT session cookie at the end of the
// request, which clobbers the session-cookie deletion that signOut() emits and
// leaves the user logged in. Here nothing re-wraps the request, so the deletion
// sticks. The client hard-navigates to this route, so the logout overlay stays
// up until the document unloads (no soft RSC redirect re-rendering the
// signed-out dashboard underneath it).
export async function GET(request: NextRequest) {
  const publicOrigin = getPublicAppOrigin(request.nextUrl.origin)
  const { redirectTo } = await signOut({ origin: publicOrigin })
  return NextResponse.redirect(new URL(redirectTo, publicOrigin))
}
