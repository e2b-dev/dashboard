'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useReducer, useRef, useState } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import {
  defaultErrorToast,
  defaultSuccessToast,
  toast,
} from '@/lib/hooks/use-toast'
import { useTRPCClient } from '@/trpc/client'
import { AlertDialog } from '@/ui/alert-dialog'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import {
  AddIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  KeyIcon,
  LogOutIcon,
  TerminalIcon,
} from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select'
import { Textarea } from '@/ui/primitives/textarea'
import {
  type DevinLaunchAttempt,
  getDevinLaunchAttempt,
} from './devin-launch-attempt'

type Pool = { id: string; name: string; platform: string }

const DEFAULT_DEVIN_API_URL = 'https://api.beta.devinenterprise.com'

type ManualConnectionState = {
  accountChecked: boolean
  apiKey: string
  outpostsToken: string
  poolId: string
  pools: Pool[]
}

const initialManualConnectionState: ManualConnectionState = {
  accountChecked: false,
  apiKey: '',
  outpostsToken: '',
  poolId: '',
  pools: [],
}

type DevinConnectionFormProps = {
  teamSlug: string
}

type PendingOperation =
  | 'create-pool'
  | 'disconnect'
  | 'discover'
  | 'launch'
  | null

export function DevinConnectionForm({ teamSlug }: DevinConnectionFormProps) {
  const [pendingOperation, setPendingOperation] =
    useState<PendingOperation>(null)

  return (
    <div className="flex flex-col gap-7 pb-12">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="border-stroke bg-bg-1 flex size-10 items-center justify-center border">
            <TerminalIcon className="size-5" aria-hidden />
          </div>
          <div>
            <p className="prose-label text-fg-tertiary uppercase">Connection</p>
            <h1 className="text-fg text-xl font-medium">Devin Outposts</h1>
          </div>
        </div>
        <p className="prose-body text-fg-tertiary max-w-2xl">
          Discover your Devin Outposts pools from the dashboard, then start a
          worker using only a scoped machine token inside the sandbox.
        </p>
      </header>

      <ManualDevinConnection
        pendingOperation={pendingOperation}
        setPendingOperation={setPendingOperation}
        teamSlug={teamSlug}
      />
      <DevinWorkerControls
        pendingOperation={pendingOperation}
        setPendingOperation={setPendingOperation}
        teamSlug={teamSlug}
      />
    </div>
  )
}

type OperationProps = DevinConnectionFormProps & {
  pendingOperation: PendingOperation
  setPendingOperation: (operation: PendingOperation) => void
}

function DevinWorkerControls({
  pendingOperation,
  setPendingOperation,
  teamSlug,
}: OperationProps) {
  const trpcClient = useTRPCClient()
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const mounted = useMountedRef()
  const disconnectPending = pendingOperation === 'disconnect'

  async function disconnectWorkers() {
    if (pendingOperation) return
    setPendingOperation('disconnect')
    try {
      const data = await trpcClient.connections.disconnectDevinWorkers.mutate({
        confirm: true,
        teamSlug,
      })
      if (!mounted.current) return
      toast(
        defaultSuccessToast(
          data.count === 0
            ? 'No E2B Devin workers were running.'
            : `Disconnected ${data.count} E2B Devin ${data.count === 1 ? 'worker' : 'workers'}.`
        )
      )
      setDisconnectDialogOpen(false)
    } catch (error) {
      if (!mounted.current) return
      toast(
        defaultErrorToast(
          error instanceof Error && error.message
            ? error.message
            : 'Could not disconnect the Devin workers.'
        )
      )
    }
    if (mounted.current) setPendingOperation(null)
  }

  return (
    <section className="border-stroke flex max-w-2xl flex-col gap-4 border-t pt-5">
      <h2 className="prose-body-highlight text-fg">Workers</h2>
      <p className="prose-body text-fg-tertiary">
        Stop every Devin worker sandbox created for your account in this E2B
        team.
      </p>
      <AlertDialog
        open={disconnectDialogOpen}
        onOpenChange={setDisconnectDialogOpen}
        title="Disconnect Devin workers?"
        description="This stops every running or paused Devin worker sandbox created for your account in this E2B team."
        confirm="Disconnect workers"
        onConfirm={disconnectWorkers}
        confirmProps={{
          disabled: pendingOperation !== null,
          loading: disconnectPending ? 'Disconnecting workers' : undefined,
        }}
        trigger={
          <Button
            disabled={pendingOperation !== null}
            type="button"
            variant="secondary"
          >
            Disconnect workers
            <LogOutIcon />
          </Button>
        }
      />
    </section>
  )
}

