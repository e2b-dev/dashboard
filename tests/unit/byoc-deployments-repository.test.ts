import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createByocDeploymentsRepository } from '@/core/modules/byoc-deployments/repository.server'

const originalUrl = process.env.BYOC_DEPLOYMENTS_API_URL
const originalToken = process.env.BYOC_DEPLOYMENTS_API_TOKEN
const originalTarget = {
  domainName: process.env.BYOC_DOMAIN_NAME,
  namespace: process.env.BYOC_NAMESPACE,
  prefix: process.env.BYOC_RESOURCE_PREFIX,
  projectId: process.env.BYOC_GCP_PROJECT_ID,
  region: process.env.BYOC_GCP_REGION,
  zone: process.env.BYOC_GCP_ZONE,
}

describe('BYOC deployments repository', () => {
  beforeEach(() => {
    process.env.BYOC_DEPLOYMENTS_API_URL = 'http://localhost:8098'
    process.env.BYOC_DEPLOYMENTS_API_TOKEN = 'test-token'
    process.env.BYOC_GCP_PROJECT_ID = 'test-project'
    process.env.BYOC_GCP_REGION = 'test-region'
    process.env.BYOC_GCP_ZONE = 'test-zone-a'
    process.env.BYOC_NAMESPACE = 'test-namespace'
    process.env.BYOC_DOMAIN_NAME = 'test.example.com'
    process.env.BYOC_RESOURCE_PREFIX = 'test-'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    process.env.BYOC_DEPLOYMENTS_API_URL = originalUrl
    process.env.BYOC_DEPLOYMENTS_API_TOKEN = originalToken
    process.env.BYOC_GCP_PROJECT_ID = originalTarget.projectId
    process.env.BYOC_GCP_REGION = originalTarget.region
    process.env.BYOC_GCP_ZONE = originalTarget.zone
    process.env.BYOC_NAMESPACE = originalTarget.namespace
    process.env.BYOC_DOMAIN_NAME = originalTarget.domainName
    process.env.BYOC_RESOURCE_PREFIX = originalTarget.prefix
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('rejects plaintext requests to the hosted runner', () => {
    process.env.BYOC_DEPLOYMENTS_API_URL =
      'http://e2b-byoc-deployments-h6wbjcn56a-uw.a.run.app'

    expect(() => createByocDeploymentsRepository({ teamId: 'team-a' })).toThrow(
      'runner URL is invalid'
    )
  })

  it('checks deployment ownership before a destructive request', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(
      Response.json({
        id: '11111111-1111-4111-8111-111111111111',
        team_id: 'team-b',
        provider: 'gcp',
        gcp: {
          project_id: 'e2b-dev-matt',
          region: 'us-central1',
          zone: 'us-central1-a',
        },
        domain_name: 'dashboard-byoc-smoke.e2b-test.dev',
        prefix: 'byoc-testing-',
        deployer_service_account: {
          account_id: 'e2b-byoc-deployer',
          email: 'e2b-byoc-deployer@e2b-dev-matt.iam.gserviceaccount.com',
          display_name: 'E2B BYOC deployer',
          project_id: 'e2b-dev-matt',
          status: 'planned',
          roles: [],
        },
        status: 'draft',
        created_at: '2026-07-11T00:00:00Z',
        updated_at: '2026-07-11T00:00:00Z',
      })
    )

    const repository = createByocDeploymentsRepository({ teamId: 'team-a' })
    await expect(
      repository.destroy('11111111-1111-4111-8111-111111111111')
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBeUndefined()
  })

  it('checks cloud connection ownership before listing projects', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(
      Response.json({
        cloud_connections: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            team_id: 'team-b',
            provider: 'gcp',
            mode: 'keyless_impersonation',
            status: 'connected',
            subject_email: 'customer@example.com',
            authorized_projects: [],
            required_project_roles: [],
            created_at: '2026-07-11T00:00:00Z',
            updated_at: '2026-07-11T00:00:00Z',
          },
        ],
      })
    )

    const repository = createByocDeploymentsRepository({ teamId: 'team-a' })
    await expect(
      repository.listProjects('22222222-2222-4222-8222-222222222222')
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
