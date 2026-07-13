import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type CloudConnection,
  type CloudProjectAuthorization,
  createByocDeploymentsRepository,
  type Deployment,
} from '@/core/modules/byoc-deployments/repository.server'

const originalEnv = {
  apiUrl: process.env.BYOC_DEPLOYMENTS_API_URL,
  apiToken: process.env.BYOC_DEPLOYMENTS_API_TOKEN,
  domainName: process.env.BYOC_DOMAIN_NAME,
  e2bPrincipal: process.env.BYOC_E2B_PRINCIPAL,
  e2bPrincipals: process.env.BYOC_E2B_PRINCIPALS,
  region: process.env.BYOC_GCP_REGION,
  sdkDomain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
  zone: process.env.BYOC_GCP_ZONE,
}

const teamId = 'team-a'
const targetKey = 'abc123def456'
const targetStem = `t${targetKey}`
const connectionId = '22222222-2222-4222-8222-222222222222'
const deploymentId = '11111111-1111-4111-8111-111111111111'
const clientRequestId = '33333333-3333-4333-8333-333333333333'
const projectId = 'test-project'
const deployerEmail = `${targetStem}@${projectId}.iam.gserviceaccount.com`
const targetIdentity = {
  team_id: teamId,
  target_key: targetKey,
  provider: 'gcp' as const,
  region: 'test-region',
  zone: 'test-zone-a',
  namespace: targetStem,
  domain_name: `${targetStem}.test.example.com`,
  prefix: `${targetStem}-`,
  deployer_account_id: targetStem,
  e2b_principal: 'serviceAccount:runner@test-control.iam.gserviceaccount.com',
  e2b_principals: [
    'serviceAccount:runner@test-control.iam.gserviceaccount.com',
  ],
}

type RouteHandler = (
  url: URL,
  init: RequestInit
) => Response | Promise<Response>

function requestKey(input: RequestInfo | URL, init?: RequestInit) {
  const url =
    input instanceof Request
      ? new URL(input.url)
      : new URL(input instanceof URL ? input.href : input)
  return {
    key: `${(init?.method ?? 'GET').toUpperCase()} ${url.pathname}`,
    url,
  }
}

function fetchCall(index: number) {
  const call = vi.mocked(fetch).mock.calls[index]
  if (!call) throw new Error(`Missing fetch call at index ${index}`)
  return call
}

function mockRunner({
  identity = {},
  routes = {},
}: {
  identity?: Partial<typeof targetIdentity>
  routes?: Record<string, RouteHandler>
} = {}) {
  vi.mocked(fetch).mockImplementation(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const { key, url } = requestKey(input, init)
      if (key === 'POST /target-identities') {
        return Response.json({ ...targetIdentity, ...identity })
      }

      const handler = routes[key]
      if (!handler) throw new Error(`Unexpected runner request: ${key}`)
      return handler(url, init)
    }
  )
}

function authorization(
  overrides: Partial<CloudProjectAuthorization> = {}
): CloudProjectAuthorization {
  return {
    project_id: projectId,
    name: projectId,
    default_region: 'test-region',
    default_zone: 'test-zone-a',
    namespace: targetStem,
    domain_name: `${targetStem}.test.example.com`,
    prefix: `${targetStem}-`,
    status: 'authorized',
    required_roles: [],
    deployer_account_hint: targetStem,
    ...overrides,
  }
}

function cloudConnection(
  overrides: Partial<CloudConnection> = {}
): CloudConnection {
  return {
    id: connectionId,
    team_id: teamId,
    provider: 'gcp',
    mode: 'keyless_impersonation',
    status: 'connected',
    subject_email: deployerEmail,
    authorized_projects: [authorization()],
    required_project_roles: [],
    created_at: '2026-07-11T00:00:00Z',
    updated_at: '2026-07-11T00:00:00Z',
    ...overrides,
  }
}