function ManualDevinConnection({
  pendingOperation,
  setPendingOperation,
  teamSlug,
}: OperationProps) {
  const router = useRouter()
  const trpcClient = useTRPCClient()
  const apiUrlRef = useRef<HTMLInputElement>(null)
  const serviceApiKeyRef = useEphemeralServiceApiKey()
  const poolCreationInFlight = useRef(false)
  const [state, updateState] = useReducer(
    (
      current: ManualConnectionState,
      update: Partial<ManualConnectionState>
    ) => ({ ...current, ...update }),
    initialManualConnectionState
  )
  const { accountChecked, apiKey, outpostsToken, poolId, pools } = state
  const launchAttempt = useRef<DevinLaunchAttempt | null>(null)
  const mounted = useMountedRef()
  const [poolDialogOpen, setPoolDialogOpen] = useState(false)
  const [newPoolName, setNewPoolName] = useState('')
  const [newPoolDescription, setNewPoolDescription] = useState('')
  const [poolCreationError, setPoolCreationError] = useState('')
  const createPoolPending = pendingOperation === 'create-pool'
  const discoverPending = pendingOperation === 'discover'
  const launchPending = pendingOperation === 'launch'
  const anyOperationPending = pendingOperation !== null

  const launchDisabledReason = (() => {
    if (!accountChecked) return 'Check the Devin account first.'
    if (!poolId) return 'Select an Outposts pool.'
    if (!outpostsToken.trim()) return 'Enter a scoped Outposts machine token.'
    return undefined
  })()

  function resetDiscovery() {
    serviceApiKeyRef.current = ''
    setPoolDialogOpen(false)
    updateState({
      accountChecked: false,
      outpostsToken: '',
      poolId: '',
      pools: [],
    })
  }

  async function checkAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!apiKey.trim() || pendingOperation) return
    const submittedApiKey = apiKey
    updateState({ apiKey: '' })
    setPendingOperation('discover')
    try {
      const data = await trpcClient.connections.discoverDevin.mutate({
        apiKey: submittedApiKey,
        apiUrl: apiUrlRef.current?.value || DEFAULT_DEVIN_API_URL,
        teamSlug,
      })
      if (!mounted.current) return
      serviceApiKeyRef.current = submittedApiKey
      updateState({
        accountChecked: true,
        poolId: data.pools.length === 1 ? data.pools[0]?.id || '' : '',
        pools: data.pools,
      })
      toast(defaultSuccessToast('Devin account checked.'))
    } catch (error) {
      if (!mounted.current) return
      serviceApiKeyRef.current = ''
      resetDiscovery()
      toast(
        defaultErrorToast(
          error instanceof Error && error.message
            ? error.message
            : 'Could not check Devin account.'
        )
      )
    }
    if (mounted.current) setPendingOperation(null)
  }

  function closePoolDialog() {
    setPoolDialogOpen(false)
    setNewPoolName('')
    setNewPoolDescription('')
    setPoolCreationError('')
  }

  async function createPool(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newPoolName.trim()
    if (
      !name ||
      pendingOperation ||
      poolCreationInFlight.current ||
      !serviceApiKeyRef.current
    )
      return
    if (pools.some((pool) => pool.name === name)) {
      setPoolCreationError(`An Outposts pool named ${name} already exists.`)
      return
    }

    setPoolCreationError('')
    poolCreationInFlight.current = true
    setPendingOperation('create-pool')
    try {
      const data = await trpcClient.connections.createDevinPool.mutate({
        apiKey: serviceApiKeyRef.current,
        apiUrl: apiUrlRef.current?.value || DEFAULT_DEVIN_API_URL,
        description: newPoolDescription.trim() || undefined,
        name,
        teamSlug,
      })
      if (mounted.current) {
        updateState({
          poolId: data.pool.id,
          pools: [
            ...pools.filter((pool) => pool.id !== data.pool.id),
            data.pool,
          ],
        })
        closePoolDialog()
        toast(defaultSuccessToast(`Created Outposts pool ${data.pool.name}.`))
      }
    } catch (error) {
      if (mounted.current) {
        setPoolCreationError(
          error instanceof Error && error.message
            ? error.message
            : 'Could not create the Devin Outposts pool.'
        )
      }
    }
    poolCreationInFlight.current = false
    if (mounted.current) setPendingOperation(null)
  }

  async function startWorker(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (launchDisabledReason || pendingOperation) return
    const launchPayload = {
      apiUrl: apiUrlRef.current?.value || DEFAULT_DEVIN_API_URL,
      outpostsToken,
      poolId,
    }
    setPendingOperation('launch')
    updateState({ outpostsToken: '' })
    try {
      launchAttempt.current = await getDevinLaunchAttempt(
        launchAttempt.current,
        launchPayload
      )
      const data = await trpcClient.connections.launchDevinWorker.mutate({
        ...launchPayload,
        operationId: launchAttempt.current.operationId,
        teamSlug,
      })
      if (!mounted.current) return
      launchAttempt.current = null
      toast(
        defaultSuccessToast(
          data.reused
            ? 'Opened the existing Devin worker launch.'
            : 'Devin worker process started.'
        )
      )
      router.push(PROTECTED_URLS.SANDBOX_TERMINAL(teamSlug, data.sandboxId))
    } catch (error) {
      if (!mounted.current) return
      toast(
        defaultErrorToast(
          error instanceof Error && error.message
            ? error.message
            : 'Failed to start the Devin Outposts worker.'
        )
      )
    }
    if (mounted.current) setPendingOperation(null)
  }

  return (
    <>
      <AccountDiscoverySection
        apiKey={apiKey}
        apiUrlRef={apiUrlRef}
        disabled={anyOperationPending}
        pending={discoverPending}
        onApiKeyChange={(value) => {
          serviceApiKeyRef.current = ''
          updateState(manualStateForApiKey(value))
        }}
        onApiUrlChange={resetDiscovery}
        onSubmit={checkAccount}
      />

      <section className="border-stroke flex flex-col gap-4 border-t pt-5">
        <div className="flex items-start gap-3">
          <CheckCircleIcon className="text-icon-tertiary mt-0.5 size-4 shrink-0" />
          <div>
            <h2 className="prose-body-highlight text-fg">
              Choose worker target
            </h2>
            <p className="prose-body text-fg-tertiary mt-1">
              Select the Outposts pool this worker should serve.
            </p>
          </div>
        </div>

        <Dialog
          open={poolDialogOpen}
          onOpenChange={(open) => {
            if (createPoolPending) return
            if (open) {
              setPoolCreationError('')
              setPoolDialogOpen(true)
            } else {
              closePoolDialog()
            }
          }}
        >
          <form className="grid max-w-2xl gap-4" onSubmit={startWorker}>
            {accountChecked ? (
              <p className="prose-body text-fg-tertiary">
                Devin account access verified.
              </p>
            ) : null}

            <PoolSelector
              accountChecked={accountChecked}
              disabled={anyOperationPending}
              onChange={(value) => updateState({ poolId: value })}
              poolId={poolId}
              pools={pools}
            />

            <Field id="devin-outposts-token" label="Outposts machine token">
              <Input
                id="devin-outposts-token"
                autoComplete="off"
                data-1p-ignore
                data-form-type="other"
                disabled={
                  !accountChecked || pools.length === 0 || anyOperationPending
                }
                type="password"
                value={outpostsToken}
                onChange={(event) =>
                  updateState({ outpostsToken: event.target.value })
                }
                placeholder="Token with the outposts machine scope"
              />
            </Field>

            <p className="prose-body text-fg-tertiary">
              This scoped token is injected into the worker sandbox. Do not use
              a broad enterprise administrator credential here.
            </p>

            <Button
              aria-describedby="devin-launch-status"
              className="w-full sm:w-fit"
              disabled={Boolean(launchDisabledReason) || anyOperationPending}
              loading={launchPending ? 'Starting worker' : undefined}
              title={launchDisabledReason}
              type="submit"
            >
              Start worker sandbox
              <ExternalLinkIcon />
            </Button>
            <output
              className="prose-body text-fg-tertiary"
              id="devin-launch-status"
            >
              {launchDisabledReason ||
                'Ready to create an E2B sandbox and start the Devin worker.'}
            </output>
          </form>

          <PoolCreationDialogContent
            description={newPoolDescription}
            error={poolCreationError}
            name={newPoolName}
            pending={createPoolPending}
            onCancel={closePoolDialog}
            onDescriptionChange={setNewPoolDescription}
            onNameChange={setNewPoolName}
            onSubmit={createPool}
          />
        </Dialog>
      </section>
    </>
  )
}

