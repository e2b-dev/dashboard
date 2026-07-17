'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import { SiClaude } from 'react-icons/si'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import {
  ExternalLinkIcon,
  TerminalIcon,
  UnpackIcon,
} from '@/ui/primitives/icons'
import type { AgentTemplateConfig } from './config'

const AGENT_ICONS = {
  claude: SiClaude,
  open: UnpackIcon,
  openai: TerminalIcon,
} satisfies Record<
  AgentTemplateConfig['icon'],
  ComponentType<{ className?: string }>
>

function getLaunchHref(agent: AgentTemplateConfig) {
  const params = new URLSearchParams({
    command: agent.command,
    template: agent.template,
  })

  return `/sbx/new?${params.toString()}`
}

export function AgentsList({
  agents,
  className,
}: {
  agents: AgentTemplateConfig[]
  className?: string
}) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {agents.map((agent) => (
        <AgentCard agent={agent} key={agent.id} />
      ))}
    </div>
  )
}

function AgentCard({ agent }: { agent: AgentTemplateConfig }) {
  const AgentIcon = AGENT_ICONS[agent.icon]

  return (
    <section className="border-stroke bg-bg-1 flex min-h-44 flex-col rounded-lg border p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="border-stroke bg-bg flex size-9 shrink-0 items-center justify-center rounded-md border">
          <AgentIcon className="size-4" />
        </div>
        <div className="min-w-0">
          <h3 className="prose-body-highlight text-fg truncate">
            {agent.name}
          </h3>
          <p className="prose-body text-fg-tertiary mt-1 line-clamp-2">
            {agent.description}
          </p>
        </div>
      </div>

      <div className="prose-label text-fg-tertiary mt-auto pt-4 uppercase">
        {agent.template}
      </div>

      <Button asChild className="mt-3 w-full" variant="primary">
        <Link href={getLaunchHref(agent)} prefetch={false}>
          Start
          <ExternalLinkIcon />
        </Link>
      </Button>
    </section>
  )
}
