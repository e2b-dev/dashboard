'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { cn } from '@/lib/utils'
import type { TRPCRouterOutputs } from '@/trpc/client'
import { useTRPC } from '@/trpc/client'
import { CodeBlock } from '@/ui/code-block'
import { Button } from '@/ui/primitives/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card'
import {
  CheckCircleIcon,
  CloudIcon,
  KeyIcon,
  RefreshIcon,
  TerminalIcon,
  WarningIcon,
} from '@/ui/primitives/icons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'

type Deployment = TRPCRouterOutputs['byoc']['listDeployments'][number]
type DeploymentEvent = TRPCRouterOutputs['byoc']['listEvents'][number]
type HealthStatus = 'healthy' | 'checking' | 'waiting' | 'warning' | 'failed'

const MATT_DEV_PROJECT_ID = 'e2b-dev-matt'
const E2B_PRINCIPAL =
  'serviceAccount:byoc-testing-deployer@e2b-dev-matt.iam.gserviceaccount.com'
const DEFAULT_DEPLOYER_SA = 'e2b-byoc-deployer'
const bootstrapRoles = [
  'roles/serviceusage.serviceUsageAdmin',
  'roles/compute.admin',
  'roles/storage.admin',
  'roles/secretmanager.admin',
  'roles/artifactregistry.admin',
  'roles/certificatemanager.owner',
  'roles/redis.admin',
  'roles/networkconnectivity.admin',
  'roles/iam.serviceAccountAdmin',
  'roles/iam.serviceAccountKeyAdmin',
  'roles/resourcemanager.projectIamAdmin',
  'roles/monitoring.admin',
  'roles/logging.admin',
]
function bootstrapCommand({
  deployerServiceAccount = DEFAULT_DEPLOYER_SA,
  e2bPrincipal = E2B_PRINCIPAL,
  projectId = MATT_DEV_PROJECT_ID,
}: {
  deployerServiceAccount?: string
  e2bPrincipal?: string
  projectId?: string
}) {
  return `export PROJECT_ID="${projectId}"
export DEPLOYER_SA="${deployerServiceAccount}"
export E2B_PRINCIPAL="${e2bPrincipal}"

gcloud services enable \\
  iam.googleapis.com \\
  cloudresourcemanager.googleapis.com \\
  serviceusage.googleapis.com \\
  --project="$PROJECT_ID"

gcloud iam service-accounts create "$DEPLOYER_SA" \\
  --project="$PROJECT_ID" \\
  --display-name="E2B BYOC deployer"

for ROLE in \\
  ${bootstrapRoles.join(' \\\n  ')}
do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \\
    --member="serviceAccount:\${DEPLOYER_SA}@\${PROJECT_ID}.iam.gserviceaccount.com" \\
    --role="$ROLE" \\
    --condition=None
done

gcloud iam service-accounts add-iam-policy-binding \\
  "\${DEPLOYER_SA}@\${PROJECT_ID}.iam.gserviceaccount.com" \\
  --project="$PROJECT_ID" \\
  --member="$E2B_PRINCIPAL" \\
  --role="roles/iam.serviceAccountTokenCreator"`
}

function bootstrapTerraform({
  deployerServiceAccount = DEFAULT_DEPLOYER_SA,
  e2bPrincipal = E2B_PRINCIPAL,
  projectId = MATT_DEV_PROJECT_ID,
}: {
  deployerServiceAccount?: string
  e2bPrincipal?: string
  projectId?: string
}) {
  return `terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.50.0"
    }
  }
}

variable "project_id" {
  type    = string
  default = "${projectId}"
}

variable "deployer_account_id" {
  type    = string
  default = "${deployerServiceAccount}"
}

variable "e2b_principal" {
  type    = string
  default = "${e2bPrincipal}"
}

provider "google" {
  project = var.project_id
}

locals {
  bootstrap_apis = toset([
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
  ])

  byoc_deployer_roles = toset([
    ${bootstrapRoles.map((role) => `"${role}"`).join(',\n    ')}
  ])
}

resource "google_project_service" "bootstrap" {
  for_each = local.bootstrap_apis

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_service_account" "byoc_deployer" {
  project      = var.project_id
  account_id   = var.deployer_account_id
  display_name = "E2B BYOC deployer"
}

resource "google_project_iam_member" "byoc_deployer_roles" {
  for_each = local.byoc_deployer_roles

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:\${google_service_account.byoc_deployer.email}"

  depends_on = [google_project_service.bootstrap]
}

resource "google_service_account_iam_member" "e2b_impersonation" {
  service_account_id = google_service_account.byoc_deployer.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = var.e2b_principal
}

output "byoc_deployer_service_account" {
  value = google_service_account.byoc_deployer.email
}`
}

