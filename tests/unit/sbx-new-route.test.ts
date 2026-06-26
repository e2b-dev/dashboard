import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetAuthContext, mockResolveUserTeam } = vi.hoisted(() => ({
  mockGetAuthContext: vi.fn(),
  mockResolveUserTeam: vi.fn(),
}))

vi.mock('@/core/server/auth', () => ({
  getAuthContext: mockGetAuthContext,
}))

vi.mock('@/core/server/functions/team/resolve-user-team', () => ({
  resolveUserTeam: mockResolveUserTeam,
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: {
    warn: vi.fn(),
  },
  serializeErrorForLog: vi.fn((error) => error),
}))

describe('/sbx/new', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthContext.mockResolvedValue({
      accessToken: 'access-token',
      user: {
        id: 'user-123',
      },
    })
    mockResolveUserTeam.mockResolvedValue({
      id: 'team-123',
      slug: 'team-slug',
    })
  })

  it('redirects template launches to the gated team terminal create flow', async () => {
    const { GET } = await import('@/app/sbx/new/route')

    const response = await GET(
      new NextRequest(
        'https://dashboard.test/sbx/new?template=malicious/base&command=echo+hi'
      )
    )

    expect(response.headers.get('location')).toBe(
      'https://dashboard.test/dashboard/team-slug/terminal?template=malicious%2Fbase&command=echo+hi'
    )
  })
})
