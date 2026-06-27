import 'server-cli-only'

import { createOryMiddleware } from '@ory/nextjs/middleware'
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from 'next/server'
import oryConfig from '@/configs/ory'
import { isKratosSessionActive } from '@/core/server/auth/ory/kratos-session-edge'
import {
  E2B_SESSION_COOKIE,
  openSessionCookie,
  sealSessionCookie,
  sessionCookieDeleteOptions,
  sessionCookieOptions,
} from '@/core/server/auth/ory/session-cookie'
import {
  isAccessTokenExpiring,
  refreshSessionTokens,
} from '@/core/server/auth/ory/token-refresh'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { getAuthRouteRedirect } from './auth-routes'
import {
  classifyProxyRequest,
  isAuthEndpointRoute,
  type ProxyPlan,
  planNeedsAuthGate,
} from './classifier'
import {
  handleAuthGate,
  handleMiddlewareRedirect,
  handleMiddlewareRewrite,
  handleRouteRewritePassthrough,
} from './handlers'

type RunProxyOptions = {
  isAuthenticated?: boolean
  // Corrected x-forwarded-* headers (https + public host) to forward to Next so
  // RSC next/headers() reads the public origin behind E2B's ingress.
  forwardedHeaders?: Headers | null
}

// Same-origin paths the @ory/nextjs proxy forwards to Kratos (NEXT_PUBLIC_ORY_SDK_URL),
// so the Elements UI's flow cookies and whoami stay first-party.
const ORY_SDK_PROXY_PREFIXES = [
  '/self-service',
  '/sessions/whoami',
  '/ui',
  '/.well-known/ory',
  '/.ory',
]

// Pass oryConfig.project so the middleware rewrites Kratos redirects onto our UI URLs.
const oryProxy = createOryMiddleware({ project: oryConfig.project })

function isOrySdkProxyPath(pathname: string): boolean {
  return ORY_SDK_PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// @ory/nextjs's middleware resolves its upstream Kratos target from
// NEXT_PUBLIC_ORY_SDK_URL (getEnv prefers the NEXT_PUBLIC_ prefix). We set that
// to the dashboard's OWN same-origin URL so the browser's credentialed Elements
// flow fetch isn't rejected by Kratos' wildcard CORS — but that means the
// server-side proxy would fetch ITSELF and loop back out through E2B's per-port
// ingress until the sandbox connection limit trips (HTTP 429). Forward
// /self-service/* to the real internal Kratos public endpoint instead by
// pointing the upstream var at it only for the duration of the proxy call. The
// client bundle keeps the same-origin value (NEXT_PUBLIC_* is inlined at build
// time), so this server-side override never reaches the browser.
async function oryProxyToKratos(request: NextRequest) {
  const kratos = process.env.ORY_KRATOS_PUBLIC_URL
  if (!kratos) return oryProxy(request)

  const previous = process.env.NEXT_PUBLIC_ORY_SDK_URL
  process.env.NEXT_PUBLIC_ORY_SDK_URL = kratos
  try {
    return await oryProxy(request)
  } finally {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_ORY_SDK_URL
    } else {
      process.env.NEXT_PUBLIC_ORY_SDK_URL = previous
    }
  }
}

// The public host the browser actually reached. Behind E2B's per-port ingress
// `request.nextUrl.host` is the internal bind (`localhost:3000`); the published
// host lives only in `x-forwarded-host` (or `host`). Returns null for loopback.
function publicSandboxHost(request: NextRequest): string | null {
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!host) return null
  const hostname = host.split(':')[0] ?? host
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null
  return host
}

// E2B's per-port ingress terminates TLS but forwards to the dashboard with
// `x-forwarded-proto: http` (literally "http", not absent) and an internal
// `localhost:3000` host. Ory's scheme resolution (request-config.ts,
// @ory/nextjs getPublicUrl, and the middleware's `isTls`/Secure-cookie stamping)
// then believes the request is plain HTTP, so Kratos is told to rewrite its
// browser base URL to `http://<port>-<sandboxId>.e2b.dev`. The ingress is
// HTTPS-only, so the browser's redirect to that plain-HTTP
// `/self-service/login/browser` URL is reset and login dies before the form
// renders.
//
// Fix: for a public sandbox host, force `https`. Mutating `request.headers` in
// place is NOT enough — RSC/route handlers read a frozen snapshot via
// next/headers(), so the corrected headers must be forwarded on a
// `NextResponse.next({ request: { headers } })`. We also flip
// `request.nextUrl.protocol` so `nextUrl.origin` (used by the OAuth routes and
// the @ory/nextjs middleware) is the public https origin, not http://localhost.
// Returns the corrected headers to forward, or null when nothing changed.
function forceHttpsForSandbox(request: NextRequest): Headers | null {
  const host = publicSandboxHost(request)
  if (!host) return null

  // Make nextUrl.origin reflect the public https host for everything downstream.
  request.nextUrl.protocol = 'https:'
  request.nextUrl.host = host

  if (request.headers.get('x-forwarded-proto') === 'https') return null

  const headers = new Headers(request.headers)
  headers.set('x-forwarded-proto', 'https')
  headers.set('x-forwarded-host', host)
  // Mirror onto the live request so same-tick reads (request-config.ts) agree.
  request.headers.set('x-forwarded-proto', 'https')
  request.headers.set('x-forwarded-host', host)
  return headers
}

