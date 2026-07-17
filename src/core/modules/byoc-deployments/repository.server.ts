import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export type ByocProvider = 'gcp' | 'aws'

export interface ByocGcpLocation {
  provider: 'gcp'
  region: string
  zone: string
}

export interface ByocAwsLocation {
  provider: 'aws'
  region: string
}

export type ByocLocation = ByocGcpLocation | ByocAwsLocation

type LegacyByocGcpLocation = Omit<ByocGcpLocation, 'provider'>
export type ByocLocationInput = ByocLocation | LegacyByocGcpLocation

type ByocTarget = ByocLocation & {
  targetKey: string
  deployerAccountId: string
  sdkDomain: string
  namespace: string
  domainName: string
  prefix: string
  e2bPrincipal: string
  e2bPrincipals: string[]
}

const configuredGcpLocationSchema = z.object({
  region: z.string().regex(/^[a-z][a-z0-9-]+$/),
  zone: z.string().regex(/^[a-z][a-z0-9-]+$/),
})

const gcpLocationSchema = configuredGcpLocationSchema
  .extend({ provider: z.literal('gcp') })
  .refine(isValidGcpLocation, {
    message: 'Zone must belong to the selected GCP region.',
  })

const awsRegionSchema = z
  .string()
  .max(63)
  .regex(/^[a-z]{2}(?:-[a-z0-9]+)+-[0-9]+$/)
  .refine((region) => !region.includes('--'))

const awsLocationSchema = z.object({
  provider: z.literal('aws'),
  region: awsRegionSchema,
})

const byocLocationSchema = z.discriminatedUnion('provider', [
  gcpLocationSchema,
  awsLocationSchema,
])

const configuredGcpLocationsSchema = z.array(configuredGcpLocationSchema).min(1)

const byocTargetIdentityBaseSchema = z.object({
  team_id: z.string().min(1).max(128),
  target_key: z.string().regex(/^[a-z][a-z0-9]{11}$/),
  region: z.string().min(1),
  namespace: z.string().min(1),
  domain_name: z.string().min(1),
  prefix: z.string().min(1),
  deployer_account_id: z.string().min(1),
  e2b_principal: z.string().min(1),
  e2b_principals: z.array(z.string().min(1)).min(1),
})

const byocTargetIdentitySchema = z.discriminatedUnion('provider', [
  byocTargetIdentityBaseSchema.extend({
    provider: z.literal('gcp'),
    zone: z.string().min(1),
  }),
  byocTargetIdentityBaseSchema.extend({
    provider: z.literal('aws'),
    region: awsRegionSchema,
    zone: z.literal('').optional(),
  }),
])

type ByocTargetIdentity = z.infer<typeof byocTargetIdentitySchema>

export type DeploymentStatus =
  | 'draft'
  | 'plan_ready'
  | 'planning'
  | 'plan_changed'
  | 'plan_noop'
  | 'preparing_artifacts'
  | 'artifacts_ready'
  | 'waiting_for_nomad'
  | 'waiting_for_node'
  | 'health_checking'
  | 'registering_cluster'
  | 'building_base_template'
  | 'smoke_testing'
  | 'attached'
  | 'applying'
  | 'applied'
  | 'destroying'
  | 'destroyed'
  | 'failed'

export interface CloudConnection {
  id: string
  client_request_id?: string
  team_id: string
  provider: ByocProvider
  mode: 'keyless_impersonation' | 'web_identity' | 'mock'
  status: string
  subject_email: string
  authorized_projects: CloudProjectAuthorization[]
  required_project_roles: string[]
  created_at: string
  updated_at: string
}

export interface CloudProjectAuthorization {
  project_id: string
  name: string
  default_region: string
  default_zone: string
  namespace: string
  domain_name: string
  prefix: string
  status: string
  required_roles: string[]
  deployer_account_hint: string
  authorization_model?: string
  e2b_principal?: string
  revoke_hint?: string
}

export interface CloudProject {
  id: string
  name: string
  provider: ByocProvider
  default_region: string
  default_zone: string
  namespace: string
  domain_name: string
  prefix: string
  authorization_status: string
  required_roles: string[]
  mock: boolean
  ready_for_smokes: boolean
  authorization_model?: string
  e2b_principal?: string
  revoke_hint?: string
}

export interface Deployment {
  id: string
  client_request_id?: string
  team_id: string
  cloud_connection_id?: string
  cloud_project_id?: string
  provider: ByocProvider
  gcp: {
    project_id: string
    region: string
    zone: string
  }
  aws?: {
    account_id: string
    region: string
    role_arn: string
  }
  domain_name: string
  prefix: string
  deployer_service_account: {
    account_id: string
    email: string
    display_name: string
    project_id: string
    status: string
    roles: string[]
  }
  terraform_settings?: TerraformSettings
  terraform_plan_text?: string
  terraform_backend?: {
    bucket?: string
    prefix?: string
    key?: string
  }
  cluster_id?: string
  cluster_endpoint?: string
  status: DeploymentStatus
  error?: string
  created_at: string
  updated_at: string
}

interface RunnerDeployment extends Deployment {
  terraform_backend_configs?: string[]
}

export interface TerraformSettings {
  api_node_count?: number
  api_machine_type?: string
  client_node_count?: number
  client_machine_type?: string
  clickhouse_node_count?: number
  clickhouse_machine_type?: string
}

export interface DeploymentEvent {
  deployment_id: string
  sequence: number
  phase: string
  level: string
  message: string
  created_at: string
}

export type OperationStatus =
  | 'queued'
  | 'starting'
  | 'planning'
  | 'plan_ready'
  | 'applying'
  | 'validating'
  | 'attaching'
  | 'succeeded'
  | 'failed_retryable'
  | 'failed_terminal'
  | 'cancelled'
  | 'stale'

