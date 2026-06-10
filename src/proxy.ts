import { createOryMiddleware } from '@ory/nextjs/middleware'
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from 'next/server'
import { auth as authjsMiddleware } from '@/auth'
import { isOryAuthEnabled } from './configs/flags'
import { getOryAuthRouteRedirect } from './core/server/auth/ory/auth-route-redirect'
import { isOrySessionAuthenticated } from './core/server/auth/ory/authjs-session-boundary'
import {
  handleAuthGate,
  handleMiddlewareRedirect,
  handleMiddlewareRewrite,
  handleRouteRewritePassthrough,
} from './core/server/http/proxy'
import { l, serializeErrorForLog } from './core/shared/clients/logger/logger'

// Runs the proxy's ordered concerns: the first handler that returns a Response
// wins; otherwise we fall through to the auth gate. `knownAuth` is passed in Ory
// mode (resolved by the Auth.js middleware wrapper) and omitted in Supabase mode.
async function proxyCore(
  request: NextRequest,
  knownAuth?: boolean
): Promise<Response> {
  try {
    return (
      handleMiddlewareRedirect(request) ??
      handleRouteRewritePassthrough(request) ??
      handleMiddlewareRewrite(request) ??
      (await handleAuthGate(request, knownAuth))
    )
  } catch (error) {
    l.error(
      {
        key: 'middleware:unexpected_error',
        error: serializeErrorForLog(error),
        context: {
          pathname: request.nextUrl.pathname,
          teamSlug: request.nextUrl.pathname.split('/')[2],
        },
      },
      'middleware - unexpected error'
    )

    // return a basic response to avoid infinite loops
    return NextResponse.next({ request })
  }
}

// In Ory mode the Auth.js middleware wrapper populates req.auth and manages its
// session cookies, so auth is resolved here and threaded into proxyCore. Auth
// pages still bypass the local UI, but only after checking whether an existing
// session should send the user back to the dashboard instead of the hosted UI.
const proxyWithOryAuth = authjsMiddleware((req, _event: NextFetchEvent) => {
  const isAuthenticated = isOrySessionAuthenticated(req.auth)
  const authRouteRedirect = getOryAuthRouteRedirect(req, isAuthenticated)
  if (authRouteRedirect) return authRouteRedirect

  return proxyCore(req, isAuthenticated)
})

// Path prefixes the @ory/nextjs proxy forwards to the Ory SDK (Kratos public,
// from NEXT_PUBLIC_ORY_SDK_URL). The custom login UI's flow creation and form
// submit go through these same-origin paths so Kratos cookies stay first-party;
// see src/configs/ory.ts and src/app/login/page.tsx. Mirrors the
// match list inside createOryMiddleware.
const ORY_SDK_PROXY_PREFIXES = [
  '/self-service',
  '/sessions/whoami',
  '/ui',
  '/.well-known/ory',
  '/.ory',
]

// Created once; the returned closure reads NEXT_PUBLIC_ORY_SDK_URL lazily at
// request time, so this is inert in Supabase mode where the var is unset.
const oryProxy = createOryMiddleware({})

function isOrySdkProxyPath(pathname: string): boolean {
  return ORY_SDK_PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!isOryAuthEnabled()) {
    return proxyCore(request)
  }

  // Ory SDK traffic is proxied straight to Kratos before the Auth.js wrapper
  // and auth gate run — those would otherwise rewrite/redirect these paths.
  if (isOrySdkProxyPath(request.nextUrl.pathname)) {
    return oryProxy(request)
  }

  return proxyWithOryAuth(request, event)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static icons and images - .ico, .svg, .png, .jpg, .jpeg, .gif, .webp
     * - api routes
     * - vercel analytics route
     * - posthog routes
     */
    '/((?!_next/static|_next/image|api/|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp)$|_vercel/|ingest/|ph-proxy/|array/|mintlify-assets/|_mintlify/).*)',
  ],
}
