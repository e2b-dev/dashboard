'use client'

import type { AgentTemplateConfig } from '@/configs/agents'
import { cn } from '@/lib/utils/ui'
import { Button } from '@/ui/primitives/button'
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  HistoryIcon,
} from '@/ui/primitives/icons'

export function AgentTemplateCard({
  isExpanded,
  onStart,
  onToggleHistory,
  template,
}: {
  isExpanded: boolean
  onStart: () => void
  onToggleHistory: () => void
  template: AgentTemplateConfig
}) {
  const historyPanelId = `agent-history-${template.id}`

  return (
    <section className="border-stroke bg-bg-1 flex min-h-48 flex-col overflow-hidden rounded-lg border">
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
            onClick={onStart}
          >
            Start
            <ExternalLinkIcon />
          </Button>
          <Button
            aria-controls={historyPanelId}
            aria-expanded={isExpanded}
            className="w-full"
            size="default"
            variant="secondary"
            onClick={onToggleHistory}
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
}
