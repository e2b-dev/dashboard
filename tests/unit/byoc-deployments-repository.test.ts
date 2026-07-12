import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createByocDeploymentsRepository } from '@/core/modules/byoc-deployments/repository.server'

const originalUrl = process.env.BYOC_DEPLOYMENTS_API_URL
const originalToken = process.env.BYOC_DEPLOYMENTS_API_TOKEN
const originalTarget = {
  domainName: process.env.BYOC_DOMAIN_NAME,
  namespace: process.env.BYOC_NAMESPACE,
  prefix: process.env.BYOC_RESOURCE_PREFIX,
  projectId: process.env.BYOC_GCP_PROJECT_ID,
  e2bPrincipal: process.env.BYOC_E2B_PRINCIPAL,
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
    process.env.BYOC_E2B_PRINCIPAL =
      'serviceAccount:runner@test-control.iam.gserviceaccount.com'
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
    process.env.BYOC_E2B_PRINCIPAL = originalTarget.e2bPrincipal
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
      repository.destroy(
        '11111111-1111-4111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      )
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

  it('sends the selected deployer identity and target for verification', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(
      Response.json({
        id: '22222222-2222-4222-8222-222222222222',
        team_id: 'team-a',
        provider: 'gcp',
        mode: 'keyless_impersonation',
        status: 'connected',
        subject_email: 'e2b-byoc-deployer@test-project.iam.gserviceaccount.com',
        authorized_projects: [
          {
            project_id: 'test-project',
            default_region: 'test-region',
            default_zone: 'test-zone-a',
            namespace: 'test-namespace',
          },
        ],
        required_project_roles: [],
        created_at: '2026-07-11T00:00:00Z',
        updated_at: '2026-07-11T00:00:00Z',
      })
    )

    const repository = createByocDeploymentsRepository({ teamId: 'team-a' })
    await repository.createCloudConnection(
      'e2b-byoc-deployer@test-project.iam.gserviceaccount.com'
    )

    const request = fetchMock.mock.calls[0]
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({
      team_id: 'team-a',
      subject_email: 'e2b-byoc-deployer@test-project.iam.gserviceaccount.com',
      authorized_projects: [
        {
          project_id: 'test-project',
          default_region: 'test-region',
          default_zone: 'test-zone-a',
          namespace: 'test-namespace',
          e2b_principal:
            'serviceAccount:runner@test-control.iam.gserviceaccount.com',
        },
      ],
    })
  })

  it('replaces the verified identity on an existing deployment', async () => {
    const deployment = {
      id: '11111111-1111-4111-8111-111111111111',
      team_id: 'team-a',
      provider: 'gcp',
      gcp: {
        project_id: 'test-project',
        region: 'test-region',
        zone: 'test-zone-a',
      },
      domain_name: 'test.example.com',
      prefix: 'test-',
      deployer_service_account: {
        account_id: 'e2b-byoc-deployer',
        email: 'e2b-byoc-deployer@test-project.iam.gserviceaccount.com',
        display_name: 'E2B BYOC deployer',
        project_id: 'test-project',
        status: 'planned',
        roles: [],
      },
      status: 'attached',
      created_at: '2026-07-11T00:00:00Z',
      updated_at: '2026-07-11T00:00:00Z',
    }
    const connection = {
      id: '22222222-2222-4222-8222-222222222222',
      team_id: 'team-a',
      provider: 'gcp' as const,
      mode: 'keyless_impersonation' as const,
      status: 'connected',
      subject_email: 'replacement@test-project.iam.gserviceaccount.com',
      authorized_projects: [
        {
          project_id: 'test-project',
          default_region: 'test-region',
          default_zone: 'test-zone-a',
          namespace: 'test-namespace',
        },
      ],
      required_project_roles: [],
      created_at: '2026-07-11T00:00:00Z',
      updated_at: '2026-07-11T00:00:00Z',
    }
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(Response.json(deployment))
      .mockResolvedValueOnce(Response.json({ connection }))

    const repository = createByocDeploymentsRepository({ teamId: 'team-a' })
    await repository.createCloudConnection(
      connection.subject_email,
      '11111111-1111-4111-8111-111111111111'
    )

    expect(fetchMock.mock.calls[1]?.[0].toString()).toBe(
      'http://localhost:8098/deployments/11111111-1111-4111-8111-111111111111/cloud-connection'
    )
  })

  it('checks deployment ownership before replacing its connection', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(
      Response.json({
        id: '11111111-1111-4111-8111-111111111111',
        team_id: 'team-b',
        provider: 'gcp',
        gcp: {
          project_id: 'test-project',
          region: 'test-region',
          zone: 'test-zone-a',
        },
        domain_name: 'test.example.com',
        prefix: 'test-',
        deployer_service_account: {
          account_id: 'e2b-byoc-deployer',
          email: 'e2b-byoc-deployer@test-project.iam.gserviceaccount.com',
          display_name: 'E2B BYOC deployer',
          project_id: 'test-project',
          status: 'planned',
          roles: [],
        },
        status: 'attached',
        created_at: '2026-07-11T00:00:00Z',
        updated_at: '2026-07-11T00:00:00Z',
      })
    )

    const repository = createByocDeploymentsRepository({ teamId: 'team-a' })
    await expect(
      repository.createCloudConnection(
        'replacement@test-project.iam.gserviceaccount.com',
        '11111111-1111-4111-8111-111111111111'
      )
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('maps runner transport failures to a bounded gateway error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(
      new DOMException('timed out', 'TimeoutError')
    )

    const repository = createByocDeploymentsRepository({ teamId: 'team-a' })
    await expect(repository.health()).rejects.toMatchObject({
      code: 'BAD_GATEWAY',
      message: 'BYOC deployments runner is unavailable.',
    })
  })

  it('queues a topology-only deploy operation', async () => {
    const deployment = {
      id: '11111111-1111-4111-8111-111111111111',
      team_id: 'team-a',
      provider: 'gcp',
      gcp: {
        project_id: 'test-project',
        region: 'test-region',
        zone: 'test-zone-a',
      },
      domain_name: 'test.example.com',
      prefix: 'test-',
      deployer_service_account: {
        account_id: 'e2b-byoc-deployer',
        email: 'e2b-byoc-deployer@test-project.iam.gserviceaccount.com',
        display_name: 'E2B BYOC deployer',
        project_id: 'test-project',
        status: 'planned',
        roles: [],
      },
      status: 'draft',
      created_at: '2026-07-11T00:00:00Z',
      updated_at: '2026-07-11T00:00:00Z',
    }
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(Response.json(deployment))
      .mockResolvedValueOnce(
        Response.json({
          id: '22222222-2222-4222-8222-222222222222',
          deployment_id: deployment.id,
          kind: 'deploy',
          status: 'queued',
          created_at: '2026-07-11T00:00:01Z',
          updated_at: '2026-07-11T00:00:01Z',
        })
      )

    const repository = createByocDeploymentsRepository({ teamId: 'team-a' })
    await repository.deploy(
      deployment.id,
      {
        api_node_count: 3,
        api_machine_type: 'e2-standard-8',
        client_node_count: 5,
        client_machine_type: 'n2-standard-16',
        clickhouse_node_count: 2,
        clickhouse_machine_type: 'n2-standard-8',
      },
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    )

    const request = fetchMock.mock.calls[1]
    expect(request?.[0].toString()).toBe(
      `http://localhost:8098/deployments/${deployment.id}/operations/deploy`
    )
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      client_request_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      api_node_count: 3,
      api_machine_type: 'e2-standard-8',
      client_node_count: 5,
      client_machine_type: 'n2-standard-16',
      clickhouse_node_count: 2,
      clickhouse_machine_type: 'n2-standard-8',
    })
  })
})