export interface ByocOperation {
  id: string
  deployment_id: string
  kind: 'deploy' | 'validate' | 'destroy'
  status: OperationStatus
  client_request_id: string
  error?: string
  created_at: string
  updated_at: string
}

// The runner may spend up to 15 seconds dispatching a durable Cloud Run job
// after committing the operation. Leave room for transport overhead so the
// dashboard does not report a false failure for an accepted operation.
const runnerRequestTimeoutMs = 30_000

export function createByocDeploymentsRepository({
  teamId,
}: {
  teamId: string
}) {
  const sdkDomain = requiredEnv('NEXT_PUBLIC_E2B_DOMAIN')
  const baseUrl = getRunnerBaseUrl()
  const token = getRunnerToken()
  const targetPromises = new Map<string, Promise<ByocTarget>>()
  let allocatedTargetPromise: Promise<ByocTarget | null> | undefined

  async function request<T>(path: string, init?: RequestInit): Promise<T>
  async function request<T>(
    path: string,
    init: RequestInit,
    options: { allowNotFound: true }
  ): Promise<T | undefined>
  async function request<T>(
    path: string,
    init: RequestInit = {},
    options?: { allowNotFound?: boolean }
  ): Promise<T | undefined> {
    let response: Response
    try {
      response = await fetch(new URL(path, baseUrl), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': token,
          ...init.headers,
        },
        cache: 'no-store',
        signal: init.signal
          ? AbortSignal.any([
              init.signal,
              AbortSignal.timeout(runnerRequestTimeoutMs),
            ])
          : AbortSignal.timeout(runnerRequestTimeoutMs),
      })
    } catch {
      throw new TRPCError({
        code: 'BAD_GATEWAY',
        message: 'BYOC deployments runner is unavailable.',
      })
    }

    if (response.status === 404 && options?.allowNotFound) return undefined
    if (!response.ok) {
      const runnerError = await readRunnerError(response)
      throw new TRPCError({
        code: runnerStatusCode(response.status),
        message: getPublicRunnerError(response.status, path, runnerError),
      })
    }

    try {
      return (await response.json()) as T
    } catch {
      throw new TRPCError({
        code: 'BAD_GATEWAY',
        message: 'BYOC deployments runner returned an invalid response.',
      })
    }
  }

  function getTarget(location: ByocLocation) {
    const desiredTarget = getByocTargetBase(location)
    const domainBase = requiredEnv('BYOC_DOMAIN_NAME')
    const targetKey = locationKey(location)
    const existingTarget = targetPromises.get(targetKey)
    if (existingTarget) return existingTarget

    const targetPromise = request<unknown>('/target-identities', {
      method: 'POST',
      body: JSON.stringify({
        team_id: teamId,
        provider: location.provider,
        region: desiredTarget.region,
        ...(location.provider === 'gcp' && { zone: location.zone }),
        domain_base: domainBase,
        e2b_principal: desiredTarget.e2bPrincipal,
        e2b_principals: desiredTarget.e2bPrincipals,
      }),
    }).then((response) => {
      const parsed = byocTargetIdentitySchema.safeParse(response)
      if (!parsed.success) {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message: 'BYOC deployments runner returned an invalid target.',
        })
      }
      const identity = parsed.data
      if (identity.team_id !== teamId) {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message: 'BYOC deployments runner returned another team target.',
        })
      }
      return getByocTarget(identity, desiredTarget, sdkDomain, domainBase)
    })
    targetPromises.set(targetKey, targetPromise)
    return targetPromise
  }

  async function getAllocatedTarget() {
    allocatedTargetPromise ??= request<unknown>(
      `/target-identities/${encodeURIComponent(teamId)}`,
      {},
      { allowNotFound: true }
    ).then((response) => {
      if (response === undefined) return null
      const parsed = byocTargetIdentitySchema.safeParse(response)
      if (!parsed.success || parsed.data.team_id !== teamId) {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message: 'BYOC deployments runner returned an invalid target.',
        })
      }
      return storedByocTarget(parsed.data, sdkDomain)
    })
    return allocatedTargetPromise
  }

  async function resolveTarget(requestedLocation?: ByocLocation) {
    const allocatedTarget = await getAllocatedTarget()
    if (allocatedTarget) {
      if (
        requestedLocation &&
        !sameLocation(allocatedTarget, requestedLocation)
      ) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'This team already has a different BYOC location reserved.',
        })
      }
      return allocatedTarget
    }

    const [defaultLocation] = getSuggestedLocations()
    const selectedLocation = requestedLocation ?? defaultLocation
    if (!selectedLocation) throw invalidLocationsConfiguration()
    assertValidLocation(selectedLocation)
    return getTarget(selectedLocation)
  }

  async function getOwnedCloudConnection(connectionId: string) {
    const response = await request<{ cloud_connections: CloudConnection[] }>(
      '/cloud-connections'
    )
    const connection = response.cloud_connections.find(
      (item) => item.id === connectionId
    )
    if (!connection || connection.team_id !== teamId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Cloud connection not found.',
      })
    }
    const allocatedTarget = await getAllocatedTarget()
    if (allocatedTarget && allocatedTarget.provider !== connection.provider) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Cloud connection does not use the allocated BYOC provider.',
      })
    }
    const authorization = connection.authorized_projects.find((project) => {
      const location = authorizationLocation(connection.provider, project)
      return (
        location !== undefined &&
        (!allocatedTarget || sameLocation(allocatedTarget, location))
      )
    })
    if (!authorization) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Cloud connection does not use an allowed BYOC location.',
      })
    }
    const location = authorizationLocation(connection.provider, authorization)
    if (!location) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Cloud connection does not use an allowed BYOC location.',
      })
    }
    const target = await resolveTarget(location)
    if (!isConfiguredConnection(connection, teamId, target)) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message:
          'Cloud connection is missing the approved BYOC target project.',
      })
    }
    return { connection, target }
  }

  async function getOwnedDeployment(deploymentId: string) {
    const deployment = await request<RunnerDeployment>(
      `/deployments/${deploymentId}`
    )
    assertAllowedDeployment(deployment, teamId)
    return sanitizeDeployment(deployment)
  }

  return {
    locations() {
      return getSuggestedLocations()
    },

    allocatedTarget() {
      return getAllocatedTarget()
    },

    async resetTarget(expectedTargetKey: string) {
      const response = await request<unknown>(
        `/target-identities/${encodeURIComponent(teamId)}`,
        {
          method: 'DELETE',
          body: JSON.stringify({ expected_target_key: expectedTargetKey }),
        }
      )
      if (
        !response ||
        typeof response !== 'object' ||
        !('reset' in response) ||
        typeof response.reset !== 'boolean'
      ) {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message:
            'BYOC deployments runner returned an invalid reset response.',
        })
      }
      allocatedTargetPromise = Promise.resolve(null)
      targetPromises.clear()
      return response
    },

    async updateTargetLocation(
      expectedLocationInput: ByocLocationInput,
      locationInput: ByocLocationInput
    ) {
      const expectedLocation = normalizeLocation(expectedLocationInput)
      const location = normalizeLocation(locationInput)
      assertValidLocation(location)
      const current = await getAllocatedTarget()
      if (!current) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'BYOC target identity is not allocated.',
        })
      }
      if (!sameLocation(current, expectedLocation)) {
        throw new TRPCError({
          code: 'CONFLICT',
          message:
            'The BYOC location changed since this page loaded. Refresh before retrying.',
        })
      }
      if (current.provider !== location.provider) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'The BYOC cloud provider cannot change after allocation.',
        })
      }

      const response = await request<unknown>(
        `/target-identities/${encodeURIComponent(teamId)}/location`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            expected_region: expectedLocation.region,
            ...(expectedLocation.provider === 'gcp' && {
              expected_zone: expectedLocation.zone,
            }),
            region: location.region,
            ...(location.provider === 'gcp' && { zone: location.zone }),
          }),
        }
      )
      const parsed = byocTargetIdentitySchema.safeParse(response)
      if (!parsed.success || parsed.data.team_id !== teamId) {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message: 'BYOC deployments runner returned an invalid target.',
        })
      }
      const updated = storedByocTarget(parsed.data, sdkDomain)
      if (
        !sameLocation(updated, location) ||
        updated.deployerAccountId !== current.deployerAccountId ||
        updated.namespace !== current.namespace ||
        updated.domainName !== current.domainName ||
        updated.prefix !== current.prefix ||
        updated.e2bPrincipal !== current.e2bPrincipal ||
        !sameStringSet(updated.e2bPrincipals, current.e2bPrincipals)
      ) {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message:
            'BYOC deployments runner changed the stable target identity.',
        })
      }
      allocatedTargetPromise = Promise.resolve(updated)
      targetPromises.clear()
      return updated
    },

    target(location?: ByocLocationInput) {
      return resolveTarget(location ? normalizeLocation(location) : undefined)
    },

    health() {
      return request<{ status: string }>('/health')
    },

    async createCloudConnection(
      deployerIdentity: string,
      deploymentId: string | undefined,
      clientRequestId: string,
      expectedCloudConnectionId?: string,
      location?: ByocLocationInput
    ) {
      const deployment = deploymentId
        ? await getOwnedDeployment(deploymentId)
        : undefined
      const selectedLocation: ByocLocation | undefined = deployment
        ? deploymentLocation(deployment)
        : location
          ? normalizeLocation(location)
          : undefined
      const target = await resolveTarget(selectedLocation)
      const projectId = cloudAccountID(deployerIdentity, target)
      const connectionTarget = deployment
        ? configuredTargetForDeployment(deployment, [target])
        : target
      if (!connectionTarget) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message:
            'Deployment target does not match the configured BYOC target.',
        })
      }
      const expectedConnectionId =
        expectedCloudConnectionId ?? deployment?.cloud_connection_id
      if (deploymentId && !expectedConnectionId) {
        throw new TRPCError({
          code: 'CONFLICT',
          message:
            'The deployment connection changed or is unavailable. Refresh before replacing it.',
        })
      }
      if (deployment && projectId !== deploymentCloudAccountID(deployment)) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message:
            'The deployer identity must belong to the deployment target.',
        })
      }
      assertExpectedDeployerIdentity(deployerIdentity, target)
      const connection = await createCloudConnectionWithMode(
        request,
        teamId,
        getCloudConnectionMode(target.provider),
        deployerIdentity,
        projectId,
        connectionTarget,
        deploymentId,
        clientRequestId,
        expectedConnectionId
      )

      assertConfiguredConnection(connection, teamId, connectionTarget)
      return connection
    },

    async listCloudConnections() {
      const [response, allocatedTarget] = await Promise.all([
        request<{ cloud_connections: CloudConnection[] }>('/cloud-connections'),
        getAllocatedTarget(),
      ])
      const connections = await Promise.all(
        response.cloud_connections.map(async (connection) => {
          if (connection.team_id !== teamId) {
            return undefined
          }
          if (
            allocatedTarget &&
            connection.provider !== allocatedTarget.provider
          ) {
            return undefined
          }
          const authorization = connection.authorized_projects.find(
            (project) => {
              const location = authorizationLocation(
                connection.provider,
                project
              )
              return (
                location !== undefined &&
                (!allocatedTarget || sameLocation(allocatedTarget, location))
              )
            }
          )
          if (!authorization) return undefined
          const location = authorizationLocation(
            connection.provider,
            authorization
          )
          if (!location) return undefined
          const target = await resolveTarget(location)
          return isConfiguredConnection(connection, teamId, target)
            ? connection
            : undefined
        })
      )
      return connections.filter(
        (connection): connection is CloudConnection => !!connection
      )
    },

    async listProjects(connectionId: string) {
      const ownedConnection = await getOwnedCloudConnection(connectionId)
      const response = await request<{ projects: CloudProject[] }>(
        `/cloud-connections/${connectionId}/projects`
      )
      const projects = response.projects.filter(
        (project) =>
          ownedConnection.connection.authorized_projects.some(
            (authorization) => authorization.project_id === project.id
          ) && isConfiguredProject(project, ownedConnection.target)
      )
      if (projects.length === 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'No authorized BYOC project is available.',
        })
      }

      return projects
    },

    async createDeployment(
      connectionId: string,
      projectId: string,
      clientRequestId: string
    ) {
      const ownedConnection = await getOwnedCloudConnection(connectionId)
      const connection = ownedConnection.connection
      const target = ownedConnection.target
      assertExpectedDeployerIdentity(connection.subject_email, target)
      if (
        !connection.authorized_projects.some(
          (project) => project.project_id === projectId
        )
      ) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Select a project authorized by this cloud connection.',
        })
      }

      const deployment = await request<RunnerDeployment>('/deployments', {
        method: 'POST',
        body: JSON.stringify({
          client_request_id: clientRequestId,
          team_id: teamId,
          cloud_connection_id: connectionId,
          cloud_project_id: projectId,
        }),
      })

      assertConfiguredDeployment(deployment, teamId, [target])
      assertDeploymentDeployerIdentity(deployment, target)
      return sanitizeDeployment(deployment)
    },

    async listDeployments() {
      const response = await request<{ deployments: RunnerDeployment[] }>(
        '/deployments'
      )
      const deployments = await Promise.all(
        response.deployments.map((deployment) => {
          try {
            assertAllowedDeployment(deployment, teamId)
          } catch {
            return undefined
          }
          return sanitizeDeployment(deployment)
        })
      )
      return deployments.filter(
        (deployment): deployment is Deployment => !!deployment
      )
    },

    async getDeployment(deploymentId: string) {
      return getOwnedDeployment(deploymentId)
    },

    async listEvents(deploymentId: string) {
      await getOwnedDeployment(deploymentId)
      const response = await request<{ events: DeploymentEvent[] }>(
        `/deployments/${deploymentId}/events`
      )
      return response.events
    },

    async listOperations(deploymentId: string) {
      await getOwnedDeployment(deploymentId)
      return request<ByocOperation[]>(`/deployments/${deploymentId}/operations`)
    },

    async deploy(
      deploymentId: string,
      settings: TerraformSettings,
      clientRequestId: string
    ) {
      const deployment = await getOwnedDeployment(deploymentId)
      assertTopologyForProvider(deployment.provider, settings)
      return request<ByocOperation>(
        `/deployments/${deploymentId}/operations/deploy`,
        {
          method: 'POST',
          body: JSON.stringify({
            client_request_id: clientRequestId,
            api_node_count: settings.api_node_count,
            api_machine_type: settings.api_machine_type,
            client_node_count: settings.client_node_count,
            client_machine_type: settings.client_machine_type,
            clickhouse_node_count: settings.clickhouse_node_count,
            clickhouse_machine_type: settings.clickhouse_machine_type,
          }),
        }
      )
    },

    async validate(deploymentId: string, clientRequestId: string) {
      await getOwnedDeployment(deploymentId)
      return request<ByocOperation>(
        `/deployments/${deploymentId}/operations/validate`,
        {
          method: 'POST',
          body: JSON.stringify({ client_request_id: clientRequestId }),
        }
      )
    },

    async destroy(deploymentId: string, clientRequestId: string) {
      await getOwnedDeployment(deploymentId)
      return request<ByocOperation>(
        `/deployments/${deploymentId}/operations/destroy`,
        {
          method: 'POST',
          body: JSON.stringify({ client_request_id: clientRequestId }),
        }
      )
    },
  }
}

