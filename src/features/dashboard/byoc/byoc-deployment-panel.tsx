'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useState } from 'react'
import { CreateApiKeyDialog } from '@/features/dashboard/settings/keys'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { cn } from '@/lib/utils'
import type { TRPCRouterOutputs } from '@/trpc/client'
import { useTRPC } from '@/trpc/client'
import { AlertDialog } from '@/ui/alert-dialog'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import {
  AddIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CloudIcon,
  IndicatorDotsIcon,
  InfoIcon,
  RefreshIcon,
  SettingsIcon,
  SpinnerIcon,
  TerminalIcon,
  UndoIcon,
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
  cloudConnectionRetryDelayMs,
  shouldRetryCloudConnectionVerification,
} from './cloud-connection-retry'
import {
  buildDeploymentChecks,
  type DeploymentCheckStatus,
  eventsForOperation,
} from './deployment-checks'
import {
  recommendedByocOperation,
  recommendedByocOperationLabel,
} from './operation-action'
import {
  createOptimisticOperation,
  type OperationMutationInput,
  preserveOptimisticOperations,
  removeOptimisticOperation,
  upsertDeployment,
  upsertOperation,
} from './operation-cache'
import {
  resolvedTargetLocation,
  targetLocationChangeLocked,
} from './target-location'
import { useByocRequestIntents } from './use-byoc-request-intents'

type Deployment = TRPCRouterOutputs['byoc']['listDeployments'][number]
type DeploymentEvent = TRPCRouterOutputs['byoc']['listEvents'][number]
type ByocOperation = TRPCRouterOutputs['byoc']['listOperations'][number]
type ByocLocation = TRPCRouterOutputs['byoc']['locations'][number]
type BootstrapBundle = TRPCRouterOutputs['byoc']['bootstrapBundle']
type ByocProvider = ByocLocation['provider']
type TopologyDraft = {
  apiNodeCount: number
  apiMachineType: string
  clientNodeCount: number
  clientMachineType: string
  clickHouseNodeCount: number
  clickHouseMachineType: string
}

