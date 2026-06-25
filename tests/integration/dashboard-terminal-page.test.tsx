import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetAuthContext,
  mockGetDefaultTemplatesCached,
  mockGetTeamTemplates,
  mockListUserTeams,
} = vi.hoisted(() => ({
  mockGetAuthContext: vi.fn(),
  mockGetDefaultTemplatesCached: vi.fn(),
  mockGetTeamTemplates: vi.fn(),
  mockListUserTeams: vi.fn(),
}))

vi.mock('@/core/server/auth', () => ({
  getAuthContext: mockGetAuthContext,
}))

vi.mock('@/core/modules/teams/user-teams-repository.server', () => ({
  createUserTeamsRepository: vi.fn(() => ({
    listUserTeams: mockListUserTeams,
  })),
}))

vi.mock('@/core/modules/templates/repository.server', () => ({
  createDefaultTemplatesRepository: vi.fn(() => ({
    getDefaultTemplatesCached: mockGetDefaultTemplatesCached,
  })),
  createTemplatesRepository: vi.fn(() => ({
    getTeamTemplates: mockGetTeamTemplates,
  })),
}))

vi.mock('@/features/dashboard/terminal/dashboard-terminal', () => ({
  default: ({ launchTarget }: { launchTarget: { template: string } }) => (
    <div data-template={launchTarget.template}>terminal</div>
  ),
}))

import TeamTerminalPage from '@/app/dashboard/[teamSlug]/terminal/page'

describe('team terminal page template launch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthContext.mockResolvedValue({
      accessToken: 'auth-provider-token',
      user: { id: 'user-123' },
    })
    mockListUserTeams.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'active-team-id',
          slug: 'active-team',
        },
        {
          id: 'template-owner-team-id',
          slug: 'template-owner',
        },
      ],
    })
    mockGetDefaultTemplatesCached.mockResolvedValue({
      ok: true,
      data: { templates: [] },
    })
    mockGetTeamTemplates.mockResolvedValue({
      ok: true,
      data: { templates: [] },
    })
  })

  it('lets backend authorize a shared template that is not listed for the active team', async () => {
    const page = await TeamTerminalPage({
      params: Promise.resolve({ teamSlug: 'active-team' }),
      searchParams: Promise.resolve({
        template: 'template-owner/shared-template',
      }),
    })

    const html = renderToStaticMarkup(page)

    expect(html).toContain('data-template="template-owner/shared-template"')
    expect(html).not.toContain('is not available for this account')
  })
})
