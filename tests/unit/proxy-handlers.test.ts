import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMiddlewareRedirectMock = vi.hoisted(() => vi.fn())
const getRewriteForPathMock = vi.hoisted(() => vi.fn())
const createAuthForProxyMock = vi.hoisted(() => vi.fn())

vi.mock('@/configs/flags', () => ({ ALLOW_SEO_INDEXING: false }))

vi.mock('@/lib/utils/redirects', () => ({
  getMiddlewareRedirectFromPath: getMiddlewareRedirectMock,
}))

vi.mock('@/lib/utils/rewrites', () => ({
  getRewriteForPath: getRewriteForPathMock,
}))

vi.mock('@/core/server/auth', () => ({
  createAuthForProxy: createAuthForProxyMock,
}))

const {
  handleMiddlewareRedirect,
  handleRouteRewritePassthrough,
  handleMiddlewareRewrite,
  handleAuthGate,
} = await import('@/core/server/http/proxy')

function request(path: string): NextRequest {
  return new NextRequest(`https://app.e2b.dev${path}`)
}

beforeEach(() => {
  getMiddlewareRedirectMock.mockReset().mockReturnValue(undefined)
  getRewriteForPathMock.mockReset().mockReturnValue({ config: undefined })
  createAuthForProxyMock.mockReset()
})

describe('handleMiddlewareRedirect', () => {
  it('returns a redirect with the configured status and headers', () => {
    getMiddlewareRedirectMock.mockReturnValue({
      destination: '/new-home',
      statusCode: 308,
      headers: { 'x-custom': 'yes' },
    })

    const response = handleMiddlewareRedirect(request('/old-home'))

    expect(response?.status).toBe(308)
    expect(response?.headers.get('location')).toContain('/new-home')
  })

  it('returns null when there is no matching redirect', () => {
    expect(handleMiddlewareRedirect(request('/anything'))).toBeNull()
  })
})

describe('handleRouteRewritePassthrough', () => {
  it('passes through when a catch-all route rewrite matches', () => {
    getRewriteForPathMock.mockReturnValue({ config: { domain: 'x' } })

    const response = handleRouteRewritePassthrough(request('/docs'))

    expect(response).not.toBeNull()
    expect(response?.headers.get('location')).toBeNull()
  })

  it('returns null when no route rewrite matches', () => {
    expect(handleRouteRewritePassthrough(request('/docs'))).toBeNull()
  })
})

describe('handleMiddlewareRewrite', () => {
  it('rewrites to the configured domain, applies the path preprocessor, and tags no-index', () => {
    getRewriteForPathMock.mockReturnValue({
      config: { domain: 'docs.e2b.dev' },
      rule: { pathPreprocessor: (p: string) => p.replace('/docs', '') },
    })

    const response = handleMiddlewareRewrite(request('/docs/guide'))

    expect(response).not.toBeNull()
    const rewrittenTo = response?.headers.get('x-middleware-rewrite') ?? ''
    expect(rewrittenTo).toContain('docs.e2b.dev')
    expect(rewrittenTo).toContain('/guide')
    expect(response?.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
  })

  it('returns null when no middleware rewrite matches', () => {
    expect(handleMiddlewareRewrite(request('/dashboard'))).toBeNull()
  })
})

describe('handleAuthGate', () => {
  it('redirects an unauthenticated dashboard request without resolving auth when knownAuth is provided', async () => {
    const response = await handleAuthGate(request('/dashboard/team-x'), false)

    expect(response.headers.get('location')).toContain('/sign-in')
    expect(createAuthForProxyMock).not.toHaveBeenCalled()
  })

  it('resolves auth from the request when knownAuth is omitted', async () => {
    createAuthForProxyMock.mockReturnValue({
      getAuthContext: vi.fn().mockResolvedValue(null),
    })

    const response = await handleAuthGate(request('/dashboard/team-x'))

    expect(createAuthForProxyMock).toHaveBeenCalled()
    expect(response.headers.get('location')).toContain('/sign-in')
  })

  it('passes through when authenticated on a neutral route', async () => {
    const response = await handleAuthGate(request('/some/page'), true)

    expect(response.headers.get('location')).toBeNull()
  })
})
