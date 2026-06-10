import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ensureBootstrappedMock = vi.hoisted(() => vi.fn())
const cookieSetMock = vi.hoisted(() => vi.fn())
const signOutMock = vi.hoisted(() => vi.fn())
const authSessionGetMock = vi.hoisted(() => vi.fn())
const authSessionPostMock = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ set: cookieSetMock })),
}))

vi.mock('@/auth', () => ({
  signOut: signOutMock,
  handlers: {
    GET: authSessionGetMock,
    POST: authSessionPostMock,
  },
}))

vi.mock('@/core/server/auth/ory/dashboard-bootstrap', () => ({
  ensureOryUserBootstrapped: ensureBootstrappedMock,
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { handleOryAuthJsSignIn } = await import(
  '@/core/server/auth/ory/authjs-callbacks'
)
const { GET: authSessionGET } = await import(
  '@/app/api/auth/oauth/[...nextauth]/route'
)
const { GET: bootstrapFailedGET } = await import(
  '@/app/api/auth/oauth/bootstrap-failed/route'
)

describe('Ory Auth.js session boundary', () => {
  beforeEach(() => {
    ensureBootstrappedMock.mockReset()
    cookieSetMock.mockReset()
    signOutMock.mockReset().mockResolvedValue(undefined)
    authSessionGetMock.mockReset().mockResolvedValue(
      Response.json({
        user: { id: 'user-1' },
        accessToken: 'access-token',
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        identityId: 'kratos-id',
      })
    )
    vi.stubEnv('ORY_SDK_URL', 'https://project.oryapis.com')
  })

  it('allows Auth.js sign-in only after dashboard bootstrap succeeds', async () => {
    ensureBootstrappedMock.mockResolvedValueOnce(true)

    await expect(
      handleOryAuthJsSignIn({
        account: {
          provider: 'ory',
          type: 'oidc',
          providerAccountId: 'x',
          access_token: 'access-token',
          id_token: 'id-token',
        },
      })
    ).resolves.toBe(true)

    ensureBootstrappedMock.mockResolvedValueOnce(false)

    await expect(
      handleOryAuthJsSignIn({
        account: {
          provider: 'ory',
          type: 'oidc',
          providerAccountId: 'x',
          access_token: 'access-token',
          id_token: 'id-token',
        },
      })
    ).resolves.toBe('/api/auth/oauth/bootstrap-failed')
    expect(cookieSetMock).toHaveBeenCalledWith(
      'e2b-ory-bootstrap-failed-id-token',
      'id-token',
      expect.objectContaining({ httpOnly: true, maxAge: 60 })
    )
  })

  it('strips Ory tokens from the public Auth.js session response', async () => {
    const response = await authSessionGET(
      new NextRequest('https://app.e2b.dev/api/auth/oauth/session')
    )
    const body = await response.json()

    expect(body).toEqual({ user: { id: 'user-1' } })
    expect(JSON.stringify(body)).not.toContain('access-token')
    expect(JSON.stringify(body)).not.toContain('id-token')
    expect(JSON.stringify(body)).not.toContain('refresh-token')
  })

  it('only signs out from bootstrap-failed when the handoff cookie is present', async () => {
    const withCookie = await bootstrapFailedGET(
      new NextRequest('https://app.e2b.dev/api/auth/oauth/bootstrap-failed', {
        headers: { cookie: 'e2b-ory-bootstrap-failed-id-token=id.token.sig' },
      })
    )
    expect(signOutMock).toHaveBeenCalledWith({ redirect: false })
    expect(withCookie.headers.get('location')).toContain(
      '/oauth2/sessions/logout'
    )

    signOutMock.mockClear()

    const withoutCookie = await bootstrapFailedGET(
      new NextRequest('https://app.e2b.dev/api/auth/oauth/bootstrap-failed')
    )
    expect(signOutMock).not.toHaveBeenCalled()
    expect(withoutCookie.headers.get('location')).toBe('https://app.e2b.dev/')
  })
})
