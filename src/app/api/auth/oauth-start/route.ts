import { NextResponse } from 'next/server'
import { signIn } from '@/auth'
import {
  authorizationParamsForOryIntent,
  normalizeOryReturnTo,
  readOryAuthIntent,
  shouldCaptureOrySignupMetadata,
} from '@/core/server/auth/ory/build-start-url'
import {
  readOrySignupMetadataFromHeaders,
  setOrySignupMetadataCookie,
} from '@/core/server/auth/ory/signup-metadata'

// Server-side entry point for the Ory OAuth2 flow. Pages redirect here
// instead of rendering a client-side form so that Auth.js can set its
// state/PKCE cookies (only allowed in route handlers / server actions
// / middleware) without any client JS in the loop.
//
// `intent=signup` forwards `prompt=registration` to Hydra, which routes
// to its registration UI (`urls.registration`, default `/ui/registration`)
// instead of the login UI.
//
// `intent=reauth` forwards `prompt=login`, forcing Hydra to redo the login
// flow even with an active session so we get a fresh `auth_time`. Used to
// re-authenticate before sensitive account changes (password).
// https://www.ory.com/docs/oauth2-oidc/authorization-code-flow
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

  await signIn('ory', { redirectTo }, authorizationParamsForOryIntent(intent))
}