function createCloudConnectionWithMode(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  teamId: string,
  mode: CloudConnection['mode'],
  deployerIdentity: string,
  projectId: string,
  target: ByocTarget,
  deploymentId: string | undefined,
  clientRequestId: string,
  expectedCloudConnectionId?: string
) {
  const path = deploymentId
    ? `/deployments/${deploymentId}/cloud-connection`
    : '/cloud-connections'
  return request<CloudConnection | { connection: CloudConnection }>(path, {
    method: 'POST',
    body: JSON.stringify({
      client_request_id: clientRequestId,
      expected_cloud_connection_id: expectedCloudConnectionId,
      team_id: teamId,
      provider: target.provider,
      mode,
      subject_email: deployerIdentity,
      authorized_projects: [
        {
          project_id: projectId,
          name: projectId,
          default_region: target.region,
          default_zone: target.provider === 'gcp' ? target.zone : '',
          namespace: target.namespace,
          domain_name: target.domainName,
          prefix: target.prefix,
          e2b_principal: target.e2bPrincipal,
        },
      ],
    }),
  }).then((response) =>
    'connection' in response ? response.connection : response
  )
}

function getCloudConnectionMode(
  provider: ByocProvider
): CloudConnection['mode'] {
  if (provider === 'aws') return 'web_identity'
  if (process.env.DEPLOYMENT_MOCK === 'true') {
    return 'mock'
  }

  return 'keyless_impersonation'
}

