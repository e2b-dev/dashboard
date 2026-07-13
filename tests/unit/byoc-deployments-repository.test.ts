import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createByocDeploymentsRepository } from '@/core/modules/byoc-deployments/repository.server'

const originalUrl = process.env.BYOC_DEPLOYMENTS_API_URL
const originalToken = process.env.BYOC_DEPLOYMENTS_API_TOKEN
const originalSdkDomain = process.env.NEXT_PUBLIC_E2B_DOMAIN
const originalTarget = {
  domainName: process.env.BYOC_DOMAIN_NAME,
  namespace: process.env.BYOC_NAMESPACE,
  prefix: process.env.BYOC_RESOURCE_PREFIX,
  projectId: process.env.BYOC_GCP_PROJECT_ID,
  e2bPrincipal: process.env.BYOC_E2B_PRINCIPAL,
  e2bPrincipals: process.env.BYOC_E2B_PRINCIPALS,
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
    process.env.NEXT_PUBLIC_E2B_DOMAIN = 'test.example.com'
    delete process.env.BYOC_E2B_PRINCIPALS
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
    process.env.BYOC_E2B_PRINCIPALS = originalTarget.e2bPrincipals
    process.env.NEXT_PUBLIC_E2B_DOMAIN = originalSdkDomain
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
        subject_email:
          'e2b-byoc-96c2886c51d1dfb4@test-project.iam.gserviceaccount.com',
        authorized_projects: [
          {
            project_id: 'test-project',
            default_region: 'test-region',
            default_zone: 'test-zone-a',
            namespace: 'test-namespace',
            domain_name: 'test.example.com',
            prefix: 'test-',
          },
        ],
        required_project_roles: [],
        created_at: '2026-07-11T00:00:00Z',
        updated_at: '2026-07-11T00:00:00Z',
      })
    )

    const repository = createByocDeploymentsRepository({ teamId: 'team-a' })
    await repository.createCloudConnection(
      'e2b-byoc-96c2886c51d1dfb4@test-project.iam.gserviceaccount.com',
      undefined,
      '33333333-3333-4333-8333-333333333333'
    )

    const request = fetchMock.mock.calls[0]
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({
      client_request_id: '33333333-3333-4333-8333-333333333333',
      team_id: 'team-a',
      subject_email:
        'e2b-byoc-96c2886c51d1dfb4@test-project.iam.gserviceaccount.com',
      authorized_projects: [
        {
          project_id: 'test-project',
          default_region: 'test-region',
          default_zone: 'test-zone-a',
          namespace: 'test-namespace',
          domain_name: 'test.example.com',
          prefix: 'test-',
          e2b_principal:
            'serviceAccount:runner@test-control.iam.gserviceaccount.com',
        },
      ],
    })
  })

  it('uses the deployer identity project as the authorized project', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(
      Response.json({
        id: '22222222-2222-4222-8222-222222222222',
        team_id: 'team-a',
        provider: 'gcp',
        mode: 'keyless_impersonation',
        status: 'connected',
        subject_email:
          'e2b-byoc-96c2886c51d1dfb4@other-project.iam.gserviceaccount.com',
        authorized_projects: [
          {
            project_id: 'other-project',
            default_region: 'test-region',
            default_zone: 'test-zone-a',
            namespace: 'test-namespace',
            domain_name: 'test.example.com',
            prefix: 'test-',
          },
        ],
        required_project_roles: [],
        created_at: '2026-07-11T00:00:00Z',
        updated_at: '2026-07-11T00:00:00Z',
      })
    )
    const repository = createByocDeploymentsRepository({ teamId: 'team-a' })

    await repository.createCloudConnection(
      'e2b-byoc-96c2886c51d1dfb4@other-project.iam.gserviceaccount.com',
      undefined,
      '33333333-3333-4333-8333-333333333333'
    )

    expect(
      JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
        .authorized_projects[0].project_id
    ).toBe('other-project')
  })

  it('adds runtime principals without replacing the API principal', () => {
    process.env.BYOC_E2B_PRINCIPALS = [
      'serviceAccount:api@test-control.iam.gserviceaccount.com',
      'serviceAccount:worker@test-control.iam.gserviceaccount.com',
    ].join(',')

    const target = createByocDeploymentsRepository({
      teamId: 'team-a',
    }).target()

    expect(target.e2bPrincipals).toEqual([
      'serviceAccount:runner@test-control.iam.gserviceaccount.com',
      'serviceAccount:api@test-control.iam.gserviceaccount.com',
      'serviceAccount:worker@test-control.iam.gserviceaccount.com',
    ])
    expect(target.e2bPrincipal).toBe(
      'serviceAccount:runner@test-control.iam.gserviceaccount.com'
    )
  })

  it('derives the deployer account from the immutable team ID', () => {
    const target = createByocDeploymentsRepository({
      teamId: 'team-a',
    }).target()

    expect(target.deployerAccountId).toBe('e2b-byoc-96c2886c51d1dfb4')
    expect(target.sdkDomain).toBe('test.example.com')
  })

  it('rejects a deployer account assigned to another team', async () => {
    const repository = createByocDeploymentsRepository({ teamId: 'team-a' })

    await expect(
      repository.createCloudConnection(
        'e2b-byoc-deployer@test-project.iam.gserviceaccount.com',
        undefined,
        '33333333-3333-4333-8333-333333333333'
      )
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: 'Use the deployer service account generated for this team.',
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not create a new deployment from a legacy shared connection', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(
      Response.json({
        cloud_connections: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            team_id: 'team-a',
            provider: 'gcp',
            mode: 'keyless_impersonation',
            status: 'connected',
            subject_email:
              'e2b-byoc-deployer@test-project.iam.gserviceaccount.com',
            authorized_projects: [
              {
                project_id: 'test-project',
                default_region: 'test-region',
                default_zone: 'test-zone-a',
                namespace: 'test-namespace',
                domain_name: 'test.example.com',
                prefix: 'test-',
              },
            ],
            required_project_roles: [],
            created_at: '2026-07-11T00:00:00Z',
            updated_at: '2026-07-11T00:00:00Z',
          },
        ],
      })
    )

    const repository = createByocDeploymentsRepository({ teamId: 'team-a' })
    await expect(
      repository.createDeployment(
        '22222222-2222-4222-8222-222222222222',
        'test-project',
        '33333333-3333-4333-8333-333333333333'
      )
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: 'Use the deployer service account generated for this team.',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects deployment projects not authorized by the cloud connection', async () => {
    const connection = {
      id: '22222222-2222-4222-8222-222222222222',
      team_id: 'team-a',
      provider: 'gcp' as const,
      mode: 'keyless_impersonation' as const,
      status: 'connected',
      subject_email:
        'e2b-byoc-96c2886c51d1dfb4@test-project.iam.gserviceaccount.com',
      authorized_projects: [
        {
          project_id: 'test-project',
          default_region: 'test-region',
          default_zone: 'test-zone-a',
          namespace: 'test-namespace',
          domain_name: 'test.example.com',
          prefix: 'test-',
        },
      ],
      required_project_roles: [],
      created_at: '2026-07-11T00:00:00Z',
      updated_at: '2026-07-11T00:00:00Z',
    }
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ cloud_connections: [connection] })
    )

    const repository = createByocDeploymentsRepository({ teamId: 'team-a' })
    await expect(
      repository.createDeployment(
        connection.id,
        'other-project',
        '33333333-3333-4333-8333-333333333333'
      )
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: 'Select a project authorized by this cloud connection.',
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('sends the deployment idempotency key unchanged', async () => {
    const connection = {
      id: '22222222-2222-4222-8222-222222222222',
      team_id: 'team-a',
      provider: 'gcp' as const,
      mode: 'keyless_impersonation' as const,
      status: 'connected',
      subject_email:
        'e2b-byoc-96c2886c51d1dfb4@test-project.iam.gserviceaccount.com',
      authorized_projects: [
        {
          project_id: 'test-project',
          default_region: 'test-region',
          default_zone: 'test-zone-a',
          namespace: 'test-namespace',
          domain_name: 'test.example.com',
          prefix: 'test-',
        },
      ],
      required_project_roles: [],
      created_at: '2026-07-11T00:00:00Z',
      updated_at: '2026-07-11T00:00:00Z',
    }
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(Response.json({ cloud_connections: [connection] }))
      .mockResolvedValueOnce(
        Response.json({
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
            account_id: 'e2b-byoc-96c2886c51d1dfb4',
            email:
              'e2b-byoc-96c2886c51d1dfb4@test-project.iam.gserviceaccount.com',
            display_name: 'E2B BYOC deployer',
            project_id: 'test-project',
            status: 'planned',
            roles: [],
          },
          status: 'draft',
          created_at: '2026-07-11T00:00:00Z',
          updated_at: '2026-07-11T00:00:00Z',
        })
      )

    const repository = createByocDeploymentsRepository({ teamId: 'team-a' })
    await repository.createDeployment(
      connection.id,
      'test-project',
      '33333333-3333-4333-8333-333333333333'
    )

    const requestBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))
    expect(requestBody).toMatchObject({
      client_request_id: '33333333-3333-4333-8333-333333333333',
      cloud_connection_id: connection.id,
      cloud_project_id: 'test-project',
      team_id: 'team-a',
    })
    expect(requestBody).not.toHaveProperty('domain_name')
    expect(requestBody).not.toHaveProperty('prefix')
  })

  it('replaces the verified identity on an existing deployment', async () => {
    const deployment = {
      id: '11111111-1111-4111-8111-111111111111',
      team_id: 'team-a',
      cloud_connection_id: '22222222-2222-4222-8222-222222222222',
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
      subject_email:
        'e2b-byoc-96c2886c51d1dfb4@test-project.iam.gserviceaccount.com',
      authorized_projects: [
        {
          project_id: 'test-project',
          default_region: 'test-region',
          default_zone: 'test-zone-a',
          namespace: 'test-namespace',
          domain_name: 'test.example.com',
          prefix: 'test-',
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
      '11111111-1111-4111-8111-111111111111',
      '33333333-3333-4333-8333-333333333333',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    )

    expect(fetchMock.mock.calls[1]?.[0].toString()).toBe(
      'http://localhost:8098/deployments/11111111-1111-4111-8111-111111111111/cloud-connection'
    )
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))
    ).toMatchObject({
      client_request_id: '33333333-3333-4333-8333-333333333333',
      expected_cloud_connection_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    })
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
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333'
      )
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not replace a deployment without current connection state', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(
      Response.json({
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
      })
    )

    const repository = createByocDeploymentsRepository({ teamId: 'team-a' })
    await expect(
      repository.createCloudConnection(
        'replacement@test-project.iam.gserviceaccount.com',
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333'
      )
    ).rejects.toMatchObject({ code: 'CONFLICT' })
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
