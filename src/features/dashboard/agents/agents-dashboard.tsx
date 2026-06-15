'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import type { CSSProperties, PointerEvent } from 'react'
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
  RefreshIcon,
  RemoveIcon,
} from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'

const RECENT_SESSION_LIMIT = 3
const LOCAL_INFRA_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])
const TERMINAL_WINDOW_OFFSET_PX = 28
const TERMINAL_WINDOW_MAX_CASCADE_STEPS = 5
const MINIMIZED_TERMINAL_HEIGHT_PX = 40
const MINIMIZED_TERMINAL_STACK_GAP_PX = 8

interface AgentsDashboardProps {
  sandboxManagementAuth: SandboxManagementAuth
  templates: AgentTemplateConfig[]
  teamSlug: string
}

type WindowPosition = {
  x: number
  y: number
}

type AgentTerminalWindow = {
  id: string
  forceNewSandbox?: boolean
  minimized: boolean
  position: WindowPosition
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

  return [sandbox.templateID, sandbox.alias, sandbox.metadata?.template]
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

const getInitialWindowPosition = (windowCount: number): WindowPosition => {
  const offset =
    Math.min(windowCount, TERMINAL_WINDOW_MAX_CASCADE_STEPS) *
    TERMINAL_WINDOW_OFFSET_PX

  return { x: offset, y: offset }
}

const clampWindowPosition = ({
  layerRect,
  position,
  windowRect,
}: {
  layerRect: DOMRect
  position: WindowPosition
  windowRect: DOMRect
}): WindowPosition => ({
  x: Math.max(0, Math.min(position.x, layerRect.width - windowRect.width)),
  y: Math.max(0, Math.min(position.y, layerRect.height - windowRect.height)),
})

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
      <div className="prose-body text-fg-tertiary px-3 py-3">
        No sessions yet
      </div>
    )
  }

  return (
    <div className="divide-stroke divide-y">
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
  const expandedTemplate = templates.find(
    (template) => template.id === expandedAgentId
  )
  const expandedSessions = expandedTemplate
    ? (sandboxesByAgentId[expandedTemplate.id] ?? []).slice(
        0,
        RECENT_SESSION_LIMIT
      )
    : []

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
        position: getInitialWindowPosition(currentWindows.length),
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
            </section>
          )
        })}
      </div>

      {expandedTemplate ? (
        <section className="border-stroke bg-bg-1 mt-4 overflow-hidden rounded-lg border">
          <div className="border-stroke flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <h3 className="prose-body-highlight text-fg truncate">
                {expandedTemplate.name} history
              </h3>
              <p className="prose-body text-fg-tertiary truncate">
                Recent sessions for {expandedTemplate.template}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Button
                loading={isPending ? 'Refreshing...' : undefined}
                size="none"
                variant="tertiary"
                onClick={() => {
                  void refetch()
                }}
              >
                <RefreshIcon />
                Refresh
              </Button>
              <Button
                size="none"
                variant="tertiary"
                onClick={() => setExpandedAgentId(null)}
              >
                Close
              </Button>
            </div>
          </div>

          {isPending ? (
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
                  template: expandedTemplate,
                })
              }
              sessions={expandedSessions}
              teamSlug={teamSlug}
              template={expandedTemplate}
            />
          )}
        </section>
      ) : null}

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
        onMoveWindow={(windowId, position) => {
          setTerminalWindows((currentWindows) =>
            currentWindows.map((terminalWindow) =>
              terminalWindow.id === windowId
                ? { ...terminalWindow, position }
                : terminalWindow
            )
          )
        }}
        onSandboxAttached={(windowId, sandboxId) => {
          void refetch()
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
  onMoveWindow,
  onSandboxAttached,
}: {
  activeWindowId: string | null
  sandboxManagementAuth: SandboxManagementAuth
  teamSlug: string
  windows: AgentTerminalWindow[]
  onActivateWindow: (windowId: string) => void
  onCloseWindow: (windowId: string) => void
  onMinimizeWindow: (windowId: string) => void
  onMoveWindow: (windowId: string, position: WindowPosition) => void
  onSandboxAttached: (windowId: string, sandboxId: string) => void
}) {
  const layerRef = useRef<HTMLDivElement>(null)

  if (windows.length === 0) {
    return null
  }

  const handleWindowDragStart = (
    event: PointerEvent<HTMLDivElement>,
    terminalWindow: AgentTerminalWindow
  ) => {
    const target = event.target as HTMLElement | null

    if (
      terminalWindow.minimized ||
      target?.closest('button,a,input,textarea,select,[role="button"]') ||
      window.matchMedia('(max-width: 767px)').matches
    ) {
      return
    }

    const layerElement = layerRef.current
    const windowElement = event.currentTarget.closest(
      '[data-agent-terminal-window]'
    ) as HTMLElement | null

    if (!layerElement || !windowElement) {
      return
    }

    event.preventDefault()
    onActivateWindow(terminalWindow.id)

    const layerRect = layerElement.getBoundingClientRect()
    const windowRect = windowElement.getBoundingClientRect()
    const startPosition = terminalWindow.position
    const startPointer = {
      x: event.clientX,
      y: event.clientY,
    }

    const handlePointerMove = (pointerEvent: globalThis.PointerEvent) => {
      onMoveWindow(
        terminalWindow.id,
        clampWindowPosition({
          layerRect,
          position: {
            x: startPosition.x + pointerEvent.clientX - startPointer.x,
            y: startPosition.y + pointerEvent.clientY - startPointer.y,
          },
          windowRect,
        })
      )
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
  }

  return (
    <div
      ref={layerRef}
      className="pointer-events-none fixed top-18 right-2 bottom-4 left-2 z-40 md:right-4 md:bottom-10 md:left-[248px]"
    >
      {windows.map((terminalWindow) => {
        const isActive = activeWindowId === terminalWindow.id
        const minimizedIndex = windows
          .filter((candidate) => candidate.minimized)
          .findIndex((candidate) => candidate.id === terminalWindow.id)
        const windowStyle = terminalWindow.minimized
          ? {
              bottom:
                minimizedIndex *
                (MINIMIZED_TERMINAL_HEIGHT_PX +
                  MINIMIZED_TERMINAL_STACK_GAP_PX),
              left: 0,
            }
          : ({
              '--terminal-window-x': `${terminalWindow.position.x}px`,
              '--terminal-window-y': `${terminalWindow.position.y}px`,
            } as CSSProperties)

        return (
          <fieldset
            data-agent-terminal-window
            className={cn(
              'pointer-events-auto absolute m-0 min-w-0 border-0 p-0 shadow-xl',
              terminalWindow.minimized
                ? 'bottom-0 left-0 h-10 w-[min(18rem,calc(100%_-_1rem))]'
                : 'top-0 left-0 h-full w-full md:top-[var(--terminal-window-y)] md:left-[var(--terminal-window-x)] md:h-[min(540px,calc(100%_-_2rem))] md:w-[min(880px,calc(100%_-_2rem))]',
              isActive && 'z-10'
            )}
            key={terminalWindow.id}
            style={windowStyle}
            onPointerDown={() => onActivateWindow(terminalWindow.id)}
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
              onWindowDragStart={(event) =>
                handleWindowDragStart(event, terminalWindow)
              }
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
