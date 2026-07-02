import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetAuthContext, mockResolveUserTeam, mockSandboxCreate } =
  vi.hoisted(() => ({
    mockGetAuthContext: vi.fn(),
    mockResolveUserTeam: vi.fn(),
    mockSandboxCreate: vi.fn(),
  }))

vi.mock('e2b', () => ({
  default: {
    create: mockSandboxCreate,
  },
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
      name: 'Team Name',
      slug: 'team-slug',
    })
    mockSandboxCreate.mockResolvedValue({
      sandboxId: 'sandbox-123',
    })
  })

  it('keeps bare launches on the original sandbox terminal flow', async () => {
    const { GET } = await import('@/app/sbx/new/route')

    const response = await GET(
      new NextRequest('https://dashboard.test/sbx/new')
    )

    expect(mockSandboxCreate).toHaveBeenCalledWith('base', {
      apiUrl: process.env.NEXT_PUBLIC_INFRA_API_URL,
      domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
      apiHeaders: {
        Authorization: 'Bearer access-token',
        'X-Team-ID': 'team-123',
      },
    })
    expect(response.headers.get('location')).toBe(
      'https://dashboard.test/dashboard/team-slug/sandboxes/sandbox-123/terminal?template=base'
    )
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
    expect(mockSandboxCreate).not.toHaveBeenCalled()
  })

  it('redirects command launches to the gated team terminal create flow', async () => {
    const { GET } = await import('@/app/sbx/new/route')

    const response = await GET(
      new NextRequest('https://dashboard.test/sbx/new?command=echo+hi')
    )

    expect(response.headers.get('location')).toBe(
      'https://dashboard.test/dashboard/team-slug/terminal?template=base&command=echo+hi'
    )
    expect(mockSandboxCreate).not.toHaveBeenCalled()
  })
})
