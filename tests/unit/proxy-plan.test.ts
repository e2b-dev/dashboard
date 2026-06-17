import { describe, expect, it } from 'vitest'
import {
  classifyProxyRequest,
  planNeedsAuthSession,
} from '@/core/server/proxy/classifier'

describe('classifyProxyRequest', () => {
  it.each([
    ['/dashboard/team/sandboxes', 'dashboard-page', true],
    ['/sign-in', 'auth-page', true],
    ['/sign-up', 'auth-page', true],
    ['/api/trpc/user.update', 'trpc', false],
    ['/api/auth/sign-out', 'bypass', false],
    ['/api/health', 'bypass', false],
    ['/docs/quickstart', 'rewrite', false],
    ['/', 'rewrite', false],
    ['/unknown-public-page', 'public', false],
  ])('classifies %s', (pathname, kind, needsAuthSession) => {
    const plan = classifyProxyRequest(pathname)

    expect(plan.kind).toBe(kind)
    expect(planNeedsAuthSession(plan)).toBe(needsAuthSession)
  })
})
