import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authMock = vi.hoisted(() => vi.fn())
const signOutMock = vi.hoisted(() => vi.fn())
const revokeKratosSessionsMock = vi.hoisted(() => vi.fn())

vi.mock('@/auth', () => ({ auth: authMock, signOut: signOutMock }))

vi.mock('@/core/server/auth/ory/kratos-session', () => ({
  revokeKratosSessionsForIdentity: revokeKratosSessionsMock,
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { GET } = await import('@/app/api/auth/oauth/signout-flow/route')

function request(): NextRequest {
  return new NextRequest('https://app.e2b.dev/api/auth/oauth/signout-flow')
}

beforeEach(() => {
  authMock.mockReset()
  signOutMock.mockReset().mockResolvedValue(undefined)
  revokeKratosSessionsMock.mockReset().mockResolvedValue(undefined)
  vi.stubEnv('ORY_SDK_URL', 'https://project.oryapis.com')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('signout-flow GET', () => {
  it('revokes Kratos sessions and redirects through Hydra logout', async () => {
    authMock.mockResolvedValue({
      idToken: 'id.token.sig',
      identityId: 'kratos-uuid',
    })

    const response = await GET(request())
    const location = response.headers.get('location') ?? ''

    expect(revokeKratosSessionsMock).toHaveBeenCalledWith('kratos-uuid')
    expect(location).toContain('/oauth2/sessions/logout')
    expect(location).toContain('id_token_hint=id.token.sig')
  })
})
