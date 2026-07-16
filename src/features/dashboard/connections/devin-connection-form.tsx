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
import {
  type DevinLaunchAttempt,
  getDevinLaunchAttempt,
} from './devin-launch-attempt'

type Organization = { id: string; name: string }
type Pool = { id: string; name: string; platform: string }

type ManualConnectionState = {
  accountChecked: boolean
  apiKey: string
  organizations: Organization[]
  outpostsToken: string
  poolId: string
  pools: Pool[]
}

const initialManualConnectionState: ManualConnectionState = {
  accountChecked: false,
  apiKey: '',
  organizations: [],
  outpostsToken: '',
  poolId: '',
  pools: [],
}

type DevinConnectionFormProps = {
  teamSlug: string
}

type PendingOperation = 'disconnect' | 'discover' | 'launch' | null

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
          Discover your Devin organizations and pools from the dashboard, then
          start a worker using only a scoped machine token inside the sandbox.
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
  const [state, updateState] = useReducer(
    (
      current: ManualConnectionState,
      update: Partial<ManualConnectionState>
    ) => ({ ...current, ...update }),
    initialManualConnectionState
  )
  const {
    accountChecked,
    apiKey,
    organizations,
    outpostsToken,
    poolId,
    pools,
  } = state
  const launchAttempt = useRef<DevinLaunchAttempt | null>(null)
  const mounted = useMountedRef()
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
    updateState({
      accountChecked: false,
      organizations: [],
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
        apiUrl: apiUrlRef.current?.value || 'https://api.devin.ai',
        teamSlug,
      })
      if (!mounted.current) return
      updateState({
        accountChecked: true,
        organizations: data.organizations,
        poolId: data.pools.length === 1 ? data.pools[0]?.id || '' : '',
        pools: data.pools,
      })
      toast(defaultSuccessToast('Devin account checked.'))
    } catch (error) {
      if (!mounted.current) return
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

  async function startWorker(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (launchDisabledReason || pendingOperation) return
    const launchPayload = {
      apiUrl: apiUrlRef.current?.value || 'https://api.devin.ai',
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
      <section className="border-stroke flex flex-col gap-4 border-t pt-5">
        <div className="flex items-start gap-3">
          <KeyIcon className="text-icon-tertiary mt-0.5 size-4 shrink-0" />
          <div>
            <h2 className="prose-body-highlight text-fg">Manual setup</h2>
            <p className="prose-body text-fg-tertiary mt-1 max-w-2xl">
              Use an existing service-user API key and scoped Outposts machine
              token. The API key is sent to the dashboard server only for the
              lookup, then cleared and never sent to the sandbox.
            </p>
          </div>
        </div>

        <form className="grid max-w-2xl gap-3" onSubmit={checkAccount}>
          <Field id="devin-api-key" label="Service-user API key">
            <Input
              id="devin-api-key"
              autoComplete="off"
              data-1p-ignore
              data-form-type="other"
              disabled={anyOperationPending}
              type="password"
              value={apiKey}
              onChange={(event) => {
                updateState({
                  accountChecked: false,
                  apiKey: event.target.value,
                  organizations: [],
                  outpostsToken: '',
                  poolId: '',
                  pools: [],
                })
              }}
              placeholder="cog_..."
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
                  disabled={anyOperationPending}
                  defaultValue="https://api.devin.ai"
                  onChange={resetDiscovery}
                  ref={apiUrlRef}
                  placeholder="https://api.devin.ai"
                />
              </Field>
            </div>
          </details>

          <Button
            className="w-full sm:w-fit"
            disabled={!apiKey.trim() || anyOperationPending}
            loading={discoverPending ? 'Checking account' : undefined}
            title={!apiKey.trim() ? 'Enter a Devin API key.' : undefined}
            type="submit"
          >
            Check Devin account
          </Button>
        </form>
      </section>

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

        <form className="grid max-w-2xl gap-4" onSubmit={startWorker}>
          {accountChecked ? (
            <p className="prose-body text-fg-tertiary">
              Account access verified for{' '}
              <span className="text-fg-secondary">
                {organizations
                  .map((organization) => organization.name)
                  .join(', ')}
              </span>
              .
            </p>
          ) : null}

          <div className="max-w-sm">
            <Field id="devin-pool" label="Outposts pool">
              <Select
                disabled={
                  !accountChecked || pools.length === 0 || anyOperationPending
                }
                value={poolId}
                onValueChange={(value) => updateState({ poolId: value })}
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

          {accountChecked && pools.length === 0 ? (
            <p className="prose-body text-accent-warning-highlight">
              This account has no Outposts pools. Create one in Devin, then
              check the account again.
            </p>
          ) : null}

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
            This scoped token is injected into the worker sandbox. Do not use a
            broad enterprise administrator credential here.
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
      </section>
    </>
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
