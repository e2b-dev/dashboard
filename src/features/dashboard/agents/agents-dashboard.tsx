'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import type { AgentTemplateConfig } from '@/configs/agents'
import { PROTECTED_URLS } from '@/configs/urls'
import type { Sandbox } from '@/core/modules/sandboxes/models'
import {
  killSandboxAction,
  pauseSandboxAction,
} from '@/core/server/actions/sandbox-actions'
import type { SandboxManagementAuth } from '@/core/shared/sandbox-management-auth'
import { useSandboxListTableStore } from '@/features/dashboard/sandboxes/list/stores/table-store'
import DashboardTerminal from '@/features/dashboard/terminal/dashboard-terminal'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import { cn } from '@/lib/utils/ui'
import { useTRPC } from '@/trpc/client'
import { AlertPopover } from '@/ui/alert-popover'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  HistoryIcon,
  PausedIcon,
  RemoveIcon,
} from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'

const RECENT_SESSION_LIMIT = 3
const LOCAL_INFRA_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

interface AgentsDashboardProps {
  sandboxManagementAuth: SandboxManagementAuth
  templates: AgentTemplateConfig[]
  teamSlug: string
}

type AgentTerminalWindow = {
  id: string
  forceNewSandbox?: boolean
  minimized: boolean
  sandboxId?: string
  template: AgentTemplateConfig
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

const canReopenTerminal = (sandbox: Sandbox) =>
  sandbox.state === 'running' || sandbox.state === 'paused'

const canPauseSandboxes = () => {
  const infraApiUrl = process.env.NEXT_PUBLIC_INFRA_API_URL

  if (!infraApiUrl) {
    return true
  }

  try {
    const url = new URL(infraApiUrl)

    return !(LOCAL_INFRA_HOSTNAMES.has(url.hostname) && url.port === '3001')
  } catch {
    return true
  }
}

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
  disabled,
  sandboxId,
  teamSlug,
  onPaused,
}: {
  disabled?: boolean
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
      disabled={disabled || isExecuting}
      loading={isExecuting ? 'Pausing...' : undefined}
      size="none"
      title={
        disabled ? 'Pause is not supported by the local harness' : undefined
      }
      variant="tertiary"
      onClick={() => {
        if (disabled) {
          return
        }

        execute({ teamSlug, sandboxId })
      }}
    >
      <PausedIcon />
      Pause
    </Button>
  )
}

