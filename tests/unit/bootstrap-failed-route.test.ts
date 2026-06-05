import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const signOutMock = vi.hoisted(() => vi.fn())

vi.mock('@/auth', () => ({ signOut: signOutMock }))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { GET } = await import('@/app/api/auth/oauth/bootstrap-failed/route')

function request(cookie: string): NextRequest {
  return new NextRequest(
    'https://app.e2b.dev/api/auth/oauth/bootstrap-failed',
    { headers: { cookie } }
  )
}

describe('bootstrap-failed GET', () => {
  beforeEach(() => {
    signOutMock.mockReset().mockResolvedValue(undefined)
    vi.stubEnv('ORY_SDK_URL', 'https://project.oryapis.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('clears the app session and redirects through Ory logout with the handoff id_token', async () => {
    const response = await GET(
      request('e2b-ory-bootstrap-failed-id-token=id.token.sig')
    )
    const location = response.headers.get('location') ?? ''

    expect(signOutMock).toHaveBeenCalledWith({ redirect: false })
    expect(location).toContain('/oauth2/sessions/logout')
    expect(location).toContain('id_token_hint=id.token.sig')
    expect(response.cookies.get('e2b-ory-bootstrap-failed-id-token')).toEqual(
      expect.objectContaining({ value: '' })
    )
  })
})
