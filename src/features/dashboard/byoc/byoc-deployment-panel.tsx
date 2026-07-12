'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { cn } from '@/lib/utils'
import type { TRPCRouterOutputs } from '@/trpc/client'
import { useTRPC } from '@/trpc/client'
import { CodeBlock } from '@/ui/code-block'
import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import {
  CloudIcon,
  RefreshIcon,
  TerminalIcon,
  WarningIcon,
} from '@/ui/primitives/icons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'

type Deployment = TRPCRouterOutputs['byoc']['listDeployments'][number]
type DeploymentEvent = TRPCRouterOutputs['byoc']['listEvents'][number]
type HealthStatus = 'healthy' | 'checking' | 'waiting' | 'warning' | 'failed'
type TopologyDraft = {
  apiNodeCount: number
  apiMachineType: string
  clientNodeCount: number
  clientMachineType: string
  clickHouseNodeCount: number
  clickHouseMachineType: string
}

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
  e2bPrincipal,
  projectId,
}: {
  deployerServiceAccount?: string
  e2bPrincipal: string
  projectId: string
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
  e2bPrincipal,
  projectId,
}: {
  deployerServiceAccount?: string
  e2bPrincipal: string
  projectId: string
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
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false)
  const [deployerServiceAccountEmail, setDeployerServiceAccountEmail] =
    useState('')
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>()
  const [runningDeploymentId, setRunningDeploymentId] = useState<string>()
  const [topologyDraft, setTopologyDraft] = useState<{
    deploymentId: string
    value: TopologyDraft
  }>()
  const [destroyConfirmation, setDestroyConfirmation] = useState({
    deploymentKey: '',
    value: '',
  })

  const targetQuery = useQuery(trpc.byoc.target.queryOptions({ teamSlug }))
  const healthQuery = useQuery(trpc.byoc.health.queryOptions({ teamSlug }))
  const connectionsQuery = useQuery(
    trpc.byoc.listCloudConnections.queryOptions({ teamSlug })
  )
  const deploymentsQuery = useQuery(
    trpc.byoc.listDeployments.queryOptions(
      { teamSlug },
      {
        refetchInterval: (query) =>
          runningDeploymentId || query.state.data?.some(isActive)
            ? 1500
            : false,
      }
    )
  )

  const connection =
    connectionsQuery.data?.find((item) => item.id === selectedConnectionId) ??
    latestByTimestamp(connectionsQuery.data)

  const projectsQuery = useQuery({
    ...trpc.byoc.listProjects.queryOptions({
      teamSlug,
      connectionId: connection?.id ?? '',
    }),
    enabled: !!connection?.id,
  })

  const deployment =
    deploymentsQuery.data?.find((item) => item.id === selectedDeploymentId) ??
    latestByTimestamp(deploymentsQuery.data)

  const savedTopology = topologyFromDeployment(deployment)
  const topology =
    topologyDraft && topologyDraft.deploymentId === deployment?.id
      ? topologyDraft.value
      : savedTopology
  const topologyDirty = !topologiesEqual(topology, savedTopology)
  const updateTopology = (patch: Partial<TopologyDraft>) => {
    setTopologyDraft({
      deploymentId: deployment?.id ?? '',
      value: { ...topology, ...patch },
    })
  }

  const eventsQuery = useQuery({
    ...trpc.byoc.listEvents.queryOptions({
      teamSlug,
      deploymentId: deployment?.id ?? emptyUuid,
    }),
    enabled: !!deployment?.id,
    refetchInterval:
      deployment &&
      (isActive(deployment) || runningDeploymentId === deployment.id)
        ? 1500
        : false,
  })

  const operationsQuery = useQuery({
    ...trpc.byoc.listOperations.queryOptions({
      teamSlug,
      deploymentId: deployment?.id ?? emptyUuid,
    }),
    enabled: !!deployment?.id,
    refetchInterval: (query) =>
      query.state.data?.some((operation) => isActiveOperation(operation.status))
        ? 1500
        : false,
  })
  const activeOperation = operationsQuery.data?.find((operation) =>
    isActiveOperation(operation.status)
  )
  const latestOperation = operationsQuery.data?.[0]

  useEffect(() => {
    if (!deployment?.id || !latestOperation?.updated_at) return
    void queryClient.invalidateQueries(
      trpc.byoc.listDeployments.queryFilter({ teamSlug })
    )
    void queryClient.invalidateQueries(
      trpc.byoc.listEvents.queryFilter({
        teamSlug,
        deploymentId: deployment.id,
      })
    )
  }, [
    deployment?.id,
    latestOperation?.updated_at,
    queryClient,
    teamSlug,
    trpc.byoc.listDeployments,
    trpc.byoc.listEvents,
  ])

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries(
        trpc.byoc.listCloudConnections.queryFilter({ teamSlug })
      ),
      queryClient.invalidateQueries(
        trpc.byoc.listDeployments.queryFilter({ teamSlug })
      ),
      queryClient.invalidateQueries(trpc.byoc.target.queryFilter({ teamSlug })),
      queryClient.invalidateQueries(trpc.byoc.health.queryFilter({ teamSlug })),
      connection?.id
        ? queryClient.invalidateQueries(
            trpc.byoc.listProjects.queryFilter({
              teamSlug,
              connectionId: connection.id,
            })
          )
        : Promise.resolve(),
      deployment?.id
        ? queryClient.invalidateQueries(
            trpc.byoc.listEvents.queryFilter({
              teamSlug,
              deploymentId: deployment.id,
            })
          )
        : Promise.resolve(),
      deployment?.id
        ? queryClient.invalidateQueries(
            trpc.byoc.listOperations.queryFilter({
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
        setConnectionDialogOpen(false)
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
        setRunningDeploymentId(variables.deploymentId)
      },
      onSuccess: async (data) => {
        setSelectedDeploymentId(data.deployment_id)
        await refresh()
      },
      onSettled: () => {
        setRunningDeploymentId(undefined)
      },
    })
  )

  const destroy = useMutation(
    trpc.byoc.destroy.mutationOptions({
      onMutate: (variables) => {
        setRunningDeploymentId(variables.deploymentId)
      },
      onSuccess: async (data) => {
        setSelectedDeploymentId(data.deployment_id)
        setDestroyConfirmation({ deploymentKey: '', value: '' })
        await refresh()
      },
      onSettled: () => {
        setRunningDeploymentId(undefined)
      },
    })
  )

  const selectedProject = projectsQuery.data?.find(
    (project) => project.id === targetQuery.data?.projectId
  )
  const selectedProjectPrincipal =
    selectedProject?.e2b_principal ??
    connection?.authorized_projects[0]?.e2b_principal
  const deploymentKey = `${teamSlug}:${deployment?.id ?? ''}`
  const destroyConfirmationValue =
    destroyConfirmation.deploymentKey === deploymentKey
      ? destroyConfirmation.value
      : ''
  const healthChecks = buildHealthChecks({
    connection: !!connection,
    deployment,
    events: eventsQuery.data ?? [],
    project: !!selectedProject,
    runnerHealthy: healthQuery.data?.status === 'ok',
    target: targetQuery.data,
  })
  const operationPending =
    createDeployment.isPending ||
    deploy.isPending ||
    destroy.isPending ||
    !!activeOperation ||
    (!!deployment?.id && operationsQuery.isPending) ||
    operationsQuery.isError
  const selectedDeploymentActive = deployment ? isActive(deployment) : false
  const anyDeploymentActive = deploymentsQuery.data?.some(isActive) ?? false
  const canCreateDeployment =
    !!connection?.id &&
    !!selectedProject &&
    !operationPending &&
    !anyDeploymentActive &&
    !deploymentsQuery.data?.some((item) => item.status !== 'destroyed')
  const canDeploy =
    !!deployment?.id &&
    !selectedDeploymentActive &&
    canRunDeploy(deployment) &&
    !operationPending &&
    (deployment?.status !== 'attached' || topologyDirty)
  const canDestroy =
    !!deployment?.id &&
    !selectedDeploymentActive &&
    deployment.status !== 'destroyed' &&
    !operationPending &&
    destroyConfirmationValue === 'destroy'
  const error =
    mutationError(createConnection.error) ??
    mutationError(createDeployment.error) ??
    mutationError(deploy.error) ??
    mutationError(destroy.error) ??
    latestOperation?.error ??
    queryError(targetQuery.error) ??
    queryError(healthQuery.error) ??
    queryError(connectionsQuery.error) ??
    queryError(projectsQuery.error) ??
    queryError(deploymentsQuery.error) ??
    queryError(operationsQuery.error) ??
    (eventsQuery.data?.length ? undefined : queryError(eventsQuery.error))
  const runDeploy = () => {
    if (!deployment) return
    deploy.mutate({
      teamSlug,
      deploymentId: deployment.id,
      topology,
    })
  }

  return (
    <main className="flex min-w-0 flex-col gap-4">
      <section className="flex flex-col gap-3 border-b border-stroke pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="prose-headline-medium">BYOC</h1>
            <StatusBadge status={deployment?.status} />
          </div>
          <p className="mt-1 truncate text-sm text-fg-secondary">
            {deployment
              ? `${deployment.gcp.region} · ${deployment.domain_name}`
              : 'Deploy and operate a dedicated E2B region.'}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
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
          {!connection ? (
            <Button
              disabled={operationPending || anyDeploymentActive}
              onClick={() => setConnectionDialogOpen(true)}
              loading={createConnection.isPending ? 'Connecting' : undefined}
            >
              <CloudIcon />
              Connect GCP
            </Button>
          ) : !deployment ? (
            <Button
              disabled={!canCreateDeployment}
              onClick={() =>
                createDeployment.mutate({
                  teamSlug,
                  connectionId: connection.id,
                  projectId: targetQuery.data?.projectId ?? '',
                })
              }
              loading={createDeployment.isPending ? 'Creating' : undefined}
            >
              Create deployment
            </Button>
          ) : (
            <Button
              disabled={!canDeploy}
              onClick={runDeploy}
              loading={deploy.isPending ? 'Deploying' : undefined}
            >
              {deployment.status === 'attached'
                ? topologyDirty
                  ? 'Apply changes'
                  : 'No changes'
                : deployment.status === 'failed'
                  ? 'Retry deployment'
                  : 'Deploy'}
            </Button>
          )}
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-accent-error-highlight/35 bg-accent-error-highlight/10 p-3 text-fg">
          <WarningIcon className="mt-0.5 size-4 shrink-0 text-accent-error-highlight" />
          <p className="prose-body whitespace-pre-wrap">{error}</p>
        </div>
      ) : null}

      <Tabs defaultValue="overview" className="min-w-0 gap-4">
        <TabsList className="h-10 w-full justify-start gap-5 overflow-x-auto border-b border-stroke bg-transparent p-0 max-md:px-0">
          <TabsTrigger layoutkey="byoc-main-tabs" value="overview">
            Overview
          </TabsTrigger>
          <TabsTrigger layoutkey="byoc-main-tabs" value="configuration">
            Configuration
          </TabsTrigger>
          <TabsTrigger layoutkey="byoc-main-tabs" value="activity">
            Activity
          </TabsTrigger>
          <TabsTrigger layoutkey="byoc-main-tabs" value="access">
            Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 min-w-0">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
            <Card variant="layer" className="rounded-lg">
              <CardHeader>
                <CardTitle>Current operation</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <OperationSummary
                  deployment={deployment}
                  events={eventsQuery.data ?? []}
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {healthChecks.slice(0, 4).map((check) => (
                    <HealthCell key={check.label} {...check} />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card variant="layer" className="rounded-lg">
              <CardHeader>
                <CardTitle>Attachment</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <SummaryRow
                  label="Cluster"
                  value={deployment?.cluster_id ?? 'not attached'}
                  mono
                />
                <SummaryRow
                  label="Endpoint"
                  value={deployment?.cluster_endpoint ?? 'pending'}
                  mono
                />
                <SummaryRow
                  label="Team routing"
                  value={deployment?.cluster_id ? 'attached' : 'pending'}
                />
                <p className="prose-caption text-fg-secondary">
                  Requests resolve this team's cluster ID and connect to the
                  stored cluster endpoint. Capacity is measured separately.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="mt-0 min-w-0">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card variant="layer" className="rounded-lg">
              <CardHeader>
                <CardTitle>Topology</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-3">
                <TopologyControl
                  count={topology.apiNodeCount}
                  label="API nodes"
                  machineType={topology.apiMachineType}
                  machineTypes={[
                    'e2-standard-4',
                    'e2-standard-8',
                    'n2-standard-8',
                  ]}
                  max={20}
                  onCountChange={(apiNodeCount) =>
                    updateTopology({ apiNodeCount })
                  }
                  onMachineTypeChange={(apiMachineType) =>
                    updateTopology({ apiMachineType })
                  }
                />
                <TopologyControl
                  count={topology.clientNodeCount}
                  label="Sandbox nodes"
                  machineType={topology.clientMachineType}
                  machineTypes={[
                    'n2-standard-8',
                    'n2-standard-16',
                    'n2-highmem-8',
                  ]}
                  max={100}
                  onCountChange={(clientNodeCount) =>
                    updateTopology({ clientNodeCount })
                  }
                  onMachineTypeChange={(clientMachineType) =>
                    updateTopology({ clientMachineType })
                  }
                />
                <TopologyControl
                  count={topology.clickHouseNodeCount}
                  label="ClickHouse nodes"
                  machineType={topology.clickHouseMachineType}
                  machineTypes={[
                    'e2-standard-4',
                    'e2-standard-8',
                    'n2-standard-8',
                  ]}
                  max={10}
                  onCountChange={(clickHouseNodeCount) =>
                    updateTopology({ clickHouseNodeCount })
                  }
                  onMachineTypeChange={(clickHouseMachineType) =>
                    updateTopology({ clickHouseMachineType })
                  }
                />
              </CardContent>
              {deployment ? (
                <CardFooter className="mt-0 justify-between gap-3 border-stroke py-4">
                  <p className="prose-caption text-fg-secondary">
                    {topologyDirty
                      ? 'Topology differs from the attached configuration.'
                      : 'Topology matches the attached configuration.'}
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      disabled={!topologyDirty || operationPending}
                      onClick={() => setTopologyDraft(undefined)}
                      variant="secondary"
                    >
                      Reset
                    </Button>
                    <Button
                      disabled={!canDeploy}
                      loading={deploy.isPending ? 'Applying' : undefined}
                      onClick={runDeploy}
                    >
                      {deployment.status === 'attached'
                        ? 'Apply changes'
                        : 'Deploy'}
                    </Button>
                  </div>
                </CardFooter>
              ) : null}
            </Card>
            <Card variant="layer" className="rounded-lg">
              <CardHeader>
                <CardTitle>Target</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <TargetCell
                  label="Project"
                  value={targetQuery.data?.projectId}
                />
                <TargetCell
                  label="Region / zone"
                  value={
                    targetQuery.data
                      ? `${targetQuery.data.region} / ${targetQuery.data.zone}`
                      : undefined
                  }
                />
                <TargetCell
                  label="Namespace"
                  value={targetQuery.data?.namespace}
                />
                <TargetCell
                  label="Resource prefix"
                  value={targetQuery.data?.prefix}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-0 min-w-0">
          <Card variant="layer" className="rounded-lg">
            <CardHeader>
              <CardTitle>Operation log</CardTitle>
            </CardHeader>
            <CardContent>
              <EventLog events={eventsQuery.data ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="mt-0 min-w-0">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card variant="layer" className="rounded-lg">
              <CardHeader>
                <CardTitle>Bootstrap access</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                <div className="mb-5 flex flex-col gap-3 border-b border-stroke pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Active deployer</p>
                    <p className="truncate font-mono text-sm text-fg-secondary">
                      {deployment?.deployer_service_account.email ??
                        connection?.subject_email ??
                        'not verified'}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setDeployerServiceAccountEmail(
                        deployment?.deployer_service_account.email ??
                          connection?.subject_email ??
                          ''
                      )
                      setConnectionDialogOpen(true)
                    }}
                    variant="secondary"
                  >
                    {connection ? 'Replace connection' : 'Connect GCP'}
                  </Button>
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
                      viewportProps={{ className: 'max-h-[420px]' }}
                    >
                      {bootstrapCommand({
                        deployerServiceAccount:
                          deployment?.deployer_service_account.email.split(
                            '@'
                          )[0] ?? connection?.subject_email.split('@')[0],
                        e2bPrincipal: selectedProjectPrincipal ?? '',
                        projectId:
                          selectedProject?.id ??
                          targetQuery.data?.projectId ??
                          '',
                      })}
                    </CodeBlock>
                  </TabsContent>
                  <TabsContent value="terraform" className="mt-0 min-w-0">
                    <CodeBlock
                      className="overflow-hidden rounded-md"
                      icon={<TerminalIcon />}
                      lang="hcl"
                      title="Terraform bootstrap snippet"
                      viewportProps={{ className: 'max-h-[420px]' }}
                    >
                      {bootstrapTerraform({
                        deployerServiceAccount:
                          deployment?.deployer_service_account.email.split(
                            '@'
                          )[0] ?? connection?.subject_email.split('@')[0],
                        e2bPrincipal: selectedProjectPrincipal ?? '',
                        projectId:
                          selectedProject?.id ??
                          targetQuery.data?.projectId ??
                          '',
                      })}
                    </CodeBlock>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            <Card
              variant="layer"
              className="rounded-lg border-accent-error-highlight/30"
            >
              <CardHeader>
                <CardTitle>Danger zone</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="prose-body text-fg-secondary">
                  Destroy infrastructure and detach this team's cluster.
                </p>
                <input
                  className="h-9 rounded-md border border-stroke bg-bg px-3 font-mono text-sm text-fg outline-none focus:border-stroke-active"
                  disabled={!deployment || deployment.status === 'destroyed'}
                  onChange={(event) =>
                    setDestroyConfirmation({
                      deploymentKey,
                      value: event.currentTarget.value,
                    })
                  }
                  placeholder="Type destroy"
                  value={destroyConfirmationValue}
                />
                <Button
                  variant="error"
                  disabled={!canDestroy}
                  onClick={() =>
                    deployment &&
                    destroy.mutate({ teamSlug, deploymentId: deployment.id })
                  }
                  loading={destroy.isPending ? 'Destroying' : undefined}
                >
                  Destroy BYOC
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ConnectGCPDialog
        deployerServiceAccountEmail={deployerServiceAccountEmail}
        e2bPrincipal={targetQuery.data?.e2bPrincipal ?? ''}
        error={mutationError(createConnection.error)}
        isPending={createConnection.isPending}
        onConnect={() =>
          createConnection.mutate({
            teamSlug,
            deployerServiceAccountEmail,
            deploymentId: deployment?.id,
          })
        }
        onDeployerServiceAccountEmailChange={setDeployerServiceAccountEmail}
        onOpenChange={setConnectionDialogOpen}
        open={connectionDialogOpen}
        projectId={targetQuery.data?.projectId ?? ''}
      />
    </main>
  )
}

