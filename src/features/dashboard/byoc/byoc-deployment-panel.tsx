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
  ArrowRightIcon,
  CheckCircleIcon,
  CloudIcon,
  InfoIcon,
  RefreshIcon,
  SettingsIcon,
  SpinnerIcon,
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
import {
  buildDeploymentChecks,
  type DeploymentCheckStatus,
} from './deployment-checks'
import { useByocRequestIntents } from './use-byoc-request-intents'

type Deployment = TRPCRouterOutputs['byoc']['listDeployments'][number]
type DeploymentEvent = TRPCRouterOutputs['byoc']['listEvents'][number]
type ByocOperation = TRPCRouterOutputs['byoc']['listOperations'][number]
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
  'roles/memorystore.admin',
  'roles/networkconnectivity.admin',
  'roles/iam.roleAdmin',
  'roles/iam.serviceAccountAdmin',
  'roles/iam.serviceAccountUser',
  'roles/iam.serviceAccountKeyAdmin',
  'roles/resourcemanager.projectIamAdmin',
  'roles/monitoring.admin',
  'roles/logging.admin',
]
function bootstrapCommand({
  deployerServiceAccount = DEFAULT_DEPLOYER_SA,
  e2bPrincipals,
  projectId,
}: {
  deployerServiceAccount?: string
  e2bPrincipals: string[]
  projectId: string
}) {
  return `export PROJECT_ID="${projectId}"
export DEPLOYER_SA="${deployerServiceAccount}"
E2B_PRINCIPALS=(${e2bPrincipals.map((principal) => `"${principal}"`).join(' ')})

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

for E2B_PRINCIPAL in "\${E2B_PRINCIPALS[@]}"
do
  gcloud iam service-accounts add-iam-policy-binding \\
    "\${DEPLOYER_SA}@\${PROJECT_ID}.iam.gserviceaccount.com" \\
    --project="$PROJECT_ID" \\
    --member="$E2B_PRINCIPAL" \\
    --role="roles/iam.serviceAccountTokenCreator"
done`
}