function getRunnerBaseUrl() {
  const raw = process.env.BYOC_DEPLOYMENTS_API_URL
  if (!raw) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'BYOC_DEPLOYMENTS_API_URL is not configured.',
    })
  }

  const url = new URL(raw)
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (
    (!local && url.protocol !== 'https:') ||
    (local && !['http:', 'https:'].includes(url.protocol)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'BYOC deployments runner URL is invalid.',
    })
  }

  return url
}

function getRunnerToken() {
  const token = process.env.BYOC_DEPLOYMENTS_API_TOKEN
  if (!token) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'BYOC_DEPLOYMENTS_API_TOKEN is not configured.',
    })
  }

  return token
}

function runnerStatusCode(status: number) {
  switch (status) {
    case 400:
    case 422:
      return 'BAD_REQUEST'
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 429:
      return 'TOO_MANY_REQUESTS'
    default:
      return status >= 500 ? 'BAD_GATEWAY' : 'INTERNAL_SERVER_ERROR'
  }
}

type RunnerError = {
  code?: string
  missingPermissions?: string[]
  deployerServiceAccount?: string
}

async function readRunnerError(response: Response): Promise<RunnerError> {
  try {
    const body: unknown = await response.json()
    if (!body || typeof body !== 'object') return {}

    const code =
      'code' in body && typeof body.code === 'string' ? body.code : undefined
    const details =
      'details' in body && body.details && typeof body.details === 'object'
        ? body.details
        : undefined
    const missingPermissions =
      details &&
      'missing_permissions' in details &&
      Array.isArray(details.missing_permissions)
        ? details.missing_permissions
            .filter(
              (permission): permission is string =>
                typeof permission === 'string'
            )
            .slice(0, 20)
        : undefined

    const deployerServiceAccount =
      details &&
      'deployer_service_account' in details &&
      typeof details.deployer_service_account === 'string'
        ? details.deployer_service_account
        : undefined

    return {
      code,
      missingPermissions,
      deployerServiceAccount,
    }
  } catch {
    // An invalid upstream error body is handled by the status fallback below.
  }
  return {}
}