function ConnectGCPDialog({
  deployerServiceAccountEmail,
  e2bPrincipal,
  error,
  isPending,
  onConnect,
  onDeployerServiceAccountEmailChange,
  onOpenChange,
  open,
  projectId,
}: {
  deployerServiceAccountEmail: string
  e2bPrincipal: string
  error?: string
  isPending: boolean
  onConnect: () => void
  onDeployerServiceAccountEmailChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
}) {
  const expectedSuffix = projectId
    ? `@${projectId}.iam.gserviceaccount.com`
    : ''
  const validEmail =
    !!expectedSuffix && deployerServiceAccountEmail.endsWith(expectedSuffix)
  const accountId =
    deployerServiceAccountEmail.split('@')[0] || DEFAULT_DEPLOYER_SA

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(760px,90vh)] max-w-2xl overflow-y-auto">
        <DialogHeader className="gap-2 text-left">
          <DialogTitle>Connect Google Cloud</DialogTitle>
          <DialogDescription>
            Create a project-local deployer identity, grant E2B permission to
            impersonate it, then verify the connection.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="byoc-deployer-sa">
              Deployer service account
            </label>
            <input
              autoComplete="off"
              className="h-10 rounded-md border border-stroke bg-bg px-3 font-mono text-sm text-fg outline-none focus:border-stroke-active"
              id="byoc-deployer-sa"
              onChange={(event) =>
                onDeployerServiceAccountEmailChange(event.currentTarget.value)
              }
              placeholder={`${DEFAULT_DEPLOYER_SA}${expectedSuffix}`}
              spellCheck={false}
              value={deployerServiceAccountEmail}
            />
            <p className="prose-caption text-fg-secondary">
              Terraform runs as this identity using short-lived credentials. No
              service-account key is stored.
            </p>
          </div>

          <CodeBlock
            className="overflow-hidden rounded-md"
            icon={<TerminalIcon />}
            title="Bootstrap access"
            viewportProps={{ className: 'max-h-64' }}
          >
            {bootstrapCommand({
              deployerServiceAccount: accountId,
              e2bPrincipal,
              projectId,
            })}
          </CodeBlock>

          {error ? (
            <div className="rounded-md border border-accent-error-highlight/35 bg-accent-error-highlight/10 p-3 text-sm text-fg">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            variant="tertiary"
          >
            Cancel
          </Button>
          <Button
            disabled={!validEmail || !e2bPrincipal || isPending}
            loading={isPending ? 'Verifying' : undefined}
            onClick={onConnect}
          >
            Verify connection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const emptyUuid = '00000000-0000-0000-0000-000000000000'

function topologyFromDeployment(deployment?: Deployment): TopologyDraft {
  return {
    apiNodeCount: deployment?.terraform_settings?.api_node_count ?? 1,
    apiMachineType:
      deployment?.terraform_settings?.api_machine_type ?? 'e2-standard-4',
    clientNodeCount: deployment?.terraform_settings?.client_node_count ?? 1,
    clientMachineType:
      deployment?.terraform_settings?.client_machine_type ?? 'n2-standard-8',
    clickHouseNodeCount:
      deployment?.terraform_settings?.clickhouse_node_count ?? 1,
    clickHouseMachineType:
      deployment?.terraform_settings?.clickhouse_machine_type ??
      'e2-standard-4',
  }
}

function topologiesEqual(left: TopologyDraft, right: TopologyDraft) {
  return (
    left.apiNodeCount === right.apiNodeCount &&
    left.apiMachineType === right.apiMachineType &&
    left.clientNodeCount === right.clientNodeCount &&
    left.clientMachineType === right.clientMachineType &&
    left.clickHouseNodeCount === right.clickHouseNodeCount &&
    left.clickHouseMachineType === right.clickHouseMachineType
  )
}

function StatusBadge({ status }: { status?: Deployment['status'] }) {
  const tone =
    status === 'attached'
      ? 'border-accent-success-highlight/40 bg-accent-success-highlight/10 text-accent-success-highlight'
      : status === 'failed'
        ? 'border-accent-error-highlight/40 bg-accent-error-highlight/10 text-accent-error-highlight'
        : status && isActiveStatus(status)
          ? 'border-accent-main-highlight/40 bg-accent-main-highlight/10 text-accent-main-highlight'
          : 'border-stroke bg-bg-1 text-fg-secondary'

  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-xs font-medium',
        tone
      )}
    >
      {status?.replaceAll('_', ' ') ?? 'not configured'}
    </span>
  )
}