export function ByocDeploymentPanel({
  view,
}: {
  view: 'configuration' | 'infrastructure'
}) {
  const router = useRouter()
  const { teamSlug } = useRouteParams<'/dashboard/[teamSlug]/byoc'>()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>()
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false)
  const [setupStarted, setSetupStarted] = useState(false)
  const [setupProjectId, setSetupProjectId] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<ByocProvider>()
  const [selectedLocation, setSelectedLocation] = useState<ByocLocation>()
  const [pendingLocation, setPendingLocation] = useState<ByocLocation>()
  const [resetTargetDialogKey, setResetTargetDialogKey] = useState<string>()
  const [deployerServiceAccountEmail, setDeployerServiceAccountEmail] =
    useState('')
  const [createdApiKey, setCreatedApiKey] = useState<string>()
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

  const locationsQuery = useQuery(
    trpc.byoc.locations.queryOptions({ teamSlug })
  )
  const allocatedTargetQuery = useQuery(
    trpc.byoc.allocatedTarget.queryOptions({ teamSlug })
  )
  const allocateTarget = useMutation(
    trpc.byoc.allocateTarget.mutationOptions({
      onSuccess: (data) => {
        queryClient.setQueryData(
          trpc.byoc.allocatedTarget.queryOptions({ teamSlug }).queryKey,
          data
        )
      },
      onSettled: async () => {
        await queryClient.invalidateQueries(
          trpc.byoc.allocatedTarget.queryFilter({ teamSlug })
        )
      },
    })
  )
  const updateTargetLocation = useMutation(
    trpc.byoc.updateTargetLocation.mutationOptions({
      onSuccess: (data) => {
        queryClient.setQueryData(
          trpc.byoc.allocatedTarget.queryOptions({ teamSlug }).queryKey,
          data
        )
        setPendingLocation(undefined)
      },
      onSettled: async () => {
        await queryClient.invalidateQueries(
          trpc.byoc.allocatedTarget.queryFilter({ teamSlug })
        )
      },
    })
  )
  const resetTarget = useMutation(
    trpc.byoc.resetTarget.mutationOptions({
      onSuccess: () => {
        queryClient.setQueryData(
          trpc.byoc.allocatedTarget.queryOptions({ teamSlug }).queryKey,
          null
        )
        allocateTarget.reset()
        updateTargetLocation.reset()
        setSelectedProvider(undefined)
        setSelectedLocation(undefined)
        setPendingLocation(undefined)
        setSetupProjectId('')
        setDeployerServiceAccountEmail('')
        setSetupStarted(false)
        setResetTargetDialogKey(undefined)
      },
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.byoc.allocatedTarget.queryFilter({ teamSlug })
          ),
          queryClient.invalidateQueries(
            trpc.byoc.listCloudConnections.queryFilter({ teamSlug })
          ),
          queryClient.invalidateQueries(
            trpc.byoc.listDeployments.queryFilter({ teamSlug })
          ),
        ])
      },
    })
  )
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
  const connectionLocation = connection
    ? cloudConnectionLocation(connection)
    : undefined
  const allocatedLocation = allocatedTargetQuery.data
    ? targetLocation(allocatedTargetQuery.data)
    : undefined
  const immutableLocation: ByocLocation | undefined = deployment
    ? deploymentLocation(deployment)
    : connectionLocation
  const target = allocatedTargetQuery.isSuccess
    ? (allocatedTargetQuery.data ?? undefined)
    : allocateTarget.data
  const location = resolvedTargetLocation(
    immutableLocation,
    selectedLocation,
    allocatedLocation,
    !!target
  )
  const locationChangeLocked = targetLocationChangeLocked(
    connectionsQuery.data,
    deploymentsQuery.data
  )
  const targetResetLocked =
    connectionsQuery.isPending ||
    connectionsQuery.isError ||
    deploymentsQuery.isPending ||
    deploymentsQuery.isError ||
    locationChangeLocked
  const provider = target?.provider ?? location?.provider ?? selectedProvider
  const connectionUsesExpectedDeployer = Boolean(
    connection &&
      target &&
      isExpectedDeployerIdentity(connection.subject_email, target)
  )
  useEffect(() => {
    requestIntents.connection.acknowledge(connection?.client_request_id)
    requestIntents.createDeployment.acknowledge(deployment?.client_request_id)
  }, [
    connection?.client_request_id,
    deployment?.client_request_id,
    requestIntents.connection,
    requestIntents.createDeployment,
  ])
  const setupDeployerServiceAccountEmail =
    setupProjectId && target?.deployerAccountId
      ? target.provider === 'gcp'
        ? `${target.deployerAccountId}@${setupProjectId}.iam.gserviceaccount.com`
        : `arn:aws:iam::${setupProjectId}:role/${target.deployerAccountId}`
      : ''
  const resolvedDeployerServiceAccountEmail =
    deployerServiceAccountEmail || setupDeployerServiceAccountEmail

  const savedTopology = topologyFromDeployment(deployment, provider)
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
  const handleReservedLocationChange = (nextLocation: ByocLocation) => {
    if (
      !locationChangeLocked &&
      target &&
      !sameLocation(targetLocation(target), nextLocation)
    ) {
      setPendingLocation(nextLocation)
    }
  }
  const handleProviderChange = (nextProvider: ByocProvider) => {
    if (target) return
    requestIntents.connection.clear()
    allocateTarget.reset()
    createConnection.reset()
    setSelectedProvider(nextProvider)
    setSelectedLocation(undefined)
    setSetupProjectId('')
    setDeployerServiceAccountEmail('')
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
    structuralSharing: (current, incoming) =>
      preserveOptimisticOperations(
        current as ByocOperation[] | undefined,
        incoming as ByocOperation[]
      ),
    refetchInterval: (query) =>
      runningDeploymentId === deployment?.id ||
      query.state.data?.some((operation) => isActiveOperation(operation.status))
        ? 1500
        : false,
  })
  const activeOperation = operationsQuery.data?.find((operation) =>
    isActiveOperation(operation.status)
  )
  const latestOperation = operationsQuery.data?.[0]

  const queueOptimisticOperation = async (
    kind: ByocOperation['kind'],
    input: OperationMutationInput
  ) => {
    const query = trpc.byoc.listOperations.queryOptions({
      teamSlug,
      deploymentId: input.deploymentId,
    })
    await queryClient.cancelQueries({ queryKey: query.queryKey, exact: true })
    const operation = createOptimisticOperation(kind, input)
    queryClient.setQueryData<ByocOperation[]>(query.queryKey, (current) =>
      upsertOperation(current, operation)
    )
  }

  const replaceOptimisticOperation = (operation: ByocOperation) => {
    queryClient.setQueryData<ByocOperation[]>(
      trpc.byoc.listOperations.queryOptions({
        teamSlug,
        deploymentId: operation.deployment_id,
      }).queryKey,
      (current) => upsertOperation(current, operation)
    )
  }

  const removeOptimisticOperationFromCache = (
    input: OperationMutationInput
  ) => {
    queryClient.setQueryData<ByocOperation[]>(
      trpc.byoc.listOperations.queryOptions({
        teamSlug,
        deploymentId: input.deploymentId,
      }).queryKey,
      (current) => removeOptimisticOperation(current, input.clientRequestId)
    )
  }
  const terraformOperation = operationsQuery.data?.find(
    (operation) => operation.kind !== 'validate'
  )

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
      queryClient.invalidateQueries(
        trpc.byoc.locations.queryFilter({ teamSlug })
      ),
      queryClient.invalidateQueries(
        trpc.byoc.allocatedTarget.queryFilter({ teamSlug })
      ),
      queryClient.invalidateQueries(
        trpc.byoc.bootstrapBundle.queryFilter({ teamSlug })
      ),
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
      retry: (failureCount, error) =>
        shouldRetryCloudConnectionVerification(
          failureCount,
          mutationError(error)
        ),
      retryDelay: cloudConnectionRetryDelayMs,
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
        setTopologyDraft((current) =>
          current ? { ...current, deploymentId: data.id } : current
        )
        await refresh()
        await router.push(`/dashboard/${teamSlug}/byoc/infrastructure`)
      },
    })
  )

  const createInitialDeployment = useMutation(
    trpc.byoc.createDeploymentAndDeploy.mutationOptions({
      onSuccess: async (data) => {
        setSelectedDeploymentId(data.deployment.id)
        setTopologyDraft((current) =>
          current ? { ...current, deploymentId: data.deployment.id } : current
        )
        queryClient.setQueryData<Deployment[]>(
          trpc.byoc.listDeployments.queryOptions({ teamSlug }).queryKey,
          (current) => upsertDeployment(current, data.deployment)
        )
        setOperationBaseline({
          kind: 'deploy',
          clientRequestId: data.operation.client_request_id,
        })
        replaceOptimisticOperation(data.operation)
        requestIntents.createDeployment.clear()
        requestIntents.deploy.clear()
        void refresh()
        await router.push(`/dashboard/${teamSlug}/byoc/infrastructure`)
      },
    })
  )

  const deploy = useMutation(
    trpc.byoc.deploy.mutationOptions({
      onMutate: async (variables) => {
        setRunningDeploymentId(variables.deploymentId)
        setOperationBaseline({
          kind: 'deploy',
          clientRequestId: variables.clientRequestId,
        })
        await queueOptimisticOperation('deploy', variables)
      },
      onSuccess: (data) => {
        replaceOptimisticOperation(data)
        requestIntents.deploy.clear()
        setSelectedDeploymentId(data.deployment_id)
      },
      onError: (_error, variables) =>
        removeOptimisticOperationFromCache(variables),
      onSettled: () =>
        refresh().finally(() => {
          setRunningDeploymentId(undefined)
        }),
    })
  )

  const validate = useMutation(
    trpc.byoc.validate.mutationOptions({
      onMutate: async (variables) => {
        setRunningDeploymentId(variables.deploymentId)
        setOperationBaseline({
          kind: 'validate',
          clientRequestId: variables.clientRequestId,
        })
        await queueOptimisticOperation('validate', variables)
      },
      onSuccess: (data) => {
        replaceOptimisticOperation(data)
        requestIntents.validate.clear()
        setSelectedDeploymentId(data.deployment_id)
      },
      onError: (_error, variables) =>
        removeOptimisticOperationFromCache(variables),
      onSettled: () =>
        refresh().finally(() => {
          setRunningDeploymentId(undefined)
        }),
    })
  )

  const destroy = useMutation(
    trpc.byoc.destroy.mutationOptions({
      onMutate: async (variables) => {
        setRunningDeploymentId(variables.deploymentId)
        setOperationBaseline({
          kind: 'destroy',
          clientRequestId: variables.clientRequestId,
        })
        await queueOptimisticOperation('destroy', variables)
      },
      onSuccess: (data) => {
        replaceOptimisticOperation(data)
        requestIntents.destroy.clear()
        setSelectedDeploymentId(data.deployment_id)
        setDestroyConfirmation({ deploymentKey: '', value: '' })
      },
      onError: (_error, variables) =>
        removeOptimisticOperationFromCache(variables),
      onSettled: () =>
        refresh().finally(() => {
          setRunningDeploymentId(undefined)
        }),
    })
  )

  const selectedProject =
    projectsQuery.data?.find(
      (project) => project.id === deploymentCloudAccountId(deployment)
    ) ?? projectsQuery.data?.[0]
  const displayedSetupProjectId =
    setupProjectId ||
    selectedProject?.id ||
    connection?.authorized_projects[0]?.project_id ||
    ''
  const bootstrapBundleQuery = useQuery({
    ...trpc.byoc.bootstrapBundle.queryOptions({
      teamSlug,
      expectedTargetKey: target?.targetKey ?? '',
      expectedProvider: target?.provider ?? 'gcp',
      cloudAccountId: displayedSetupProjectId,
    }),
    enabled:
      !!target &&
      isValidCloudAccountId(target.provider, displayedSetupProjectId),
  })
  const currentBootstrapBundle =
    !bootstrapBundleQuery.isFetching && !bootstrapBundleQuery.error
      ? bootstrapBundleQuery.data
      : undefined
  const deploymentKey = `${teamSlug}:${deployment?.id ?? ''}`
  const destroyConfirmationValue =
    destroyConfirmation.deploymentKey === deploymentKey
      ? destroyConfirmation.value
      : ''
  const operationPending =
    createDeployment.isPending ||
    createInitialDeployment.isPending ||
    deploy.isPending ||
    validate.isPending ||
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
    !latestOperation?.id.startsWith('optimistic:') &&
    latestOperation?.kind === operationBaseline.kind &&
    latestOperation.client_request_id === operationBaseline.clientRequestId
  useEffect(() => {
    if (!discoveredSubmittedOperation || !operationBaseline) return
    if (operationBaseline.kind === 'deploy') requestIntents.deploy.clear()
    if (operationBaseline.kind === 'validate') requestIntents.validate.clear()
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
  const validateError =
    operationBaseline?.kind === 'validate' && discoveredSubmittedOperation
      ? undefined
      : mutationError(validate.error)
  const error =
    mutationError(createConnection.error) ??
    mutationError(createDeployment.error) ??
    mutationError(createInitialDeployment.error) ??
    deployError ??
    validateError ??
    destroyError ??
    mutationError(allocateTarget.error) ??
    mutationError(updateTargetLocation.error) ??
    mutationError(resetTarget.error) ??
    queryError(allocatedTargetQuery.error) ??
    queryError(locationsQuery.error) ??
    queryError(healthQuery.error) ??
    queryError(connectionsQuery.error) ??
    queryError(projectsQuery.error) ??
    queryError(deploymentsQuery.error) ??
    queryError(operationsQuery.error) ??
    queryError(eventsQuery.error)
  const runDeploy = () => {
    if (!deployment) return
    validate.reset()
    const clientRequestId = requestIntents.deploy.get()
    deploy.mutate({
      teamSlug,
      deploymentId: deployment.id,
      clientRequestId,
      topology,
    })
  }
  const runValidate = () => {
    if (!deployment?.cluster_id) return
    deploy.reset()
    const clientRequestId = requestIntents.validate.get()
    validate.mutate({
      teamSlug,
      deploymentId: deployment.id,
      clientRequestId,
    })
  }
  const runRecommendedOperation = () => {
    if (
      recommendedByocOperation({
        clusterId: deployment?.cluster_id,
        deploymentStatus: deployment?.status ?? 'draft',
        latestOperation,
        topologyDirty,
      }) === 'validate'
    ) {
      runValidate()
      return
    }
    runDeploy()
  }
  const runDestroy = () => {
    if (!deployment) return
    destroy.mutate({
      teamSlug,
      deploymentId: deployment.id,
      clientRequestId: requestIntents.destroy.get(),
    })
  }

  if (
    locationsQuery.isPending ||
    allocatedTargetQuery.isPending ||
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

  if (setupInProgress && view === 'configuration') {
    return (
      <>
        <ByocSetupFlow
          activeOperation={activeOperation}
          bootstrapBundle={currentBootstrapBundle}
          bootstrapError={mutationError(bootstrapBundleQuery.error)}
          bootstrapPending={bootstrapBundleQuery.isFetching}
          canCreateDeployment={canCreateDeployment}
          canDeploy={canDeploy}
          connection={
            deployment || connectionUsesExpectedDeployer
              ? connection
              : undefined
          }
          createConnectionError={mutationError(createConnection.error)}
          createConnectionFailureCount={createConnection.failureCount}
          createConnectionPending={createConnection.isPending}
          createDeploymentPending={createInitialDeployment.isPending}
          deployerServiceAccountEmail={setupDeployerServiceAccountEmail}
          deployerAccountId={target?.deployerAccountId ?? ''}
          deployment={deployment}
          deploymentEvents={eventsQuery.data ?? []}
          deploymentOperation={latestOperation}
          e2bPrincipals={target?.e2bPrincipals ?? []}
          error={error}
          locations={locationsQuery.data ?? []}
          location={location}
          locationLocked={
            locationChangeLocked ||
            allocateTarget.isPending ||
            updateTargetLocation.isPending ||
            allocateTarget.isError ||
            allocatedTargetQuery.isFetching
          }
          onGenerateIdentity={() => {
            if (!location) return
            allocateTarget.mutate({ teamSlug, ...location })
          }}
          onResetTarget={() => {
            if (!target) return
            resetTarget.reset()
            setResetTargetDialogKey(target.targetKey)
          }}
          onConnect={() => {
            if (!location || !setupDeployerServiceAccountEmail) return
            const intent = requestIntents.connection.get(
              deployment?.cloud_connection_id
            )
            createConnection.mutate({
              clientRequestId: intent.requestId,
              expectedCloudConnectionId: intent.expectedCloudConnectionId,
              teamSlug,
              deployerServiceAccountEmail: setupDeployerServiceAccountEmail,
              deploymentId: deployment?.id,
              location,
            })
          }}
          onCreateDeployment={() => {
            if (!connection) return
            const deploymentClientRequestId =
              requestIntents.createDeployment.get()
            const operationClientRequestId = requestIntents.deploy.get()
            createInitialDeployment.mutate({
              teamSlug,
              connectionId: connection.id,
              deploymentClientRequestId,
              operationClientRequestId,
              projectId: selectedProject?.id ?? '',
              topology,
            })
          }}
          onSetupProjectIdChange={(value) => {
            requestIntents.connection.clear()
            createConnection.reset()
            const projectId = value.trim()
            setSetupProjectId(projectId)
            setDeployerServiceAccountEmail(
              projectId && target?.deployerAccountId
                ? target.provider === 'gcp'
                  ? `${target.deployerAccountId}@${projectId}.iam.gserviceaccount.com`
                  : `arn:aws:iam::${projectId}:role/${target.deployerAccountId}`
                : ''
            )
          }}
          onLocationChange={
            target ? handleReservedLocationChange : setSelectedLocation
          }
          onProviderChange={handleProviderChange}
          onDeploy={runDeploy}
          onValidate={runValidate}
          onRefresh={() => void refresh()}
          onSetupStart={() => setSetupStarted(true)}
          operationPending={operationPending}
          targetPending={
            allocateTarget.isPending ||
            updateTargetLocation.isPending ||
            resetTarget.isPending
          }
          projectId={displayedSetupProjectId}
          provider={provider}
          setupStarted={setupStarted || !!connection}
          target={target}
          targetResetLocked={targetResetLocked}
          topology={topology}
          updateTopology={updateTopology}
        />
        <AlertDialog
          confirm="Reset selection"
          confirmProps={{
            loading: resetTarget.isPending ? 'Resetting' : undefined,
          }}
          description="This releases the reserved cloud, target key, namespace, domain, and deployer identity. A new selection will generate a new target identity."
          onConfirm={() => {
            if (!resetTargetDialogKey) return
            resetTarget.mutate({
              teamSlug,
              expectedTargetKey: resetTargetDialogKey,
            })
          }}
          onOpenChange={(open) => {
            if (!open && !resetTarget.isPending) {
              setResetTargetDialogKey(undefined)
            }
          }}
          open={!!resetTargetDialogKey}
          title="Reset BYOC cloud selection?"
        >
          {resetTarget.error ? (
            <p
              className="border border-accent-error-highlight/35 bg-accent-error-highlight/10 p-3 text-sm text-fg"
              role="alert"
            >
              {mutationError(resetTarget.error)}
            </p>
          ) : null}
        </AlertDialog>
        <AlertDialog
          confirm="Change location"
          confirmProps={{
            loading: updateTargetLocation.isPending ? 'Changing' : undefined,
            variant: 'primary',
          }}
          description={
            pendingLocation && allocatedLocation
              ? `Change this team's reserved location from ${formatLocation(allocatedLocation)} to ${formatLocation(pendingLocation)}? The target key, namespace, and domain will stay the same.`
              : 'Confirm the new BYOC location.'
          }
          onConfirm={() => {
            if (!pendingLocation || !allocatedLocation) return
            updateTargetLocation.mutate({
              teamSlug,
              expectedLocation: allocatedLocation,
              location: pendingLocation,
            })
          }}
          onOpenChange={(open) => {
            if (!open && !updateTargetLocation.isPending) {
              setPendingLocation(undefined)
            }
          }}
          open={!!pendingLocation}
          title="Change BYOC location?"
        />
        {deployment ? (
          <div className="mx-auto mt-5 w-full max-w-5xl">
            <DestroyByocCard
              canDestroy={canDestroy}
              confirmation={destroyConfirmationValue}
              disabled={deployment.status === 'destroyed'}
              onConfirmationChange={(value) =>
                setDestroyConfirmation({ deploymentKey, value })
              }
              onDestroy={runDestroy}
              pending={destroy.isPending}
            />
          </div>
        ) : null}
      </>
    )
  }

  if (!deployment && view === 'infrastructure') {
    return (
      <main className="flex min-w-0 flex-col gap-4">
        <section>
          <h1 className="prose-headline-medium">Infrastructure</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Terraform state, operations, and deployment health appear after the
            initial configuration is saved.
          </p>
        </section>
        <Card variant="layer" className="rounded-lg">
          <CardHeader>
            <CardTitle>Complete configuration first</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-fg-secondary">
            Choose a cloud and location, connect the cloud account, and save the
            initial topology before managing infrastructure.
          </CardContent>
          <CardFooter className="mt-0 justify-end border-stroke py-4">
            <Button
              onClick={() =>
                router.push(`/dashboard/${teamSlug}/byoc/configuration`)
              }
            >
              Open configuration
              <ArrowRightIcon />
            </Button>
          </CardFooter>
        </Card>
      </main>
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
              ? `${deploymentLocation(deployment).region} · ${deployment.domain_name}`
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
          {view === 'infrastructure' ? null : !connection ? (
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
                  projectId: selectedProject?.id ?? '',
                })
              }}
              loading={createDeployment.isPending ? 'Creating' : undefined}
            >
              Create deployment
            </Button>
          ) : latestOperation?.kind === 'destroy' &&
            deployment.status === 'failed' ? null : (
            <div className="flex items-center gap-2">
              <Button
                disabled={!canDeploy}
                onClick={runRecommendedOperation}
                loading={
                  deploy.isPending
                    ? 'Deploying'
                    : validate.isPending
                      ? 'Validating'
                      : undefined
                }
              >
                <SettingsIcon />
                {recommendedByocOperationLabel({
                  clusterId: deployment.cluster_id,
                  deploymentStatus: deployment.status,
                  latestOperation,
                  topologyDirty,
                })}
              </Button>
              {deployment.cluster_id ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label="Deployment actions"
                      className="size-9"
                      disabled={operationPending}
                      size="none"
                      variant="secondary"
                    >
                      <IndicatorDotsIcon className="-rotate-90" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={runDeploy}>
                      <RefreshIcon />
                      Reconcile infrastructure
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-accent-error-highlight/35 bg-accent-error-highlight/10 p-3 text-fg">
          <WarningIcon className="mt-0.5 size-4 shrink-0 text-accent-error-highlight" />
          <p className="prose-body whitespace-pre-wrap">{error}</p>
        </div>
      ) : null}

      {view === 'configuration' && durableRouteAttached && target ? (
        <UseDeploymentCard
          apiKey={createdApiKey}
          domain={target.sdkDomain}
          onApiKeyCreated={setCreatedApiKey}
        />
      ) : null}

      <Tabs value={view} className="min-w-0 gap-4">
        <TabsContent value="infrastructure" className="mt-0 min-w-0">
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
            <Card
              variant="layer"
              className="min-w-0 overflow-hidden rounded-lg"
            >
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
            <Card
              variant="layer"
              className="min-w-0 overflow-hidden rounded-lg"
            >
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
          <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card
              variant="layer"
              className="min-w-0 overflow-hidden rounded-lg"
            >
              <CardHeader>
                <CardTitle>Latest Terraform plan</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                {deployment?.terraform_plan_text ? (
                  <CodeBlock
                    className="min-w-0 max-w-full overflow-hidden rounded-md"
                    icon={<TerminalIcon />}
                    title="terraform plan"
                    viewportProps={{ className: 'max-h-[520px] max-w-full' }}
                  >
                    {deployment.terraform_plan_text}
                  </CodeBlock>
                ) : (
                  <p className="prose-body text-fg-secondary">
                    No Terraform plan has been stored for this deployment yet.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card variant="layer" className="h-fit rounded-lg">
              <CardHeader>
                <CardTitle>Terraform state</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <SummaryRow
                  label="Operation"
                  value={terraformOperation?.status ?? 'not started'}
                />
                <SummaryRow
                  label="Bucket"
                  value={deployment?.terraform_backend?.bucket ?? 'unavailable'}
                  mono
                />
                <SummaryRow
                  label={deployment?.provider === 'aws' ? 'Key' : 'Prefix'}
                  value={
                    (deployment?.provider === 'aws'
                      ? deployment.terraform_backend?.key
                      : deployment?.terraform_backend?.prefix) ?? 'unavailable'
                  }
                  mono
                />
                <p className="prose-caption text-fg-secondary">
                  Backend metadata is read-only. Terraform state contents are
                  not loaded by the dashboard.
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
                  machineTypes={machineTypesForProvider(
                    deployment?.provider ?? 'gcp',
                    'api'
                  )}
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
                  machineTypes={machineTypesForProvider(
                    deployment?.provider ?? 'gcp',
                    'client'
                  )}
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
                  machineTypes={machineTypesForProvider(
                    deployment?.provider ?? 'gcp',
                    'clickhouse'
                  )}
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
                  label={
                    deployment?.provider === 'aws' ? 'AWS account' : 'Project'
                  }
                  value={
                    deploymentCloudAccountId(deployment) ?? selectedProject?.id
                  }
                />
                <TargetCell
                  label={
                    deployment?.provider === 'aws' ? 'Region' : 'Region / zone'
                  }
                  value={
                    deployment
                      ? formatLocation(deploymentLocation(deployment))
                      : undefined
                  }
                />
                <p className="prose-caption text-fg-secondary">
                  Location is read-only after deployment creation.
                </p>
                <TargetCell
                  label="Namespace"
                  value={deployment?.prefix.replace(/-+$/, '')}
                />
                <TargetCell
                  label="Resource prefix"
                  value={deployment?.prefix}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="infrastructure" className="mt-0 min-w-0">
          <Card variant="layer" className="rounded-lg">
            <CardHeader>
              <CardTitle>Operation log</CardTitle>
            </CardHeader>
            <CardContent>
              <EventLog events={eventsQuery.data ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="mt-0 min-w-0">
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
                      {(deployment?.provider === 'aws'
                        ? deployment.aws?.role_arn
                        : deployment?.deployer_service_account.email) ||
                        connection?.subject_email ||
                        'not verified'}
                    </p>
                  </div>
                  <Button
                    disabled={operationPending}
                    onClick={() => {
                      setDeployerServiceAccountEmail(
                        target?.deployerAccountId &&
                          deploymentCloudAccountId(deployment)
                          ? target.provider === 'gcp'
                            ? `${target.deployerAccountId}@${deploymentCloudAccountId(deployment)}.iam.gserviceaccount.com`
                            : `arn:aws:iam::${deploymentCloudAccountId(deployment)}:role/${target.deployerAccountId}`
                          : ''
                      )
                      setConnectionDialogOpen(true)
                    }}
                    variant="secondary"
                  >
                    {connection ? 'Replace connection' : 'Connect cloud'}
                  </Button>
                </div>
                <BootstrapArtifacts
                  bundle={currentBootstrapBundle}
                  error={mutationError(bootstrapBundleQuery.error)}
                  isPending={bootstrapBundleQuery.isFetching}
                />
              </CardContent>
            </Card>
            <DestroyByocCard
              canDestroy={canDestroy}
              confirmation={destroyConfirmationValue}
              disabled={!deployment || deployment.status === 'destroyed'}
              onConfirmationChange={(value) =>
                setDestroyConfirmation({ deploymentKey, value })
              }
              onDestroy={runDestroy}
              pending={destroy.isPending}
            />
          </div>
        </TabsContent>
      </Tabs>

      <ConnectCloudDialog
        bootstrapBundle={currentBootstrapBundle}
        bootstrapError={mutationError(bootstrapBundleQuery.error)}
        bootstrapPending={bootstrapBundleQuery.isFetching}
        deployerAccountId={target?.deployerAccountId ?? ''}
        deployerServiceAccountEmail={resolvedDeployerServiceAccountEmail}
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
            deployerServiceAccountEmail: resolvedDeployerServiceAccountEmail,
            deploymentId: deployment?.id,
            location,
          })
        }}
        onOpenChange={setConnectionDialogOpen}
        open={connectionDialogOpen}
        provider={deployment?.provider ?? target?.provider ?? 'gcp'}
        projectId={
          deploymentCloudAccountId(deployment) ??
          connection?.authorized_projects[0]?.project_id ??
          ''
        }
      />
    </main>
  )
}