function getPublicRunnerError(
  status: number,
  path: string,
  runnerError: RunnerError
) {
  const errorCode = runnerError.code
  if (errorCode === 'deployer_verification_unavailable') {
    return 'E2B cannot use the deployer service account yet. Retrying verification may succeed.'
  }
  if (errorCode === 'aws_deployer_verification_unavailable') {
    return 'E2B cannot assume the deployer IAM role yet. Retrying verification may succeed.'
  }
  if (errorCode === 'invalid_aws_identity') {
    return 'The AWS deployer role could not be verified. Check its web identity trust and account ID.'
  }
  if (errorCode === 'deployer_missing_permissions') {
    const suffix = runnerError.missingPermissions?.length
      ? ` Missing: ${runnerError.missingPermissions.join(', ')}.`
      : ''
    return `The BYOC deployer is missing required GCP permissions.${suffix}`
  }
  if (errorCode === 'deployer_not_found') {
    const account = runnerError.deployerServiceAccount
      ? ` ${runnerError.deployerServiceAccount}`
      : ''
    return `Create the generated BYOC deployer service account${account} in the selected GCP project, then retry verification.`
  }
  if (errorCode === 'deployer_project_mismatch') {
    return 'The BYOC deployer service account must belong to the selected GCP project.'
  }
  if (errorCode === 'invalid_gcp_location') {
    return 'The selected GCP zone is not available in this project. Choose another region and zone.'
  }
  if (errorCode === 'target_identity_mismatch') {
    return 'The BYOC deployer does not match this team. Refresh the setup and use the generated identity.'
  }
  if (errorCode === 'target_identity_conflict') {
    return 'The stored BYOC target conflicts with this dashboard configuration.'
  }
  if (errorCode === 'target_identity_changed') {
    return 'The BYOC location changed since this page loaded. Refresh before retrying.'
  }
  if (errorCode === 'target_identity_locked') {
    return 'The BYOC cloud and location cannot change after a cloud connection or deployment exists.'
  }
  if (errorCode === 'active_operation') {
    return 'Another BYOC operation is still running. Wait for it to finish, then refresh.'
  }
  if (errorCode === 'idempotency_conflict') {
    return 'This request was already used for a different BYOC action. Refresh and try again.'
  }
  if (errorCode === 'deployment_changed') {
    return 'The BYOC deployment changed since this page loaded. Refresh before retrying.'
  }
  if (errorCode === 'invalid_operation_state') {
    return "This BYOC action is not valid from the deployment's current state. Refresh to see the available action."
  }
  if (status === 401 || status === 403) {
    return 'BYOC deployments runner authentication failed.'
  }
  if (status === 404) {
    return 'BYOC deployment resource not found.'
  }
  if (status === 409) {
    if (path === '/target-identities') {
      return 'The stored BYOC target conflicts with this dashboard configuration.'
    }
    return 'BYOC deployment is already running another operation.'
  }
  if (status === 422) {
    return 'BYOC deployment configuration was rejected.'
  }
  if (status === 429 || status >= 500) {
    return 'BYOC deployments runner is temporarily unavailable.'
  }
  return 'BYOC deployment request was rejected.'
}

function getByocTarget(
  identity: ByocTargetIdentity,
  desired: ReturnType<typeof getByocTargetBase>,
  sdkDomain: string,
  domainBase: string
): ByocTarget {
  const target = storedByocTarget(identity, sdkDomain)
  const resourceStem = `t${identity.target_key}`
  if (
    !sameLocation(target, desired) ||
    target.namespace !== resourceStem ||
    target.prefix !== `${resourceStem}-` ||
    target.domainName !== `${resourceStem}.${domainBase}` ||
    target.deployerAccountId !== resourceStem ||
    target.e2bPrincipal !== desired.e2bPrincipal ||
    !sameStringSet(target.e2bPrincipals, desired.e2bPrincipals)
  ) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'The stored BYOC target does not match this dashboard configuration.',
    })
  }
  return target
}

