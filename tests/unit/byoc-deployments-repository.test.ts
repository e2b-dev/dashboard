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
  awsRegions: process.env.BYOC_AWS_REGIONS,
  locations: process.env.BYOC_GCP_LOCATIONS,
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
const operationId = '55555555-5555-4555-8555-555555555555'
const projectId = 'test-project'
const deployerEmail = `${targetStem}@${projectId}.iam.gserviceaccount.com`
const awsAccountId = '899188253580'
const awsRoleArn = `arn:aws:iam::${awsAccountId}:role/${targetStem}`
const targetIdentity = {
  team_id: teamId,
  target_key: targetKey,
  provider: 'gcp' as const,
  region: 'us-test1',
  zone: 'us-test1-a',
  namespace: targetStem,
  domain_name: `${targetStem}.test.example.com`,
  prefix: `${targetStem}-`,
  deployer_account_id: targetStem,
  e2b_principal: 'serviceAccount:runner@test-control.iam.gserviceaccount.com',
  e2b_principals: [
    'serviceAccount:runner@test-control.iam.gserviceaccount.com',
  ],
}

const awsTargetIdentity = {
  ...targetIdentity,
  provider: 'aws' as const,
  region: 'us-east-2',
  zone: undefined,
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
  identity?: Partial<typeof targetIdentity> | Partial<typeof awsTargetIdentity>
  routes?: Record<string, RouteHandler>
} = {}) {
  vi.mocked(fetch).mockImplementation(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const { key, url } = requestKey(input, init)
      if (key === 'POST /target-identities') {
        return Response.json({ ...targetIdentity, ...identity })
      }

      if (key === `GET /target-identities/${teamId}` && !routes[key]) {
        return Response.json(
          { error: 'target identity not found' },
          { status: 404 }
        )
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
    default_region: 'us-test1',
    default_zone: 'us-test1-a',
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

function awsCloudConnection(
  overrides: Partial<CloudConnection> = {}
): CloudConnection {
  return cloudConnection({
    provider: 'aws',
    mode: 'web_identity',
    subject_email: awsRoleArn,
    authorized_projects: [
      authorization({
        project_id: awsAccountId,
        name: awsAccountId,
        default_region: 'us-east-2',
        default_zone: '',
        authorization_model: 'web_identity',
      }),
    ],
    ...overrides,
  })
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
      region: 'us-test1',
      zone: 'us-test1-a',
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

function awsDeployment(overrides: Partial<Deployment> = {}): Deployment {
  return deployment({
    cloud_project_id: awsAccountId,
    provider: 'aws',
    gcp: { project_id: '', region: '', zone: '' },
    aws: {
      account_id: awsAccountId,
      region: 'us-east-2',
      role_arn: awsRoleArn,
    },
    deployer_service_account: {
      account_id: '',
      email: '',
      display_name: '',
      project_id: '',
      status: '',
      roles: [],
    },
    ...overrides,
  })
}

describe('BYOC deployments repository', () => {
  beforeEach(() => {
    process.env.BYOC_DEPLOYMENTS_API_URL = 'http://localhost:8098'
    process.env.BYOC_DEPLOYMENTS_API_TOKEN = 'test-token'
    process.env.BYOC_DOMAIN_NAME = 'test.example.com'
    process.env.BYOC_E2B_PRINCIPAL =
      'serviceAccount:runner@test-control.iam.gserviceaccount.com'
    process.env.BYOC_GCP_REGION = 'us-test1'
    process.env.BYOC_GCP_ZONE = 'us-test1-a'
    delete process.env.BYOC_GCP_LOCATIONS
    delete process.env.BYOC_AWS_REGIONS
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
    process.env.BYOC_AWS_REGIONS = originalEnv.awsRegions
    process.env.BYOC_GCP_LOCATIONS = originalEnv.locations
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

    const target = await createByocDeploymentsRepository({ teamId }).target({
      region: 'us-test1',
      zone: 'us-test1-a',
    })

    expect(target).toEqual({
      targetKey,
      deployerAccountId: targetStem,
      sdkDomain: 'test.example.com',
      region: 'us-test1',
      zone: 'us-test1-a',
      namespace: targetStem,
      domainName: `${targetStem}.test.example.com`,
      prefix: `${targetStem}-`,
      provider: 'gcp',
      e2bPrincipal:
        'serviceAccount:runner@test-control.iam.gserviceaccount.com',
      e2bPrincipals: [
        'serviceAccount:runner@test-control.iam.gserviceaccount.com',
      ],
    })
    expect(fetch).toHaveBeenCalledTimes(2)
    const [url, init] = fetchCall(1)
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
      region: 'us-test1',
      zone: 'us-test1-a',
      domain_base: 'test.example.com',
      e2b_principal:
        'serviceAccount:runner@test-control.iam.gserviceaccount.com',
      e2b_principals: [
        'serviceAccount:runner@test-control.iam.gserviceaccount.com',
      ],
    })
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('keeps the legacy target caller on the configured default location', async () => {
    mockRunner()

    const target = await createByocDeploymentsRepository({ teamId }).target()

    expect(target).toMatchObject({
      region: 'us-test1',
      zone: 'us-test1-a',
    })
    expect(JSON.parse(String(fetchCall(1)[1]?.body))).toMatchObject({
      region: 'us-test1',
      zone: 'us-test1-a',
    })
  })

  it('keeps legacy target callers on an existing non-default allocation', async () => {
    process.env.BYOC_GCP_LOCATIONS = JSON.stringify([
      { region: 'us-default1', zone: 'us-default1-a' },
      { region: 'us-test1', zone: 'us-test1-a' },
    ])
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(targetIdentity),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).target()
    ).resolves.toMatchObject({
      region: 'us-test1',
      zone: 'us-test1-a',
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('keeps one stable target for repeated same-team lookups', async () => {
    mockRunner()
    const repository = createByocDeploymentsRepository({ teamId })

    const [first, second] = await Promise.all([
      repository.target({ region: 'us-test1', zone: 'us-test1-a' }),
      repository.target({ region: 'us-test1', zone: 'us-test1-a' }),
    ])

    expect(second).toBe(first)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('returns configured suggested locations without allocating a target', () => {
    process.env.BYOC_GCP_LOCATIONS = JSON.stringify([
      { region: 'us-central1', zone: 'us-central1-a' },
      { region: 'us-east4', zone: 'us-east4-a' },
      { region: 'us-central1', zone: 'us-central1-a' },
    ])

    const locations = createByocDeploymentsRepository({ teamId }).locations()

    expect(locations).toEqual([
      { provider: 'gcp', region: 'us-central1', zone: 'us-central1-a' },
      { provider: 'gcp', region: 'us-east4', zone: 'us-east4-a' },
    ])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('adds configured AWS regions to the provider-discriminated locations', () => {
    process.env.BYOC_AWS_REGIONS = JSON.stringify([
      'us-east-2',
      'eu-west-1',
      'us-east-2',
    ])

    expect(createByocDeploymentsRepository({ teamId }).locations()).toEqual([
      { provider: 'gcp', region: 'us-test1', zone: 'us-test1-a' },
      { provider: 'aws', region: 'us-east-2' },
      { provider: 'aws', region: 'eu-west-1' },
    ])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('accepts comma-separated AWS region configuration', () => {
    process.env.BYOC_AWS_REGIONS = 'us-east-2, eu-central-1'

    expect(createByocDeploymentsRepository({ teamId }).locations()).toEqual([
      { provider: 'gcp', region: 'us-test1', zone: 'us-test1-a' },
      { provider: 'aws', region: 'us-east-2' },
      { provider: 'aws', region: 'eu-central-1' },
    ])
  })

  it('rejects malformed AWS region configuration', () => {
    process.env.BYOC_AWS_REGIONS = '["us-east-2", "not-a-region"]'

    expect(() =>
      createByocDeploymentsRepository({ teamId }).locations()
    ).toThrow('BYOC_AWS_REGIONS is not configured correctly.')
  })

  it('allocates AWS targets with a provider and no zone', async () => {
    mockRunner({ identity: awsTargetIdentity })

    const target = await createByocDeploymentsRepository({ teamId }).target({
      provider: 'aws',
      region: 'us-east-2',
    })

    expect(target).toMatchObject({
      provider: 'aws',
      region: 'us-east-2',
      deployerAccountId: targetStem,
    })
    expect(target).not.toHaveProperty('zone')
    expect(JSON.parse(String(fetchCall(1)[1]?.body))).toEqual({
      team_id: teamId,
      provider: 'aws',
      region: 'us-east-2',
      domain_base: 'test.example.com',
      e2b_principal:
        'serviceAccount:runner@test-control.iam.gserviceaccount.com',
      e2b_principals: [
        'serviceAccount:runner@test-control.iam.gserviceaccount.com',
      ],
    })
  })

  it('rejects an allocated target whose stored provider does not match', async () => {
    mockRunner({ identity: targetIdentity })

    await expect(
      createByocDeploymentsRepository({ teamId }).target({
        provider: 'aws',
        region: 'us-east-2',
      })
    ).rejects.toThrow(
      'The stored BYOC target does not match this dashboard configuration.'
    )
  })

  it('does not allow a team to allocate a second provider', async () => {
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(targetIdentity),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).target({
        provider: 'aws',
        region: 'us-east-2',
      })
    ).rejects.toThrow('already has a different BYOC location reserved')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('loads an allocated target without mutating it', async () => {
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(targetIdentity),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).allocatedTarget()
    ).resolves.toMatchObject({
      deployerAccountId: targetStem,
      region: 'us-test1',
      zone: 'us-test1-a',
    })
    expect(requestKey(...fetchCall(0)).key).toBe(
      `GET /target-identities/${teamId}`
    )
  })

  it('loads the backend-owned post-allocation view', async () => {
    mockRunner({
      routes: {
        [`GET /teams/${teamId}/view`]: () =>
          Response.json({
            version: 2,
            phase: 'cloud_access',
            status: 'action_required',
            title: 'Connect your cloud account',
            description: 'Create the generated identity.',
            deployment_id: deploymentId,
            target: targetIdentity,
            steps: [
              { id: 'cloud_access', label: 'Cloud access', status: 'current' },
            ],
            actions: [
              {
                id: 'retry_operation',
                label: 'Retry deployment',
                kind: 'primary',
                enabled: true,
                operation_id: operationId,
              },
            ],
            updated_at: '2026-07-11T00:00:00Z',
          }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).teamView(targetKey)
    ).resolves.toMatchObject({
      version: 2,
      phase: 'cloud_access',
      deployment_id: deploymentId,
      target: { team_id: teamId },
      actions: [{ id: 'retry_operation', operation_id: operationId }],
    })
  })

  it('rejects a backend view for another team', async () => {
    mockRunner({
      routes: {
        [`GET /teams/${teamId}/view`]: () =>
          Response.json({
            version: 1,
            target: { ...targetIdentity, team_id: 'team-b' },
          }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).teamView(targetKey)
    ).rejects.toThrow('BYOC deployments runner returned an invalid team view.')
  })

  it('rejects a backend view for a previous target allocation', async () => {
    mockRunner({
      routes: {
        [`GET /teams/${teamId}/view`]: () =>
          Response.json({
            version: 1,
            phase: 'cloud_access',
            status: 'action_required',
            title: 'Connect your cloud account',
            description: 'Create the generated identity.',
            target: { ...targetIdentity, target_key: 'old123target' },
            steps: [],
            updated_at: '2026-07-11T00:00:00Z',
          }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).teamView(targetKey)
    ).rejects.toThrow('BYOC deployments runner returned an invalid team view.')
  })

  it('returns no allocated target for a new team', async () => {
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(
            { error: 'target identity not found' },
            { status: 404 }
          ),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).allocatedTarget()
    ).resolves.toBeNull()
  })

  it('resets an allocated target with the team-scoped runner route', async () => {
    mockRunner({
      routes: {
        [`DELETE /target-identities/${teamId}`]: (_url, init) => {
          expect(init.method).toBe('DELETE')
          expect(JSON.parse(String(init.body))).toEqual({
            expected_target_key: targetKey,
          })
          return Response.json({ reset: true })
        },
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).resetTarget(targetKey)
    ).resolves.toEqual({ reset: true })
    expect(requestKey(...fetchCall(0)).key).toBe(
      `DELETE /target-identities/${teamId}`
    )
  })

  it('loads versioned bootstrap artifacts for the current target', async () => {
    mockRunner({
      routes: {
        [`POST /target-identities/${teamId}/bootstrap`]: (_url, init) => {
          expect(JSON.parse(String(init.body))).toEqual({
            expected_target_key: targetKey,
            cloud_account_id: projectId,
          })
          return Response.json({
            schema_version: 'v1',
            provider: 'gcp',
            target_key: targetKey,
            cloud_account_id: projectId,
            artifacts: [
              {
                id: 'gcloud',
                label: 'gcloud',
                language: 'bash',
                filename: 'bootstrap.sh',
                content: 'gcloud services enable iam.googleapis.com',
              },
            ],
          })
        },
      },
    })

    const bundle = await createByocDeploymentsRepository({
      teamId,
    }).bootstrapBundle(targetKey, 'gcp', projectId)

    expect(bundle.schema_version).toBe('v1')
    expect(bundle.target_key).toBe(targetKey)
    expect(bundle.artifacts[0]?.id).toBe('gcloud')
  })

  it('rejects bootstrap artifacts for another target', async () => {
    mockRunner({
      routes: {
        [`POST /target-identities/${teamId}/bootstrap`]: () =>
          Response.json({
            schema_version: 'v1',
            provider: 'gcp',
            target_key: 'zzz123def456',
            cloud_account_id: projectId,
            artifacts: [
              {
                id: 'terraform',
                label: 'Terraform',
                language: 'hcl',
                content: 'terraform {}',
              },
            ],
          }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).bootstrapBundle(
        targetKey,
        'gcp',
        projectId
      )
    ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
  })

  it('rejects bootstrap artifacts for another provider', async () => {
    mockRunner({
      routes: {
        [`POST /target-identities/${teamId}/bootstrap`]: () =>
          Response.json({
            schema_version: 'v1',
            provider: 'aws',
            target_key: targetKey,
            cloud_account_id: projectId,
            artifacts: [
              {
                id: 'commands',
                label: 'Commands',
                language: 'bash',
                content: 'aws sts get-caller-identity',
              },
            ],
          }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).bootstrapBundle(
        targetKey,
        'gcp',
        projectId
      )
    ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
  })

  it('rejects bootstrap artifacts for another cloud account', async () => {
    mockRunner({
      routes: {
        [`POST /target-identities/${teamId}/bootstrap`]: () =>
          Response.json({
            schema_version: 'v1',
            provider: 'gcp',
            target_key: targetKey,
            cloud_account_id: 'another-project-1',
            artifacts: [
              {
                id: 'gcloud',
                label: 'gcloud',
                language: 'bash',
                content: 'gcloud services enable iam.googleapis.com',
              },
            ],
          }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).bootstrapBundle(
        targetKey,
        'gcp',
        projectId
      )
    ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
  })

  it('rejects duplicate bootstrap artifact IDs', async () => {
    mockRunner({
      routes: {
        [`POST /target-identities/${teamId}/bootstrap`]: () =>
          Response.json({
            schema_version: 'v1',
            provider: 'gcp',
            target_key: targetKey,
            cloud_account_id: projectId,
            artifacts: [
              {
                id: 'terraform',
                label: 'Terraform',
                language: 'hcl',
                content: 'terraform {}',
              },
              {
                id: 'terraform',
                label: 'Duplicate',
                language: 'hcl',
                content: 'terraform {}',
              },
            ],
          }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).bootstrapBundle(
        targetKey,
        'gcp',
        projectId
      )
    ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
  })

  it.each([
    {
      schema_version: 'v2',
      artifacts: [
        { id: 'gcloud', label: 'gcloud', language: 'bash', content: 'echo ok' },
      ],
    },
    { schema_version: 'v1', artifacts: [] },
  ])('rejects malformed bootstrap bundle %#', async ({
    schema_version,
    artifacts,
  }) => {
    mockRunner({
      routes: {
        [`POST /target-identities/${teamId}/bootstrap`]: () =>
          Response.json({
            schema_version,
            provider: 'gcp',
            target_key: targetKey,
            cloud_account_id: projectId,
            artifacts,
          }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).bootstrapBundle(
        targetKey,
        'gcp',
        projectId
      )
    ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
  })

  it('rejects an invalid target reset response', async () => {
    mockRunner({
      routes: {
        [`DELETE /target-identities/${teamId}`]: () =>
          Response.json({ ok: true }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).resetTarget(targetKey)
    ).rejects.toThrow('invalid reset response')
  })

  it('accepts an idempotent target reset response', async () => {
    mockRunner({
      routes: {
        [`DELETE /target-identities/${teamId}`]: () =>
          Response.json({ reset: false }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).resetTarget(targetKey)
    ).resolves.toEqual({ reset: false })
  })

  it('maps a locked target reset without treating it as success', async () => {
    mockRunner({
      routes: {
        [`DELETE /target-identities/${teamId}`]: () =>
          Response.json(
            { code: 'target_identity_locked', error: 'internal details' },
            { status: 409 }
          ),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).resetTarget(targetKey)
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message:
        'The BYOC cloud and location cannot change after a cloud connection or deployment exists.',
    })
  })

  it('updates an allocated location with compare-and-swap metadata', async () => {
    process.env.BYOC_GCP_LOCATIONS = JSON.stringify([
      { region: 'us-test1', zone: 'us-test1-a' },
      { region: 'europe-west1', zone: 'europe-west1-b' },
    ])
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(targetIdentity),
        [`PATCH /target-identities/${teamId}/location`]: () =>
          Response.json({
            ...targetIdentity,
            region: 'europe-west1',
            zone: 'europe-west1-b',
          }),
      },
    })

    const updated = await createByocDeploymentsRepository({
      teamId,
    }).updateTargetLocation(
      { region: 'us-test1', zone: 'us-test1-a' },
      { region: 'europe-west1', zone: 'europe-west1-b' }
    )

    expect(updated).toMatchObject({
      deployerAccountId: targetStem,
      namespace: targetStem,
      domainName: `${targetStem}.test.example.com`,
      region: 'europe-west1',
      zone: 'europe-west1-b',
    })
    const [url, init] = fetchCall(1)
    expect(requestKey(url, init).key).toBe(
      `PATCH /target-identities/${teamId}/location`
    )
    expect(JSON.parse(String(init?.body))).toEqual({
      expected_region: 'us-test1',
      expected_zone: 'us-test1-a',
      region: 'europe-west1',
      zone: 'europe-west1-b',
    })
  })

  it('keeps the allocated provider immutable during location updates', async () => {
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(targetIdentity),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).updateTargetLocation(
        { provider: 'gcp', region: 'us-test1', zone: 'us-test1-a' },
        { provider: 'aws', region: 'us-east-2' }
      )
    ).rejects.toThrow('cloud provider cannot change after allocation')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('updates an AWS region without sending zone fields', async () => {
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(awsTargetIdentity),
        [`PATCH /target-identities/${teamId}/location`]: (_url, init) => {
          expect(JSON.parse(String(init.body))).toEqual({
            expected_region: 'us-east-2',
            region: 'eu-west-1',
          })
          return Response.json({
            ...awsTargetIdentity,
            region: 'eu-west-1',
          })
        },
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).updateTargetLocation(
        { provider: 'aws', region: 'us-east-2' },
        { provider: 'aws', region: 'eu-west-1' }
      )
    ).resolves.toMatchObject({ provider: 'aws', region: 'eu-west-1' })
  })

  it('rejects a location response that changes the stable target identity', async () => {
    process.env.BYOC_GCP_LOCATIONS = JSON.stringify([
      { region: 'us-test1', zone: 'us-test1-a' },
      { region: 'europe-west1', zone: 'europe-west1-b' },
    ])
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(targetIdentity),
        [`PATCH /target-identities/${teamId}/location`]: () =>
          Response.json({
            ...targetIdentity,
            region: 'europe-west1',
            zone: 'europe-west1-b',
            e2b_principal:
              'serviceAccount:other@test-control.iam.gserviceaccount.com',
            e2b_principals: [
              'serviceAccount:other@test-control.iam.gserviceaccount.com',
            ],
          }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).updateTargetLocation(
        { region: 'us-test1', zone: 'us-test1-a' },
        { region: 'europe-west1', zone: 'europe-west1-b' }
      )
    ).rejects.toThrow('changed the stable target identity')
  })

  it.each([
    [
      'target_identity_changed',
      'The BYOC location changed since this page loaded. Refresh before retrying.',
    ],
    [
      'target_identity_locked',
      'The BYOC cloud and location cannot change after a cloud connection or deployment exists.',
    ],
  ])('maps %s location conflicts', async (code, message) => {
    process.env.BYOC_GCP_LOCATIONS = JSON.stringify([
      { region: 'us-test1', zone: 'us-test1-a' },
      { region: 'europe-west1', zone: 'europe-west1-b' },
    ])
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(targetIdentity),
        [`PATCH /target-identities/${teamId}/location`]: () =>
          Response.json({ code, error: 'internal details' }, { status: 409 }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).updateTargetLocation(
        { region: 'us-test1', zone: 'us-test1-a' },
        { region: 'europe-west1', zone: 'europe-west1-b' }
      )
    ).rejects.toMatchObject({ code: 'CONFLICT', message })
  })

  it('accepts a valid location outside the configured suggestions', async () => {
    process.env.BYOC_GCP_LOCATIONS = JSON.stringify([
      { region: 'us-central1', zone: 'us-central1-a' },
    ])
    mockRunner({
      identity: {
        region: 'us-east4',
        zone: 'us-east4-a',
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).target({
        region: 'us-east4',
        zone: 'us-east4-a',
      })
    ).resolves.toMatchObject({ region: 'us-east4', zone: 'us-east4-a' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('rejects a zone from another region', async () => {
    mockRunner()

    await expect(
      createByocDeploymentsRepository({ teamId }).target({
        region: 'us-east4',
        zone: 'europe-west1-b',
      })
    ).rejects.toThrow('Select a valid GCP region and matching zone.')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('does not allocate a target while listing a new team', async () => {
    mockRunner({
      routes: {
        'GET /deployments': () => Response.json({ deployments: [] }),
      },
    })

    const deployments = await createByocDeploymentsRepository({
      teamId,
    }).listDeployments()

    expect(deployments).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(requestKey(...fetchCall(0)).key).toBe('GET /deployments')
  })

  it('keeps retired locations visible and destroyable', async () => {
    process.env.BYOC_GCP_LOCATIONS = JSON.stringify([
      { region: 'europe-test1', zone: 'europe-test1-a' },
    ])
    const retiredDeployment = deployment()
    mockRunner({
      routes: {
        'GET /deployments': () =>
          Response.json({ deployments: [retiredDeployment] }),
        [`GET /deployments/${deploymentId}`]: () =>
          Response.json(retiredDeployment),
        [`POST /deployments/${deploymentId}/operations/destroy`]: () =>
          Response.json({
            id: clientRequestId,
            deployment_id: deploymentId,
            kind: 'destroy',
            status: 'queued',
            client_request_id: clientRequestId,
            created_at: '2026-07-11T00:00:00Z',
            updated_at: '2026-07-11T00:00:00Z',
          }),
      },
    })

    const repository = createByocDeploymentsRepository({ teamId })

    expect(await repository.listDeployments()).toHaveLength(1)
    await expect(
      repository.destroy(deploymentId, clientRequestId)
    ).resolves.toMatchObject({ kind: 'destroy', status: 'queued' })
    expect(
      vi
        .mocked(fetch)
        .mock.calls.map(([input, init]) => requestKey(input, init).key)
    ).toEqual([
      'GET /deployments',
      `GET /deployments/${deploymentId}`,
      `POST /deployments/${deploymentId}/operations/destroy`,
    ])
  })

  it('revalidates existing deployments and sanitizes backend metadata', async () => {
    mockRunner({
      routes: {
        'GET /deployments': () =>
          Response.json({
            deployments: [
              {
                ...deployment({
                  terraform_plan_text:
                    'Plan: 2 to add, 0 to change, 0 to destroy.',
                  terraform_settings: {
                    api_node_count: 1,
                    internal_state: 'never-expose',
                  } as Deployment['terraform_settings'],
                }),
                terraform_backend_configs: [
                  'bucket=customer-state',
                  'prefix=deployments/team-a',
                  'credentials=/tmp/never-expose.json',
                ],
                terraform_backend: { credentials: 'never-expose' },
                internal_state: 'never-expose',
              },
            ],
          }),
      },
    })

    const deployments = await createByocDeploymentsRepository({
      teamId,
    }).listDeployments()

    expect(deployments).toHaveLength(1)
    expect(deployments[0]).toMatchObject({
      terraform_plan_text: 'Plan: 2 to add, 0 to change, 0 to destroy.',
      terraform_backend: {
        bucket: 'customer-state',
        prefix: 'deployments/team-a',
      },
    })
    expect(deployments[0]).not.toHaveProperty('terraform_backend_configs')
    expect(deployments[0]).not.toHaveProperty('terraform_backend.credentials')
    expect(deployments[0]).not.toHaveProperty('internal_state')
    expect(deployments[0]).not.toHaveProperty(
      'terraform_settings.internal_state'
    )
    expect(
      vi
        .mocked(fetch)
        .mock.calls.map(([input, init]) => requestKey(input, init).key)
    ).toEqual(['GET /deployments'])
  })

  it('rejects a target identity returned for another team', async () => {
    mockRunner({
      identity: { team_id: 'team-b', target_key: targetKey },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).target({
        region: 'us-test1',
        zone: 'us-test1-a',
      })
    ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
  })

  it('rejects an invalid persisted target key', async () => {
    mockRunner({
      identity: { team_id: teamId, target_key: 'INVALID' },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).target({
        region: 'us-test1',
        zone: 'us-test1-a',
      })
    ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
  })

  it('rejects valid JSON with an invalid target shape', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(null))

    await expect(
      createByocDeploymentsRepository({ teamId }).target({
        region: 'us-test1',
        zone: 'us-test1-a',
      })
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
        clientRequestId,
        undefined,
        { region: 'us-test1', zone: 'us-test1-a' }
      )
    ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('keeps legacy cloud-connection callers on the default location', async () => {
    mockRunner({
      routes: {
        'POST /cloud-connections': (_url, init) => {
          expect(JSON.parse(String(init.body))).toMatchObject({
            authorized_projects: [
              {
                default_region: 'us-test1',
                default_zone: 'us-test1-a',
              },
            ],
          })
          return Response.json(cloudConnection())
        },
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).createCloudConnection(
        deployerEmail,
        undefined,
        clientRequestId
      )
    ).resolves.toMatchObject({ id: connectionId })
  })

  it('creates AWS web identity connections from an IAM role ARN', async () => {
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(awsTargetIdentity),
        'POST /cloud-connections': (_url, init) => {
          expect(JSON.parse(String(init.body))).toEqual({
            client_request_id: clientRequestId,
            team_id: teamId,
            provider: 'aws',
            mode: 'web_identity',
            subject_email: awsRoleArn,
            authorized_projects: [
              {
                project_id: awsAccountId,
                name: awsAccountId,
                default_region: 'us-east-2',
                default_zone: '',
                namespace: targetStem,
                domain_name: `${targetStem}.test.example.com`,
                prefix: `${targetStem}-`,
                e2b_principal:
                  'serviceAccount:runner@test-control.iam.gserviceaccount.com',
              },
            ],
          })
          return Response.json(awsCloudConnection())
        },
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).createCloudConnection(
        awsRoleArn,
        undefined,
        clientRequestId,
        undefined,
        { provider: 'aws', region: 'us-east-2' }
      )
    ).resolves.toMatchObject({
      provider: 'aws',
      mode: 'web_identity',
      subject_email: awsRoleArn,
    })
  })

  it('rejects AWS roles that do not use the allocated team role name', async () => {
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(awsTargetIdentity),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).createCloudConnection(
        `arn:aws:iam::${awsAccountId}:role/another-team`,
        undefined,
        clientRequestId,
        undefined,
        { provider: 'aws', region: 'us-east-2' }
      )
    ).rejects.toThrow('Use the deployer IAM role generated for this team.')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('grandfathers a retired allocated location through connection setup', async () => {
    process.env.BYOC_GCP_LOCATIONS = JSON.stringify([
      { region: 'europe-test1', zone: 'europe-test1-a' },
    ])
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(targetIdentity),
        'POST /cloud-connections': (_url, init) => {
          expect(JSON.parse(String(init.body))).toMatchObject({
            authorized_projects: [
              {
                default_region: 'us-test1',
                default_zone: 'us-test1-a',
              },
            ],
          })
          return Response.json(cloudConnection())
        },
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).createCloudConnection(
        deployerEmail,
        undefined,
        clientRequestId
      )
    ).resolves.toMatchObject({ id: connectionId })
  })

  it('keeps a connection visible after its allocated location is retired', async () => {
    process.env.BYOC_GCP_LOCATIONS = JSON.stringify([
      { region: 'europe-test1', zone: 'europe-test1-a' },
    ])
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(targetIdentity),
        'GET /cloud-connections': () =>
          Response.json({ cloud_connections: [cloudConnection()] }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).listCloudConnections()
    ).resolves.toEqual([expect.objectContaining({ id: connectionId })])
  })

  it('lists only AWS connections and projects matching the allocated target', async () => {
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(awsTargetIdentity),
        'GET /cloud-connections': () =>
          Response.json({
            cloud_connections: [
              awsCloudConnection(),
              awsCloudConnection({
                id: '44444444-4444-4444-8444-444444444444',
                subject_email: `arn:aws:iam::${awsAccountId}:role/wrong-role`,
              }),
            ],
          }),
        [`GET /cloud-connections/${connectionId}/projects`]: () =>
          Response.json({
            projects: [
              {
                id: awsAccountId,
                name: awsAccountId,
                provider: 'aws',
                default_region: 'us-east-2',
                default_zone: '',
                namespace: targetStem,
                domain_name: `${targetStem}.test.example.com`,
                prefix: `${targetStem}-`,
                authorization_status: 'authorized',
                required_roles: [],
                mock: false,
                ready_for_smokes: true,
              },
              {
                id: '111111111111',
                name: 'wrong-region',
                provider: 'aws',
                default_region: 'us-west-2',
                default_zone: '',
                namespace: targetStem,
                domain_name: `${targetStem}.test.example.com`,
                prefix: `${targetStem}-`,
                authorization_status: 'authorized',
                required_roles: [],
                mock: false,
                ready_for_smokes: true,
              },
            ],
          }),
      },
    })

    const repository = createByocDeploymentsRepository({ teamId })
    await expect(repository.listCloudConnections()).resolves.toEqual([
      expect.objectContaining({ id: connectionId, provider: 'aws' }),
    ])
    await expect(repository.listProjects(connectionId)).resolves.toEqual([
      expect.objectContaining({ id: awsAccountId, provider: 'aws' }),
    ])
  })

  it('creates an AWS deployment from connection-owned account metadata', async () => {
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(awsTargetIdentity),
        'GET /cloud-connections': () =>
          Response.json({ cloud_connections: [awsCloudConnection()] }),
        'POST /deployments': (_url, init) => {
          expect(JSON.parse(String(init.body))).toEqual({
            client_request_id: clientRequestId,
            team_id: teamId,
            cloud_connection_id: connectionId,
            cloud_project_id: awsAccountId,
          })
          return Response.json(awsDeployment())
        },
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).createDeployment(
        connectionId,
        awsAccountId,
        clientRequestId
      )
    ).resolves.toMatchObject({
      provider: 'aws',
      aws: { account_id: awsAccountId, region: 'us-east-2' },
    })
  })

  it('uses a connection after its allocated location is retired', async () => {
    process.env.BYOC_GCP_LOCATIONS = JSON.stringify([
      { region: 'europe-test1', zone: 'europe-test1-a' },
    ])
    mockRunner({
      routes: {
        [`GET /target-identities/${teamId}`]: () =>
          Response.json(targetIdentity),
        'GET /cloud-connections': () =>
          Response.json({ cloud_connections: [cloudConnection()] }),
        'POST /deployments': () => Response.json(deployment()),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).createDeployment(
        connectionId,
        projectId,
        clientRequestId
      )
    ).resolves.toMatchObject({ id: deploymentId })
  })

  it('reports a stored target configuration conflict', async () => {
    mockRunner()
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve(
        Response.json({ error: 'target identity not found' }, { status: 404 })
      )
    )
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve(
        Response.json({ error: 'target identity conflict' }, { status: 409 })
      )
    )

    await expect(
      createByocDeploymentsRepository({ teamId }).target({
        region: 'us-test1',
        zone: 'us-test1-a',
      })
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
                default_region: 'us-test1',
                default_zone: 'us-test1-a',
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
    }).createCloudConnection(
      deployerEmail,
      undefined,
      clientRequestId,
      undefined,
      {
        region: 'us-test1',
        zone: 'us-test1-a',
      }
    )

    expect(
      vi
        .mocked(fetch)
        .mock.calls.map(([input, init]) => requestKey(input, init).key)
    ).toEqual([
      `GET /target-identities/${teamId}`,
      'POST /target-identities',
      'POST /cloud-connections',
    ])
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
        clientRequestId,
        undefined,
        { region: 'us-test1', zone: 'us-test1-a' }
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

  it('reports missing deployer permissions without a retryable message', async () => {
    mockRunner({
      routes: {
        'POST /cloud-connections': () =>
          Response.json(
            {
              code: 'deployer_missing_permissions',
              error: 'upstream details are not exposed',
              details: {
                retryable: false,
                project_id: projectId,
                missing_permissions: [
                  'servicenetworking.services.addPeering',
                  'iap.tunnelInstances.accessViaIAP',
                ],
              },
            },
            { status: 403 }
          ),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).createCloudConnection(
        deployerEmail,
        undefined,
        clientRequestId,
        undefined,
        { region: 'us-test1', zone: 'us-test1-a' }
      )
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message:
        'The BYOC deployer is missing required GCP permissions. Missing: servicenetworking.services.addPeering, iap.tunnelInstances.accessViaIAP.',
    })
  })

  it('reports a missing deployer service account without retrying', async () => {
    mockRunner({
      routes: {
        'POST /cloud-connections': () =>
          Response.json(
            {
              code: 'deployer_not_found',
              error: 'upstream details are not exposed',
              details: {
                retryable: false,
                project_id: projectId,
                deployer_service_account: deployerEmail,
              },
            },
            { status: 422 }
          ),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).createCloudConnection(
        deployerEmail,
        undefined,
        clientRequestId,
        undefined,
        { region: 'us-test1', zone: 'us-test1-a' }
      )
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: `Create the generated BYOC deployer service account ${deployerEmail} in the selected GCP project, then retry verification.`,
    })
  })

  it('reports a deployer project mismatch without retrying', async () => {
    mockRunner({
      routes: {
        'POST /cloud-connections': () =>
          Response.json(
            {
              code: 'deployer_project_mismatch',
              error: 'upstream details are not exposed',
              details: { retryable: false, project_id: projectId },
            },
            { status: 422 }
          ),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).createCloudConnection(
        deployerEmail,
        undefined,
        clientRequestId,
        undefined,
        { region: 'us-test1', zone: 'us-test1-a' }
      )
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message:
        'The BYOC deployer service account must belong to the selected GCP project.',
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
        clientRequestId,
        undefined,
        { region: 'us-test1', zone: 'us-test1-a' }
      )
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message:
        'The BYOC deployer does not match this team. Refresh the setup and use the generated identity.',
    })
  })

  it('maps unavailable GCP locations before creating a connection', async () => {
    mockRunner({
      routes: {
        'POST /cloud-connections': () =>
          Response.json(
            {
              code: 'invalid_gcp_location',
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
        clientRequestId,
        undefined,
        { region: 'us-test1', zone: 'us-test1-a' }
      )
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message:
        'The selected GCP zone is not available in this project. Choose another region and zone.',
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
    ).toEqual(['GET /cloud-connections'])
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
    ).toEqual([`GET /deployments/${deploymentId}`])
  })

  it('sanitizes AWS deployments with empty GCP and service account plans', async () => {
    mockRunner({
      routes: {
        [`GET /deployments/${deploymentId}`]: () =>
          Response.json({
            ...awsDeployment(),
            gcp: undefined,
            deployer_service_account: undefined,
            terraform_backend_configs: [
              'bucket=customer-state',
              'key=terraform/byoc/deployments/deployment-aws/state',
              'role_arn=never-expose',
            ],
          }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).getDeployment(deploymentId)
    ).resolves.toMatchObject({
      provider: 'aws',
      gcp: { project_id: '', region: '', zone: '' },
      aws: {
        account_id: awsAccountId,
        region: 'us-east-2',
        role_arn: awsRoleArn,
      },
      deployer_service_account: {
        account_id: '',
        email: '',
        project_id: '',
        roles: [],
      },
      terraform_backend: {
        bucket: 'customer-state',
        key: 'terraform/byoc/deployments/deployment-aws/state',
      },
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('rejects AWS machine types for GCP deployments before enqueueing', async () => {
    mockRunner({
      routes: {
        [`GET /deployments/${deploymentId}`]: () => Response.json(deployment()),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).deploy(
        deploymentId,
        { api_machine_type: 'm8i.4xlarge' },
        clientRequestId
      )
    ).rejects.toThrow('m8i.4xlarge is not a supported GCP api machine type.')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('accepts supported AWS machine types when enqueueing', async () => {
    mockRunner({
      routes: {
        [`GET /deployments/${deploymentId}`]: () =>
          Response.json(awsDeployment()),
        [`POST /deployments/${deploymentId}/operations/deploy`]: (
          _url,
          init
        ) => {
          expect(JSON.parse(String(init.body))).toMatchObject({
            client_request_id: clientRequestId,
            api_machine_type: 't3.xlarge',
            client_machine_type: 'm8i.4xlarge',
            clickhouse_machine_type: 'm7i.2xlarge',
          })
          return Response.json({ id: 'operation-aws' })
        },
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).deploy(
        deploymentId,
        {
          api_machine_type: 't3.xlarge',
          client_machine_type: 'm8i.4xlarge',
          clickhouse_machine_type: 'm7i.2xlarge',
        },
        clientRequestId
      )
    ).resolves.toMatchObject({ id: 'operation-aws' })
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

  it('controls only an operation owned by the current team', async () => {
    const operation = {
      id: operationId,
      deployment_id: deploymentId,
      kind: 'deploy',
      status: 'failed_retryable',
      client_request_id: clientRequestId,
      dispatch_attempts: 1,
      created_at: '2026-07-11T00:00:00Z',
      updated_at: '2026-07-11T00:00:00Z',
    }
    mockRunner({
      routes: {
        [`GET /operations/${operationId}`]: () => Response.json(operation),
        [`GET /deployments/${deploymentId}`]: () => Response.json(deployment()),
        [`POST /operations/${operationId}/retry`]: () =>
          Response.json({ ...operation, status: 'queued' }),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).retryOperation(operationId)
    ).resolves.toMatchObject({ id: operationId, status: 'queued' })
    expect(
      vi
        .mocked(fetch)
        .mock.calls.map(([input, init]) => requestKey(input, init).key)
    ).toEqual([
      `GET /operations/${operationId}`,
      `GET /deployments/${deploymentId}`,
      `POST /operations/${operationId}/retry`,
    ])
  })

  it('rejects a cross-team operation before mutating it', async () => {
    mockRunner({
      routes: {
        [`GET /operations/${operationId}`]: () =>
          Response.json({ id: operationId, deployment_id: deploymentId }),
        [`GET /deployments/${deploymentId}`]: () =>
          Response.json(deployment({ team_id: 'team-b' })),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).cancelOperation(operationId)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(
          ([input, init]) =>
            requestKey(input, init).key ===
            `POST /operations/${operationId}/cancel`
        )
    ).toBe(false)
  })

  it('explains when an exact operation cannot be cancelled', async () => {
    mockRunner({
      routes: {
        [`GET /operations/${operationId}`]: () =>
          Response.json({ id: operationId, deployment_id: deploymentId }),
        [`GET /deployments/${deploymentId}`]: () => Response.json(deployment()),
        [`POST /operations/${operationId}/cancel`]: () =>
          Response.json(
            {
              code: 'operation_not_cancellable',
              error: 'internal state is not exposed',
            },
            { status: 409 }
          ),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).cancelOperation(operationId)
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message:
        'This operation has already started or is recovering durable work and cannot be cancelled.',
    })
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
      'GET /cloud-connections',
      `GET /target-identities/${teamId}`,
      'POST /target-identities',
      'POST /deployments',
    ])
  })

  it('maps coded operation conflicts to actionable guidance', async () => {
    mockRunner({
      routes: {
        'GET /cloud-connections': () =>
          Response.json({ cloud_connections: [cloudConnection()] }),
        'POST /deployments': () =>
          Response.json(
            {
              code: 'idempotency_conflict',
              error: 'upstream details are not exposed',
            },
            { status: 409 }
          ),
      },
    })

    await expect(
      createByocDeploymentsRepository({ teamId }).createDeployment(
        connectionId,
        projectId,
        clientRequestId
      )
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message:
        'This request was already used for a different BYOC action. Refresh and try again.',
    })
  })

  it('maps runner transport failures to a bounded gateway error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('connection reset'))

    await expect(
      createByocDeploymentsRepository({ teamId }).target({
        region: 'us-test1',
        zone: 'us-test1-a',
      })
    ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
  })
})
