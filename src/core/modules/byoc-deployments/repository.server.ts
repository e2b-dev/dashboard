import { TRPCError } from '@trpc/server'
import { z } from 'zod'

interface ByocTarget {
  deployerAccountId: string
  sdkDomain: string
  region: string
  zone: string
  namespace: string
  domainName: string
  prefix: string
  e2bPrincipal: string
  e2bPrincipals: string[]
}

const byocTargetIdentitySchema = z.object({
  team_id: z.string().min(1).max(128),
  target_key: z.string().regex(/^[a-z][a-z0-9]{11}$/),
  provider: z.literal('gcp'),
  region: z.string().min(1),
  zone: z.string().min(1),
  namespace: z.string().min(1),
  domain_name: z.string().min(1),
  prefix: z.string().min(1),
  deployer_account_id: z.string().min(1),
  e2b_principal: z.string().min(1),
  e2b_principals: z.array(z.string().min(1)).min(1),
})

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
  provider: 'gcp'
  mode: 'keyless_impersonation' | 'mock'
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
  provider: 'gcp'
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
  provider: 'gcp'
  gcp: {
    project_id: string
    region: string
    zone: string
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
  cluster_id?: string
  cluster_endpoint?: string
  status: DeploymentStatus
  error?: string
  created_at: string
  updated_at: string
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
  kind: 'deploy' | 'destroy'
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
  let targetPromise: Promise<ByocTarget> | undefined

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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

    if (!response.ok) {
      throw new TRPCError({
        code: runnerStatusCode(response.status),
        message: getPublicRunnerError(response.status, path),
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

  function getTarget() {
    const desiredTarget = getByocTargetBase()
    const domainBase = requiredEnv('BYOC_DOMAIN_NAME')
    targetPromise ??= request<unknown>('/target-identities', {
      method: 'POST',
      body: JSON.stringify({
        team_id: teamId,
        provider: 'gcp',
        region: desiredTarget.region,
        zone: desiredTarget.zone,
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
    return targetPromise
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
    const target = await getTarget()
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
    const deployment = await request<Deployment>(`/deployments/${deploymentId}`)
    assertConfiguredDeployment(deployment, teamId, [await getTarget()])
    return deployment
  }

  return {
    target() {
      return getTarget()
    },

    health() {
      return request<{ status: string }>('/health')
    },

    async createCloudConnection(
      deployerServiceAccountEmail: string,
      deploymentId: string | undefined,
      clientRequestId: string,
      expectedCloudConnectionId?: string
    ) {
      const target = await getTarget()
      const projectId = serviceAccountProjectId(deployerServiceAccountEmail)
      const deployment = deploymentId
        ? await getOwnedDeployment(deploymentId)
        : undefined
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
      if (deployment && projectId !== deployment.gcp.project_id) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message:
            'The deployer service account must belong to the deployment project.',
        })
      }
      assertExpectedDeployerAccount(
        deployerServiceAccountEmail,
        target.deployerAccountId
      )
      const connection = await createCloudConnectionWithMode(
        request,
        teamId,
        getCloudConnectionMode(),
        deployerServiceAccountEmail,
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
      const target = await getTarget()
      const response = await request<{ cloud_connections: CloudConnection[] }>(
        '/cloud-connections'
      )
      return response.cloud_connections.filter((connection) =>
        isConfiguredConnection(connection, teamId, target)
      )
    },

    async listProjects(connectionId: string) {
      const connection = await getOwnedCloudConnection(connectionId)
      const response = await request<{ projects: CloudProject[] }>(
        `/cloud-connections/${connectionId}/projects`
      )
      const projects = response.projects.filter((project) =>
        isConfiguredProject(project, connection.target)
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
      const target = await getTarget()
      const ownedConnection = await getOwnedCloudConnection(connectionId)
      const connection = ownedConnection.connection
      if (!sameTargetIdentity(ownedConnection.target, target)) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message:
            'Reconnect this project before creating an isolated BYOC deployment.',
        })
      }
      assertExpectedDeployerAccount(
        connection.subject_email,
        target.deployerAccountId
      )
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

      const deployment = await request<Deployment>('/deployments', {
        method: 'POST',
        body: JSON.stringify({
          client_request_id: clientRequestId,
          team_id: teamId,
          cloud_connection_id: connectionId,
          cloud_project_id: projectId,
        }),
      })

      assertConfiguredDeployment(deployment, teamId, [target])
      assertExpectedDeployerAccount(
        deployment.deployer_service_account.email,
        target.deployerAccountId
      )
      return deployment
    },

    async listDeployments() {
      const target = await getTarget()
      const response = await request<{ deployments: Deployment[] }>(
        '/deployments'
      )
      return response.deployments
        .filter((deployment) => deployment.team_id === teamId)
        .filter((deployment) => {
          try {
            assertConfiguredDeployment(deployment, teamId, [target])
            return true
          } catch {
            return false
          }
        })
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
      await getOwnedDeployment(deploymentId)
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
  deployerServiceAccountEmail: string,
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
      provider: 'gcp',
      mode,
      subject_email: deployerServiceAccountEmail,
      authorized_projects: [
        {
          project_id: projectId,
          name: projectId,
          default_region: target.region,
          default_zone: target.zone,
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

function getCloudConnectionMode(): CloudConnection['mode'] {
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

function getPublicRunnerError(status: number, path: string) {
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
    return 'Could not verify the deployer service account. Check its Token Creator binding and try again.'
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
  if (!/^[a-z][a-z0-9]{11}$/.test(identity.target_key)) {
    throw new TRPCError({
      code: 'BAD_GATEWAY',
      message: 'BYOC deployments runner returned an invalid target key.',
    })
  }
  const resourceStem = `t${identity.target_key}`
  const target: ByocTarget = {
    region: identity.region,
    zone: identity.zone,
    namespace: identity.namespace,
    domainName: identity.domain_name,
    prefix: identity.prefix,
    deployerAccountId: identity.deployer_account_id,
    e2bPrincipal: identity.e2b_principal,
    e2bPrincipals: identity.e2b_principals,
    sdkDomain,
  }
  if (
    identity.provider !== 'gcp' ||
    target.region !== desired.region ||
    target.zone !== desired.zone ||
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

function sameStringSet(left: string[], right: string[]) {
  return (
    left.length === right.length && left.every((value) => right.includes(value))
  )
}

function getByocTargetBase(): Pick<
  ByocTarget,
  'region' | 'zone' | 'e2bPrincipal' | 'e2bPrincipals'
> {
  const e2bPrincipal = requiredEnv('BYOC_E2B_PRINCIPAL')
  const additionalPrincipals = process.env.BYOC_E2B_PRINCIPALS?.split(',')
    .map((principal) => principal.trim())
    .filter(Boolean)
  return {
    region: requiredEnv('BYOC_GCP_REGION'),
    zone: requiredEnv('BYOC_GCP_ZONE'),
    e2bPrincipal,
    e2bPrincipals: [
      ...new Set([e2bPrincipal, ...(additionalPrincipals ?? [])]),
    ],
  }
}

function sameTargetIdentity(left: ByocTarget, right: ByocTarget) {
  return (
    left.region === right.region &&
    left.zone === right.zone &&
    left.namespace === right.namespace &&
    left.domainName === right.domainName &&
    left.prefix === right.prefix
  )
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
  return (
    project.default_region === target.region &&
    project.default_zone === target.zone &&
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

function assertExpectedDeployerAccount(email: string, accountId: string) {
  if (email.slice(0, email.lastIndexOf('@')) !== accountId) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Use the deployer service account generated for this team.',
    })
  }
}

function isConfiguredConnection(
  connection: CloudConnection,
  teamId: string,
  target: ByocTarget
) {
  return (
    connection.team_id === teamId &&
    connection.authorized_projects.some((project) => {
      return (
        project.default_region === target.region &&
        project.default_zone === target.zone &&
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

function configuredTargetForDeployment(
  deployment: Deployment,
  targets: ByocTarget[]
) {
  if (
    deployment.provider !== 'gcp' ||
    deployment.deployer_service_account.project_id !== deployment.gcp.project_id
  ) {
    return undefined
  }

  return targets.find(
    (target) =>
      deployment.gcp.region === target.region &&
      deployment.gcp.zone === target.zone &&
      deployment.domain_name === target.domainName &&
      deployment.prefix === target.prefix
  )
}