function UseDeploymentCard({
  apiKey,
  domain,
  onApiKeyCreated,
}: {
  apiKey?: string
  domain: string
  onApiKeyCreated: (key: string) => void
}) {
  const env = `export E2B_API_KEY="${apiKey ?? 'YOUR_API_KEY'}"
export E2B_DOMAIN="${domain}"`
  const example = `import { Sandbox } from 'e2b'

const sandbox = await Sandbox.create('base')
console.log(sandbox.sandboxId)
await sandbox.kill()`

  return (
    <Card variant="layer" className="min-w-0 overflow-hidden rounded-lg">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Use your deployment</CardTitle>
          <p className="mt-1 text-sm text-fg-secondary">
            Create a team API key, configure the SDK, and start a sandbox on
            this BYOC region.
          </p>
        </div>
        {!apiKey ? (
          <CreateApiKeyDialog
            defaultName="BYOC quickstart"
            onCreated={onApiKeyCreated}
          >
            <Button>
              <AddIcon />
              Create API key
            </Button>
          </CreateApiKeyDialog>
        ) : null}
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="grid min-w-0 gap-3">
          <p className="text-sm font-medium">1. Configure your environment</p>
          <div className="ph-mask ph-no-capture min-w-0">
            <CodeBlock
              className="min-w-0 overflow-hidden rounded-md"
              icon={<TerminalIcon />}
              title="Environment"
            >
              {env}
            </CodeBlock>
          </div>
          {apiKey ? (
            <p className="text-xs text-accent-warning-highlight">
              This key is shown only for this page session. Copy it before
              leaving or refreshing.
            </p>
          ) : (
            <p className="text-xs text-fg-secondary">
              API keys belong to this dashboard team and route through its
              attached BYOC cluster.
            </p>
          )}
        </div>
        <div className="grid min-w-0 gap-3">
          <p className="text-sm font-medium">2. Start a sandbox</p>
          <CodeBlock
            className="min-w-0 overflow-hidden rounded-md"
            icon={<TerminalIcon />}
            lang="ts"
            title="quickstart.ts"
          >
            {example}
          </CodeBlock>
          <p className="text-xs text-fg-secondary">
            Install with <code className="font-mono">npm install e2b</code>,
            then run this file with your TypeScript runtime.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

type ByocTarget = TRPCRouterOutputs['byoc']['target']

function DestroyByocCard({
  canDestroy,
  confirmation,
  disabled,
  onConfirmationChange,
  onDestroy,
  pending,
}: {
  canDestroy: boolean
  confirmation: string
  disabled: boolean
  onConfirmationChange: (value: string) => void
  onDestroy: () => void
  pending: boolean
}) {
  return (
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
          disabled={disabled}
          onChange={(event) => onConfirmationChange(event.currentTarget.value)}
          placeholder="Type destroy"
          value={confirmation}
        />
        <Button
          variant="error"
          disabled={!canDestroy}
          onClick={onDestroy}
          loading={pending ? 'Destroying' : undefined}
        >
          Destroy BYOC
        </Button>
      </CardContent>
    </Card>
  )
}

function ByocSetupFlow({
  activeOperation,
  bootstrapBundle,
  bootstrapError,
  bootstrapPending,
  canCreateDeployment,
  canDeploy,
  connection,
  createConnectionError,
  createConnectionFailureCount,
  createConnectionPending,
  createDeploymentPending,
  deployerServiceAccountEmail,
  deployerAccountId,
  deployment,
  deploymentEvents,
  deploymentOperation,
  e2bPrincipals,
  error,
  locations,
  location,
  locationLocked,
  onConnect,
  onCreateDeployment,
  onDeploy,
  onGenerateIdentity,
  onResetTarget,
  onValidate,
  onRefresh,
  onLocationChange,
  onProviderChange,
  onSetupStart,
  onSetupProjectIdChange,
  operationPending,
  projectId,
  provider,
  setupStarted,
  target,
  targetPending,
  targetResetLocked,
  topology,
  updateTopology,
}: {
  activeOperation?: ByocOperation
  bootstrapBundle?: BootstrapBundle
  bootstrapError?: string
  bootstrapPending: boolean
  canCreateDeployment: boolean
  canDeploy: boolean
  connection?: TRPCRouterOutputs['byoc']['listCloudConnections'][number]
  createConnectionError?: string
  createConnectionFailureCount: number
  createConnectionPending: boolean
  createDeploymentPending: boolean
  deployerServiceAccountEmail: string
  deployerAccountId: string
  deployment?: Deployment
  deploymentEvents: DeploymentEvent[]
  deploymentOperation?: ByocOperation
  e2bPrincipals: string[]
  error?: string
  locations: ByocLocation[]
  location?: ByocLocation
  locationLocked: boolean
  onConnect: () => void
  onCreateDeployment: () => void
  onDeploy: () => void
  onGenerateIdentity: () => void
  onResetTarget: () => void
  onValidate: () => void
  onRefresh: () => void
  onLocationChange: (location: ByocLocation) => void
  onProviderChange: (provider: ByocProvider) => void
  onSetupStart: () => void
  onSetupProjectIdChange: (value: string) => void
  operationPending: boolean
  projectId: string
  provider?: ByocProvider
  setupStarted: boolean
  target?: ByocTarget
  targetPending: boolean
  targetResetLocked: boolean
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
              Deploy sandboxes in your own cloud account
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-fg-secondary">
              E2B provisions and operates a dedicated region in infrastructure
              your team controls.
            </p>
            <div className="mt-6 grid gap-px border border-stroke bg-stroke text-left sm:grid-cols-3">
              <SetupBenefit
                label="Your account"
                text="Infrastructure and workload boundaries remain in your cloud account."
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
            Choose a cloud and region, connect your account, and let E2B deploy
            the region.
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
          bootstrapBundle={bootstrapBundle}
          bootstrapError={bootstrapError}
          bootstrapPending={bootstrapPending}
          deployerAccountId={deployerAccountId}
          deployerServiceAccountEmail={deployerServiceAccountEmail}
          e2bPrincipals={e2bPrincipals}
          error={createConnectionError}
          failureCount={createConnectionFailureCount}
          isPending={createConnectionPending || operationPending}
          locations={locations}
          location={location}
          locationLocked={locationLocked}
          onConnect={onConnect}
          onGenerateIdentity={onGenerateIdentity}
          onResetTarget={onResetTarget}
          onLocationChange={onLocationChange}
          onProviderChange={onProviderChange}
          onProjectIdChange={onSetupProjectIdChange}
          projectId={projectId}
          provider={provider}
          target={target}
          targetPending={targetPending}
          targetResetLocked={targetResetLocked}
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
          projectId={projectId}
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
          onRetry={
            deployment?.cluster_id &&
            !(
              deploymentOperation?.kind === 'validate' &&
              deploymentOperation.status === 'failed_terminal'
            )
              ? onValidate
              : onDeploy
          }
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
    .filter((check) => check.group === 'infrastructure')
    .every((check) => isCompletedCheck(check.status))
  const applicationsReady = checks
    .filter((check) => check.group === 'applications')
    .every((check) => isCompletedCheck(check.status))
  const verificationReady = isCompletedCheck(checks.at(-1)?.status)
  const steps = [
    { label: 'Cloud access', complete: connectionReady },
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
  bootstrapBundle,
  bootstrapError,
  bootstrapPending,
  deployerAccountId,
  deployerServiceAccountEmail,
  e2bPrincipals,
  error,
  failureCount,
  isPending,
  locations,
  location,
  locationLocked,
  onConnect,
  onGenerateIdentity,
  onResetTarget,
  onLocationChange,
  onProviderChange,
  onProjectIdChange,
  projectId,
  provider,
  target,
  targetPending,
  targetResetLocked,
}: {
  bootstrapBundle?: BootstrapBundle
  bootstrapError?: string
  bootstrapPending: boolean
  deployerAccountId: string
  deployerServiceAccountEmail: string
  e2bPrincipals: string[]
  error?: string
  failureCount: number
  isPending: boolean
  locations: ByocLocation[]
  location?: ByocLocation
  locationLocked: boolean
  onConnect: () => void
  onGenerateIdentity: () => void
  onResetTarget: () => void
  onLocationChange: (location: ByocLocation) => void
  onProviderChange: (provider: ByocProvider) => void
  onProjectIdChange: (value: string) => void
  projectId: string
  provider?: ByocProvider
  target?: ByocTarget
  targetPending: boolean
  targetResetLocked: boolean
}) {
  const validProjectId =
    provider === 'aws'
      ? /^[0-9]{12}$/.test(projectId)
      : /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)
  const availableProviders = [
    ...new Set(locations.map((candidate) => candidate.provider)),
  ]
  const providerLocations = provider
    ? locations.filter((candidate) => candidate.provider === provider)
    : []
  const providerLocked = !!target || locationLocked

  return (
    <section className="mx-auto w-full max-w-5xl min-w-0">
      <Card variant="layer" className="min-w-0 overflow-hidden rounded-lg">
        <CardHeader>
          <CardTitle>Choose cloud and location</CardTitle>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-5">
          <p className="prose-body max-w-2xl text-fg-secondary">
            Choose the cloud first, then a region available for that provider.
            Generating this team's target reserves its provider and stable
            identity.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <label
              className="grid min-w-0 gap-2 text-sm font-medium"
              htmlFor="byoc-setup-provider"
            >
              Cloud
              <Select
                disabled={isPending || targetPending || providerLocked}
                onValueChange={(value) =>
                  onProviderChange(value as ByocProvider)
                }
                value={provider}
              >
                <SelectTrigger
                  className="h-10 min-w-0 bg-bg"
                  id="byoc-setup-provider"
                >
                  <SelectValue placeholder="Select a cloud" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map((candidate) => (
                    <SelectItem key={candidate} value={candidate}>
                      {providerLabel(candidate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label
              className="grid min-w-0 gap-2 text-sm font-medium"
              htmlFor="byoc-setup-location"
            >
              Region
              <Select
                disabled={
                  !provider || isPending || targetPending || locationLocked
                }
                onValueChange={(value) => {
                  const nextLocation = providerLocations.find(
                    (candidate) => locationKey(candidate) === value
                  )
                  if (nextLocation) onLocationChange(nextLocation)
                }}
                value={location ? locationKey(location) : undefined}
              >
                <SelectTrigger
                  className="h-10 min-w-0 bg-bg"
                  id="byoc-setup-location"
                >
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {providerLocations.map((candidate) => (
                    <SelectItem
                      key={locationKey(candidate)}
                      value={locationKey(candidate)}
                    >
                      {candidate.region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            {provider === 'gcp' ? (
              <div className="grid min-w-0 gap-2 text-sm font-medium">
                Zone
                <div className="flex h-10 min-w-0 items-center rounded-md border border-stroke bg-bg-1 px-3 font-mono text-sm font-normal text-fg-secondary">
                  {location?.provider === 'gcp'
                    ? location.zone
                    : 'Select a region'}
                </div>
              </div>
            ) : null}
          </div>

          {provider ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label
                className="grid min-w-0 gap-2 text-sm font-medium"
                htmlFor="byoc-setup-project-id"
              >
                {provider === 'gcp'
                  ? 'Google Cloud project ID'
                  : 'AWS account ID'}
                <input
                  autoComplete="off"
                  className="h-10 min-w-0 rounded-md border border-stroke bg-bg px-3 font-mono text-sm font-normal text-fg outline-none focus:border-stroke-active"
                  id="byoc-setup-project-id"
                  disabled={isPending}
                  onChange={(event) =>
                    onProjectIdChange(event.currentTarget.value)
                  }
                  inputMode={provider === 'aws' ? 'numeric' : undefined}
                  placeholder={
                    provider === 'gcp' ? 'your-gcp-project-id' : '123456789012'
                  }
                  spellCheck={false}
                  value={projectId}
                />
              </label>
              <div className="grid min-w-0 gap-2 text-sm font-medium">
                {provider === 'gcp'
                  ? 'Google Cloud deployer identity'
                  : 'AWS deployer role'}
                <div className="flex h-10 min-w-0 items-center rounded-md border border-stroke bg-bg-1 px-3 font-mono text-sm font-normal text-fg-secondary">
                  <span className="truncate">
                    {validProjectId
                      ? deployerServiceAccountEmail ||
                        'Generate the deployer identity first'
                      : target && deployerAccountId
                        ? provider === 'gcp'
                          ? `${deployerAccountId}@<project>.iam.gserviceaccount.com`
                          : `arn:aws:iam::<account>:role/${deployerAccountId}`
                        : 'Generate the deployer identity first'}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {provider ? (
            <div className="flex flex-col gap-3 border border-stroke bg-bg p-3 text-xs leading-5 text-fg-secondary sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-2">
                <InfoIcon className="mt-0.5 size-4 shrink-0" />
                <span>
                  {providerLocked
                    ? `This team has reserved ${providerLabel(provider)}.`
                    : 'Changing the cloud clears the selected region and project before target allocation.'}{' '}
                  {locationLocked
                    ? 'The region cannot change after a cloud connection or deployment exists.'
                    : target
                      ? 'You can change the region or reset the cloud selection until a connection or deployment exists.'
                      : 'The region can change until a cloud connection or deployment exists.'}{' '}
                  E2B uses short-lived{' '}
                  {provider === 'gcp' ? 'impersonation' : 'web identity'}{' '}
                  credentials and never receives a long-lived cloud credential.
                </span>
              </div>
              {target && !targetResetLocked ? (
                <Button
                  className="shrink-0"
                  disabled={isPending || targetPending}
                  onClick={onResetTarget}
                  size="small"
                  variant="secondary"
                >
                  <UndoIcon />
                  Reset cloud selection
                </Button>
              ) : null}
            </div>
          ) : null}

          {target && validProjectId ? (
            <BootstrapArtifacts
              bundle={bootstrapBundle}
              error={bootstrapError}
              isPending={bootstrapPending}
            />
          ) : null}
          {error ? (
            <p className="text-sm text-accent-error-highlight">{error}</p>
          ) : null}
        </CardContent>
        <CardFooter className="mt-0 justify-between gap-4 border-stroke py-4 max-sm:flex-col max-sm:items-stretch">
          <p className="text-xs text-fg-secondary">
            {target && isPending
              ? `Checking access (attempt ${failureCount + 1}). IAM changes are retried every 5 seconds while this page is open.`
              : target
                ? `Create the ${provider === 'gcp' ? 'service account' : 'IAM role'}, then verify that E2B can assume it.`
                : "Review the location, then generate this team's permanent deployer identity."}
          </p>
          {target ? (
            <Button
              className="shrink-0"
              disabled={
                !location ||
                !validProjectId ||
                !bootstrapBundle ||
                (provider === 'gcp' && e2bPrincipals.length === 0) ||
                isPending
              }
              loading={isPending ? 'Verifying' : undefined}
              onClick={onConnect}
            >
              Verify and continue
              <ArrowRightIcon />
            </Button>
          ) : (
            <Button
              className="shrink-0"
              disabled={!location || targetPending}
              loading={targetPending ? 'Generating' : undefined}
              onClick={onGenerateIdentity}
            >
              Generate deployer identity
              <ArrowRightIcon />
            </Button>
          )}
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
  projectId,
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
  projectId: string
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
            machineTypes={machineTypesForProvider(
              target?.provider ?? 'gcp',
              'api'
            )}
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
            machineTypes={machineTypesForProvider(
              target?.provider ?? 'gcp',
              'client'
            )}
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
            machineTypes={machineTypesForProvider(
              target?.provider ?? 'gcp',
              'clickhouse'
            )}
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
              loading={createDeploymentPending ? 'Deploying' : undefined}
              onClick={onCreateDeployment}
            >
              Deploy initial configuration
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
          <TargetCell
            label={target?.provider === 'aws' ? 'AWS account' : 'Project'}
            value={projectId}
          />
          <TargetCell
            label="Location"
            value={target ? formatLocation(targetLocation(target)) : undefined}
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
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card variant="layer" className="rounded-lg">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>
              {operation?.kind === 'validate'
                ? 'Validating your BYOC region'
                : 'Deploying your BYOC region'}
            </CardTitle>
            <p className="mt-1 text-sm text-fg-secondary">
              {completedChecks} of {checks.length} checks complete
            </p>
          </div>
          {canRetryDeploy ? (
            <Button disabled={operationPending} onClick={onRetry}>
              {deployment?.cluster_id && operation?.status !== 'failed_terminal'
                ? 'Retry validation'
                : 'Retry deployment'}
            </Button>
          ) : failed ? (
            <WarningIcon className="size-5 text-accent-error-highlight" />
          ) : (
            <SpinnerIcon className="size-5 animate-spin text-accent-main-highlight" />
          )}
        </CardHeader>
        <CardContent className="grid gap-5">
          {operation?.kind === 'validate' ? (
            <SetupPhase
              title="Validation"
              description="Live health, base-template, and sandbox checks without infrastructure changes."
              checks={checks}
            />
          ) : (
            <>
              <SetupPhase
                title="Cloud infrastructure"
                description="Project access, Redis, network, compute, storage, and DNS."
                checks={checks.filter(
                  (check) => check.group === 'infrastructure'
                )}
              />
              <SetupPhase
                title="Applications"
                description="E2B services and final infrastructure convergence."
                checks={checks.filter(
                  (check) => check.group === 'applications'
                )}
              />
              <SetupPhase
                title="Verification"
                description="A real sandbox is started and checked before traffic is attached."
                checks={checks.filter(
                  (check) => check.group === 'verification'
                )}
              />
            </>
          )}
        </CardContent>
      </Card>
      <Card variant="layer" className="h-fit rounded-lg">
        <CardHeader>
          <CardTitle>Latest activity</CardTitle>
        </CardHeader>
        <CardContent>
          <EventLog compact events={events.slice(-12)} />
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

function BootstrapArtifacts({
  bundle,
  error,
  isPending,
}: {
  bundle?: BootstrapBundle
  error?: string
  isPending: boolean
}) {
  const tabsLayoutKey = `byoc-bootstrap-${useId()}`
  if (isPending) {
    return (
      <div className="flex items-center gap-2 border border-stroke bg-bg p-3 text-sm text-fg-secondary">
        <SpinnerIcon className="size-4" />
        Loading current setup instructions from the deployment service...
      </div>
    )
  }
  if (error) {
    return (
      <div
        className="border border-accent-error-highlight/35 bg-accent-error-highlight/10 p-3 text-sm text-fg"
        role="alert"
      >
        {error}
      </div>
    )
  }
  if (!bundle) {
    return (
      <div className="border border-stroke bg-bg p-3 text-sm text-fg-secondary">
        Select a valid cloud account and current target to load setup
        instructions.
      </div>
    )
  }

  const firstArtifact = bundle.artifacts[0]
  if (!firstArtifact) return null
  return (
    <Tabs defaultValue={firstArtifact.id} className="min-w-0 gap-3">
      <TabsList className="h-9 w-fit gap-5 border-b-0 bg-bg p-0 max-md:px-0">
        {bundle.artifacts.map((artifact) => (
          <TabsTrigger
            key={artifact.id}
            layoutkey={tabsLayoutKey}
            value={artifact.id}
          >
            {artifact.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {bundle.artifacts.map((artifact) => (
        <TabsContent
          key={artifact.id}
          value={artifact.id}
          className="mt-0 min-w-0"
        >
          <CodeBlock
            className="min-w-0 max-w-full overflow-hidden rounded-md"
            icon={<TerminalIcon />}
            lang={artifact.language === 'hcl' ? 'hcl' : undefined}
            title={artifact.filename ?? artifact.label}
            viewportProps={{ className: 'max-h-[420px] max-w-full' }}
          >
            {artifact.content}
          </CodeBlock>
        </TabsContent>
      ))}
    </Tabs>
  )
}

function ConnectCloudDialog({
  bootstrapBundle,
  bootstrapError,
  bootstrapPending,
  deployerAccountId,
  deployerServiceAccountEmail,
  error,
  isPending,
  onConnect,
  onOpenChange,
  open,
  provider,
  projectId,
}: {
  bootstrapBundle?: BootstrapBundle
  bootstrapError?: string
  bootstrapPending: boolean
  deployerAccountId: string
  deployerServiceAccountEmail: string
  error?: string
  isPending: boolean
  onConnect: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  provider: ByocProvider
  projectId: string
}) {
  const expectedIdentity = projectId
    ? provider === 'gcp'
      ? `${deployerAccountId}@${projectId}.iam.gserviceaccount.com`
      : `arn:aws:iam::${projectId}:role/${deployerAccountId}`
    : ''
  const validIdentity =
    expectedIdentity !== '' && deployerServiceAccountEmail === expectedIdentity
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(760px,90vh)] max-w-2xl overflow-y-auto">
        <DialogHeader className="gap-2 text-left">
          <DialogTitle>
            Connect{' '}
            {provider === 'gcp' ? 'Google Cloud' : 'Amazon Web Services'}
          </DialogTitle>
          <DialogDescription>
            Create an account-local deployer identity, grant the E2B worker
            short-lived access, then verify the connection.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="byoc-deployer-sa">
              {provider === 'gcp'
                ? 'Deployer service account'
                : 'Deployer IAM role'}
            </label>
            <input
              autoComplete="off"
              className="h-10 rounded-md border border-stroke bg-bg px-3 font-mono text-sm text-fg outline-none focus:border-stroke-active"
              id="byoc-deployer-sa"
              placeholder={expectedIdentity}
              readOnly
              spellCheck={false}
              value={deployerServiceAccountEmail}
            />
            <p className="prose-caption text-fg-secondary">
              Terraform runs as this identity using short-lived credentials. No
              deployer key is stored by E2B; runtime credentials created for the
              cluster remain in customer-owned Terraform state.
            </p>
          </div>

          <BootstrapArtifacts
            bundle={bootstrapBundle}
            error={bootstrapError}
            isPending={bootstrapPending}
          />

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
            disabled={!validIdentity || !bootstrapBundle || isPending}
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

function locationKey(location: ByocLocation) {
  return `${location.provider}/${location.region}/${location.provider === 'gcp' ? location.zone : ''}`
}

function isValidCloudAccountId(provider: ByocProvider, value: string) {
  return provider === 'aws'
    ? /^[0-9]{12}$/.test(value)
    : /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value)
}

function providerLabel(provider: ByocProvider) {
  return provider === 'gcp' ? 'Google Cloud' : 'Amazon Web Services'
}

function formatLocation(location: ByocLocation) {
  return location.provider === 'gcp'
    ? `${location.region} / ${location.zone}`
    : location.region
}

function targetLocation(target: ByocTarget): ByocLocation {
  return target.provider === 'gcp'
    ? { provider: 'gcp', region: target.region, zone: target.zone }
    : { provider: 'aws', region: target.region }
}

function deploymentLocation(deployment: Deployment): ByocLocation {
  return deployment.provider === 'aws' && deployment.aws
    ? { provider: 'aws', region: deployment.aws.region }
    : {
        provider: 'gcp',
        region: deployment.gcp.region,
        zone: deployment.gcp.zone,
      }
}

function deploymentCloudAccountId(deployment?: Deployment) {
  return deployment?.provider === 'aws'
    ? deployment.aws?.account_id
    : deployment?.gcp.project_id
}

function cloudConnectionLocation(
  connection: TRPCRouterOutputs['byoc']['listCloudConnections'][number]
): ByocLocation | undefined {
  const target = connection.authorized_projects[0]
  if (!target) return undefined
  return connection.provider === 'aws'
    ? { provider: 'aws', region: target.default_region }
    : {
        provider: 'gcp',
        region: target.default_region,
        zone: target.default_zone,
      }
}

function isExpectedDeployerIdentity(identity: string, target: ByocTarget) {
  return target.provider === 'gcp'
    ? identity.startsWith(`${target.deployerAccountId}@`)
    : identity.startsWith('arn:aws:iam::') &&
        identity.split('/').at(-1) === target.deployerAccountId
}

function sameLocation(left: ByocLocation, right: ByocLocation) {
  return (
    left.provider === right.provider &&
    left.region === right.region &&
    (left.provider !== 'gcp' ||
      (right.provider === 'gcp' && left.zone === right.zone))
  )
}

function machineTypesForProvider(
  provider: ByocProvider,
  role: 'api' | 'client' | 'clickhouse'
) {
  if (provider === 'aws') {
    return role === 'client'
      ? ['m8i.4xlarge', 'm8i.8xlarge', 'm8i.12xlarge']
      : ['t3.xlarge', 'm7i.2xlarge', 'm7i.4xlarge']
  }
  return role === 'client'
    ? ['n2-standard-8', 'n2-standard-16', 'n2-highmem-8']
    : ['e2-standard-4', 'e2-standard-8', 'n2-standard-8']
}

function topologyFromDeployment(
  deployment?: Deployment,
  provider: ByocProvider = 'gcp'
): TopologyDraft {
  const apiDefault = machineTypesForProvider(provider, 'api')[0] ?? ''
  const clientDefault = machineTypesForProvider(provider, 'client')[0] ?? ''
  const clickhouseDefault =
    machineTypesForProvider(provider, 'clickhouse')[0] ?? ''
  return {
    apiNodeCount: deployment?.terraform_settings?.api_node_count ?? 1,
    apiMachineType:
      deployment?.terraform_settings?.api_machine_type ?? apiDefault,
    clientNodeCount: deployment?.terraform_settings?.client_node_count ?? 1,
    clientMachineType:
      deployment?.terraform_settings?.client_machine_type ?? clientDefault,
    clickHouseNodeCount:
      deployment?.terraform_settings?.clickhouse_node_count ?? 1,
    clickHouseMachineType:
      deployment?.terraform_settings?.clickhouse_machine_type ??
      clickhouseDefault,
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
  const latest = eventsForOperation(events, operation).at(-1)
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

function EventLog({
  compact = false,
  events,
}: {
  compact?: boolean
  events: DeploymentEvent[]
}) {
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
          className={cn(
            'grid gap-1 py-3 text-sm',
            !compact && 'md:grid-cols-[150px_180px_1fr]'
          )}
          key={`${event.deployment_id}-${event.sequence}`}
        >
          <time className="text-fg-tertiary" dateTime={event.created_at}>
            {new Date(event.created_at).toLocaleString('en-US', {
              timeZone: 'UTC',
            })}
          </time>
          <span className="font-medium text-fg">
            {deploymentEventLabel(event.phase)}
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

function deploymentEventLabel(phase: string) {
  const stageLabels: Record<string, string> = {
    base_infra: 'Core infrastructure',
    final_converge: 'Final infrastructure checks',
    foundation: 'Project prerequisites',
    nomad_services: 'E2B services',
  }
  for (const [stage, label] of Object.entries(stageLabels)) {
    if (phase === stage || phase.startsWith(`${stage}_`)) return label
  }
  return phase.replaceAll('_', ' ')
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