function storedByocTarget(
  identity: ByocTargetIdentity,
  sdkDomain: string
): ByocTarget {
  if (!/^[a-z][a-z0-9]{11}$/.test(identity.target_key)) {
    throw new TRPCError({
      code: 'BAD_GATEWAY',
      message: 'BYOC deployments runner returned an invalid target key.',
    })
  }
  const resourceStem = `t${identity.target_key}`
  const commonTarget = {
    targetKey: identity.target_key,
    region: identity.region,
    namespace: identity.namespace,
    domainName: identity.domain_name,
    prefix: identity.prefix,
    deployerAccountId: identity.deployer_account_id,
    e2bPrincipal: identity.e2b_principal,
    e2bPrincipals: identity.e2b_principals,
    sdkDomain,
  }
  const target: ByocTarget =
    identity.provider === 'gcp'
      ? { ...commonTarget, provider: 'gcp', zone: identity.zone }
      : { ...commonTarget, provider: 'aws' }
  if (
    !byocLocationSchema.safeParse(target).success ||
    target.namespace !== resourceStem ||
    target.prefix !== `${resourceStem}-` ||
    !target.domainName.startsWith(`${resourceStem}.`) ||
    target.deployerAccountId !== resourceStem ||
    target.e2bPrincipals.length === 0
  ) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'The stored BYOC target does not match this dashboard configuration.',
    })
  }
  return target
}

function sameStringSet(left: string[], right: string[]) {
  const leftValues = new Set(left)
  const rightValues = new Set(right)
  return (
    leftValues.size === rightValues.size &&
    [...leftValues].every((value) => rightValues.has(value))
  )
}

function getByocTargetBase(
  location: ByocLocation
): ByocLocation & Pick<ByocTarget, 'e2bPrincipal' | 'e2bPrincipals'> {
  const e2bPrincipal = requiredEnv('BYOC_E2B_PRINCIPAL')
  const additionalPrincipals = process.env.BYOC_E2B_PRINCIPALS?.split(',')
    .map((principal) => principal.trim())
    .filter(Boolean)
  return {
    ...location,
    e2bPrincipal,
    e2bPrincipals: [
      ...new Set([e2bPrincipal, ...(additionalPrincipals ?? [])]),
    ],
  }
}

function getSuggestedLocations(): ByocLocation[] {
  const configured = process.env.BYOC_GCP_LOCATIONS?.trim()
  let gcpLocations: ByocGcpLocation[]
  if (configured) {
    let value: unknown
    try {
      value = JSON.parse(configured)
    } catch {
      throw invalidLocationsConfiguration()
    }
    const parsed = configuredGcpLocationsSchema.safeParse(value)
    if (!parsed.success) throw invalidLocationsConfiguration()
    const locations = z
      .array(gcpLocationSchema)
      .safeParse(
        parsed.data.map((location) => ({ provider: 'gcp', ...location }))
      )
    if (!locations.success) throw invalidLocationsConfiguration()
    gcpLocations = locations.data
  } else {
    gcpLocations = [
      gcpLocationSchema.parse({
        provider: 'gcp',
        region: requiredEnv('BYOC_GCP_REGION'),
        zone: requiredEnv('BYOC_GCP_ZONE'),
      }),
    ]
  }

  return deduplicateLocations([...gcpLocations, ...getConfiguredAwsLocations()])
}

function invalidLocationsConfiguration() {
  return new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: 'BYOC_GCP_LOCATIONS is not configured correctly.',
  })
}

function isValidGcpLocation(location: ByocLocation) {
  if (location.provider !== 'gcp') return false
  const { region, zone } = location
  return (
    region.length <= 63 &&
    zone.length <= 63 &&
    /^[a-z][a-z0-9-]*[0-9]$/.test(region) &&
    region.includes('-') &&
    !region.includes('--') &&
    zone.length === region.length + 2 &&
    zone.startsWith(`${region}-`) &&
    /^[a-z]$/.test(zone.at(-1) ?? '')
  )
}

function assertValidLocation(location: ByocLocation) {
  if (location.provider === 'aws') {
    if (!awsRegionSchema.safeParse(location.region).success) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Select a valid AWS region.',
      })
    }
    return
  }
  if (!isValidGcpLocation(location)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Select a valid GCP region and matching zone.',
    })
  }
}

function normalizeLocation(location: ByocLocationInput): ByocLocation {
  if ('provider' in location && location.provider === 'aws') {
    return {
      provider: 'aws',
      region: location.region,
    }
  }
  return {
    provider: 'gcp',
    region: location.region,
    zone: location.zone,
  }
}

function sameLocation(left: ByocLocation, right: ByocLocation) {
  return (
    left.provider === right.provider &&
    left.region === right.region &&
    (left.provider !== 'gcp' ||
      (right.provider === 'gcp' && left.zone === right.zone))
  )
}

function locationKey(location: ByocLocation) {
  return `${location.provider}/${location.region}/${location.provider === 'gcp' ? location.zone : ''}`
}

function deduplicateLocations(locations: ByocLocation[]) {
  return locations.filter(
    (location, index) =>
      locations.findIndex(
        (candidate) => locationKey(candidate) === locationKey(location)
      ) === index
  )
}

function getConfiguredAwsLocations(): ByocAwsLocation[] {
  const configured = process.env.BYOC_AWS_REGIONS?.trim()
  if (!configured) return []

  let regions: unknown
  try {
    regions = configured.startsWith('[')
      ? JSON.parse(configured)
      : configured.split(',').map((region) => region.trim())
  } catch {
    throw invalidAwsRegionsConfiguration()
  }
  const parsed = z.array(awsRegionSchema).min(1).safeParse(regions)
  if (!parsed.success) throw invalidAwsRegionsConfiguration()
  return [...new Set(parsed.data)].map((region) => ({
    provider: 'aws',
    region,
  }))
}

function invalidAwsRegionsConfiguration() {
  return new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: 'BYOC_AWS_REGIONS is not configured correctly.',
  })
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `${name} is not configured.`,
    })
  }
  return value
}

