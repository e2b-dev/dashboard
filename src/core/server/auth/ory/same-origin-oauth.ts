import 'server-only'

import { headers } from 'next/headers'
import { isOryCustomUiEnabled } from '@/configs/flags'

// Keep the Hydra OAuth2 authorize leg on the *visiting* origin so its login_ui_url
// redirect is rewritten back here (by the same-origin @ory/nextjs proxy) instead
// of hopping to the Ory custom domain (e.g. auth.e2b-staging.dev/login).
//
// Auth.js sends the browser to the provider's authorization_endpoint, which is
// discovered from `issuer` (= the Ory SDK base). On Ory Network, Kratos AND
// Hydra share that single base (NEXT_PUBLIC_ORY_SDK_URL), so the dashboard can
// proxy `/oauth2/auth` same-origin and rewrite the login redirect. Locally,
// Kratos and Hydra are split across different ports, so the authorize host won't
// match the proxy upstream — we leave the URL untouched and local sign-in keeps
// working via the local Ory config (which already points login at the dashboard).
//
// Only the authorize *host* is rewritten; client_id / redirect_uri / state are
// preserved, and the server-side token exchange still hits the real Ory base.
export async function rewriteAuthorizeToVisitingOrigin(
  authorizeUrl: string
): Promise<string> {
  if (!isOryCustomUiEnabled()) return authorizeUrl

  const sdkBase = process.env.NEXT_PUBLIC_ORY_SDK_URL
  if (!sdkBase) return authorizeUrl

  let target: URL
  let upstream: URL
  try {
    target = new URL(authorizeUrl)
    upstream = new URL(sdkBase)
  } catch {
    return authorizeUrl
  }

  // Only rewrite when the authorize endpoint is served by the base the proxy
  // forwards to, and only for the OAuth2 authorize path.
  if (target.host !== upstream.host) return authorizeUrl
  if (!target.pathname.startsWith('/oauth2/auth')) return authorizeUrl

  const requestHeaders = await headers()
  const host = requestHeaders.get('host')
  if (!host) return authorizeUrl
  const proto = requestHeaders.get('x-forwarded-proto') ?? 'https'

  target.protocol = `${proto}:`
  target.host = host
  return target.toString()
}
