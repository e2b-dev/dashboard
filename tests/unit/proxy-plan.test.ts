import { describe, expect, it } from 'vitest'
import { classifyProxyRequest } from '@/core/server/http/proxy-plan'

describe('classifyProxyRequest', () => {
  it.each([
    ['/dashboard/team/sandboxes', 'page-auth', true, true, true],
    ['/sign-in', 'page-auth', true, true, true],
    ['/sign-up', 'page-auth', true, true, true],
    ['/api/trpc/user.update', 'api-trpc', false, false, false],
    ['/api/auth/oauth/session', 'authjs-endpoint', false, false, false],
    ['/api/auth/oauth-start', 'authjs-endpoint', false, false, false],
    ['/api/health', 'api-public', false, false, false],
    ['/docs/quickstart', 'rewrite', false, false, false],
    ['/', 'rewrite', false, false, false],
    ['/unknown-public-page', 'public', false, false, false],
  ])('classifies %s', (pathname, kind, needsAuthJsSession, runAuthRouteRedirect, runAuthGate) => {
    const plan = classifyProxyRequest(pathname)

    expect(plan).toMatchObject({
      kind,
      needsAuthJsSession,
      runAuthRouteRedirect,
      runAuthGate,
    })
  })

  it('runs proxy concerns only for page and rewrite routes', () => {
    expect(classifyProxyRequest('/api/trpc/user.update')).toMatchObject({
      runMiddlewareRedirect: false,
      runRouteRewritePassthrough: false,
      runMiddlewareRewrite: false,
    })

    expect(classifyProxyRequest('/dashboard/team')).toMatchObject({
      runMiddlewareRedirect: true,
      runRouteRewritePassthrough: true,
      runMiddlewareRewrite: true,
    })
  })
})