function isConfiguredProject(project: CloudProject, target: ByocTarget) {
  if (project.provider !== target.provider) return false
  return (
    project.default_region === target.region &&
    (target.provider === 'gcp'
      ? project.default_zone === target.zone
      : project.default_zone === '') &&
    project.namespace === target.namespace &&
    project.domain_name === target.domainName &&
    project.prefix === target.prefix
  )
}

function serviceAccountProjectId(email: string) {
  const suffix = '.iam.gserviceaccount.com'
  const at = email.lastIndexOf('@')
  if (at <= 0 || !email.endsWith(suffix)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Enter a Google Cloud service-account email.',
    })
  }

  return email.slice(at + 1, -suffix.length)
}

const awsRoleArnSchema = z
  .string()
  .regex(/^arn:aws:iam::([0-9]{12}):role\/(.+)$/)

function tryParseAwsRoleArn(roleArn: string) {
  const parsed = awsRoleArnSchema.safeParse(roleArn.trim())
  if (!parsed.success) return undefined
  const match = /^arn:aws:iam::([0-9]{12}):role\/(.+)$/.exec(parsed.data)
  if (!match?.[1] || !match[2]) return undefined
  const roleName = match[2].split('/').at(-1)
  return roleName ? { accountId: match[1], roleName } : undefined
}

function parseAwsRoleArn(roleArn: string) {
  const parsed = tryParseAwsRoleArn(roleArn)
  if (!parsed) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Enter an AWS IAM role ARN.',
    })
  }
  return parsed
}

function cloudAccountID(identity: string, target: ByocTarget) {
  return target.provider === 'gcp'
    ? serviceAccountProjectId(identity)
    : parseAwsRoleArn(identity).accountId
}

function assertExpectedDeployerIdentity(identity: string, target: ByocTarget) {
  const actualAccount =
    target.provider === 'gcp'
      ? identity.slice(0, identity.lastIndexOf('@'))
      : parseAwsRoleArn(identity).roleName
  if (actualAccount !== target.deployerAccountId) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `Use the deployer ${target.provider === 'gcp' ? 'service account' : 'IAM role'} generated for this team.`,
    })
  }
}

function authorizationLocation(
  provider: ByocProvider,
  project: CloudProjectAuthorization
): ByocLocation | undefined {
  if (provider === 'aws') {
    const location: ByocAwsLocation = {
      provider: 'aws',
      region: project.default_region,
    }
    return project.default_zone === '' &&
      awsLocationSchema.safeParse(location).success
      ? location
      : undefined
  }
  if (provider !== 'gcp') return undefined
  const location: ByocGcpLocation = {
    provider: 'gcp',
    region: project.default_region,
    zone: project.default_zone,
  }
  return isValidGcpLocation(location) ? location : undefined
}

function isConfiguredConnection(
  connection: CloudConnection,
  teamId: string,
  target: ByocTarget
) {
  if (connection.provider !== target.provider) return false
  const awsRole =
    target.provider === 'aws'
      ? tryParseAwsRoleArn(connection.subject_email)
      : undefined
  return (
    connection.team_id === teamId &&
    (target.provider === 'gcp' || connection.mode === 'web_identity') &&
    (target.provider === 'gcp' ||
      awsRole?.roleName === target.deployerAccountId) &&
    connection.authorized_projects.some((project) => {
      return (
        (target.provider === 'gcp' ||
          awsRole?.accountId === project.project_id) &&
        project.default_region === target.region &&
        (target.provider === 'gcp'
          ? project.default_zone === target.zone
          : project.default_zone === '') &&
        project.namespace === target.namespace &&
        project.domain_name === target.domainName &&
        project.prefix === target.prefix
      )
    })
  )
}

function assertConfiguredConnection(
  connection: CloudConnection,
  teamId: string,
  target: ByocTarget
) {
  if (!isConfiguredConnection(connection, teamId, target)) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Cloud connection is missing the approved BYOC target project.',
    })
  }
}

function assertConfiguredDeployment(
  deployment: Deployment,
  teamId: string,
  targets: ByocTarget[]
) {
  if (deployment.team_id !== teamId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'BYOC deployment resource not found.',
    })
  }
  if (!configuredTargetForDeployment(deployment, targets)) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Deployment target does not match the configured BYOC target.',
    })
  }
}

function assertDeploymentDeployerIdentity(
  deployment: Deployment,
  target: ByocTarget
) {
  if (target.provider === 'gcp') {
    assertExpectedDeployerIdentity(
      deployment.deployer_service_account.email,
      target
    )
    return
  }
  if (!deployment.aws) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Deployment target metadata is inconsistent.',
    })
  }
  assertExpectedDeployerIdentity(deployment.aws.role_arn, target)
}

function assertAllowedDeployment(deployment: Deployment, teamId: string) {
  if (deployment.team_id !== teamId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'BYOC deployment resource not found.',
    })
  }
  const account = deployment.prefix.replace(/-+$/, '')
  const validProviderMetadata =
    deployment.provider === 'gcp'
      ? deployment.gcp.project_id !== '' &&
        deployment.deployer_service_account.project_id ===
          deployment.gcp.project_id &&
        deployment.deployer_service_account.account_id === account &&
        deployment.deployer_service_account.email ===
          `${account}@${deployment.gcp.project_id}.iam.gserviceaccount.com`
      : deployment.provider === 'aws' &&
        deployment.aws !== undefined &&
        deployment.cloud_project_id === deployment.aws.account_id &&
        awsRegionSchema.safeParse(deployment.aws.region).success &&
        tryParseAwsRoleArn(deployment.aws.role_arn)?.accountId ===
          deployment.aws.account_id &&
        tryParseAwsRoleArn(deployment.aws.role_arn)?.roleName === account
  if (
    !validProviderMetadata ||
    !deployment.domain_name.startsWith(`${account}.`)
  ) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Deployment target metadata is inconsistent.',
    })
  }
}

