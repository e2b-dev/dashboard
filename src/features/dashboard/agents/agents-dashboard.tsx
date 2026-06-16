'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { AgentTemplateConfig } from '@/configs/agents'
import type { SandboxManagementAuth } from '@/core/shared/sandbox-management-auth'
import { useTRPC } from '@/trpc/client'
import { AgentHistoryPanel } from './agent-history-panel'
import { AgentTemplateCard } from './agent-template-card'
import { AgentTerminalWindowLayer } from './agent-terminal-window-layer'
import { RECENT_SESSION_LIMIT } from './constants'
import { useAgentTerminalWindows } from './use-agent-terminal-windows'
import { canPauseSandboxes, sortByNewestStartedAt } from './utils'

interface AgentsDashboardProps {
  sandboxManagementAuth: SandboxManagementAuth
  templates: AgentTemplateConfig[]
  teamSlug: string
}

export function AgentsDashboard({
  sandboxManagementAuth,
  templates,
  teamSlug,
}: AgentsDashboardProps) {
  const trpc = useTRPC()
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null)
  const pauseSupported = canPauseSandboxes()
  const {
    activeWindowId,
    attachSandboxToWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    moveWindow,
    openTerminalWindow,
    resizeWindow,
    terminalWindows,
  } = useAgentTerminalWindows()

  const expandedTemplate = templates.find(
    (template) => template.id === expandedAgentId
  )
  const { data, error, isFetching, isPending, refetch } = useQuery(
    trpc.sandboxes.getAgentSandboxes.queryOptions(
      {
        teamSlug,
        template: expandedTemplate?.template ?? '',
      },
      {
        enabled: !!expandedTemplate,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
      }
    )
  )

  const expandedSessions = (data?.sandboxes ?? [])
    .toSorted(sortByNewestStartedAt)
    .slice(0, RECENT_SESSION_LIMIT)

  const refreshSessions = () => {
    void refetch()
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <AgentTemplateCard
            isExpanded={expandedAgentId === template.id}
            key={template.id}
            template={template}
            onStart={() =>
              openTerminalWindow({
                forceNewSandbox: true,
                template,
              })
            }
            onToggleHistory={() =>
              setExpandedAgentId((currentAgentId) =>
                currentAgentId === template.id ? null : template.id
              )
            }
          />
        ))}
      </div>

      {expandedTemplate ? (
        <AgentHistoryPanel
          canPause={pauseSupported}
          error={error}
          isLoading={isPending}
          isRefreshing={isFetching}
          sessions={expandedSessions}
          teamSlug={teamSlug}
          template={expandedTemplate}
          onClose={() => setExpandedAgentId(null)}
          onOpenTerminal={(sandboxId) =>
            openTerminalWindow({
              sandboxId,
              template: expandedTemplate,
            })
          }
          onRefresh={refreshSessions}
        />
      ) : null}

      <AgentTerminalWindowLayer
        activeWindowId={activeWindowId}
        sandboxManagementAuth={sandboxManagementAuth}
        teamSlug={teamSlug}
        windows={terminalWindows}
        onActivateWindow={focusWindow}
        onCloseWindow={closeWindow}
        onMinimizeWindow={minimizeWindow}
        onMoveWindow={moveWindow}
        onResizeWindow={resizeWindow}
        onSandboxAttached={(windowId, sandboxId) => {
          refreshSessions()
          attachSandboxToWindow(windowId, sandboxId)
        }}
      />
    </>
  )
}