function AgentSessionList({
  canPause,
  onKilled,
  onOpenTerminal,
  onPaused,
  sessions,
  teamSlug,
  template,
}: {
  canPause: boolean
  onKilled: () => void
  onOpenTerminal: (sandboxId: string) => void
  onPaused: () => void
  sessions: Sandbox[]
  teamSlug: string
  template: AgentTemplateConfig
}) {
  if (sessions.length === 0) {
    return (
      <div className="prose-body text-fg-tertiary border-stroke border-t px-3 py-3">
        No sessions yet
      </div>
    )
  }

  return (
    <div className="divide-stroke border-stroke divide-y border-t">
      {sessions.map((sandbox) => (
        <div
          className="grid gap-2 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
          key={sandbox.sandboxID}
        >
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <Badge variant={getStateBadgeVariant(sandbox.state)}>
                {sandbox.state}
              </Badge>
              <Link
                className="prose-body text-fg-secondary hover:text-fg min-w-0 truncate font-mono hover:underline"
                href={PROTECTED_URLS.SANDBOX(teamSlug, sandbox.sandboxID)}
              >
                {sandbox.sandboxID}
              </Link>
            </div>
            <div className="prose-label text-fg-tertiary mt-1 truncate uppercase">
              {formatStartedAt(sandbox.startedAt)}
            </div>
          </div>
          {canReopenTerminal(sandbox) ? (
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <Button
                size="none"
                variant="tertiary"
                onClick={() => onOpenTerminal(sandbox.sandboxID)}
              >
                Open
                <ExternalLinkIcon />
              </Button>
              {sandbox.state === 'running' ? (
                <PauseAgentSandboxButton
                  disabled={!canPause}
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
            <span className="prose-label text-fg-tertiary uppercase md:text-right">
              Closed
            </span>
          )}
        </div>
      ))}
      <div className="px-3 py-2">
        <Button asChild size="none" variant="tertiary">
          <Link
            href={PROTECTED_URLS.SANDBOXES_LIST(teamSlug)}
            onClick={() => applySandboxHistoryFilter(template)}
          >
            View all sessions
            <ExternalLinkIcon />
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function AgentsDashboard({
  sandboxManagementAuth,
  templates,
  teamSlug,
}: AgentsDashboardProps) {
  const trpc = useTRPC()
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null)
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null)
  const [terminalWindows, setTerminalWindows] = useState<AgentTerminalWindow[]>(
    []
  )
  const nextWindowIdRef = useRef(0)
  const pauseSupported = canPauseSandboxes()

  const { data, error, isPending, refetch } = useQuery(
    trpc.sandboxes.getSandboxes.queryOptions(
      { teamSlug },
      {
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
      }
    )
  )

  const sandboxes = data?.sandboxes ?? []
  const sandboxesByAgentId = Object.fromEntries(
    templates.map((template) => [
      template.id,
      sandboxes
        .filter((sandbox) => isAgentSandbox(sandbox, template))
        .sort(sortByNewestStartedAt),
    ])
  ) as Record<string, Sandbox[]>

  const focusWindow = (windowId: string) => {
    setActiveWindowId(windowId)
    setTerminalWindows((currentWindows) =>
      currentWindows.map((terminalWindow) =>
        terminalWindow.id === windowId
          ? { ...terminalWindow, minimized: false }
          : terminalWindow
      )
    )
  }

  const openTerminalWindow = ({
    forceNewSandbox,
    sandboxId,
    template,
  }: {
    forceNewSandbox?: boolean
    sandboxId?: string
    template: AgentTemplateConfig
  }) => {
    if (sandboxId) {
      const existingWindow = terminalWindows.find(
        (terminalWindow) => terminalWindow.sandboxId === sandboxId
      )

      if (existingWindow) {
        focusWindow(existingWindow.id)
        return
      }
    }

    const windowId = `agent-terminal-${template.id}-${nextWindowIdRef.current}`
    nextWindowIdRef.current += 1

    setTerminalWindows((currentWindows) => [
      ...currentWindows,
      {
        id: windowId,
        forceNewSandbox,
        minimized: false,
        sandboxId,
        template,
      },
    ])
    setActiveWindowId(windowId)
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => {
          const sessions = sandboxesByAgentId[template.id] ?? []
          const recentSessions = sessions.slice(0, RECENT_SESSION_LIMIT)
          const isExpanded = expandedAgentId === template.id
          return (
            <section
              className="border-stroke bg-bg-1 flex min-h-48 flex-col overflow-hidden rounded-lg border"
              key={template.id}
            >
              <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                <div className="min-w-0">
                  <h3 className="prose-body-highlight text-fg truncate">
                    {template.name}
                  </h3>
                  <p className="prose-body text-fg-tertiary mt-1 line-clamp-2">
                    {template.description}
                  </p>
                </div>

                <div className="prose-label text-fg-tertiary mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 uppercase">
                  <span>{template.template}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="w-full"
                    size="default"
                    variant="primary"
                    onClick={() =>
                      openTerminalWindow({
                        forceNewSandbox: true,
                        template,
                      })
                    }
                  >
                    Start
                    <ExternalLinkIcon />
                  </Button>
                  <Button
                    className="w-full"
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
                    <ChevronDownIcon
                      className={cn(
                        'size-4 transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </Button>
                </div>
              </div>

              {isExpanded ? (
                isPending ? (
                  <div className="prose-body text-fg-tertiary border-stroke flex items-center gap-2 border-t px-3 py-3">
                    <Loader size="sm" variant="slash" />
                    Loading sessions
                  </div>
                ) : error ? (
                  <div className="prose-body text-accent-error-highlight border-stroke border-t px-3 py-3">
                    Failed to load sessions
                  </div>
                ) : (
                  <AgentSessionList
                    canPause={pauseSupported}
                    onKilled={() => {
                      void refetch()
                    }}
                    onPaused={() => {
                      void refetch()
                    }}
                    onOpenTerminal={(sandboxId) =>
                      openTerminalWindow({
                        sandboxId,
                        template,
                      })
                    }
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

      <AgentTerminalWindowLayer
        activeWindowId={activeWindowId}
        sandboxManagementAuth={sandboxManagementAuth}
        teamSlug={teamSlug}
        windows={terminalWindows}
        onActivateWindow={focusWindow}
        onCloseWindow={(windowId) => {
          setTerminalWindows((currentWindows) =>
            currentWindows.filter(
              (terminalWindow) => terminalWindow.id !== windowId
            )
          )
          setActiveWindowId((currentWindowId) =>
            currentWindowId === windowId ? null : currentWindowId
          )
        }}
        onMinimizeWindow={(windowId) => {
          setTerminalWindows((currentWindows) =>
            currentWindows.map((terminalWindow) =>
              terminalWindow.id === windowId
                ? { ...terminalWindow, minimized: true }
                : terminalWindow
            )
          )
        }}
        onSandboxAttached={(windowId, sandboxId) => {
          setTerminalWindows((currentWindows) =>
            currentWindows.map((terminalWindow) =>
              terminalWindow.id === windowId
                ? { ...terminalWindow, forceNewSandbox: false, sandboxId }
                : terminalWindow
            )
          )
        }}
      />
    </>
  )
}

function AgentTerminalWindowLayer({
  activeWindowId,
  sandboxManagementAuth,
  teamSlug,
  windows,
  onActivateWindow,
  onCloseWindow,
  onMinimizeWindow,
  onSandboxAttached,
}: {
  activeWindowId: string | null
  sandboxManagementAuth: SandboxManagementAuth
  teamSlug: string
  windows: AgentTerminalWindow[]
  onActivateWindow: (windowId: string) => void
  onCloseWindow: (windowId: string) => void
  onMinimizeWindow: (windowId: string) => void
  onSandboxAttached: (windowId: string, sandboxId: string) => void
}) {
  if (windows.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none fixed top-18 right-4 bottom-10 left-4 z-40 md:left-[248px]">
      {windows.map((terminalWindow, index) => {
        const offset = Math.min(index, 5) * 28
        const isActive = activeWindowId === terminalWindow.id
        const minimizedIndex = windows
          .filter((candidate) => candidate.minimized)
          .findIndex((candidate) => candidate.id === terminalWindow.id)

        return (
          <fieldset
            className={cn(
              'pointer-events-auto absolute m-0 min-w-0 border-0 p-0 shadow-xl',
              terminalWindow.minimized
                ? 'h-10 w-56'
                : 'h-[min(540px,calc(100%_-_2rem))] w-[min(880px,calc(100%_-_2rem))]',
              isActive && 'z-10'
            )}
            key={terminalWindow.id}
            style={
              terminalWindow.minimized
                ? {
                    right: minimizedIndex * 232,
                    top: 0,
                  }
                : {
                    left: offset,
                    top: offset,
                  }
            }
          >
            <legend className="sr-only">
              {terminalWindow.template.name} terminal window
            </legend>
            <DashboardTerminal
              autoStart
              forceNewSandbox={terminalWindow.forceNewSandbox}
              isWindowMinimized={terminalWindow.minimized}
              launchTarget={{
                command: '',
                sandboxId: terminalWindow.sandboxId,
                template: terminalWindow.template.template,
              }}
              sandboxManagementAuth={sandboxManagementAuth}
              syncUrl={false}
              teamSlug={teamSlug}
              onSandboxAttached={(sandboxId) =>
                onSandboxAttached(terminalWindow.id, sandboxId)
              }
              onWindowClose={() => onCloseWindow(terminalWindow.id)}
              onWindowMinimize={() => {
                if (terminalWindow.minimized) {
                  onActivateWindow(terminalWindow.id)
                  return
                }

                onMinimizeWindow(terminalWindow.id)
              }}
            />
          </fieldset>
        )
      })}
    </div>
  )
}
