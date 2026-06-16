import 'server-cli-only'

import { AUTH_URLS, PROTECTED_URLS } from '@/configs/urls'
import { getMiddlewareRedirectFromPath } from '@/lib/utils/redirects'
import { getRewriteForPath } from '@/lib/utils/rewrites'

export type ProxyPlan =
  | { kind: 'bypass' }
  | { kind: 'trpc' }
  | { kind: 'auth-page' }
  | { kind: 'dashboard-page' }
  | { kind: 'rewrite' }
  | { kind: 'public' }

const TRPC_API_PREFIXES = ['/api/trpc'] as const
const AUTHJS_ENDPOINT_PREFIXES = ['/api/auth'] as const

export function classifyProxyRequest(pathname: string): ProxyPlan {
  if (matchesAnyPrefix(pathname, AUTHJS_ENDPOINT_PREFIXES)) {
    return { kind: 'bypass' }
  }

  if (matchesAnyPrefix(pathname, TRPC_API_PREFIXES)) {
    return { kind: 'trpc' }
  }

  if (pathname.startsWith('/api/')) {
    return { kind: 'bypass' }
  }

  if (isProxyAuthRoute(pathname)) {
    return { kind: 'auth-page' }
  }

  if (isProxyDashboardRoute(pathname)) {
    return { kind: 'dashboard-page' }
  }

  const hasRedirect = Boolean(getMiddlewareRedirectFromPath(pathname))
  const hasRouteRewrite = Boolean(getRewriteForPath(pathname, 'route').config)
  const hasMiddlewareRewrite = Boolean(
    getRewriteForPath(pathname, 'middleware').config
  )

  return hasRedirect || hasRouteRewrite || hasMiddlewareRewrite
    ? { kind: 'rewrite' }
    : { kind: 'public' }
}

export function planNeedsAuthJsSession(plan: ProxyPlan): boolean {
  return plan.kind === 'auth-page' || plan.kind === 'dashboard-page'
}

export function isProxyAuthRoute(pathname: string): boolean {
  const normalizedPath = normalizePath(pathname)
  return (
    normalizedPath === AUTH_URLS.SIGN_IN ||
    normalizedPath === AUTH_URLS.SIGN_UP ||
    normalizedPath === AUTH_URLS.FORGOT_PASSWORD
  )
}

export function isProxyDashboardRoute(pathname: string): boolean {
  return pathname.startsWith(PROTECTED_URLS.DASHBOARD)
}

function matchesAnyPrefix(
  pathname: string,
  prefixes: readonly string[]
): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function normalizePath(pathname: string): string {
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '')
}
