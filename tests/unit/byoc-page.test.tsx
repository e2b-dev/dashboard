import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getPayload: vi.fn(),
  getTeamIdFromSlug: vi.fn(),
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
    getPayload: mocks.getPayload,
  },
}))

import ByocPage from '@/app/dashboard/[teamSlug]/byoc/page'

describe('ByocPage', () => {
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

  it('returns not found when BYOC setup is not configured', async () => {
    mocks.getPayload.mockResolvedValue({ enabled: false })

    await expect(
      ByocPage({
        params: Promise.resolve({ teamSlug: 'team-slug' }),
      })
    ).rejects.toThrow('not found')
  })

  it('targets the resolved team and renders its setup configuration', async () => {
    const config = {
      enabled: true,
      principal:
        'serviceAccount:byoc-deployments-api@example-project.iam.gserviceaccount.com',
      regions: ['us-central1'],
      templates: {
        gcloud: 'gcloud --project={{PROJECT_ID}}',
        terraform: 'project_id = "{{PROJECT_ID}}"',
      },
    }
    mocks.getPayload.mockResolvedValue(config)

    const page = await ByocPage({
      params: Promise.resolve({ teamSlug: 'team-slug' }),
    })

    expect(mocks.getPayload).toHaveBeenCalledWith('byocSetup', {
      user: {
        id: 'user-id',
        email: 'user@example.com',
      },
      team: {
        id: 'team-id',
        slug: 'team-slug',
      },
    })
    expect(page.props.config).toEqual(config)
  })
})
