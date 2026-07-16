import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getTeamIdFromSlug: vi.fn(),
  isEnabled: vi.fn(),
  getPayload: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('not found')
  }),
  redirect: vi.fn(() => {
    throw new Error('redirect')
  }),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}))

vi.mock('@/core/server/auth', () => ({
  getAuthContext: mocks.getAuthContext,
}))

vi.mock('@/core/server/functions/team/get-team-id-from-slug', () => ({
  getTeamIdFromSlug: mocks.getTeamIdFromSlug,
}))

vi.mock('@/core/modules/feature-flags/feature-flags.server', () => ({
  featureFlags: {
    isEnabled: mocks.isEnabled,
    getPayload: mocks.getPayload,
  },
}))

import ConnectionsPage from '@/app/dashboard/[teamSlug]/connections/page'

describe('ConnectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthContext.mockResolvedValue({
      accessToken: 'access-token',
      user: {
        id: 'user-id',
        email: 'user@example.com',
      },
    })
    mocks.getTeamIdFromSlug.mockResolvedValue({
      ok: true,
      data: 'team-id',
    })
  })

  it('does not evaluate the catalog when the page flag is disabled', async () => {
    mocks.isEnabled.mockResolvedValue(false)

    await expect(
      ConnectionsPage({
        params: Promise.resolve({ teamSlug: 'team-slug' }),
      })
    ).rejects.toThrow('not found')

    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it('targets the resolved team ID and renders additional connections', async () => {
    mocks.isEnabled.mockResolvedValue(true)
    mocks.getPayload.mockResolvedValue([
      {
        name: 'Development service',
        template: 'development-template',
        description: 'Development connection',
      },
    ])

    const page = await ConnectionsPage({
      params: Promise.resolve({ teamSlug: 'team-slug' }),
    })
    const featureFlagContext = {
      user: {
        id: 'user-id',
        email: 'user@example.com',
      },
      team: {
        id: 'team-id',
      },
    }

    expect(mocks.isEnabled).toHaveBeenCalledWith(
      'connectionsEnabled',
      featureFlagContext
    )
    expect(mocks.getPayload).toHaveBeenCalledWith(
      'developmentConnections',
      featureFlagContext
    )
    const markup = renderToStaticMarkup(page)

    expect(markup).toContain('Development service')
    expect(markup).toContain(
      'href="/dashboard/team-slug/terminal?template=development-template"'
    )
    expect(markup).toContain('aria-label="Start Development service"')
  })
})