function OperationSummary({
  deployment,
  events,
}: {
  deployment?: Deployment
  events: DeploymentEvent[]
}) {
  const latest = events.at(-1)
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-md border border-stroke bg-bg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium text-fg">
          {deployment
            ? deployment.status.replaceAll('_', ' ')
            : 'Waiting for setup'}
        </div>
        {latest ? (
          <time
            className="prose-caption text-fg-tertiary"
            dateTime={latest.created_at}
          >
            {new Date(latest.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'UTC',
            })}
          </time>
        ) : null}
      </div>
      <p className="prose-body text-fg-secondary">
        {latest?.message ??
          'Connect a GCP project and create a deployment to begin.'}
      </p>
      {deployment?.error ? (
        <p className="line-clamp-3 rounded bg-accent-error-highlight/10 p-2 text-sm text-fg">
          {deployment.error}
        </p>
      ) : null}
    </div>
  )
}

function TopologyControl({
  count,
  label,
  machineType,
  machineTypes,
  max,
  onCountChange,
  onMachineTypeChange,
}: {
  count: number
  label: string
  machineType: string
  machineTypes: string[]
  max: number
  onCountChange: (count: number) => void
  onMachineTypeChange: (machineType: string) => void
}) {
  const options = machineTypes.includes(machineType)
    ? machineTypes
    : [machineType, ...machineTypes]

  return (
    <fieldset className="min-w-0 space-y-3 rounded-md border border-stroke bg-bg p-4">
      <legend className="px-1 text-sm font-medium text-fg">{label}</legend>
      <label className="block space-y-1">
        <span className="prose-caption uppercase text-fg-tertiary">Count</span>
        <input
          className="h-9 w-full rounded-md border border-stroke bg-bg-1 px-3 text-sm text-fg outline-none focus:border-stroke-active"
          max={max}
          min={1}
          onChange={(event) =>
            onCountChange(
              Math.max(1, Math.min(max, event.currentTarget.valueAsNumber || 1))
            )
          }
          type="number"
          value={count}
        />
      </label>
      <div className="space-y-1">
        <span className="prose-caption uppercase text-fg-tertiary">
          Machine type
        </span>
        <Select onValueChange={onMachineTypeChange} value={machineType}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </fieldset>
  )
}

