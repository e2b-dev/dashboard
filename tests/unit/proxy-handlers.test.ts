import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMiddlewareRedirectMock = vi.hoisted(() => vi.fn())
const getRewriteForPathMock = vi.hoisted(() => vi.fn())

vi.mock('@/configs/flags', () => ({ ALLOW_SEO_INDEXING: false }))

vi.mock('@/lib/utils/redirects', () => ({
  getMiddlewareRedirectFromPath: getMiddlewareRedirectMock,
}))

vi.mock('@/lib/utils/rewrites', () => ({
  getRewriteForPath: getRewriteForPathMock,
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
})

describe('proxy handlers', () => {
  it('redirects with the configured status and headers', () => {
    getMiddlewareRedirectMock.mockReturnValue({
      destination: '/new-home',
      statusCode: 308,
      headers: { 'x-custom': 'yes' },
    })

    const response = handleMiddlewareRedirect(request('/old-home'))

    expect(response?.status).toBe(308)
    expect(response?.headers.get('location')).toContain('/new-home')
  })

  it('passes catch-all route rewrites through untouched', () => {
    getRewriteForPathMock.mockReturnValue({ config: { domain: 'x' } })

    const response = handleRouteRewritePassthrough(request('/docs'))

    expect(response).not.toBeNull()
    expect(response?.headers.get('location')).toBeNull()
  })

  it('rewrites middleware-managed paths to the configured origin', () => {
    getRewriteForPathMock.mockReturnValue({
      config: { domain: 'docs.e2b.dev' },
      rule: { pathPreprocessor: (p: string) => p.replace('/docs', '') },
    })

    const response = handleMiddlewareRewrite(request('/docs/guide'))

    expect(response?.headers.get('x-middleware-rewrite')).toContain(
      'docs.e2b.dev/guide'
    )
    expect(response?.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
  })

  it('redirects unauthenticated dashboard pages to sign-in', async () => {
    const response = await handleAuthGate(request('/dashboard/team-x'), false)

    expect(response.headers.get('location')).toContain('/sign-in')
  })
})
