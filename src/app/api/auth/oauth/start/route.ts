import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { signIn } from '@/auth'
import {
  authorizationParamsForOryIntent,
  normalizeOryReturnTo,
  readOryAuthIntent,
  shouldCaptureOrySignupMetadata,
} from '@/core/server/auth/ory/build-start-url'
import { rewriteAuthorizeToVisitingOrigin } from '@/core/server/auth/ory/same-origin-oauth'
import {
  readOrySignupMetadataFromHeaders,
  setOrySignupMetadataCookie,
} from '@/core/server/auth/ory/signup-metadata'

// Server-side entry point for the Ory OAuth2 flow. Pages redirect here
// instead of rendering a client-side form so that Auth.js can set its
// state/PKCE cookies without any client JS in the loop.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const intent = readOryAuthIntent(url.searchParams.get('intent'))
  const redirectTo =
    normalizeOryReturnTo(url.searchParams.get('returnTo')) ?? '/dashboard'

  if (!intent) {
    return new NextResponse('Invalid Ory auth intent', { status: 400 })
  }

  if (shouldCaptureOrySignupMetadata(intent)) {
    await setOrySignupMetadataCookie(
      readOrySignupMetadataFromHeaders(request.headers)
    )
  }

  // redirect:false so we get the authorize URL back (cookies are still set) and
  // can keep it on the visiting origin for the custom same-origin UI.
  const destination = await signIn(
    'ory',
    { redirectTo, redirect: false },
    authorizationParamsForOryIntent(intent)
  )

  const target =
    typeof destination === 'string'
      ? await rewriteAuthorizeToVisitingOrigin(destination)
      : destination

  // Use next/navigation redirect (not NextResponse.redirect) so the Set-Cookie
  // headers signIn wrote via next/headers cookies() — Auth.js state/PKCE — are
  // flushed onto the redirect. NextResponse.redirect() drops them, which breaks
  // the callback (error=Configuration / "cookie doesn't stick").
  redirect(typeof target === 'string' ? target : redirectTo)
}
