'use client'

import type { AgentTemplateConfig } from '@/configs/agents'
import type { Sandbox } from '@/core/modules/sandboxes/models'
import { Button } from '@/ui/primitives/button'
import { RefreshIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { AgentSessionList } from './agent-session-list'

export function AgentHistoryPanel({
  canPause,
  error,
  isPending,
  onClose,
  onOpenTerminal,
  onRefresh,
  sessions,
  teamSlug,
  template,
}: {
  canPause: boolean
  error: unknown
  isPending: boolean
  onClose: () => void
  onOpenTerminal: (sandboxId: string) => void
  onRefresh: () => void
  sessions: Sandbox[]
  teamSlug: string
  template: AgentTemplateConfig
}) {
  return (
    <section
      className="border-stroke bg-bg-1 mt-4 overflow-hidden rounded-lg border"
      id={`agent-history-${template.id}`}
    >
      <div className="border-stroke flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h3 className="prose-body-highlight text-fg truncate">
            {template.name} history
          </h3>
          <p className="prose-body text-fg-tertiary truncate">
            Recent sessions for {template.template}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button
            loading={isPending ? 'Refreshing...' : undefined}
            size="none"
            variant="tertiary"
            onClick={onRefresh}
          >
            <RefreshIcon />
            Refresh
          </Button>
          <Button size="none" variant="tertiary" onClick={onClose}>
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
          canPause={canPause}
          onKilled={onRefresh}
          onPaused={onRefresh}
          onOpenTerminal={onOpenTerminal}
          sessions={sessions}
          teamSlug={teamSlug}
          template={template}
        />
      )}
    </section>
  )
}