function deployment(overrides: Partial<Deployment> = {}): Deployment {
  return {
    id: deploymentId,
    team_id: teamId,
    cloud_connection_id: connectionId,
    cloud_project_id: projectId,
    provider: 'gcp',
    gcp: {
      project_id: projectId,
      region: 'test-region',
      zone: 'test-zone-a',
    },
    domain_name: `${targetStem}.test.example.com`,
    prefix: `${targetStem}-`,
    deployer_service_account: {
      account_id: targetStem,
      email: deployerEmail,
      display_name: 'E2B BYOC deployer',
      project_id: projectId,
      status: 'ready',
      roles: [],
    },
    status: 'draft',
    created_at: '2026-07-11T00:00:00Z',
    updated_at: '2026-07-11T00:00:00Z',
    ...overrides,
  }
}

describe('BYOC deployments repository', () => {
  beforeEach(() => {
    process.env.BYOC_DEPLOYMENTS_API_URL = 'http://localhost:8098'
    process.env.BYOC_DEPLOYMENTS_API_TOKEN = 'test-token'
    process.env.BYOC_DOMAIN_NAME = 'test.example.com'
    process.env.BYOC_E2B_PRINCIPAL =
      'serviceAccount:runner@test-control.iam.gserviceaccount.com'
    process.env.BYOC_GCP_REGION = 'test-region'
    process.env.BYOC_GCP_ZONE = 'test-zone-a'
    process.env.NEXT_PUBLIC_E2B_DOMAIN = 'test.example.com'
    delete process.env.BYOC_E2B_PRINCIPALS
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    process.env.BYOC_DEPLOYMENTS_API_URL = originalEnv.apiUrl
    process.env.BYOC_DEPLOYMENTS_API_TOKEN = originalEnv.apiToken
    process.env.BYOC_DOMAIN_NAME = originalEnv.domainName
    process.env.BYOC_E2B_PRINCIPAL = originalEnv.e2bPrincipal
    process.env.BYOC_E2B_PRINCIPALS = originalEnv.e2bPrincipals
    process.env.BYOC_GCP_REGION = originalEnv.region
    process.env.BYOC_GCP_ZONE = originalEnv.zone
    process.env.NEXT_PUBLIC_E2B_DOMAIN = originalEnv.sdkDomain
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('rejects plaintext requests to a hosted runner', () => {
    process.env.BYOC_DEPLOYMENTS_API_URL =
      'http://e2b-byoc-deployments-h6wbjcn56a-uw.a.run.app'

    expect(() => createByocDeploymentsRepository({ teamId })).toThrow(
      'runner URL is invalid'
    )
  })

  it('maps the persisted target identity and sends required request metadata', async () => {
    mockRunner()

    const target = await createByocDeploymentsRepository({ teamId }).target()

    expect(target).toEqual({
      deployerAccountId: targetStem,
      sdkDomain: 'test.example.com',
      region: 'test-region',
      zone: 'test-zone-a',
      namespace: targetStem,
      domainName: `${targetStem}.test.example.com`,
      prefix: `${targetStem}-`,
      e2bPrincipal:
        'serviceAccount:runner@test-control.iam.gserviceaccount.com',
      e2bPrincipals: [
        'serviceAccount:runner@test-control.iam.gserviceaccount.com',
      ],
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetchCall(0)
    expect(new URL(String(url)).pathname).toBe('/target-identities')
    expect(init).toMatchObject({
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': 'test-token',
      },
    })
    expect(JSON.parse(String(init?.body))).toEqual({
      team_id: teamId,
      provider: 'gcp',
      region: 'test-region',
      zone: 'test-zone-a',
      domain_base: 'test.example.com',
      e2b_principal:
        'serviceAccount:runner@test-control.iam.gserviceaccount.com',
      e2b_principals: [
        'serviceAccount:runner@test-control.iam.gserviceaccount.com',
      ],
    })
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('keeps one stable target for repeated same-team lookups', async () => {
    mockRunner()
    const repository = createByocDeploymentsRepository({ teamId })

    const [first, second] = await Promise.all([
      repository.target(),
      repository.target(),
    ])

    expect(second).toBe(first)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('rejects a target identity returned for another team', async () => {
    mockRunner({
      identity: { team_id: 'team-b', target_key: targetKey },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).target()
    ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
  })

  it('rejects an invalid persisted target key', async () => {
    mockRunner({
      identity: { team_id: teamId, target_key: 'INVALID' },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).target()
    ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
  })

  it('rejects valid JSON with an invalid target shape', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(null))

    await expect(
      createByocDeploymentsRepository({ teamId }).target()
    ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
  })

  it('rejects a non-JSON target response before any cloud write', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('<html>upstream error</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    )

    await expect(
      createByocDeploymentsRepository({ teamId }).createCloudConnection(
        deployerEmail,
        undefined,
        clientRequestId
      )
    ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('reports a stored target configuration conflict', async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ error: 'target identity conflict' }, { status: 409 })
    )

    await expect(
      createByocDeploymentsRepository({ teamId }).target()
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message:
        'The stored BYOC target conflicts with this dashboard configuration.',
    })
  })

  it('sends the persisted target when verifying a cloud connection', async () => {
    mockRunner({
      routes: {
        'POST /cloud-connections': (_url, init) => {
          expect(JSON.parse(String(init.body))).toEqual({
            client_request_id: clientRequestId,
            team_id: teamId,
            provider: 'gcp',
            mode: 'keyless_impersonation',
            subject_email: deployerEmail,
            authorized_projects: [
              {
                project_id: projectId,
                name: projectId,
                default_region: 'test-region',
                default_zone: 'test-zone-a',
                namespace: targetStem,
                domain_name: `${targetStem}.test.example.com`,
                prefix: `${targetStem}-`,
                e2b_principal:
                  'serviceAccount:runner@test-control.iam.gserviceaccount.com',
              },
            ],
          })
          return Response.json(cloudConnection())
        },
      },
    })

    await createByocDeploymentsRepository({
      teamId,
    }).createCloudConnection(deployerEmail, undefined, clientRequestId)

    expect(
      vi
        .mocked(fetch)
        .mock.calls.map(([input, init]) => requestKey(input, init).key)
    ).toEqual(['POST /target-identities', 'POST /cloud-connections'])
  })

  it('maps coded deployer verification failures for initial connections', async () => {
    mockRunner({
      routes: {
        'POST /cloud-connections': () =>
          Response.json(
            {
              code: 'deployer_verification_unavailable',
              error: 'upstream details are not exposed',
            },
            { status: 503 }
          ),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).createCloudConnection(
        deployerEmail,
        undefined,
        clientRequestId
      )
    ).rejects.toMatchObject({
      code: 'BAD_GATEWAY',
      message:
        'E2B cannot use the deployer service account yet. Retrying verification may succeed.',
    })
  })

  it('maps coded deployer verification failures for replacement connections', async () => {
    mockRunner({
      routes: {
        [`GET /deployments/${deploymentId}`]: () => Response.json(deployment()),
        [`POST /deployments/${deploymentId}/cloud-connection`]: (
          _url,
          init
        ) => {
          expect(JSON.parse(String(init.body))).toMatchObject({
            client_request_id: clientRequestId,
            expected_cloud_connection_id: connectionId,
          })
          return Response.json(
            {
              code: 'deployer_verification_unavailable',
              error: 'upstream details are not exposed',
            },
            { status: 503 }
          )
        },
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).createCloudConnection(
        deployerEmail,
        deploymentId,
        clientRequestId
      )
    ).rejects.toMatchObject({
      code: 'BAD_GATEWAY',
      message:
        'E2B cannot use the deployer service account yet. Retrying verification may succeed.',
    })
  })

  it('maps target mismatches without a retryable verification message', async () => {
    mockRunner({
      routes: {
        'POST /cloud-connections': () =>
          Response.json(
            {
              code: 'target_identity_mismatch',
              error: 'upstream details are not exposed',
            },
            { status: 422 }
          ),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).createCloudConnection(
        deployerEmail,
        undefined,
        clientRequestId
      )
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message:
        'The BYOC deployer does not match this team. Refresh the setup and use the generated identity.',
    })
  })

  it('checks connection ownership before reading its projects', async () => {
    mockRunner({
      routes: {
        'GET /cloud-connections': () =>
          Response.json({
            cloud_connections: [cloudConnection({ team_id: 'team-b' })],
          }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).listProjects(connectionId)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(requestKey(...fetchCall(0)).key).toBe('GET /cloud-connections')
  })

  it('checks connection ownership before creating a deployment', async () => {
    mockRunner({
      routes: {
        'GET /cloud-connections': () =>
          Response.json({
            cloud_connections: [cloudConnection({ team_id: 'team-b' })],
          }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).createDeployment(
        connectionId,
        projectId,
        clientRequestId
      )
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(
      vi
        .mocked(fetch)
        .mock.calls.map(([input, init]) => requestKey(input, init).key)
    ).toEqual(['POST /target-identities', 'GET /cloud-connections'])
  })

  it('checks deployment ownership before a destructive request', async () => {
    mockRunner({
      routes: {
        [`GET /deployments/${deploymentId}`]: () =>
          Response.json(deployment({ team_id: 'team-b' })),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).destroy(
        deploymentId,
        clientRequestId
      )
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(
      vi
        .mocked(fetch)
        .mock.calls.map(([input, init]) => requestKey(input, init).key)
    ).toEqual([`GET /deployments/${deploymentId}`, 'POST /target-identities'])
  })

  it('blocks destruction when persisted target metadata does not match', async () => {
    mockRunner({
      routes: {
        [`GET /deployments/${deploymentId}`]: () =>
          Response.json(deployment({ domain_name: 'legacy.test.example.com' })),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).destroy(
        deploymentId,
        clientRequestId
      )
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' })
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(
          ([input, init]) =>
            requestKey(input, init).key ===
            `POST /deployments/${deploymentId}/operations/destroy`
        )
    ).toBe(false)
  })

  it('validates an owned deployment without sending topology', async () => {
    mockRunner({
      routes: {
        [`GET /deployments/${deploymentId}`]: () =>
          Response.json(
            deployment({
              cluster_id: '44444444-4444-4444-8444-444444444444',
              status: 'attached',
            })
          ),
        [`POST /deployments/${deploymentId}/operations/validate`]: (
          _url,
          init
        ) => {
          expect(JSON.parse(String(init.body))).toEqual({
            client_request_id: clientRequestId,
          })
          return Response.json({
            id: '55555555-5555-4555-8555-555555555555',
            deployment_id: deploymentId,
            kind: 'validate',
            status: 'queued',
            client_request_id: clientRequestId,
            created_at: '2026-07-11T00:00:00Z',
            updated_at: '2026-07-11T00:00:00Z',
          })
        },
      },
    })

    const operation = await createByocDeploymentsRepository({
      teamId,
    }).validate(deploymentId, clientRequestId)

    expect(operation.kind).toBe('validate')
    expect(
      vi
        .mocked(fetch)
        .mock.calls.map(([input, init]) => requestKey(input, init).key)
    ).toContain(`POST /deployments/${deploymentId}/operations/validate`)
  })

  it('sends only connection-owned metadata when creating a deployment', async () => {
    mockRunner({
      routes: {
        'GET /cloud-connections': () =>
          Response.json({ cloud_connections: [cloudConnection()] }),
        'POST /deployments': (_url, init) => {
          expect(JSON.parse(String(init.body))).toEqual({
            client_request_id: clientRequestId,
            team_id: teamId,
            cloud_connection_id: connectionId,
            cloud_project_id: projectId,
          })
          return Response.json(deployment())
        },
      },
    })

    await createByocDeploymentsRepository({ teamId }).createDeployment(
      connectionId,
      projectId,
      clientRequestId
    )

    expect(
      vi
        .mocked(fetch)
        .mock.calls.map(([input, init]) => requestKey(input, init).key)
    ).toEqual([
      'POST /target-identities',
      'GET /cloud-connections',
      'POST /deployments',
    ])
  })

  it('maps runner transport failures to a bounded gateway error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('connection reset'))

    await expect(
      createByocDeploymentsRepository({ teamId }).target()
    ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
  })
})
