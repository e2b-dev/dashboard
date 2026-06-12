'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { AgentTemplateConfig } from '@/configs/agents'
import { PROTECTED_URLS } from '@/configs/urls'
import type { Sandbox } from '@/core/modules/sandboxes/models'
import {
  killSandboxAction,
  pauseSandboxAction,
} from '@/core/server/actions/sandbox-actions'
import { useSandboxListTableStore } from '@/features/dashboard/sandboxes/list/stores/table-store'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { AlertPopover } from '@/ui/alert-popover'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  ExternalLinkIcon,
  HistoryIcon,
  PausedIcon,
  RemoveIcon,
} from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'

const RECENT_SESSION_LIMIT = 3

interface AgentsDashboardProps {
  templates: AgentTemplateConfig[]
  teamSlug: string
}

const normalizeIdentifier = (value: string | undefined | null) =>
  value?.trim().toLowerCase() ?? ''

const getAgentMatchKeys = (template: AgentTemplateConfig) =>
  new Set(
    [template.template, template.id]
      .map(normalizeIdentifier)
      .filter((value) => value.length > 0)
  )

const isAgentSandbox = (
  sandbox: Sandbox,
  template: AgentTemplateConfig
): boolean => {
  const matchKeys = getAgentMatchKeys(template)

  return [sandbox.templateID, sandbox.alias]
    .map(normalizeIdentifier)
    .some((identifier) => matchKeys.has(identifier))
}

const sortByNewestStartedAt = (a: Sandbox, b: Sandbox) => {
  const aTime = new Date(a.startedAt).getTime()
  const bTime = new Date(b.startedAt).getTime()

  return bTime - aTime
}

const formatStartedAt = (startedAt: string) => {
  const formatted = formatLocalLogStyleTimestamp(startedAt, {
    includeSeconds: false,
  })

  if (!formatted) {
    return '--'
  }

  return `${formatted.datePart} ${formatted.timePart} ${formatted.timezonePart}`
}

const getStateBadgeVariant = (state: Sandbox['state']) => {
  if (state === 'running') return 'positive'
  if (state === 'paused') return 'warning'
  if (state === 'killed') return 'default'

  return 'info'
}

const applySandboxHistoryFilter = (template: AgentTemplateConfig) => {
  const tableStore = useSandboxListTableStore.getState()

  tableStore.resetFilters()
  tableStore.setTemplateFilters([template.template])
}

const getTerminalUrl = (template: AgentTemplateConfig, sandboxId?: string) => {
  const params = new URLSearchParams({ template: template.template })

  if (sandboxId) {
    params.set('sandboxId', sandboxId)
  }

  return `${PROTECTED_URLS.TERMINAL}?${params.toString()}`
}

const canReopenTerminal = (sandbox: Sandbox) =>
  sandbox.state === 'running' || sandbox.state === 'paused'

function KillAgentSandboxButton({
  sandboxId,
  teamSlug,
  onKilled,
}: {
  sandboxId: string
  teamSlug: string
  onKilled: () => void
}) {
  const [open, setOpen] = useState(false)
  const { execute, isExecuting } = useAction(killSandboxAction, {
    onSuccess: () => {
      toast.success('Sandbox killed successfully')
      setOpen(false)
      onKilled()
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || 'Failed to kill sandbox. Please try again.'
      )
    },
  })

  return (
    <AlertPopover
      open={open}
      onOpenChange={setOpen}
      title="Kill Sandbox"
      description="Are you sure you want to kill this sandbox? The sandbox state will be lost and cannot be recovered."
      confirm="Kill Sandbox"
      trigger={
        <Button size="none" variant="tertiary">
          <RemoveIcon />
          Kill
        </Button>
      }
      confirmProps={{
        disabled: isExecuting,
        loading: isExecuting ? 'Killing...' : undefined,
      }}
      onConfirm={() => execute({ teamSlug, sandboxId })}
      onCancel={() => setOpen(false)}
    />
  )
}

function PauseAgentSandboxButton({
  sandboxId,
  teamSlug,
  onPaused,
}: {
  sandboxId: string
  teamSlug: string
  onPaused: () => void
}) {
  const { execute, isExecuting } = useAction(pauseSandboxAction, {
    onSuccess: () => {
      toast.success('Sandbox paused successfully')
      onPaused()
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || 'Failed to pause sandbox. Please try again.'
      )
    },
  })

  return (
    <Button
      disabled={isExecuting}
      loading={isExecuting ? 'Pausing...' : undefined}
      size="none"
      variant="tertiary"
      onClick={() => execute({ teamSlug, sandboxId })}
    >
      <PausedIcon />
      Pause
    </Button>
  )
}