function AccountDiscoverySection({
  apiKey,
  apiUrlRef,
  disabled,
  onApiKeyChange,
  onApiUrlChange,
  onSubmit,
  pending,
}: {
  apiKey: string
  apiUrlRef: React.RefObject<HTMLInputElement | null>
  disabled: boolean
  onApiKeyChange: (value: string) => void
  onApiUrlChange: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  pending: boolean
}) {
  return (
    <section className="border-stroke flex flex-col gap-4 border-t pt-5">
      <div className="flex items-start gap-3">
        <KeyIcon className="text-icon-tertiary mt-0.5 size-4 shrink-0" />
        <div>
          <h2 className="prose-body-highlight text-fg">Manual setup</h2>
          <p className="prose-body text-fg-tertiary mt-1 max-w-2xl">
            Use an existing service-user API key and scoped Outposts machine
            token. The API key stays only in this page session for account and
            pool setup. It is cleared when the account changes or this page
            closes, and is never sent to the sandbox.
          </p>
        </div>
      </div>
      <form className="grid max-w-2xl gap-3" onSubmit={onSubmit}>
        <Field id="devin-api-key" label="Service-user API key">
          <Input
            id="devin-api-key"
            autoComplete="off"
            data-1p-ignore
            data-form-type="other"
            disabled={disabled}
            onChange={(event) => onApiKeyChange(event.target.value)}
            placeholder="cog_..."
            type="password"
            value={apiKey}
          />
        </Field>
        <details className="group">
          <summary className="prose-body-highlight text-fg-secondary cursor-pointer select-none">
            Advanced API settings
          </summary>
          <div className="mt-3">
            <Field id="devin-api-url" label="Devin API URL">
              <Input
                id="devin-api-url"
                autoComplete="off"
                defaultValue={DEFAULT_DEVIN_API_URL}
                disabled={disabled}
                onChange={onApiUrlChange}
                placeholder={DEFAULT_DEVIN_API_URL}
                ref={apiUrlRef}
              />
            </Field>
          </div>
        </details>
        <Button
          className="w-full sm:w-fit"
          disabled={!apiKey.trim() || disabled}
          loading={pending ? 'Checking account' : undefined}
          title={!apiKey.trim() ? 'Enter a Devin API key.' : undefined}
          type="submit"
        >
          Check Devin account
        </Button>
      </form>
    </section>
  )
}

