import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const apiPostMock = vi.hoisted(() => vi.fn())
const originalDashboardApiAdminToken = process.env.DASHBOARD_API_ADMIN_TOKEN

function jwt(claims: Record<string, unknown>) {
  return [
    Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
      'base64url'
    ),
    Buffer.from(JSON.stringify(claims)).toString('base64url'),
    'signature',
  ].join('.')
}

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: loggerMocks,
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

vi.mock('@/configs/api', () => ({
  ADMIN_AUTH_HEADERS: vi.fn((token: string) => ({ 'X-Admin-Token': token })),
}))

vi.mock('@/core/shared/clients/api', () => ({
  api: {
    POST: apiPostMock,
  },
}))

const { bootstrapOryUser, ensureOryUserBootstrapped } = await import(
  '@/core/server/auth/ory/dashboard-bootstrap'
)

describe('dashboard bootstrap for Ory users', () => {
  beforeEach(() => {
    process.env.DASHBOARD_API_ADMIN_TOKEN = 'admin-token'
    apiPostMock.mockReset()
    loggerMocks.error.mockClear()
  })

  afterEach(() => {
    process.env.DASHBOARD_API_ADMIN_TOKEN = originalDashboardApiAdminToken
  })

  it('imports the access-token subject with id_token profile fallback', async () => {
    apiPostMock.mockResolvedValue({
      data: { id: 'team-1', slug: 'team-1' },
      error: null,
      response: { ok: true, status: 200, statusText: 'OK' },
    })

    const result = await bootstrapOryUser({
      accessToken: jwt({
        iss: 'https://ory.example.test',
        sub: 'e2b-user-id',
      }),
      idToken: jwt({
        email: 'ada@example.test',
        given_name: 'Ada',
        sub: 'kratos-uuid',
      }),
      provider: 'ory',
    })

    expect(result).toBe(true)
    expect(apiPostMock).toHaveBeenCalledWith('/admin/users/bootstrap', {
      body: {
        oidc_issuer: 'https://ory.example.test',
        oidc_user_id: 'e2b-user-id',
        oidc_user_email: 'ada@example.test',
        oidc_user_name: 'Ada',
      },
      headers: { 'X-Admin-Token': 'admin-token' },
    })
  })

  it('asks dashboard-api to confirm bootstrap during Ory sign-in', async () => {
    apiPostMock.mockResolvedValue({
      data: { id: 'team-1', slug: 'team-1' },
      error: null,
      response: { ok: true, status: 200, statusText: 'OK' },
    })

    const result = await ensureOryUserBootstrapped({
      accessToken: jwt({
        iss: 'https://ory.example.test',
        sub: 'e2b-user-id',
        email: 'ada@example.test',
      }),
      provider: 'ory',
    })

    expect(result).toBe(true)
    expect(apiPostMock).toHaveBeenCalledWith('/admin/users/bootstrap', {
      body: {
        oidc_issuer: 'https://ory.example.test',
        oidc_user_id: 'e2b-user-id',
        oidc_user_email: 'ada@example.test',
        oidc_user_name: null,
      },
      headers: { 'X-Admin-Token': 'admin-token' },
    })
  })

  it('confirms bootstrap when the admin bootstrap call succeeds', async () => {
    apiPostMock.mockResolvedValue({
      data: { id: 'team-1', slug: 'team-1' },
      error: null,
      response: { ok: true, status: 200, statusText: 'OK' },
    })

    const result = await ensureOryUserBootstrapped({
      accessToken: jwt({
        iss: 'https://ory.example.test',
        sub: 'e2b-user-id',
        email: 'ada@example.test',
      }),
      provider: 'ory',
    })

    expect(result).toBe(true)
    expect(apiPostMock).toHaveBeenCalledTimes(1)
  })

  it('denies bootstrap confirmation when the admin bootstrap call fails', async () => {
    apiPostMock.mockResolvedValue({
      data: null,
      error: { status: 503, message: 'dashboard-api unavailable' },
      response: { ok: false, status: 503, statusText: 'Service Unavailable' },
    })

    const result = await ensureOryUserBootstrapped({
      accessToken: jwt({
        iss: 'https://ory.example.test',
        sub: 'e2b-user-id',
        email: 'ada@example.test',
      }),
      provider: 'ory',
    })

    expect(result).toBe(false)
  })
})
