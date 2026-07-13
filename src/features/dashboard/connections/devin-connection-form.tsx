'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import {
  defaultErrorToast,
  defaultSuccessToast,
  toast,
} from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  CheckCircleIcon,
  ExternalLinkIcon,
  KeyIcon,
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
  teamSlug: string
}

export function DevinConnectionForm({ teamSlug }: DevinConnectionFormProps) {
  const router = useRouter()
  const trpc = useTRPC()
  const [apiUrl, setApiUrl] = useState('https://api.devin.ai')
  const [apiKey, setApiKey] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [pools, setPools] = useState<Pool[]>([])
  const [poolId, setPoolId] = useState('')
  const [outpostsToken, setOutpostsToken] = useState('')
  const [accountChecked, setAccountChecked] = useState(false)
  const launchOperationId = useRef(crypto.randomUUID())

  const discoverMutation = useMutation(
    trpc.connections.discoverDevin.mutationOptions()
  )

  const launchMutation = useMutation(
    trpc.connections.launchDevinWorker.mutationOptions()
  )

  const launchDisabledReason = useMemo(() => {
    if (!accountChecked) return 'Check the Devin account first.'
    if (!poolId) return 'Select an Outposts pool.'
    if (!outpostsToken.trim()) return 'Enter a scoped Outposts machine token.'
    return undefined
  }, [accountChecked, outpostsToken, poolId])

  function resetDiscovery() {
    setAccountChecked(false)
    setOrganizations([])
    setPools([])
    setPoolId('')
    setOutpostsToken('')
  }

  function handleApiUrlChange(value: string) {
    setApiUrl(value)
    resetDiscovery()
  }

  async function checkAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!apiKey.trim() || discoverMutation.isPending) return
    const submittedApiKey = apiKey
    setApiKey('')
    try {
      const data = await discoverMutation.mutateAsync({
        apiKey: submittedApiKey,
        apiUrl,
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
    } finally {
      discoverMutation.reset()
    }
  }

  async function startWorker(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (launchDisabledReason || launchMutation.isPending) return
    const submittedToken = outpostsToken
    setOutpostsToken('')
    try {
      const data = await launchMutation.mutateAsync({
        apiUrl,
        operationId: launchOperationId.current,
        outpostsToken: submittedToken,
        poolId,
        teamSlug,
      })
      launchOperationId.current = crypto.randomUUID()
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
    } finally {
      launchMutation.reset()
    }
  }

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

      <section className="border-stroke flex flex-col gap-4 border-t pt-5">
        <div className="flex items-start gap-3">
          <KeyIcon className="text-icon-tertiary mt-0.5 size-4 shrink-0" />
          <div>
            <h2 className="prose-body-highlight text-fg">
              Check Devin account
            </h2>
            <p className="prose-body text-fg-tertiary mt-1 max-w-2xl">
              The API key is sent to the dashboard server for this lookup. It is
              cleared when the check starts and is never sent to the sandbox.
            </p>
          </div>
        </div>

        <form className="grid max-w-2xl gap-3" onSubmit={checkAccount}>
          <Field id="devin-api-key" label="Service-user API key">
            <Input
              id="devin-api-key"
              autoComplete="off"
              disabled={discoverMutation.isPending}
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
                  disabled={discoverMutation.isPending}
                  value={apiUrl}
                  onChange={(event) => handleApiUrlChange(event.target.value)}
                  placeholder="https://api.devin.ai"
                />
              </Field>
            </div>
          </details>

          <Button
            className="w-full sm:w-fit"
            disabled={!apiKey.trim() || discoverMutation.isPending}
            loading={
              discoverMutation.isPending ? 'Checking account' : undefined
            }
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
            disabled={Boolean(launchDisabledReason) || launchMutation.isPending}
            loading={launchMutation.isPending ? 'Starting worker' : undefined}
            title={launchDisabledReason}
            type="submit"
          >
            Start worker sandbox
            <ExternalLinkIcon />
          </Button>
          <p
            className="prose-body text-fg-tertiary"
            id="devin-launch-status"
            role="status"
          >
            {launchDisabledReason ||
              'Ready to create an E2B sandbox and start the Devin worker.'}
          </p>
        </form>
      </section>
    </div>
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
