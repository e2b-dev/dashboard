import { TRPCError } from '@trpc/server'

const MATT_DEV_PROJECT_ID = 'e2b-dev-matt'
const MATT_DEV_REGION = 'us-central1'
const MATT_DEV_ZONE = 'us-central1-a'
const BYOC_TESTING_NAMESPACE = 'byoc-testing'
const RUNNER_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'e2b-byoc-deployments-h6wbjcn56a-uw.a.run.app',
])

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
  status: DeploymentStatus
  error?: string
  created_at: string
  updated_at: string
}

export interface DeploymentEvent {
  deployment_id: string
  sequence: number
  phase: string
  level: string
  message: string
  created_at: string
}

export interface PlanResponse {
  deployment: Deployment
  executed: boolean
  changed: boolean
  var_file_path?: string
  plan_path?: string
}

export interface ApplyResponse {
  deployment: Deployment
  outputs?: Record<string, unknown>
}

export interface DestroyResponse {
  deployment: Deployment
}

export interface DeployResponse {
  deployment: Deployment
  events: DeploymentEvent[]
}

export function createByocDeploymentsRepository({
  teamId,
}: {
  teamId: string
}) {
  const baseUrl = getRunnerBaseUrl()
  const token = getRunnerToken()

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(new URL(path, baseUrl), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': token,
        ...init.headers,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new TRPCError({
        code: response.status === 404 ? 'NOT_FOUND' : 'BAD_REQUEST',
        message: await getRunnerError(response),
      })
    }

    return (await response.json()) as T
  }

  return {
    target() {
      return {
        projectId: MATT_DEV_PROJECT_ID,
        region: MATT_DEV_REGION,
        zone: MATT_DEV_ZONE,
        namespace: BYOC_TESTING_NAMESPACE,
      }
    },

    health() {
      return request<{ status: string }>('/health')
    },

    async createCloudConnection() {
      const connection = await createCloudConnectionWithMode(
        request,
        teamId,
        getCloudConnectionMode()
      )

      assertMattDevConnection(connection)
      return connection
    },

    async listCloudConnections() {
      const response = await request<{ cloud_connections: CloudConnection[] }>(
        '/cloud-connections'
      )
      return response.cloud_connections.filter(
        (connection) => connection.team_id === teamId
      )
    },

    async listProjects(connectionId: string) {
      const response = await request<{ projects: CloudProject[] }>(
        `/cloud-connections/${connectionId}/projects`
      )
      const projects = response.projects.filter(isMattDevProject)
      if (projects.length === 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'No authorized BYOC project is available.',
        })
      }

      return projects
    },

    async createDeployment(connectionId: string, projectId: string) {
      assertMattDevProjectId(projectId)

      const deployment = await request<Deployment>('/deployments', {
        method: 'POST',
        body: JSON.stringify({
          team_id: teamId,
          cloud_connection_id: connectionId,
          cloud_project_id: projectId,
          domain_name: 'dashboard-byoc-smoke.e2b-test.dev',
          prefix: 'byoc-testing-',
        }),
      })

      assertMattDevDeployment(deployment)
      return deployment
    },

    async listDeployments() {
      const response = await request<{ deployments: Deployment[] }>(
        '/deployments'
      )
      return response.deployments
        .filter((deployment) => deployment.team_id === teamId)
        .filter((deployment) => {
          try {
            assertMattDevDeployment(deployment)
            return true
          } catch {
            return false
          }
        })
    },

    async getDeployment(deploymentId: string) {
      const deployment = await request<Deployment>(
        `/deployments/${deploymentId}`
      )
      assertMattDevDeployment(deployment)
      return deployment
    },

    async listEvents(deploymentId: string) {
      const response = await request<{ events: DeploymentEvent[] }>(
        `/deployments/${deploymentId}/events`
      )
      return response.events
    },

    async deploy(deploymentId: string) {
      const response = await request<DeployResponse>(
        `/deployments/${deploymentId}/deploy`,
        {
          method: 'POST',
          body: JSON.stringify({
            execute: true,
            stages: [
              {
                name: 'base_infra',
                targets: ['module.init', 'module.redis', 'module.cluster'],
              },
              {
                name: 'nomad_services',
                targets: ['module.nomad'],
              },
              {
                name: 'final_converge',
              },
            ],
            wait_for_nomad: true,
            health_check: true,
            register_cluster: true,
            build_base_template: true,
            smoke_test: true,
          }),
        }
      )
      assertMattDevDeployment(response.deployment)
      return response
    },

    async plan(deploymentId: string) {
      const response = await request<PlanResponse>(
        `/deployments/${deploymentId}/plan`,
        {
          method: 'POST',
          body: JSON.stringify({ execute: true }),
        }
      )
      assertMattDevDeployment(response.deployment)
      return response
    },

    async apply(deploymentId: string) {
      const response = await request<ApplyResponse>(
        `/deployments/${deploymentId}/apply`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      )
      assertMattDevDeployment(response.deployment)
      return response
    },

    async destroy(deploymentId: string) {
      const response = await request<DestroyResponse>(
        `/deployments/${deploymentId}/destroy`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      )
      assertMattDevDeployment(response.deployment)
      return response
    },
  }
}

function createCloudConnectionWithMode(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  teamId: string,
  mode: CloudConnection['mode']
) {
  return request<CloudConnection>('/cloud-connections', {
    method: 'POST',
    body: JSON.stringify({
      team_id: teamId,
      provider: 'gcp',
      mode,
      subject_email: 'customer-admin@example.com',
    }),
  })
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
  if (!RUNNER_HOSTS.has(url.hostname)) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'BYOC deployments runner is not an approved matt-dev endpoint.',
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

async function getRunnerError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string }
    return body.error ?? `BYOC deployments runner returned ${response.status}.`
  } catch {
    return `BYOC deployments runner returned ${response.status}.`
  }
}

function isMattDevProject(project: CloudProject) {
  return (
    project.id === MATT_DEV_PROJECT_ID &&
    project.default_region === MATT_DEV_REGION &&
    project.default_zone === MATT_DEV_ZONE &&
    project.namespace === BYOC_TESTING_NAMESPACE
  )
}

function assertMattDevProjectId(projectId: string) {
  if (projectId !== MATT_DEV_PROJECT_ID) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Only the approved BYOC target project is enabled here.',
    })
  }
}

function assertMattDevConnection(connection: CloudConnection) {
  const hasMattDev = connection.authorized_projects.some((project) => {
    return (
      project.project_id === MATT_DEV_PROJECT_ID &&
      project.default_region === MATT_DEV_REGION &&
      project.default_zone === MATT_DEV_ZONE &&
      project.namespace === BYOC_TESTING_NAMESPACE
    )
  })

  if (!hasMattDev) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Cloud connection is missing the approved BYOC target project.',
    })
  }
}

function assertMattDevDeployment(deployment: Deployment) {
  if (
    deployment.provider !== 'gcp' ||
    deployment.gcp.project_id !== MATT_DEV_PROJECT_ID ||
    deployment.gcp.region !== MATT_DEV_REGION ||
    deployment.gcp.zone !== MATT_DEV_ZONE ||
    deployment.deployer_service_account.project_id !== MATT_DEV_PROJECT_ID
  ) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Deployment target is outside matt-dev guardrails.',
    })
  }
}