function EventLog({ events }: { events: DeploymentEvent[] }) {
  if (!events.length) {
    return (
      <p className="prose-body text-fg-secondary">
        No deployment activity yet.
      </p>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-stroke">
      {events.toReversed().map((event) => (
        <div
          className="grid gap-1 py-3 text-sm md:grid-cols-[150px_180px_1fr]"
          key={`${event.deployment_id}-${event.sequence}`}
        >
          <time className="text-fg-tertiary" dateTime={event.created_at}>
            {new Date(event.created_at).toLocaleString('en-US', {
              timeZone: 'UTC',
            })}
          </time>
          <span className="font-medium text-fg">
            {event.phase.replaceAll('_', ' ')}
          </span>
          <span
            className={cn(
              'min-w-0 break-words text-fg-secondary',
              event.level === 'warning' && 'text-accent-warning-highlight',
              event.level === 'error' && 'text-accent-error-highlight'
            )}
          >
            {event.message}
          </span>
        </div>
      ))}
    </div>
  )
}

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

function buildHealthChecks({
  connection,
  deployment,
  events,
  project,
  runnerHealthy,
  target,
}: {
  connection: boolean
  deployment?: Deployment
  events: DeploymentEvent[]
  project: boolean
  runnerHealthy: boolean
  target?: { projectId: string; region: string }
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
        ? `Selected ${target?.projectId ?? 'configured project'} in ${target?.region ?? 'the configured region'}.`
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
        ? `The latest sandbox smoke was placed on node ${nodeID}.`
        : 'Waiting for a sandbox smoke through the attached cluster route.',
      label: 'Placement',
      status: nodeID ? 'healthy' : attached ? 'warning' : 'waiting',
      value: nodeID ? 'verified' : 'pending',
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
  return isActiveStatus(deployment.status)
}

function isActiveOperation(status: string) {
  return [
    'queued',
    'starting',
    'planning',
    'plan_ready',
    'applying',
    'validating',
    'attaching',
    'stale',
  ].includes(status)
}

function isActiveStatus(status: Deployment['status']) {
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
  ].includes(status)
}

function canRunDeploy(deployment: Deployment) {
  return [
    'draft',
    'plan_ready',
    'plan_changed',
    'plan_noop',
    'applied',
    'attached',
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
