import { describe, expect, it } from 'vitest'
import {
  classifyProxyRequest,
  planNeedsAuthJsSession,
} from '@/core/server/proxy/classifier'

describe('classifyProxyRequest', () => {
  it.each([
    ['/dashboard/team/sandboxes', 'dashboard-page', true],
    ['/sign-in', 'auth-page', true],
    ['/sign-up', 'auth-page', true],
    ['/api/trpc/user.update', 'trpc', false],
    ['/api/auth/oauth/session', 'bypass', false],
    ['/api/auth/oauth/start', 'bypass', false],
    ['/api/health', 'bypass', false],
    ['/docs/quickstart', 'rewrite', false],
    ['/', 'rewrite', false],
    ['/unknown-public-page', 'public', false],
  ])('classifies %s', (pathname, kind, needsAuthJsSession) => {
    const plan = classifyProxyRequest(pathname)

    expect(plan.kind).toBe(kind)
    expect(planNeedsAuthJsSession(plan)).toBe(needsAuthJsSession)
  })
})