function AgentSessionList({
  onKilled,
  onPaused,
  sessions,
  teamSlug,
  template,
}: {
  onKilled: () => void
  onPaused: () => void
  sessions: Sandbox[]
  teamSlug: string
  template: AgentTemplateConfig
}) {
  if (sessions.length === 0) {
    return (
      <div className="prose-body text-fg-tertiary px-4 py-3">No sessions</div>
    )
  }

  return (
    <div className="divide-stroke divide-y">
      {sessions.map((sandbox) => (
        <div
          className="grid min-h-11 grid-cols-[minmax(0,1fr)_112px_92px_auto] items-center gap-3 px-4 py-2"
          key={sandbox.sandboxID}
        >
          <Link
            className="prose-body-highlight text-fg hover:underline min-w-0 truncate font-mono"
            href={PROTECTED_URLS.SANDBOX(teamSlug, sandbox.sandboxID)}
          >
            <span className="truncate">{sandbox.sandboxID}</span>
          </Link>
          <span className="prose-label text-fg-tertiary truncate uppercase">
            {formatStartedAt(sandbox.startedAt)}
          </span>
          <Badge variant={getStateBadgeVariant(sandbox.state)}>
            {sandbox.state}
          </Badge>
          {canReopenTerminal(sandbox) ? (
            <div className="flex items-center gap-3">
              <Button asChild size="none" variant="tertiary">
                <Link href={getTerminalUrl(template, sandbox.sandboxID)}>
                  Open
                  <ExternalLinkIcon />
                </Link>
              </Button>
              {sandbox.state === 'running' ? (
                <PauseAgentSandboxButton
                  onPaused={onPaused}
                  sandboxId={sandbox.sandboxID}
                  teamSlug={teamSlug}
                />
              ) : null}
              <KillAgentSandboxButton
                onKilled={onKilled}
                sandboxId={sandbox.sandboxID}
                teamSlug={teamSlug}
              />
            </div>
          ) : (
            <span className="prose-body text-fg-tertiary">Closed</span>
          )}
        </div>
      ))}
      <div className="px-4 py-2">
        <Button asChild size="none" variant="tertiary">
          <Link
            href={PROTECTED_URLS.SANDBOXES_LIST(teamSlug)}
            onClick={() => applySandboxHistoryFilter(template)}
          >
            View all
            <ExternalLinkIcon />
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function AgentsDashboard({ templates, teamSlug }: AgentsDashboardProps) {
  const trpc = useTRPC()
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null)

  const { data, error, isPending, refetch } = useQuery(
    trpc.sandboxes.getSandboxes.queryOptions(
      { teamSlug },
      {
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
      }
    )
  )

  const sandboxesByAgentId = useMemo(() => {
    const sandboxes = data?.sandboxes ?? []

    return Object.fromEntries(
      templates.map((template) => [
        template.id,
        sandboxes
          .filter((sandbox) => isAgentSandbox(sandbox, template))
          .sort(sortByNewestStartedAt),
      ])
    ) as Record<string, Sandbox[]>
  }, [data?.sandboxes, templates])

  return (
    <div className="border-stroke bg-bg-1 divide-stroke overflow-hidden rounded-lg border">
      {templates.map((template) => {
        const sessions = sandboxesByAgentId[template.id] ?? []
        const recentSessions = sessions.slice(0, RECENT_SESSION_LIMIT)
        const isExpanded = expandedAgentId === template.id

        return (
          <section className="divide-stroke divide-y" key={template.id}>
            <div className="grid gap-4 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="prose-body-highlight text-fg">
                    {template.name}
                  </h3>
                  {template.command ? (
                    <code className="prose-code text-fg-tertiary">
                      {template.command}
                    </code>
                  ) : null}
                  <Badge variant="code">{template.template}</Badge>
                  {template.base ? (
                    <span className="text-fg-tertiary prose-label uppercase">
                      {template.base}
                    </span>
                  ) : null}
                </div>
                <p className="prose-body text-fg-tertiary truncate">
                  {template.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button asChild size="default" variant="primary">
                  <Link href={getTerminalUrl(template)}>
                    Start
                    <ExternalLinkIcon />
                  </Link>
                </Button>
                <Button
                  size="default"
                  variant="secondary"
                  onClick={() =>
                    setExpandedAgentId((currentAgentId) =>
                      currentAgentId === template.id ? null : template.id
                    )
                  }
                >
                  <HistoryIcon />
                  History
                  {sessions.length > 0 ? (
                    <span className="text-fg-tertiary">{sessions.length}</span>
                  ) : null}
                </Button>
              </div>
            </div>

            {isExpanded ? (
              isPending ? (
                <div className="prose-body text-fg-tertiary flex items-center gap-2 px-4 py-3">
                  <Loader size="sm" variant="slash" />
                  Loading sessions
                </div>
              ) : error ? (
                <div className="prose-body text-accent-error-highlight px-4 py-3">
                  Failed to load sessions
                </div>
              ) : (
                <AgentSessionList
                  onKilled={() => {
                    void refetch()
                  }}
                  onPaused={() => {
                    void refetch()
                  }}
                  sessions={recentSessions}
                  teamSlug={teamSlug}
                  template={template}
                />
              )
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