export function ByocDeploymentPanel() {
  const { teamSlug } = useRouteParams<'/dashboard/[teamSlug]/byoc'>()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>()
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>()
  const [deployingDeploymentId, setDeployingDeploymentId] = useState<string>()
  const [destroyConfirmation, setDestroyConfirmation] = useState('')

  const targetQuery = useQuery(trpc.byoc.target.queryOptions({ teamSlug }))
  const healthQuery = useQuery(trpc.byoc.health.queryOptions({ teamSlug }))
  const connectionsQuery = useQuery(
    trpc.byoc.listCloudConnections.queryOptions({ teamSlug })
  )
  const deploymentsQuery = useQuery(
    trpc.byoc.listDeployments.queryOptions({ teamSlug })
  )

  const connection = useMemo(() => {
    return (
      connectionsQuery.data?.find((item) => item.id === selectedConnectionId) ??
      latestByTimestamp(connectionsQuery.data)
    )
  }, [connectionsQuery.data, selectedConnectionId])

  const projectsQuery = useQuery({
    ...trpc.byoc.listProjects.queryOptions({
      teamSlug,
      connectionId: connection?.id ?? '',
    }),
    enabled: !!connection?.id,
  })

  const deployment = useMemo(() => {
    return (
      deploymentsQuery.data?.find((item) => item.id === selectedDeploymentId) ??
      latestByTimestamp(deploymentsQuery.data)
    )
  }, [deploymentsQuery.data, selectedDeploymentId])

  const eventsQuery = useQuery({
    ...trpc.byoc.listEvents.queryOptions({
      teamSlug,
      deploymentId: deployment?.id ?? emptyUuid,
    }),
    enabled: !!deployment?.id,
    refetchInterval:
      deployment &&
      (isActive(deployment) || deployingDeploymentId === deployment.id)
        ? 1500
        : false,
  })

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries(
        trpc.byoc.listCloudConnections.queryFilter({ teamSlug })
      ),
      queryClient.invalidateQueries(
        trpc.byoc.listDeployments.queryFilter({ teamSlug })
      ),
      deployment?.id
        ? queryClient.invalidateQueries(
            trpc.byoc.listEvents.queryFilter({
              teamSlug,
              deploymentId: deployment.id,
            })
          )
        : Promise.resolve(),
    ])
  }

  const createConnection = useMutation(
    trpc.byoc.createCloudConnection.mutationOptions({
      onSuccess: async (data) => {
        setSelectedConnectionId(data.id)
        await refresh()
      },
    })
  )

  const createDeployment = useMutation(
    trpc.byoc.createDeployment.mutationOptions({
      onSuccess: async (data) => {
        setSelectedDeploymentId(data.id)
        await refresh()
      },
    })
  )

  const deploy = useMutation(
    trpc.byoc.deploy.mutationOptions({
      onMutate: (variables) => {
        setDeployingDeploymentId(variables.deploymentId)
      },
      onSuccess: async (data) => {
        setSelectedDeploymentId(data.deployment.id)
        await refresh()
      },
      onSettled: () => {
        setDeployingDeploymentId(undefined)
      },
    })
  )

  const destroy = useMutation(
    trpc.byoc.destroy.mutationOptions({
      onSuccess: async (data) => {
        setSelectedDeploymentId(data.deployment.id)
        setDestroyConfirmation('')
        await refresh()
      },
    })
  )

  const selectedProject = projectsQuery.data?.find(
    (project) => project.id === MATT_DEV_PROJECT_ID
  )
  const selectedProjectPrincipal =
    selectedProject?.e2b_principal ?? E2B_PRINCIPAL
  const healthChecks = useMemo(
    () =>
      buildHealthChecks({
        connection: !!connection,
        deployment,
        events: eventsQuery.data ?? [],
        project: !!selectedProject,
        runnerHealthy: healthQuery.data?.status === 'ok',
      }),
    [
      connection,
      deployment,
      eventsQuery.data,
      healthQuery.data?.status,
      selectedProject,
    ]
  )
  const canCreateDeployment = !!connection?.id && !!selectedProject
  const canDeploy =
    !!deployment?.id &&
    !isActive(deployment) &&
    canRunDeploy(deployment) &&
    !deploy.isPending
  const canDestroy =
    !!deployment?.id &&
    !isActive(deployment) &&
    deployment.status !== 'destroyed' &&
    destroyConfirmation === 'destroy'
  const error =
    mutationError(createConnection.error) ??
    mutationError(createDeployment.error) ??
    mutationError(deploy.error) ??
    mutationError(destroy.error) ??
    queryError(targetQuery.error) ??
    queryError(healthQuery.error) ??
    queryError(connectionsQuery.error) ??
    queryError(projectsQuery.error) ??
    queryError(deploymentsQuery.error) ??
    (eventsQuery.data?.length ? undefined : queryError(eventsQuery.error))

  return (
    <main className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 border-b border-stroke pb-5 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-[680px] flex-col gap-2">
          <div className="flex items-center gap-2">
            <CloudIcon className="size-5 text-icon" />
            <h1 className="prose-headline-medium">Bring Your Own Compute</h1>
          </div>
          <p className="prose-body text-fg-secondary">
            Authorize a cloud project, deploy a dedicated BYOC region, and
            attach it to this team after health checks pass.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void refresh()}
          loading={
            deploymentsQuery.isFetching || eventsQuery.isFetching
              ? 'Refreshing'
              : undefined
          }
        >
          <RefreshIcon />
          Refresh
        </Button>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <TargetCell label="Project" value={targetQuery.data?.projectId} />
        <TargetCell label="Region" value={targetQuery.data?.region} />
        <TargetCell label="Zone" value={targetQuery.data?.zone} />
        <TargetCell label="Namespace" value={targetQuery.data?.namespace} />
      </section>

      <div className="rounded-md border border-stroke bg-bg-1 p-3">
        <div className="prose-caption uppercase text-fg-tertiary">
          Region policy
        </div>
        <p className="prose-body mt-1 text-fg-secondary">
          Each team can attach one BYOC region at a time. Deploying a different
          region should create a new cluster and replace the team's active BYOC
          cluster after validation.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-accent-error-highlight/35 bg-accent-error-highlight/10 p-3 text-fg">
          <WarningIcon className="mt-0.5 size-4 text-accent-error-highlight" />
          <p className="prose-body">{error}</p>
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card variant="layer" className="rounded-lg">
          <CardHeader>
            <CardTitle>Cloud Access</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <StepStatus
              label="Runner"
              value={healthQuery.data?.status === 'ok' ? 'healthy' : 'pending'}
            />
            <StepStatus
              label="Connection"
              value={connection ? connection.subject_email : 'not connected'}
            />
            <StepStatus
              label="Project"
              value={
                selectedProject
                  ? `${selectedProject.name} (${selectedProject.id})`
                  : 'not selected'
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => createConnection.mutate({ teamSlug })}
                loading={createConnection.isPending ? 'Connecting' : undefined}
              >
                <CloudIcon />
                Connect Google Cloud
              </Button>
              {connection ? (
                <Button
                  variant="secondary"
                  disabled={!canCreateDeployment}
                  onClick={() =>
                    createDeployment.mutate({
                      teamSlug,
                      connectionId: connection.id,
                      projectId: MATT_DEV_PROJECT_ID,
                    })
                  }
                  loading={createDeployment.isPending ? 'Creating' : undefined}
                >
                  Create deployment
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card variant="layer" className="rounded-lg">
          <CardHeader>
            <CardTitle>Deployment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <DeploymentSummary deployment={deployment} />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!canDeploy}
                onClick={() =>
                  deployment?.id &&
                  deploy.mutate({ teamSlug, deploymentId: deployment.id })
                }
                loading={deploy.isPending ? 'Deploying' : undefined}
              >
                Deploy BYOC
              </Button>
              <Button
                variant="error"
                disabled={!canDestroy}
                onClick={() =>
                  deployment?.id &&
                  destroy.mutate({ teamSlug, deploymentId: deployment.id })
                }
                loading={destroy.isPending ? 'Destroying' : undefined}
              >
                Destroy BYOC
              </Button>
            </div>
            {deployment?.id && deployment.status !== 'destroyed' ? (
              <label className="flex max-w-[320px] flex-col gap-1">
                <span className="prose-caption uppercase text-fg-tertiary">
                  Type destroy to enable cleanup
                </span>
                <input
                  className="h-9 rounded-md border border-stroke bg-bg px-3 font-mono text-sm text-fg outline-none transition-colors placeholder:text-fg-tertiary focus:border-stroke-active"
                  onChange={(event) =>
                    setDestroyConfirmation(event.currentTarget.value)
                  }
                  placeholder="destroy"
                  value={destroyConfirmation}
                />
              </label>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card variant="layer" className="rounded-lg">
        <CardHeader>
          <CardTitle>BYOC Health</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {healthChecks.map((check) => (
            <HealthCell
              key={check.label}
              detail={check.detail}
              label={check.label}
              status={check.status}
              value={check.value}
            />
          ))}
        </CardContent>
      </Card>

      <Card variant="layer" className="rounded-lg">
        <CardHeader>
          <CardTitle>Bootstrap Access</CardTitle>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-start gap-3 rounded-md border border-stroke bg-bg p-3">
              <KeyIcon className="mt-0.5 size-4 shrink-0 text-icon" />
              <div className="min-w-0">
                <p className="prose-body font-medium text-fg">
                  Create one deployer service account in the selected project.
                </p>
                <p className="prose-body mt-1 text-fg-secondary">
                  E2B gets impersonation on that account only. The dashboard
                  does not need a service account JSON key for the intended GCP
                  flow.
                </p>
              </div>
            </div>
            <Tabs defaultValue="gcloud" className="min-w-0 gap-3">
              <TabsList className="h-9 w-fit gap-5 border-b-0 bg-bg p-0 max-md:px-0">
                <TabsTrigger layoutkey="byoc-access-tabs" value="gcloud">
                  gcloud
                </TabsTrigger>
                <TabsTrigger layoutkey="byoc-access-tabs" value="terraform">
                  Terraform
                </TabsTrigger>
              </TabsList>
              <TabsContent value="gcloud" className="mt-0 min-w-0">
                <CodeBlock
                  className="overflow-hidden rounded-md"
                  icon={<TerminalIcon />}
                  title="GCP bootstrap command"
                  viewportProps={{ className: 'max-h-[360px]' }}
                >
                  {bootstrapCommand({
                    e2bPrincipal: selectedProjectPrincipal,
                    projectId: selectedProject?.id ?? MATT_DEV_PROJECT_ID,
                  })}
                </CodeBlock>
              </TabsContent>
              <TabsContent value="terraform" className="mt-0 min-w-0">
                <CodeBlock
                  className="overflow-hidden rounded-md"
                  icon={<TerminalIcon />}
                  lang="hcl"
                  title="Terraform bootstrap snippet"
                  viewportProps={{ className: 'max-h-[360px]' }}
                >
                  {bootstrapTerraform({
                    e2bPrincipal: selectedProjectPrincipal,
                    projectId: selectedProject?.id ?? MATT_DEV_PROJECT_ID,
                  })}
                </CodeBlock>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <Card variant="layer" className="rounded-lg">
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col divide-y divide-stroke">
            {eventsQuery.data?.length ? (
              eventsQuery.data.map((event) => (
                <div
                  className="grid gap-2 py-3 text-sm md:grid-cols-[80px_160px_1fr]"
                  key={`${event.deployment_id}-${event.sequence}`}
                >
                  <span className="text-fg-tertiary">#{event.sequence}</span>
                  <span className="font-medium text-fg">{event.phase}</span>
                  <span className="text-fg-secondary">{event.message}</span>
                </div>
              ))
            ) : (
              <p className="prose-body text-fg-secondary">
                Create a deployment to start recording runner events.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

const emptyUuid = '00000000-0000-0000-0000-000000000000'

function TargetCell({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md border border-stroke bg-bg-1 p-3">
      <div className="prose-caption uppercase text-fg-tertiary">{label}</div>
      <div className="mt-1 min-w-0 truncate font-mono text-sm text-fg">
        {value ?? 'pending'}
      </div>
    </div>
  )
}

function StepStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="prose-body text-fg-secondary">{label}</span>
      <span className="flex min-w-0 items-center gap-1 text-right text-sm font-medium text-fg">
        <CheckCircleIcon className="size-4 text-accent-success-highlight" />
        <span className="min-w-0 truncate">{value}</span>
      </span>
    </div>
  )
}

function HealthCell({
  detail,
  label,
  status,
  value,
}: {
  detail?: string
  label: string
  status: HealthStatus
  value: string
}) {
  return (
    <div className="min-w-0 rounded-md border border-stroke bg-bg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="prose-caption uppercase text-fg-tertiary">
            {label}
          </div>
          <div className="mt-1 truncate text-sm font-medium text-fg">
            {value}
          </div>
        </div>
        <span
          className={cn(
            'mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full',
            healthStatusClassName(status)
          )}
        />
      </div>
      {detail ? (
        <p className="prose-caption mt-2 line-clamp-2 text-fg-secondary">
          {detail}
        </p>
      ) : null}
    </div>
  )
}

function DeploymentSummary({ deployment }: { deployment?: Deployment }) {
  if (!deployment) {
    return (
      <p className="prose-body text-fg-secondary">
        No deployment draft yet. Create one after connecting Google Cloud.
      </p>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <SummaryRow label="Deployment" value={deployment.id} mono />
      <SummaryRow label="Status" value={deployment.status} />
      <SummaryRow label="Region" value={deployment.gcp.region} mono />
      <SummaryRow label="Zone" value={deployment.gcp.zone} mono />
      <SummaryRow label="Prefix" value={deployment.prefix} mono />
      <SummaryRow label="Domain" value={deployment.domain_name} mono />
      <SummaryRow
        className="md:col-span-2"
        label="Team region policy"
        value={`One active BYOC region per team; this deployment targets ${deployment.gcp.region}.`}
      />
      <SummaryRow
        className="md:col-span-2"
        label="Planned deployer"
        value={deployment.deployer_service_account.email}
        mono
      />
      {deployment.error ? (
        <SummaryRow
          className="md:col-span-2"
          label="Error"
          value={deployment.error}
        />
      ) : null}
    </div>
  )
}

function buildHealthChecks({
  connection,
  deployment,
  events,
  project,
  runnerHealthy,
}: {
  connection: boolean
  deployment?: Deployment
  events: DeploymentEvent[]
  project: boolean
  runnerHealthy: boolean
}) {
  const attached = deployment?.status === 'attached'
  const failed = deployment?.status === 'failed'
  const edgeHealthEvent = findEvent(events, 'health_check', 'passed')
  const clusterEvent = findEvent(events, 'registering_cluster', 'attached')
  const baseTemplateEvent = findEvent(events, 'building_base_template', 'ready')
  const smokeEvent = findEvent(events, 'smoke_testing', 'Sandbox smoke passed')
  const nodeID = smokeEvent?.message.match(/node ([^ ]+)/)?.[1]

  return [
    {
      detail: 'Dashboard can reach the protected Belt deployment service.',
      label: 'Deployer',
      status: runnerHealthy ? 'healthy' : 'failed',
      value: runnerHealthy ? 'reachable' : 'unreachable',
    },
    {
      detail: project
        ? `Selected ${MATT_DEV_PROJECT_ID} in us-central1.`
        : 'Connect Google Cloud and select the approved project.',
      label: 'Project',
      status: project ? 'healthy' : connection ? 'checking' : 'waiting',
      value: project ? 'selected' : 'pending',
    },
    {
      detail: deployment
        ? `Deployment status is ${deployment.status}.`
        : 'Create a deployment draft to start checks.',
      label: 'Deployment',
      status: failed
        ? 'failed'
        : attached
          ? 'healthy'
          : deployment
            ? 'checking'
            : 'waiting',
      value: deployment?.status ?? 'not created',
    },
    {
      detail: edgeHealthEvent?.message ?? 'Waiting for edge health check.',
      label: 'Edge API',
      status: edgeHealthEvent ? 'healthy' : attached ? 'warning' : 'waiting',
      value: edgeHealthEvent ? 'healthy' : 'pending',
    },
    {
      detail:
        clusterEvent?.message ??
        'Cluster registration attaches this team to the BYOC region.',
      label: 'Control plane',
      status: clusterEvent || attached ? 'healthy' : 'waiting',
      value: clusterEvent || attached ? 'attached' : 'pending',
    },
    {
      detail:
        baseTemplateEvent?.message ??
        'Base template build runs after the cluster is attached.',
      label: 'Base template',
      status: baseTemplateEvent ? 'healthy' : attached ? 'warning' : 'waiting',
      value: baseTemplateEvent ? 'ready' : 'pending',
    },
    {
      detail:
        smokeEvent?.message ?? 'Sandbox validation verifies BYOC placement.',
      label: 'Sandbox validation',
      status: smokeEvent ? 'healthy' : attached ? 'warning' : 'waiting',
      value: smokeEvent ? 'passed' : 'pending',
    },
    {
      detail: nodeID
        ? `Latest validation observed node ${nodeID}.`
        : 'Node count needs a backend readiness endpoint; validation currently reports the observed node.',
      label: 'Nodes',
      status: nodeID ? 'healthy' : attached ? 'warning' : 'waiting',
      value: nodeID ? '1 observed' : 'pending',
    },
  ] satisfies Array<{
    detail?: string
    label: string
    status: HealthStatus
    value: string
  }>
}

function findEvent(
  events: DeploymentEvent[],
  phase: string,
  messageIncludes: string
) {
  return events
    .slice()
    .reverse()
    .find(
      (event) =>
        event.phase === phase && event.message.includes(messageIncludes)
    )
}

function healthStatusClassName(status: HealthStatus) {
  switch (status) {
    case 'healthy':
      return 'bg-accent-success-highlight'
    case 'checking':
      return 'bg-accent-main-highlight'
    case 'warning':
      return 'bg-accent-warning-highlight'
    case 'failed':
      return 'bg-accent-error-highlight'
    case 'waiting':
      return 'bg-fg-tertiary'
  }
}

function SummaryRow({
  className,
  label,
  mono,
  value,
}: {
  className?: string
  label: string
  mono?: boolean
  value: string
}) {
  return (
    <div className={cn('min-w-0 rounded-md bg-bg p-3', className)}>
      <div className="prose-caption uppercase text-fg-tertiary">{label}</div>
      <div
        className={cn(
          'mt-1 min-w-0 truncate text-sm text-fg',
          mono && 'font-mono'
        )}
      >
        {value}
      </div>
    </div>
  )
}

function latestByTimestamp<
  T extends { created_at: string; updated_at?: string },
>(items: T[] | undefined) {
  return items?.toSorted((a, b) => {
    const aTime = new Date(a.updated_at ?? a.created_at).getTime()
    const bTime = new Date(b.updated_at ?? b.created_at).getTime()

    return bTime - aTime
  })[0]
}

function isActive(deployment: Deployment) {
  return [
    'planning',
    'preparing_artifacts',
    'waiting_for_nomad',
    'waiting_for_node',
    'applying',
    'health_checking',
    'registering_cluster',
    'building_base_template',
    'smoke_testing',
    'destroying',
  ].includes(deployment.status)
}

function canRunDeploy(deployment: Deployment) {
  return [
    'draft',
    'plan_ready',
    'plan_changed',
    'plan_noop',
    'applied',
    'failed',
  ].includes(deployment.status)
}

function mutationError(error: unknown) {
  return errorMessage(error)
}

function queryError(error: unknown) {
  return errorMessage(error)
}

function errorMessage(error: unknown) {
  if (!error) {
    return undefined
  }

  if (typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }

  return 'BYOC deployment request failed.'
}
