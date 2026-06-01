import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const signOutMock = vi.hoisted(() => vi.fn())
const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

vi.mock('@/auth', () => ({ signOut: signOutMock }))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: loggerMocks,
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { GET } = await import('@/app/api/auth/oauth/bootstrap-failed/route')

function request(cookie?: string): NextRequest {
  return new NextRequest(
    'https://app.e2b.dev/api/auth/oauth/bootstrap-failed',
    {
      headers: cookie ? { cookie } : undefined,
    }
  )
}

describe('bootstrap-failed GET', () => {
  beforeEach(() => {
    signOutMock.mockReset().mockResolvedValue(undefined)
    loggerMocks.error.mockClear()
    vi.stubEnv('ORY_SDK_URL', 'https://project.oryapis.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('clears any app session and redirects through Ory logout with the handoff id_token', async () => {
    const response = await GET(
      request('e2b-ory-bootstrap-failed-id-token=id.token.sig')
    )
    const location = response.headers.get('location') ?? ''

    expect(signOutMock).toHaveBeenCalledWith({ redirect: false })
    expect(location).toContain('https://project.oryapis.com')
    expect(location).toContain('/oauth2/sessions/logout')
    expect(location).toContain('id_token_hint=id.token.sig')
    expect(response.cookies.get('e2b-ory-bootstrap-failed-id-token')).toEqual(
      expect.objectContaining({ value: '' })
    )
  })

  it('falls back to the marketing root when the id_token handoff is missing', async () => {
    const response = await GET(request())

    expect(response.headers.get('location')).toBe('https://app.e2b.dev/')
    expect(loggerMocks.error).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'oauth_bootstrap_failed:missing_logout_context',
      }),
      expect.stringContaining('Could not perform Ory logout')
    )
  })
})
