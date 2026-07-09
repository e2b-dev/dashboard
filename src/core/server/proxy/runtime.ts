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
  joinSessionCookie,
  openSessionCookie,
  reconcileSessionCookies,
  sealSessionCookie,
  sessionCookieDeleteOptions,
  sessionCookieNames,
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

export async function runDashboardProxy(
  request: NextRequest,
  _event: NextFetchEvent
) {
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
  // classify as a bypass and go to Next).
  if (isOrySdkProxyPath(request.nextUrl.pathname)) {
    return oryProxy(request)
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
    return session.persist(await runProxyConcerns(request, plan))
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
    await runProxyConcerns(request, plan, { isAuthenticated })
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
    joinSessionCookie(request.cookies.getAll())
  )

  if (!tokens) return { hasToken: false, persist: noPersist }
  if (!isAccessTokenExpiring(tokens.expiresAt)) {
    return { hasToken: true, persist: noPersist }
  }

  const result = await refreshSessionTokens(tokens)

  if (result.status === 'refreshed') {
    const sealed = await sealSessionCookie(result.tokens)
    const { write, expire } = reconcileSessionCookies(
      sealed,
      request.cookies.getAll()
    )
    for (const chunk of write) request.cookies.set(chunk.name, chunk.value)
    for (const name of expire) request.cookies.delete(name)
    return {
      hasToken: true,
      persist: (response) => {
        if (response instanceof NextResponse) {
          const options = sessionCookieOptions(request.nextUrl.host)
          for (const chunk of write) {
            response.cookies.set(chunk.name, chunk.value, options)
          }
          for (const name of expire) {
            response.cookies.delete(
              sessionCookieDeleteOptions(request.nextUrl.host, name)
            )
          }
        }
        return response
      },
    }
  }

  if (result.status === 'dead') {
    // The refresh token is unusable. Drop the cookie; the gate then re-mints
    // from the live Kratos session (or routes to the login UI).
    const names = sessionCookieNames(request.cookies.getAll())
    for (const name of names) request.cookies.delete(name)
    return {
      hasToken: false,
      persist: (response) => {
        if (response instanceof NextResponse) {
          for (const name of names) {
            response.cookies.delete(
              sessionCookieDeleteOptions(request.nextUrl.host, name)
            )
          }
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

    return NextResponse.next({ request })
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

    return NextResponse.next({ request })
  }
}
