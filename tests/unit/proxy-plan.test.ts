import { describe, expect, it } from 'vitest'
import {
  classifyProxyRequest,
  isAuthEndpointRoute,
  planNeedsAuthGate,
} from '@/core/server/proxy/classifier'

describe('classifyProxyRequest', () => {
  it.each([
    ['/dashboard/team/sandboxes', 'dashboard-page', true],
    ['/sign-in', 'auth-page', true],
    ['/sign-up', 'auth-page', true],
    ['/api/trpc/user.update', 'trpc', false],
    ['/api/auth/oauth/callback/ory', 'bypass', false],
    ['/api/auth/oauth/start', 'bypass', false],
    ['/api/health', 'bypass', false],
    ['/docs/quickstart', 'rewrite', false],
    ['/', 'rewrite', false],
    ['/unknown-public-page', 'public', false],
  ])('classifies %s', (pathname, kind, needsAuthGate) => {
    const plan = classifyProxyRequest(pathname)

    expect(plan.kind).toBe(kind)
    expect(planNeedsAuthGate(plan)).toBe(needsAuthGate)
  })
})

describe('isAuthEndpointRoute', () => {
  it.each([
    ['/api/auth/sign-out', true],
    ['/api/auth/oauth/start', true],
    ['/api/auth', true],
    ['/api/health', false],
    ['/api/trpc/user.update', false],
    ['/dashboard/team/sandboxes', false],
  ])('%s -> %s', (pathname, expected) => {
    expect(isAuthEndpointRoute(pathname)).toBe(expected)
  })
})