export async function runDashboardProxy(
  request: NextRequest,
  _event: NextFetchEvent
) {
  // Must run before the Ory proxy and any scheme-dependent resolution below.
  // Forward the corrected headers via NextResponse.next so RSC next/headers()
  // and the @ory/nextjs middleware see https + the public host.
  const forwardedHeaders = forceHttpsForSandbox(request)

  if (request.nextUrl.pathname.startsWith('/oauth2/')) {
    const hydra = process.env.ORY_HYDRA_PUBLIC_URL ?? process.env.ORY_SDK_URL
    if (hydra) {
      return NextResponse.redirect(
        new URL(request.nextUrl.pathname + request.nextUrl.search, hydra),
        307
      )
    }
  }

  // Forward Ory SDK traffic to Kratos before classification (it would otherwise
  // classify as a bypass and go to Next). The @ory/nextjs middleware reads the
  // request scheme/host to tell Kratos which browser base URL to emit, so it
  // must see the corrected https + public host.
  if (isOrySdkProxyPath(request.nextUrl.pathname)) {
    return oryProxyToKratos(request)
  }

  const plan = classifyProxyRequest(request.nextUrl.pathname)

  // refresh the e2b_session up front and propagate it to the same
  // request (request.cookies) so RSC/route handlers and the gate below read the
  // fresh token, then persist it on the outgoing response for the browser.
  //
  // Auth endpoints own their session lifecycle: sign-out reads the id_token from
  // e2b_session before clearing it, the OAuth callback mints a fresh session. A
  // dead refresh here would delete the cookie out of the propagated request
  // before the handler reads it, breaking RP-initiated logout (Kratos/Hydra
  // would never end the session), so skip the refresh for them.
  const session = isAuthEndpointRoute(request.nextUrl.pathname)
    ? skipRefresh
    : await refreshSessionCookie(request)

  if (!planNeedsAuthGate(plan)) {
    return session.persist(
      await runProxyConcerns(request, plan, { forwardedHeaders })
    )
  }

  // The Kratos session is the source of truth, checked via an edge-safe whoami.
  // A valid API token must also be present; without one we skip whoami and let
  // the redirect re-mint a token (or surface the login UI) through the OAuth
  // start route.
  const isAuthenticated =
    session.hasToken && (await isKratosSessionActive(request))

  const authRouteRedirect = getAuthRouteRedirect(request, isAuthenticated)
  if (authRouteRedirect) return session.persist(authRouteRedirect)

  return session.persist(
    await runProxyConcerns(request, plan, { isAuthenticated, forwardedHeaders })
  )
}

type SessionRefresh = {
  hasToken: boolean
  persist: (response: Response) => Response
}

const noPersist: SessionRefresh['persist'] = (response) => response

const skipRefresh: SessionRefresh = { hasToken: false, persist: noPersist }

async function refreshSessionCookie(
  request: NextRequest
): Promise<SessionRefresh> {
  const tokens = await openSessionCookie(
    request.cookies.get(E2B_SESSION_COOKIE)?.value
  )

  if (!tokens) return { hasToken: false, persist: noPersist }
  if (!isAccessTokenExpiring(tokens.expiresAt)) {
    return { hasToken: true, persist: noPersist }
  }

  const result = await refreshSessionTokens(tokens)

  if (result.status === 'refreshed') {
    const sealed = await sealSessionCookie(result.tokens)
    request.cookies.set(E2B_SESSION_COOKIE, sealed)
    return {
      hasToken: true,
      persist: (response) => {
        if (response instanceof NextResponse) {
          response.cookies.set(
            E2B_SESSION_COOKIE,
            sealed,
            sessionCookieOptions(request.nextUrl.host)
          )
        }
        return response
      },
    }
  }

  if (result.status === 'dead') {
    // The refresh token is unusable. Drop the cookie; the gate then re-mints
    // from the live Kratos session (or routes to the login UI).
    request.cookies.delete(E2B_SESSION_COOKIE)
    return {
      hasToken: false,
      persist: (response) => {
        if (response instanceof NextResponse) {
          response.cookies.delete(
            sessionCookieDeleteOptions(request.nextUrl.host)
          )
        }
        return response
      },
    }
  }

  // Transient failure: keep serving the current (still-valid) token.
  return { hasToken: true, persist: noPersist }
}

async function runProxyConcerns(
  request: NextRequest,
  plan: ProxyPlan,
  options: RunProxyOptions = {}
): Promise<Response> {
  try {
    if (plan.kind !== 'bypass' && plan.kind !== 'trpc') {
      const redirect = handleMiddlewareRedirect(request)
      if (redirect) return redirect

      const routeRewrite = handleRouteRewritePassthrough(request)
      if (routeRewrite) return routeRewrite

      const middlewareRewrite = handleMiddlewareRewrite(request)
      if (middlewareRewrite) return middlewareRewrite
    }

    if (plan.kind === 'auth-page' || plan.kind === 'dashboard-page') {
      return handleAuthGate(request, options.isAuthenticated ?? false)
    }

    return options.forwardedHeaders
      ? NextResponse.next({ request: { headers: options.forwardedHeaders } })
      : NextResponse.next({ request })
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

    return options.forwardedHeaders
      ? NextResponse.next({ request: { headers: options.forwardedHeaders } })
      : NextResponse.next({ request })
  }
}