function bootstrapTerraform({
  deployerServiceAccount = DEFAULT_DEPLOYER_SA,
  e2bPrincipals,
  projectId,
}: {
  deployerServiceAccount?: string
  e2bPrincipals: string[]
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

variable "e2b_principals" {
  type    = set(string)
  default = [${e2bPrincipals.map((principal) => `"${principal}"`).join(', ')}]
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
  for_each = var.e2b_principals

  service_account_id = google_service_account.byoc_deployer.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = each.value
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
  const [setupStarted, setSetupStarted] = useState(false)
  const [setupProjectId, setSetupProjectId] = useState('')
  const [deployerServiceAccountEmail, setDeployerServiceAccountEmail] =
    useState('')
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>()
  const [runningDeploymentId, setRunningDeploymentId] = useState<string>()
  const [operationBaseline, setOperationBaseline] = useState<{
    kind: ByocOperation['kind']
    clientRequestId: string
  }>()
  const [topologyDraft, setTopologyDraft] = useState<{
    deploymentId: string
    value: TopologyDraft
  }>()
  const requestIntents = useByocRequestIntents()
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

  const availableDeployments = deploymentsQuery.data?.filter(
    (item) => item.status !== 'destroyed'
  )
  const deployment =
    availableDeployments?.find((item) => item.id === selectedDeploymentId) ??
    latestByTimestamp(availableDeployments)
  useEffect(() => {
    requestIntents.connection.acknowledge(connection?.client_request_id)
    requestIntents.createDeployment.acknowledge(deployment?.client_request_id)
  }, [
    connection?.client_request_id,
    deployment?.client_request_id,
    requestIntents.connection,
    requestIntents.createDeployment,
  ])

  const savedTopology = topologyFromDeployment(deployment)
  const topology =
    topologyDraft && topologyDraft.deploymentId === deployment?.id
      ? topologyDraft.value
      : savedTopology
  const topologyDirty = !topologiesEqual(topology, savedTopology)
  const updateTopology = (patch: Partial<TopologyDraft>) => {
    requestIntents.deploy.clear()
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
        requestIntents.connection.clear()
        setSelectedConnectionId(data.id)
        setConnectionDialogOpen(false)
        await refresh()
      },
    })
  )

  const createDeployment = useMutation(
    trpc.byoc.createDeployment.mutationOptions({
      onSuccess: async (data) => {
        requestIntents.createDeployment.clear()
        setSelectedDeploymentId(data.id)
        await refresh()
      },
    })
  )

  const deploy = useMutation(
    trpc.byoc.deploy.mutationOptions({
      onMutate: (variables) => {
        setRunningDeploymentId(variables.deploymentId)
        setOperationBaseline({
          kind: 'deploy',
          clientRequestId: variables.clientRequestId,
        })
      },
      onSuccess: (data) => {
        requestIntents.deploy.clear()
        setSelectedDeploymentId(data.deployment_id)
      },
      onSettled: () =>
        refresh().finally(() => {
          setRunningDeploymentId(undefined)
        }),
    })
  )

  const destroy = useMutation(
    trpc.byoc.destroy.mutationOptions({
      onMutate: (variables) => {
        setRunningDeploymentId(variables.deploymentId)
        setOperationBaseline({
          kind: 'destroy',
          clientRequestId: variables.clientRequestId,
        })
      },
      onSuccess: (data) => {
        requestIntents.destroy.clear()
        setSelectedDeploymentId(data.deployment_id)
        setDestroyConfirmation({ deploymentKey: '', value: '' })
      },
      onSettled: () =>
        refresh().finally(() => {
          setRunningDeploymentId(undefined)
        }),
    })
  )

  const selectedProject =
    projectsQuery.data?.find(
      (project) => project.id === deployment?.gcp.project_id
    ) ?? projectsQuery.data?.[0]
  const selectedProjectPrincipal =
    selectedProject?.e2b_principal ??
    connection?.authorized_projects[0]?.e2b_principal
  const deploymentKey = `${teamSlug}:${deployment?.id ?? ''}`
  const destroyConfirmationValue =
    destroyConfirmation.deploymentKey === deploymentKey
      ? destroyConfirmation.value
      : ''
  const operationPending =
    createDeployment.isPending ||
    deploy.isPending ||
    destroy.isPending ||
    !!activeOperation ||
    (!!deployment?.id && operationsQuery.isPending) ||
    (operationsQuery.isError && !operationsQuery.data)
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
    !operationPending
  const canDestroy =
    !!deployment?.id &&
    !selectedDeploymentActive &&
    deployment.status !== 'destroyed' &&
    !operationPending &&
    destroyConfirmationValue === 'destroy'
  const discoveredSubmittedOperation =
    !!operationBaseline &&
    latestOperation?.kind === operationBaseline.kind &&
    latestOperation.client_request_id === operationBaseline.clientRequestId
  useEffect(() => {
    if (!discoveredSubmittedOperation || !operationBaseline) return
    if (operationBaseline.kind === 'deploy') requestIntents.deploy.clear()
    if (operationBaseline.kind === 'destroy') requestIntents.destroy.clear()
  }, [discoveredSubmittedOperation, operationBaseline, requestIntents])
  const deployError =
    operationBaseline?.kind === 'deploy' && discoveredSubmittedOperation
      ? undefined
      : mutationError(deploy.error)
  const destroyError =
    operationBaseline?.kind === 'destroy' && discoveredSubmittedOperation
      ? undefined
      : mutationError(destroy.error)
  const error =
    mutationError(createConnection.error) ??
    mutationError(createDeployment.error) ??
    deployError ??
    destroyError ??
    queryError(targetQuery.error) ??
    queryError(healthQuery.error) ??
    queryError(connectionsQuery.error) ??
    queryError(projectsQuery.error) ??
    queryError(deploymentsQuery.error) ??
    queryError(operationsQuery.error) ??
    queryError(eventsQuery.error)
  const runDeploy = () => {
    if (!deployment) return
    const clientRequestId = requestIntents.deploy.get()
    deploy.mutate({
      teamSlug,
      deploymentId: deployment.id,
      clientRequestId,
      topology,
    })
  }

  if (
    targetQuery.isPending ||
    connectionsQuery.isPending ||
    deploymentsQuery.isPending
  ) {
    return (
      <main className="flex min-w-0 flex-col gap-4">
        <section className="border-b border-stroke pb-4">
          <h1 className="prose-headline-medium">BYOC</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Run E2B sandboxes in infrastructure owned by your team.
          </p>
        </section>
        <div className="grid min-h-80 place-items-center border border-stroke bg-bg-1">
          <div className="flex items-center gap-2 text-sm text-fg-secondary">
            <SpinnerIcon className="size-4 animate-spin" />
            Loading deployment state
          </div>
        </div>
      </main>
    )
  }

  const durableRouteAttached = Boolean(
    deployment?.cluster_id && deployment.cluster_endpoint
  )
  const setupInProgress =
    !deployment ||
    (deployment.status !== 'attached' &&
      !durableRouteAttached &&
      latestOperation?.kind !== 'destroy')

  if (setupInProgress) {
    return (
      <ByocSetupFlow
        activeOperation={activeOperation}
        canCreateDeployment={canCreateDeployment}
        canDeploy={canDeploy}
        connection={connection}
        createConnectionError={mutationError(createConnection.error)}
        createConnectionPending={createConnection.isPending}
        createDeploymentPending={createDeployment.isPending}
        deployerServiceAccountEmail={deployerServiceAccountEmail}
        deployment={deployment}
        deploymentEvents={eventsQuery.data ?? []}
        deploymentOperation={latestOperation}
        e2bPrincipals={targetQuery.data?.e2bPrincipals ?? []}
        error={error}
        onConnect={() => {
          const intent = requestIntents.connection.get(
            deployment?.cloud_connection_id
          )
          createConnection.mutate({
            clientRequestId: intent.requestId,
            expectedCloudConnectionId: intent.expectedCloudConnectionId,
            teamSlug,
            deployerServiceAccountEmail,
            deploymentId: deployment?.id,
          })
        }}
        onCreateDeployment={() => {
          if (!connection) return
          const clientRequestId = requestIntents.createDeployment.get()
          createDeployment.mutate({
            clientRequestId,
            teamSlug,
            connectionId: connection.id,
            projectId: selectedProject?.id ?? '',
          })
        }}
        onSetupProjectIdChange={(value) => {
          requestIntents.connection.clear()
          createConnection.reset()
          const projectId = value.trim()
          setSetupProjectId(projectId)
          setDeployerServiceAccountEmail(
            projectId
              ? `${DEFAULT_DEPLOYER_SA}@${projectId}.iam.gserviceaccount.com`
              : ''
          )
        }}
        onDeploy={runDeploy}
        onRefresh={() => void refresh()}
        onSetupStart={() => setSetupStarted(true)}
        operationPending={operationPending}
        projectId={setupProjectId}
        setupStarted={setupStarted || !!connection}
        target={targetQuery.data}
        topology={topology}
        updateTopology={updateTopology}
      />
    )
  }

  return (
    <main className="flex min-w-0 flex-col gap-4">
      <section className="flex flex-col gap-3 border-b border-stroke pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="prose-headline-medium">BYOC</h1>
            <StatusBadge
              status={activeOperation?.status ?? deployment?.status}
            />
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
              onClick={() => {
                const clientRequestId = requestIntents.createDeployment.get()
                createDeployment.mutate({
                  clientRequestId,
                  teamSlug,
                  connectionId: connection.id,
                  projectId: targetQuery.data?.projectId ?? '',
                })
              }}
              loading={createDeployment.isPending ? 'Creating' : undefined}
            >
              Create deployment
            </Button>
          ) : latestOperation?.kind === 'destroy' &&
            deployment.status === 'failed' ? null : (
            <Button
              disabled={!canDeploy}
              onClick={runDeploy}
              loading={deploy.isPending ? 'Deploying' : undefined}
            >
              <SettingsIcon />
              {deployment.status === 'attached'
                ? topologyDirty
                  ? 'Apply changes'
                  : 'Reconcile'
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
                  operation={latestOperation}
                />
                <DeploymentChecklist
                  events={eventsQuery.data ?? []}
                  operation={latestOperation}
                />
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
                  value={durableRouteAttached ? 'attached' : 'incomplete'}
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
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card
              variant="layer"
              className="min-w-0 overflow-hidden rounded-lg"
            >
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
                      onClick={() => {
                        requestIntents.deploy.clear()
                        setTopologyDraft(undefined)
                      }}
                      variant="secondary"
                    >
                      Reset
                    </Button>
                    <Button
                      disabled={!topologyDirty || !canDeploy}
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
                  value={deployment?.gcp.project_id ?? selectedProject?.id}
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
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card
              variant="layer"
              className="min-w-0 overflow-hidden rounded-lg"
            >
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
                    disabled={operationPending}
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
                      className="min-w-0 max-w-full overflow-hidden rounded-md"
                      icon={<TerminalIcon />}
                      title="GCP bootstrap command"
                      viewportProps={{ className: 'max-h-[420px] max-w-full' }}
                    >
                      {bootstrapCommand({
                        deployerServiceAccount:
                          deployment?.deployer_service_account.email.split(
                            '@'
                          )[0] ?? connection?.subject_email.split('@')[0],
                        e2bPrincipals:
                          targetQuery.data?.e2bPrincipals ??
                          (selectedProjectPrincipal
                            ? [selectedProjectPrincipal]
                            : []),
                        projectId:
                          selectedProject?.id ??
                          targetQuery.data?.projectId ??
                          '',
                      })}
                    </CodeBlock>
                  </TabsContent>
                  <TabsContent value="terraform" className="mt-0 min-w-0">
                    <CodeBlock
                      className="min-w-0 max-w-full overflow-hidden rounded-md"
                      icon={<TerminalIcon />}
                      lang="hcl"
                      title="Terraform bootstrap snippet"
                      viewportProps={{ className: 'max-h-[420px] max-w-full' }}
                    >
                      {bootstrapTerraform({
                        deployerServiceAccount:
                          deployment?.deployer_service_account.email.split(
                            '@'
                          )[0] ?? connection?.subject_email.split('@')[0],
                        e2bPrincipals:
                          targetQuery.data?.e2bPrincipals ??
                          (selectedProjectPrincipal
                            ? [selectedProjectPrincipal]
                            : []),
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
                  aria-label="Destroy confirmation"
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
                  onClick={() => {
                    if (!deployment) return
                    const clientRequestId = requestIntents.destroy.get()
                    destroy.mutate({
                      teamSlug,
                      deploymentId: deployment.id,
                      clientRequestId,
                    })
                  }}
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
        e2bPrincipals={targetQuery.data?.e2bPrincipals ?? []}
        error={mutationError(createConnection.error)}
        isPending={createConnection.isPending || operationPending}
        onConnect={() => {
          const intent = requestIntents.connection.get(
            deployment?.cloud_connection_id
          )
          createConnection.mutate({
            clientRequestId: intent.requestId,
            expectedCloudConnectionId: intent.expectedCloudConnectionId,
            teamSlug,
            deployerServiceAccountEmail,
            deploymentId: deployment?.id,
          })
        }}
        onDeployerServiceAccountEmailChange={(value) => {
          requestIntents.connection.clear()
          createConnection.reset()
          setDeployerServiceAccountEmail(value)
        }}
        onOpenChange={setConnectionDialogOpen}
        open={connectionDialogOpen}
        projectId={
          deployment?.gcp.project_id ??
          connection?.authorized_projects[0]?.project_id ??
          ''
        }
      />
    </main>
  )
}

type ByocTarget = TRPCRouterOutputs['byoc']['target']

function ByocSetupFlow({
  activeOperation,
  canCreateDeployment,
  canDeploy,
  connection,
  createConnectionError,
  createConnectionPending,
  createDeploymentPending,
  deployerServiceAccountEmail,
  deployment,
  deploymentEvents,
  deploymentOperation,
  e2bPrincipals,
  error,
  onConnect,
  onCreateDeployment,
  onDeploy,
  onRefresh,
  onSetupStart,
  onSetupProjectIdChange,
  operationPending,
  projectId,
  setupStarted,
  target,
  topology,
  updateTopology,
}: {
  activeOperation?: ByocOperation
  canCreateDeployment: boolean
  canDeploy: boolean
  connection?: TRPCRouterOutputs['byoc']['listCloudConnections'][number]
  createConnectionError?: string
  createConnectionPending: boolean
  createDeploymentPending: boolean
  deployerServiceAccountEmail: string
  deployment?: Deployment
  deploymentEvents: DeploymentEvent[]
  deploymentOperation?: ByocOperation
  e2bPrincipals: string[]
  error?: string
  onConnect: () => void
  onCreateDeployment: () => void
  onDeploy: () => void
  onRefresh: () => void
  onSetupStart: () => void
  onSetupProjectIdChange: (value: string) => void
  operationPending: boolean
  projectId: string
  setupStarted: boolean
  target?: ByocTarget
  topology: TopologyDraft
  updateTopology: (patch: Partial<TopologyDraft>) => void
}) {
  if (!setupStarted && !connection) {
    return (
      <main className="flex min-w-0 flex-col gap-6">
        <section className="border-b border-stroke pb-4">
          <h1 className="prose-headline-medium">BYOC</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Run E2B sandboxes in infrastructure owned by your team.
          </p>
        </section>
        <section className="grid min-h-[420px] place-items-center border border-stroke bg-bg-1 px-6 py-12">
          <div className="w-full max-w-xl text-center">
            <div className="mx-auto grid size-12 place-items-center border border-stroke bg-bg">
              <CloudIcon className="size-5 text-fg-secondary" />
            </div>
            <h2 className="mt-5 text-xl font-medium text-fg">
              Deploy sandboxes in your own Google Cloud project
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-fg-secondary">
              E2B provisions and operates a dedicated region in your project.
              Your sandbox workloads stay on infrastructure your team controls.
            </p>
            <div className="mt-6 grid gap-px border border-stroke bg-stroke text-left sm:grid-cols-3">
              <SetupBenefit
                label="Your project"
                text="Infrastructure and workload boundaries remain in your GCP account."
              />
              <SetupBenefit
                label="Managed deployment"
                text="E2B applies infrastructure, deploys services, and verifies the region."
              />
              <SetupBenefit
                label="Adjustable capacity"
                text="Change API, sandbox, and ClickHouse capacity after setup."
              />
            </div>
            <Button className="mt-6" onClick={onSetupStart}>
              Start setup
              <ArrowRightIcon />
            </Button>
          </div>
        </section>
      </main>
    )
  }

  const configuring =
    !!connection &&
    (!deployment ||
      ['draft', 'plan_ready', 'plan_changed', 'plan_noop'].includes(
        deployment.status
      )) &&
    !activeOperation
  const checks = buildDeploymentChecks(deploymentEvents, deploymentOperation)
  const completedChecks = checks.filter((check) =>
    isCompletedCheck(check.status)
  ).length

  return (
    <main className="flex min-w-0 flex-col gap-5">
      <section className="flex flex-col gap-3 border-b border-stroke pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="prose-headline-medium">Set up BYOC</h1>
            <StatusBadge
              status={activeOperation?.status ?? deployment?.status}
            />
          </div>
          <p className="mt-1 text-sm text-fg-secondary">
            Connect your project, choose the initial capacity, and let E2B
            deploy the region.
          </p>
        </div>
        <Button variant="secondary" onClick={onRefresh}>
          <RefreshIcon />
          Refresh
        </Button>
      </section>

      <SetupStepRail
        connectionReady={!!connection}
        deployment={deployment}
        checks={checks}
      />

      {error ? (
        <div className="flex items-start gap-2 border border-accent-error-highlight/35 bg-accent-error-highlight/10 p-3 text-fg">
          <WarningIcon className="mt-0.5 size-4 shrink-0 text-accent-error-highlight" />
          <p className="prose-body whitespace-pre-wrap">{error}</p>
        </div>
      ) : null}

      {!connection ? (
        <SetupServiceAccount
          deployerServiceAccountEmail={deployerServiceAccountEmail}
          e2bPrincipals={e2bPrincipals}
          error={createConnectionError}
          isPending={createConnectionPending || operationPending}
          onConnect={onConnect}
          onProjectIdChange={onSetupProjectIdChange}
          projectId={projectId}
        />
      ) : configuring ? (
        <SetupConfiguration
          canCreateDeployment={canCreateDeployment}
          canDeploy={canDeploy}
          createDeploymentPending={createDeploymentPending}
          deployment={deployment}
          onCreateDeployment={onCreateDeployment}
          onDeploy={onDeploy}
          operationPending={operationPending}
          target={target}
          topology={topology}
          updateTopology={updateTopology}
        />
      ) : (
        <SetupDeploymentProgress
          checks={checks}
          completedChecks={completedChecks}
          deployment={deployment}
          events={deploymentEvents}
          onRetry={onDeploy}
          operation={deploymentOperation}
          operationPending={operationPending}
        />
      )}
    </main>
  )
}

function SetupBenefit({ label, text }: { label: string; text: string }) {
  return (
    <div className="bg-bg p-4">
      <p className="text-sm font-medium text-fg">{label}</p>
      <p className="mt-1 text-xs leading-5 text-fg-secondary">{text}</p>
    </div>
  )
}

function SetupStepRail({
  checks,
  connectionReady,
  deployment,
}: {
  checks: ReturnType<typeof buildDeploymentChecks>
  connectionReady: boolean
  deployment?: Deployment
}) {
  const infrastructureReady = checks
    .slice(0, 5)
    .every((check) => isCompletedCheck(check.status))
  const applicationsReady = checks
    .slice(5, 8)
    .every((check) => isCompletedCheck(check.status))
  const verificationReady = isCompletedCheck(checks.at(-1)?.status)
  const steps = [
    { label: 'Service account', complete: connectionReady },
    { label: 'Configuration', complete: !!deployment },
    { label: 'Infrastructure', complete: infrastructureReady },
    { label: 'Applications', complete: applicationsReady },
    { label: 'Verification', complete: verificationReady },
  ]
  const current = Math.max(
    0,
    steps.findIndex((step) => !step.complete)
  )
  const currentStep = steps[current] ?? steps[0]

  return (
    <>
      <div className="flex items-center justify-between gap-4 border border-stroke bg-accent-main-highlight/5 px-3 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center border border-accent-main-highlight text-xs text-accent-main-highlight">
            {current + 1}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">
              {currentStep?.label}
            </p>
            <p className="text-xs text-fg-secondary">
              Step {current + 1} of {steps.length}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-xs text-fg-tertiary">
          {steps.filter((step) => step.complete).length} complete
        </span>
      </div>
      <ol className="hidden grid-cols-5 gap-px border border-stroke bg-stroke lg:grid">
        {steps.map((step, index) => (
          <li
            className={cn(
              'flex min-w-0 items-center gap-2 bg-bg px-3 py-3 text-sm',
              index === current && 'bg-accent-main-highlight/5'
            )}
            key={step.label}
          >
            <span
              className={cn(
                'grid size-5 shrink-0 place-items-center border text-[11px]',
                step.complete
                  ? 'border-accent-success-highlight/40 bg-accent-success-highlight/10 text-accent-success-highlight'
                  : index === current
                    ? 'border-accent-main-highlight text-accent-main-highlight'
                    : 'border-stroke text-fg-tertiary'
              )}
            >
              {step.complete ? (
                <CheckCircleIcon className="size-3.5" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                'truncate',
                index === current ? 'font-medium text-fg' : 'text-fg-secondary'
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </>
  )
}

function SetupServiceAccount({
  deployerServiceAccountEmail,
  e2bPrincipals,
  error,
  isPending,
  onConnect,
  onProjectIdChange,
  projectId,
}: {
  deployerServiceAccountEmail: string
  e2bPrincipals: string[]
  error?: string
  isPending: boolean
  onConnect: () => void
  onProjectIdChange: (value: string) => void
  projectId: string
}) {
  const validProjectId = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)
  const commandProjectId = validProjectId ? projectId : 'YOUR_GCP_PROJECT_ID'

  return (
    <section className="mx-auto w-full max-w-5xl min-w-0">
      <Card variant="layer" className="min-w-0 overflow-hidden rounded-lg">
        <CardHeader>
          <CardTitle>Create the deployer service account</CardTitle>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-5">
          <p className="prose-body max-w-2xl text-fg-secondary">
            Choose the GCP project that will own the BYOC region. The deployer
            is scoped to that project, not to an individual dashboard user.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <label
              className="grid min-w-0 gap-2 text-sm font-medium"
              htmlFor="byoc-setup-project-id"
            >
              Google Cloud project ID
              <input
                autoComplete="off"
                className="h-10 min-w-0 rounded-md border border-stroke bg-bg px-3 font-mono text-sm font-normal text-fg outline-none focus:border-stroke-active"
                id="byoc-setup-project-id"
                onChange={(event) =>
                  onProjectIdChange(event.currentTarget.value)
                }
                placeholder="your-gcp-project-id"
                spellCheck={false}
                value={projectId}
              />
            </label>
            <div className="grid min-w-0 gap-2 text-sm font-medium">
              Project deployer identity
              <div className="flex h-10 min-w-0 items-center rounded-md border border-stroke bg-bg-1 px-3 font-mono text-sm font-normal text-fg-secondary">
                <span className="truncate">
                  {validProjectId
                    ? deployerServiceAccountEmail
                    : `${DEFAULT_DEPLOYER_SA}@<project>.iam.gserviceaccount.com`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 border border-stroke bg-bg p-3 text-xs leading-5 text-fg-secondary">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            One deployer identity is created in the selected project. E2B uses
            short-lived impersonation credentials; no service-account key is
            created or stored.
          </div>

          <CodeBlock
            className="min-w-0 max-w-full overflow-hidden"
            icon={<TerminalIcon />}
            title="Run in Cloud Shell"
            viewportProps={{ className: 'max-h-[420px] max-w-full' }}
          >
            {bootstrapCommand({
              deployerServiceAccount: DEFAULT_DEPLOYER_SA,
              e2bPrincipals,
              projectId: commandProjectId,
            })}
          </CodeBlock>
          {error ? (
            <p className="text-sm text-accent-error-highlight">{error}</p>
          ) : null}
        </CardContent>
        <CardFooter className="mt-0 justify-between gap-4 border-stroke py-4 max-sm:flex-col max-sm:items-stretch">
          <p className="text-xs text-fg-secondary">
            Run the command, then verify that E2B can impersonate the deployer.
          </p>
          <Button
            className="shrink-0"
            disabled={
              !validProjectId || e2bPrincipals.length === 0 || isPending
            }
            loading={isPending ? 'Verifying' : undefined}
            onClick={onConnect}
          >
            Verify and continue
            <ArrowRightIcon />
          </Button>
        </CardFooter>
      </Card>
    </section>
  )
}

function SetupConfiguration({
  canCreateDeployment,
  canDeploy,
  createDeploymentPending,
  deployment,
  onCreateDeployment,
  onDeploy,
  operationPending,
  target,
  topology,
  updateTopology,
}: {
  canCreateDeployment: boolean
  canDeploy: boolean
  createDeploymentPending: boolean
  deployment?: Deployment
  onCreateDeployment: () => void
  onDeploy: () => void
  operationPending: boolean
  target?: ByocTarget
  topology: TopologyDraft
  updateTopology: (patch: Partial<TopologyDraft>) => void
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card variant="layer" className="rounded-lg">
        <CardHeader>
          <CardTitle>2. Choose the initial configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3">
          <TopologyControl
            count={topology.apiNodeCount}
            label="API nodes"
            machineType={topology.apiMachineType}
            machineTypes={['e2-standard-4', 'e2-standard-8', 'n2-standard-8']}
            max={20}
            onCountChange={(apiNodeCount) => updateTopology({ apiNodeCount })}
            onMachineTypeChange={(apiMachineType) =>
              updateTopology({ apiMachineType })
            }
          />
          <TopologyControl
            count={topology.clientNodeCount}
            label="Sandbox nodes"
            machineType={topology.clientMachineType}
            machineTypes={['n2-standard-8', 'n2-standard-16', 'n2-highmem-8']}
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
            machineTypes={['e2-standard-4', 'e2-standard-8', 'n2-standard-8']}
            max={10}
            onCountChange={(clickHouseNodeCount) =>
              updateTopology({ clickHouseNodeCount })
            }
            onMachineTypeChange={(clickHouseMachineType) =>
              updateTopology({ clickHouseMachineType })
            }
          />
        </CardContent>
        <CardFooter className="mt-0 justify-end border-stroke py-4">
          {!deployment ? (
            <Button
              disabled={!canCreateDeployment || operationPending}
              loading={createDeploymentPending ? 'Saving' : undefined}
              onClick={onCreateDeployment}
            >
              Save initial configuration
              <ArrowRightIcon />
            </Button>
          ) : (
            <Button
              disabled={!canDeploy || operationPending}
              onClick={onDeploy}
            >
              Deploy initial configuration
              <ArrowRightIcon />
            </Button>
          )}
        </CardFooter>
      </Card>
      <Card variant="layer" className="h-fit rounded-lg">
        <CardHeader>
          <CardTitle>Deployment target</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <TargetCell label="Project" value={target?.projectId} />
          <TargetCell
            label="Region / zone"
            value={target ? `${target.region} / ${target.zone}` : undefined}
          />
          <TargetCell label="Domain" value={target?.domainName} />
        </CardContent>
      </Card>
    </section>
  )
}

function SetupDeploymentProgress({
  checks,
  completedChecks,
  deployment,
  events,
  onRetry,
  operation,
  operationPending,
}: {
  checks: ReturnType<typeof buildDeploymentChecks>
  completedChecks: number
  deployment?: Deployment
  events: DeploymentEvent[]
  onRetry: () => void
  operation?: ByocOperation
  operationPending: boolean
}) {
  const failed =
    deployment?.status === 'failed' || operation?.status.startsWith('failed')
  const canRetryDeploy = failed && operation?.kind !== 'destroy'
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card variant="layer" className="rounded-lg">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Deploying your BYOC region</CardTitle>
            <p className="mt-1 text-sm text-fg-secondary">
              {completedChecks} of {checks.length} checks complete
            </p>
          </div>
          {canRetryDeploy ? (
            <Button disabled={operationPending} onClick={onRetry}>
              Retry deployment
            </Button>
          ) : failed ? (
            <WarningIcon className="size-5 text-accent-error-highlight" />
          ) : (
            <SpinnerIcon className="size-5 animate-spin text-accent-main-highlight" />
          )}
        </CardHeader>
        <CardContent className="grid gap-5">
          <SetupPhase
            title="Infrastructure"
            description="Network, compute, storage, DNS, and Terraform resources."
            checks={checks.slice(0, 5)}
          />
          <SetupPhase
            title="Applications"
            description="E2B control-plane services, routing, and the base template."
            checks={checks.slice(5, 8)}
          />
          <SetupPhase
            title="Verification"
            description="A real sandbox is started and checked before traffic is attached."
            checks={checks.slice(8)}
          />
        </CardContent>
      </Card>
      <Card variant="layer" className="h-fit rounded-lg">
        <CardHeader>
          <CardTitle>Latest activity</CardTitle>
        </CardHeader>
        <CardContent>
          <EventLog events={events.slice(-6)} />
        </CardContent>
      </Card>
    </section>
  )
}

function SetupPhase({
  checks,
  description,
  title,
}: {
  checks: ReturnType<typeof buildDeploymentChecks>
  description: string
  title: string
}) {
  return (
    <div className="border border-stroke bg-bg">
      <div className="border-b border-stroke px-4 py-3">
        <h3 className="text-sm font-medium text-fg">{title}</h3>
        <p className="mt-0.5 text-xs text-fg-secondary">{description}</p>
      </div>
      <ol className="divide-y divide-stroke">
        {checks.map((check) => (
          <li
            className="grid grid-cols-[20px_minmax(0,1fr)] gap-2 px-4 py-3"
            key={check.label}
          >
            <CheckStatusIcon status={check.status} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{check.label}</p>
              <p className="mt-0.5 text-xs text-fg-secondary">
                {check.message}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function DeploymentChecklist({
  events,
  operation,
}: {
  events: DeploymentEvent[]
  operation?: ByocOperation
}) {
  const checks = buildDeploymentChecks(events, operation)

  return (
    <ol aria-live="polite" className="grid gap-1">
      {checks.map((check) => (
        <li
          className="grid grid-cols-[20px_minmax(0,1fr)] items-start gap-2 rounded-md px-2 py-2 sm:grid-cols-[20px_minmax(0,1fr)_auto]"
          key={check.label}
        >
          <CheckStatusIcon status={check.status} />
          <div className="min-w-0">
            <p className="prose-body font-medium text-fg">
              {check.label}
              <span className="sr-only">: {check.status}</span>
            </p>
            <p className="prose-caption break-words text-fg-secondary">
              {check.message}
            </p>
          </div>
          {check.timestamp ? (
            <time
              className="prose-caption col-start-2 text-fg-tertiary sm:col-start-auto"
              dateTime={check.timestamp}
            >
              {new Date(check.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'UTC',
              })}
            </time>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function CheckStatusIcon({ status }: { status: DeploymentCheckStatus }) {
  if (status === 'passed') {
    return (
      <CheckCircleIcon className="mt-0.5 size-4 text-accent-success-highlight" />
    )
  }
  if (status === 'running') {
    return (
      <SpinnerIcon className="mt-0.5 size-4 animate-spin text-accent-main-highlight" />
    )
  }
  if (status === 'skipped') {
    return <CheckCircleIcon className="mt-0.5 size-4 text-fg-tertiary" />
  }
  if (status === 'failed') {
    return <WarningIcon className="mt-0.5 size-4 text-accent-error-highlight" />
  }
  return <span className="mt-0.5 size-4 rounded border border-stroke" />
}

function isCompletedCheck(status?: DeploymentCheckStatus) {
  return status === 'passed' || status === 'skipped'
}

function ConnectGCPDialog({
  deployerServiceAccountEmail,
  e2bPrincipals,
  error,
  isPending,
  onConnect,
  onDeployerServiceAccountEmailChange,
  onOpenChange,
  open,
  projectId,
}: {
  deployerServiceAccountEmail: string
  e2bPrincipals: string[]
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
              e2bPrincipals,
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
            disabled={!validEmail || e2bPrincipals.length === 0 || isPending}
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

function StatusBadge({ status }: { status?: string }) {
  const tone =
    status === 'attached'
      ? 'border-accent-success-highlight/40 bg-accent-success-highlight/10 text-accent-success-highlight'
      : status === 'failed'
        ? 'border-accent-error-highlight/40 bg-accent-error-highlight/10 text-accent-error-highlight'
        : status &&
            (isActiveStatus(status as Deployment['status']) ||
              isActiveOperation(status))
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
  operation,
}: {
  deployment?: Deployment
  events: DeploymentEvent[]
  operation?: ByocOperation
}) {
  const latest = events.at(-1)
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-md border border-stroke bg-bg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium text-fg">
          {operation
            ? `${operation.kind} · ${operation.status.replaceAll('_', ' ')}`
            : deployment
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
          (deployment
            ? `Deployment is ${deployment.status.replaceAll('_', ' ')}.`
            : 'Connect a GCP project and create a deployment to begin.')}
      </p>
      {deployment?.error &&
      deployment.error !== latest?.message &&
      deployment.error !== operation?.error &&
      !(operation && isActiveOperation(operation.status)) ? (
        <p className="line-clamp-3 rounded bg-accent-error-highlight/10 p-2 text-sm text-fg">
          {deployment.error}
        </p>
      ) : null}
      {operation?.error &&
      operation.error !== latest?.message &&
      operation.error !== deployment?.error ? (
        <p className="rounded bg-accent-error-highlight/10 p-2 text-sm text-fg">
          {operation.error}
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
