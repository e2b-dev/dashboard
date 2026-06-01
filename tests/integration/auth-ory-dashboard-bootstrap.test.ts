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
    loggerMocks.error.mockClear()
    loggerMocks.warn.mockClear()
    apiPostMock.mockReset()
    listUserTeamsMock.mockReset()
  })

  afterEach(() => {
    process.env.DASHBOARD_API_ADMIN_TOKEN = originalDashboardApiAdminToken
  })

  it('calls dashboard-api bootstrap with Ory user fields', async () => {
    apiPostMock.mockResolvedValue({
      data: { id: 'team-1', slug: 'team-1' },
      error: null,
      response: { ok: true, status: 200, statusText: 'OK' },
    })

    const result = await bootstrapOryUser({
      accessToken: jwt({
        iss: 'https://ory.example.test',
        sub: 'access-token-sub',
        email: 'access-token-user@example.com',
        name: 'Access Token User',
      }),
      provider: 'ory',
    })

    expect(result).toBe(true)
    expect(apiPostMock).toHaveBeenCalledTimes(1)
    expect(apiPostMock).toHaveBeenCalledWith('/admin/users/bootstrap', {
      body: {
        oidc_issuer: 'https://ory.example.test',
        oidc_user_id: 'access-token-sub',
        oidc_user_email: 'access-token-user@example.com',
        oidc_user_name: 'Access Token User',
      },
      headers: { 'X-Admin-Token': 'admin-token' },
    })
    expect(loggerMocks.error).not.toHaveBeenCalled()
  })

  it('falls back to id_token email and name while keeping access-token subject', async () => {
    apiPostMock.mockResolvedValue({
      data: { id: 'team-1', slug: 'team-1' },
      error: null,
      response: { ok: true, status: 200, statusText: 'OK' },
    })

    const result = await bootstrapOryUser({
      accessToken: jwt({
        iss: 'https://ory.example.test',
        sub: 'access-token-sub',
      }),
      idToken: jwt({
        iss: 'https://ory.example.test',
        sub: 'id-token-sub',
        email: 'id-token-user@example.com',
        given_name: 'Id Token User',
      }),
      provider: 'ory',
    })

    expect(result).toBe(true)
    expect(apiPostMock).toHaveBeenCalledWith('/admin/users/bootstrap', {
      body: {
        oidc_issuer: 'https://ory.example.test',
        oidc_user_id: 'access-token-sub',
        oidc_user_email: 'id-token-user@example.com',
        oidc_user_name: 'Id Token User',
      },
      headers: { 'X-Admin-Token': 'admin-token' },
    })
  })

  it('skips the bootstrap call and logs when iss is missing', async () => {
    const result = await bootstrapOryUser({
      accessToken: jwt({
        sub: 'access-token-sub',
        email: 'user@example.com',
      }),
      provider: 'ory',
    })

    expect(result).toBe(false)
    expect(apiPostMock).not.toHaveBeenCalled()
    expect(loggerMocks.error).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'auth_events:bootstrap_user:missing_claims',
        context: expect.objectContaining({
          has_iss: false,
          has_sub: true,
          has_email: true,
        }),
      }),
      expect.stringContaining('missing required bootstrap claims')
    )
  })

  it('logs but does not throw when the bootstrap call returns an api error', async () => {
    apiPostMock.mockResolvedValue({
      data: null,
      error: { status: 503, message: 'dashboard-api unavailable' },
      response: { ok: false, status: 503, statusText: 'Service Unavailable' },
    })

    await expect(
      bootstrapOryUser({
        accessToken: jwt({
          iss: 'https://ory.example.test',
          sub: 'access-token-sub',
          email: 'user@example.com',
          name: 'User',
        }),
        provider: 'ory',
      })
    ).resolves.toBe(false)

    expect(loggerMocks.error).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'auth_events:bootstrap_user:error',
        context: expect.objectContaining({
          provider: 'ory',
          error_status: 503,
        }),
      }),
      expect.stringContaining('dashboard-api unavailable')
    )
  })

  it('logs but does not throw when the repository throws', async () => {
    const failure = new Error('network down')
    apiPostMock.mockRejectedValue(failure)

    await expect(
      bootstrapOryUser({
        accessToken: jwt({
          iss: 'https://ory.example.test',
          sub: 'access-token-sub',
          email: 'user@example.com',
        }),
      })
    ).resolves.toBe(false)

    expect(loggerMocks.error).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'auth_events:bootstrap_user:exception',
        error: failure,
      }),
      expect.stringContaining('threw unexpected exception')
    )
  })

  it('skips dashboard-api bootstrap when the user already resolves to a team', async () => {
    listUserTeamsMock.mockResolvedValue({
      ok: true,
      data: [{ id: 'team-1', slug: 'team-1', isDefault: true }],
    })

    const result = await ensureOryUserBootstrapped({
      accessToken: jwt({
        iss: 'https://ory.example.test',
        sub: 'access-token-sub',
        email: 'user@example.com',
      }),
      provider: 'ory',
    })

    expect(result).toBe(true)
    expect(listUserTeamsMock).toHaveBeenCalledTimes(1)
    expect(apiPostMock).not.toHaveBeenCalled()
  })

  it('bootstraps through dashboard-api when no user team resolves', async () => {
    listUserTeamsMock.mockResolvedValue({ ok: true, data: [] })
    apiPostMock.mockResolvedValue({
      data: { id: 'team-1', slug: 'team-1' },
      error: null,
      response: { ok: true, status: 200, statusText: 'OK' },
    })

    const result = await ensureOryUserBootstrapped({
      accessToken: jwt({
        iss: 'https://ory.example.test',
        sub: 'access-token-sub',
        email: 'user@example.com',
      }),
      provider: 'ory',
    })

    expect(result).toBe(true)
    expect(apiPostMock).toHaveBeenCalledTimes(1)
  })

  it('returns false when no user team resolves and bootstrap fails', async () => {
    listUserTeamsMock.mockResolvedValue({ ok: true, data: [] })
    apiPostMock.mockResolvedValue({
      data: null,
      error: { status: 503, message: 'dashboard-api unavailable' },
      response: { ok: false, status: 503, statusText: 'Service Unavailable' },
    })

    const result = await ensureOryUserBootstrapped({
      accessToken: jwt({
        iss: 'https://ory.example.test',
        sub: 'access-token-sub',
        email: 'user@example.com',
      }),
      provider: 'ory',
    })

    expect(result).toBe(false)
  })
})