function sanitizeDeployment(deployment: RunnerDeployment): Deployment {
  const terraformBackend = sanitizeTerraformBackend(
    deployment.terraform_backend_configs
  )
  return {
    id: deployment.id,
    client_request_id: deployment.client_request_id,
    team_id: deployment.team_id,
    cloud_connection_id: deployment.cloud_connection_id,
    cloud_project_id: deployment.cloud_project_id,
    provider: deployment.provider,
    gcp: {
      project_id: deployment.gcp?.project_id ?? '',
      region: deployment.gcp?.region ?? '',
      zone: deployment.gcp?.zone ?? '',
    },
    ...(deployment.aws && {
      aws: {
        account_id: deployment.aws.account_id,
        region: deployment.aws.region,
        role_arn: deployment.aws.role_arn,
      },
    }),
    domain_name: deployment.domain_name,
    prefix: deployment.prefix,
    deployer_service_account: {
      account_id: deployment.deployer_service_account?.account_id ?? '',
      email: deployment.deployer_service_account?.email ?? '',
      display_name: deployment.deployer_service_account?.display_name ?? '',
      project_id: deployment.deployer_service_account?.project_id ?? '',
      status: deployment.deployer_service_account?.status ?? '',
      roles: [...(deployment.deployer_service_account?.roles ?? [])],
    },
    terraform_settings: deployment.terraform_settings
      ? {
          api_node_count: deployment.terraform_settings.api_node_count,
          api_machine_type: deployment.terraform_settings.api_machine_type,
          client_node_count: deployment.terraform_settings.client_node_count,
          client_machine_type:
            deployment.terraform_settings.client_machine_type,
          clickhouse_node_count:
            deployment.terraform_settings.clickhouse_node_count,
          clickhouse_machine_type:
            deployment.terraform_settings.clickhouse_machine_type,
        }
      : undefined,
    terraform_plan_text: deployment.terraform_plan_text,
    ...(terraformBackend && { terraform_backend: terraformBackend }),
    cluster_id: deployment.cluster_id,
    cluster_endpoint: deployment.cluster_endpoint,
    status: deployment.status,
    error: deployment.error,
    created_at: deployment.created_at,
    updated_at: deployment.updated_at,
  }
}

function sanitizeTerraformBackend(configs?: string[]) {
  if (!configs) return undefined

  const metadata: NonNullable<Deployment['terraform_backend']> = {}
  for (const config of configs) {
    const separator = config.indexOf('=')
    if (separator <= 0) continue
    const key = config.slice(0, separator).trim()
    const value = config.slice(separator + 1).trim()
    if (!value) continue
    if (
      key === 'bucket' &&
      value.length <= 222 &&
      /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(value)
    ) {
      metadata.bucket = value
    }
    if (
      (key === 'prefix' || key === 'key') &&
      value.length <= 1024 &&
      /^[A-Za-z0-9._/-]+$/.test(value)
    ) {
      metadata[key] = value
    }
  }
  return metadata.bucket || metadata.prefix || metadata.key
    ? metadata
    : undefined
}

function configuredTargetForDeployment(
  deployment: Deployment,
  targets: ByocTarget[]
) {
  return targets.find((target) => {
    if (
      target.provider !== deployment.provider ||
      deployment.domain_name !== target.domainName ||
      deployment.prefix !== target.prefix
    ) {
      return false
    }
    if (target.provider === 'gcp') {
      return (
        deployment.gcp.region === target.region &&
        deployment.gcp.zone === target.zone &&
        deployment.deployer_service_account.project_id ===
          deployment.gcp.project_id
      )
    }
    return (
      deployment.aws?.region === target.region &&
      deployment.cloud_project_id === deployment.aws.account_id &&
      tryParseAwsRoleArn(deployment.aws.role_arn)?.accountId ===
        deployment.aws.account_id &&
      tryParseAwsRoleArn(deployment.aws.role_arn)?.roleName ===
        target.deployerAccountId
    )
  })
}

function deploymentLocation(deployment: Deployment): ByocLocation {
  if (deployment.provider === 'aws' && deployment.aws) {
    return { provider: 'aws', region: deployment.aws.region }
  }
  if (deployment.provider === 'gcp') {
    return {
      provider: 'gcp',
      region: deployment.gcp.region,
      zone: deployment.gcp.zone,
    }
  }
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: 'Deployment target metadata is inconsistent.',
  })
}

function deploymentCloudAccountID(deployment: Deployment) {
  return deployment.provider === 'aws'
    ? deployment.aws?.account_id
    : deployment.gcp.project_id
}

const supportedMachineTypes: Record<
  ByocProvider,
  Record<'api' | 'client' | 'clickhouse', ReadonlySet<string>>
> = {
  gcp: {
    api: new Set(['e2-standard-4', 'e2-standard-8', 'n2-standard-8']),
    client: new Set(['n2-standard-8', 'n2-standard-16', 'n2-highmem-8']),
    clickhouse: new Set(['e2-standard-4', 'e2-standard-8', 'n2-standard-8']),
  },
  aws: {
    api: new Set(['t3.xlarge', 'm7i.2xlarge', 'm7i.4xlarge']),
    client: new Set(['m8i.4xlarge', 'm8i.8xlarge', 'm8i.12xlarge']),
    clickhouse: new Set(['t3.xlarge', 'm7i.2xlarge', 'm7i.4xlarge']),
  },
}

function assertTopologyForProvider(
  provider: ByocProvider,
  settings: TerraformSettings
) {
  const values = [
    ['api', settings.api_machine_type],
    ['client', settings.client_machine_type],
    ['clickhouse', settings.clickhouse_machine_type],
  ] as const
  for (const [role, machineType] of values) {
    if (
      machineType &&
      !supportedMachineTypes[provider][role].has(machineType)
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `${machineType} is not a supported ${provider.toUpperCase()} ${role} machine type.`,
      })
    }
  }
}
