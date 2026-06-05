import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const apiPostMock = vi.hoisted(() => vi.fn())
const listUserTeamsMock = vi.hoisted(() => vi.fn())
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

vi.mock('@/core/modules/teams/user-teams-repository.server', () => ({
  createUserTeamsRepository: vi.fn(() => ({
    listUserTeams: listUserTeamsMock,
  })),
}))

const { bootstrapOryUser, ensureOryUserBootstrapped } = await import(
  '@/core/server/auth/ory/dashboard-bootstrap'
)

describe('dashboard bootstrap for Ory users', () => {
  beforeEach(() => {
    process.env.DASHBOARD_API_ADMIN_TOKEN = 'admin-token'
    apiPostMock.mockReset()
    listUserTeamsMock.mockReset()
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

  it('does not bootstrap after a successful lookup returns any team', async () => {
    listUserTeamsMock.mockResolvedValue({
      ok: true,
      data: [{ id: 'team-1', slug: null, isDefault: true }],
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
    expect(apiPostMock).not.toHaveBeenCalled()
  })

  it('does not bootstrap when the team lookup fails', async () => {
    listUserTeamsMock.mockResolvedValue({
      ok: false,
      error: new Error('dashboard-api unavailable'),
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
    expect(apiPostMock).not.toHaveBeenCalled()
  })

  it('bootstraps only after a successful empty team lookup', async () => {
    listUserTeamsMock.mockResolvedValue({ ok: true, data: [] })
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
    listUserTeamsMock.mockResolvedValue({ ok: true, data: [] })
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
