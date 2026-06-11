import { createOryMiddleware } from '@ory/nextjs/middleware'
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from 'next/server'
import { auth as authjsMiddleware } from '@/auth'
import { isOryAuthEnabled, isOryCustomUiEnabled } from './configs/flags'
import oryConfig from './configs/ory'
import { getOryAuthRouteRedirect } from './core/server/auth/ory/auth-route-redirect'
import { isOrySessionAuthenticated } from './core/server/auth/ory/authjs-session-boundary'
import {
  handleAuthGate,
  handleMiddlewareRedirect,
  handleMiddlewareRewrite,
  handleRouteRewritePassthrough,
} from './core/server/http/proxy'
import {
  classifyProxyRequest,
  type ProxyPlan,
} from './core/server/http/proxy-plan'
import { l, serializeErrorForLog } from './core/shared/clients/logger/logger'

type ProxyCoreOptions = {
  knownAuth?: boolean
}

// Runs the selected proxy concerns in order; the first handler that returns a
// Response wins. Ory mode supplies `knownAuth` from the Auth.js wrapper.
async function proxyCore(
  request: NextRequest,
  plan: ProxyPlan,
  options: ProxyCoreOptions = {}
): Promise<Response> {
  try {
    if (plan.runMiddlewareRedirect) {
      const response = handleMiddlewareRedirect(request)
      if (response) return response
    }

    if (plan.runRouteRewritePassthrough) {
      const response = handleRouteRewritePassthrough(request)
      if (response) return response
    }

    if (plan.runMiddlewareRewrite) {
      const response = handleMiddlewareRewrite(request)
      if (response) return response
    }

    if (plan.runAuthGate) {
      return handleAuthGate(request, options.knownAuth)
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

    // return a basic response to avoid infinite loops
    return NextResponse.next({ request })
  }
}

function proxyWithOryAuth(
  request: NextRequest,
  event: NextFetchEvent,
  plan: ProxyPlan
) {
  const proxyWithAuth = authjsMiddleware((req, _event: NextFetchEvent) => {
    const isAuthenticated = isOrySessionAuthenticated(req.auth)

    if (plan.runAuthRouteRedirect) {
      const authRouteRedirect = getOryAuthRouteRedirect(req, isAuthenticated)
      if (authRouteRedirect) return authRouteRedirect
    }

    return proxyCore(req, plan, {
      knownAuth: isAuthenticated,
    })
  })

  return proxyWithAuth(request, event)
}

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
//
// Pass the same `project` config as @ory/elements-react: the middleware's
// rewriteUrls() uses its built-in Ory-path↔ui_url table to rewrite Kratos
// redirect Location headers / response bodies (e.g. /login, /registration) onto
// our own UI URLs. Without it those rewrites are no-ops.
const oryProxy = createOryMiddleware({ project: oryConfig.project })

function isOrySdkProxyPath(pathname: string): boolean {
  return ORY_SDK_PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const plan = classifyProxyRequest(request.nextUrl.pathname)

  // Ory SDK traffic (/self-service, /sessions/whoami, …) must be forwarded to
  // Kratos before anything else. These paths classify as public
  // (needsOryAuthJsSession: false), so the bypass below would otherwise send
  // them to proxyCore/Next instead of Kratos — breaking the custom UI's flow
  // creation and form submits. Only the custom Elements UI needs this
  // same-origin proxy (gated, so production is unaffected).
  if (isOryCustomUiEnabled() && isOrySdkProxyPath(request.nextUrl.pathname)) {
    return oryProxy(request)
  }

  if (!isOryAuthEnabled() || !plan.needsOryAuthJsSession) {
    return proxyCore(request, plan)
  }

  return proxyWithOryAuth(request, event, plan)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/ (Next.js internals: static files, image optimization, etc.)
     * - static icons and images - .ico, .svg, .png, .jpg, .jpeg, .gif, .webp
     * - vercel analytics route
     * - posthog routes
     * - mintlify docs asset routes (rewritten in next.config.ts)
     */
    '/((?!_next/|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp)$|_vercel/|ingest/|ph-proxy/|array/|mintlify-assets/|_mintlify/).*)',
  ],
}