function PoolSelector({
  accountChecked,
  disabled,
  onChange,
  poolId,
  pools,
}: {
  accountChecked: boolean
  disabled: boolean
  onChange: (value: string) => void
  poolId: string
  pools: Pool[]
}) {
  return (
    <>
      <div className="flex max-w-2xl items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field id="devin-pool" label="Outposts pool">
            <Select
              disabled={!accountChecked || pools.length === 0 || disabled}
              onValueChange={onChange}
              value={poolId}
            >
              <SelectTrigger id="devin-pool" className="h-9 border-solid">
                <SelectValue placeholder="Select pool" />
              </SelectTrigger>
              <SelectContent>
                {pools.map((pool) => (
                  <SelectItem key={pool.id} value={pool.id}>
                    {pool.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogTrigger asChild>
          <Button
            disabled={!accountChecked || disabled}
            type="button"
            variant="secondary"
          >
            <AddIcon />
            Create pool
          </Button>
        </DialogTrigger>
      </div>
      {accountChecked && pools.length === 0 ? (
        <p className="prose-body text-accent-warning-highlight">
          This account has no Outposts pools. Create one to continue.
        </p>
      ) : null}
    </>
  )
}

function PoolCreationDialogContent({
  description,
  error,
  name,
  onCancel,
  onDescriptionChange,
  onNameChange,
  onSubmit,
  pending,
}: {
  description: string
  error: string
  name: string
  onCancel: () => void
  onDescriptionChange: (value: string) => void
  onNameChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  pending: boolean
}) {
  return (
    <DialogContent hideClose>
      <form className="grid gap-4" onSubmit={onSubmit}>
        <DialogHeader className="gap-2 text-left">
          <DialogTitle>Create Outposts pool</DialogTitle>
          <DialogDescription>
            Sessions assigned to this pool run on machines connected by its
            workers.
          </DialogDescription>
        </DialogHeader>
        <Field id="devin-new-pool-name" label="Pool name">
          <Input
            id="devin-new-pool-name"
            autoFocus
            disabled={pending}
            maxLength={128}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="e2b-dev-workers"
            value={name}
          />
        </Field>
        <Field id="devin-new-pool-description" label="Description (optional)">
          <Textarea
            id="devin-new-pool-description"
            disabled={pending}
            maxLength={500}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="What runs in this pool"
            rows={3}
            value={description}
          />
        </Field>
        <p className="prose-body text-fg-tertiary">Platform: Ubuntu / Linux</p>
        {error ? (
          <p className="prose-body text-accent-error-highlight" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            disabled={pending}
            onClick={onCancel}
            type="button"
            variant="tertiary"
          >
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || pending}
            loading={pending ? 'Creating pool' : undefined}
            type="submit"
          >
            Create pool
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}

function useMountedRef() {
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  return mounted
}

function useEphemeralServiceApiKey() {
  const apiKeyRef = useRef('')
  useEffect(
    () => () => {
      apiKeyRef.current = ''
    },
    []
  )
  return apiKeyRef
}

function manualStateForApiKey(apiKey: string): ManualConnectionState {
  return {
    accountChecked: false,
    apiKey,
    outpostsToken: '',
    poolId: '',
    pools: [],
  }
}

function Field({
  children,
  id,
  label,
}: {
  children: React.ReactNode
  id: string
  label: string
}) {
  return (
    <div className="grid gap-1.5">
      <label
        className="prose-label-highlight text-fg-secondary uppercase"
        htmlFor={id}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
