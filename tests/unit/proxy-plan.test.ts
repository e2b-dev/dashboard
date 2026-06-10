import { describe, expect, it } from 'vitest'
import { classifyProxyRequest } from '@/core/server/http/proxy-plan'

describe('classifyProxyRequest', () => {
  it.each([
    ['/dashboard/team/sandboxes', 'page-auth', true, true, true],
    ['/sign-in', 'page-auth', true, true, true],
    ['/sign-up', 'page-auth', true, true, true],
    ['/api/trpc/user.update', 'api-auth-session', true, false, false],
    ['/api/teams/team-slug/metrics', 'api-auth-session', true, false, false],
    ['/api/auth/oauth/session', 'authjs-endpoint', false, false, false],
    ['/api/auth/oauth-start', 'authjs-endpoint', false, false, false],
    ['/api/health', 'api-public', false, false, false],
    ['/api/team/state', 'api-public', false, false, false],
    ['/api/sidebar/state', 'api-public', false, false, false],
    ['/docs/quickstart', 'rewrite', false, false, false],
    ['/', 'rewrite', false, false, false],
    ['/unknown-public-page', 'public', false, false, false],
  ])('classifies %s', (pathname, kind, needsOryAuthJsSession, runAuthRouteRedirect, runAuthGate) => {
    const plan = classifyProxyRequest(pathname)

    expect(plan).toMatchObject({
      kind,
      needsOryAuthJsSession,
      runAuthRouteRedirect,
      runAuthGate,
    })
  })

  it('only forwards verified Ory auth context for protected API routes', () => {
    expect(classifyProxyRequest('/api/trpc/user.update')).toMatchObject({
      forwardVerifiedOryAuth: true,
      runMiddlewareRedirect: false,
      runRouteRewritePassthrough: false,
      runMiddlewareRewrite: false,
    })

    expect(classifyProxyRequest('/dashboard/team')).toMatchObject({
      forwardVerifiedOryAuth: true,
      runMiddlewareRedirect: true,
      runRouteRewritePassthrough: true,
      runMiddlewareRewrite: true,
    })
  })
})
