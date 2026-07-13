'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
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

type Organization = { id: string; name: string }
type Pool = { id: string; name: string; platform: string }

type DevinConnectionFormProps = {
  oauthEnabled: boolean
  oauthMessage?: string
  teamSlug: string
}

export function DevinConnectionForm({
  oauthEnabled,
  oauthMessage,
  teamSlug,
}: DevinConnectionFormProps) {
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

      <DevinOAuthConnection
        oauthEnabled={oauthEnabled}
        oauthMessage={oauthMessage}
        teamSlug={teamSlug}
      />
      <ManualDevinConnection teamSlug={teamSlug} />
    </div>
  )
}

function DevinOAuthConnection({
  oauthEnabled,
  oauthMessage,
  teamSlug,
}: DevinConnectionFormProps) {
  const trpcClient = useTRPCClient()
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [disconnectPending, setDisconnectPending] = useState(false)

  async function disconnectWorkers() {
    if (disconnectPending) return
    setDisconnectPending(true)
    try {
      const data = await trpcClient.connections.disconnectDevinWorkers.mutate({
        confirm: true,
        teamSlug,
      })
      toast(
        defaultSuccessToast(
          data.count === 0
            ? 'No E2B Devin workers were running.'
            : `Disconnected ${data.count} E2B Devin ${data.count === 1 ? 'worker' : 'workers'}.`
        )
      )
      setDisconnectDialogOpen(false)
    } catch (error) {
      toast(
        defaultErrorToast(
          error instanceof Error && error.message
            ? error.message
            : 'Could not disconnect the Devin workers.'
        )
      )
    }
    setDisconnectPending(false)
  }

  return (
    <section className="border-stroke flex max-w-2xl flex-col gap-4 border-t pt-5">
      <div className="flex items-start gap-3">
        <KeyIcon className="text-icon-tertiary mt-0.5 size-4 shrink-0" />
        <div>
          <h2 className="prose-body-highlight text-fg">Connect with Devin</h2>
          <p className="prose-body text-fg-tertiary mt-1">
            Authorize E2B in Devin. Devin creates a dedicated pool and scoped
            service user. After approval, the dashboard creates the worker
            sandbox and injects the scoped credential without putting it in
            browser state.
          </p>
        </div>
      </div>

      {oauthMessage ? (
        <p
          className="prose-body border-accent-error-highlight/35 bg-accent-error-highlight/10 text-fg border p-3"
          role="alert"
        >
          {oauthMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {oauthEnabled ? (
          <form
            action={`/api/connections/devin/start?teamSlug=${encodeURIComponent(teamSlug)}`}
            method="post"
          >
            <Button type="submit">
              Authorize in Devin
              <ExternalLinkIcon />
            </Button>
          </form>
        ) : (
          <Button
            disabled
            title="Partner OAuth is not configured for this dashboard deployment."
          >
            Authorize in Devin
            <ExternalLinkIcon />
          </Button>
        )}
        <AlertDialog
          open={disconnectDialogOpen}
          onOpenChange={setDisconnectDialogOpen}
          title="Disconnect Devin workers?"
          description="This stops every running or paused Devin worker sandbox created for your account in this E2B team. It does not revoke the generated service user in Devin."
          confirm="Disconnect workers"
          onConfirm={disconnectWorkers}
          confirmProps={{
            disabled: disconnectPending,
            loading: disconnectPending ? 'Disconnecting workers' : undefined,
          }}
          trigger={
            <Button type="button" variant="secondary">
              Disconnect workers
              <LogOutIcon />
            </Button>
          }
        />
      </div>
      <p className="prose-body text-fg-tertiary">
        Disconnecting stops the E2B workers. To revoke Devin access entirely,
        delete the generated service user in Devin enterprise settings.
      </p>
      {!oauthEnabled ? (
        <p className="prose-body text-fg-tertiary">
          Partner OAuth is not configured for this deployment. Use the manual
          setup below.
        </p>
      ) : null}
    </section>
  )
}

function ManualDevinConnection({ teamSlug }: { teamSlug: string }) {
  const router = useRouter()
  const trpcClient = useTRPCClient()
  const apiUrlRef = useRef<HTMLInputElement>(null)
  const [apiKey, setApiKey] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [pools, setPools] = useState<Pool[]>([])
  const [poolId, setPoolId] = useState('')
  const [outpostsToken, setOutpostsToken] = useState('')
  const [accountChecked, setAccountChecked] = useState(false)
  const [discoverPending, setDiscoverPending] = useState(false)
  const [launchPending, setLaunchPending] = useState(false)
  const launchOperationId = useRef<string | null>(null)

  const launchDisabledReason = (() => {
    if (!accountChecked) return 'Check the Devin account first.'
    if (!poolId) return 'Select an Outposts pool.'
    if (!outpostsToken.trim()) return 'Enter a scoped Outposts machine token.'
    return undefined
  })()

  function resetDiscovery() {
    setAccountChecked(false)
    setOrganizations([])
    setPools([])
    setPoolId('')
    setOutpostsToken('')
  }

  async function checkAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!apiKey.trim() || discoverPending) return
    const submittedApiKey = apiKey
    setApiKey('')
    setDiscoverPending(true)
    try {
      const data = await trpcClient.connections.discoverDevin.mutate({
        apiKey: submittedApiKey,
        apiUrl: apiUrlRef.current?.value || 'https://api.devin.ai',
        teamSlug,
      })
      setOrganizations(data.organizations)
      setPools(data.pools)
      setPoolId(data.pools.length === 1 ? data.pools[0]?.id || '' : '')
      setAccountChecked(true)
      toast(defaultSuccessToast('Devin account checked.'))
    } catch (error) {
      resetDiscovery()
      toast(
        defaultErrorToast(
          error instanceof Error && error.message
            ? error.message
            : 'Could not check Devin account.'
        )
      )
    }
    setDiscoverPending(false)
  }

  async function startWorker(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (launchDisabledReason || launchPending) return
    const submittedToken = outpostsToken
    setOutpostsToken('')
    setLaunchPending(true)
    if (!launchOperationId.current) {
      launchOperationId.current = crypto.randomUUID()
    }
    try {
      const data = await trpcClient.connections.launchDevinWorker.mutate({
        apiUrl: apiUrlRef.current?.value || 'https://api.devin.ai',
        operationId: launchOperationId.current,
        outpostsToken: submittedToken,
        poolId,
        teamSlug,
      })
      launchOperationId.current = null
      toast(
        defaultSuccessToast(
          data.reused
            ? 'Opened the existing Devin worker launch.'
            : 'Devin worker process started.'
        )
      )
      router.push(PROTECTED_URLS.SANDBOX_TERMINAL(teamSlug, data.sandboxId))
    } catch (error) {
      toast(
        defaultErrorToast(
          error instanceof Error && error.message
            ? error.message
            : 'Failed to start the Devin Outposts worker.'
        )
      )
    }
    setLaunchPending(false)
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
              disabled={discoverPending}
              type="password"
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value)
                resetDiscovery()
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
                  disabled={discoverPending}
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
            disabled={!apiKey.trim() || discoverPending}
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
                disabled={!accountChecked || pools.length === 0}
                value={poolId}
                onValueChange={setPoolId}
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
              disabled={!accountChecked || pools.length === 0}
              type="password"
              value={outpostsToken}
              onChange={(event) => setOutpostsToken(event.target.value)}
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
            disabled={Boolean(launchDisabledReason) || launchPending}
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
