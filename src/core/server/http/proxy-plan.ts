import 'server-cli-only'

import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { getMiddlewareRedirectFromPath } from '@/lib/utils/redirects'
import { getRewriteForPath } from '@/lib/utils/rewrites'

export type ProxyRouteKind =
  | 'api-trpc'
  | 'api-public'
  | 'authjs-endpoint'
  | 'page-auth'
  | 'rewrite'
  | 'public'

export type ProxyPlan = {
  kind: ProxyRouteKind
  needsAuthJsSession: boolean
  runAuthRouteRedirect: boolean
  runAuthGate: boolean
  runMiddlewareRedirect: boolean
  runRouteRewritePassthrough: boolean
  runMiddlewareRewrite: boolean
}

const TRPC_API_PREFIXES = ['/api/trpc'] as const
const AUTHJS_ENDPOINT_PREFIXES = ['/api/auth'] as const

export function classifyProxyRequest(pathname: string): ProxyPlan {
  if (matchesAnyPrefix(pathname, AUTHJS_ENDPOINT_PREFIXES)) {
    return bypassPlan('authjs-endpoint')
  }

  if (matchesAnyPrefix(pathname, TRPC_API_PREFIXES)) {
    return {
      kind: 'api-trpc',
      needsAuthJsSession: false,
      runAuthRouteRedirect: false,
      runAuthGate: false,
      runMiddlewareRedirect: false,
      runRouteRewritePassthrough: false,
      runMiddlewareRewrite: false,
    }
  }

  if (pathname.startsWith('/api/')) {
    return bypassPlan('api-public')
  }

  const hasRedirect = Boolean(getMiddlewareRedirectFromPath(pathname))
  const hasRouteRewrite = Boolean(getRewriteForPath(pathname, 'route').config)
  const hasMiddlewareRewrite = Boolean(
    getRewriteForPath(pathname, 'middleware').config
  )
  const runsAuthGate =
    isProxyAuthRoute(pathname) || isProxyDashboardRoute(pathname)
  const kind = runsAuthGate
    ? 'page-auth'
    : hasRedirect || hasRouteRewrite || hasMiddlewareRewrite
      ? 'rewrite'
      : 'public'

  return {
    kind,
    needsAuthJsSession: runsAuthGate,
    runAuthRouteRedirect: runsAuthGate,
    runAuthGate: runsAuthGate,
    runMiddlewareRedirect: true,
    runRouteRewritePassthrough: true,
    runMiddlewareRewrite: true,
  }
}

export function isProxyAuthRoute(pathname: string): boolean {
  return (
    pathname.includes(AUTH_URLS.SIGN_IN) ||
    pathname.includes(AUTH_URLS.SIGN_UP) ||
    pathname.includes(AUTH_URLS.FORGOT_PASSWORD)
  )
}

export function isProxyDashboardRoute(pathname: string): boolean {
  return pathname.startsWith(PROTECTED_URLS.DASHBOARD)
}

function bypassPlan(kind: ProxyRouteKind): ProxyPlan {
  return {
    kind,
    needsAuthJsSession: false,
    runAuthRouteRedirect: false,
    runAuthGate: false,
    runMiddlewareRedirect: false,
    runRouteRewritePassthrough: false,
    runMiddlewareRewrite: false,
  }
}

function matchesAnyPrefix(
  pathname: string,
  prefixes: readonly string[]
): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
