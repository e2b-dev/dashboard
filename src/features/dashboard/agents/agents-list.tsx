'use client'

import Link from 'next/link'
import { type ComponentType, useEffect, useState } from 'react'
import { SiClaude, SiOpenai } from 'react-icons/si'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/primitives/button'
import { ExternalLinkIcon, UnpackIcon } from '@/ui/primitives/icons'
import type { AgentTemplateConfig } from './config'

const AGENT_ICONS = {
  claude: SiClaude,
  open: UnpackIcon,
  openai: SiOpenai,
} satisfies Record<
  AgentTemplateConfig['icon'],
  ComponentType<{ className?: string }>
>

const NAME_VARIANT_MASK = 23
const NAME_VARIANTS: Partial<Record<string, number[]>> = {
  claude: [109, 114, 118, 123, 120, 99],
  codex: [122, 118, 101, 126, 121, 114],
  opencode: [109, 114, 101, 112, 123, 126, 121, 112],
}

function getNameVariant(agentId: string) {
  const variant = NAME_VARIANTS[agentId]

  if (!variant) return

  return String.fromCharCode(
    ...variant.map((codePoint) => codePoint ^ NAME_VARIANT_MASK)
  )
}

function getLaunchHref(agent: AgentTemplateConfig) {
  const params = new URLSearchParams({
    command: agent.command,
    template: agent.template,
  })

  return `/sbx/new?${params.toString()}`
}

function useMetaKeyPressed() {
  const [isPressed, setIsPressed] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Meta') {
        setIsPressed(true)
      }
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Meta') {
        setIsPressed(false)
      }
    }
    const handleBlur = () => {
      setIsPressed(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  return isPressed
}

export function AgentsList({
  agents,
  className,
}: {
  agents: AgentTemplateConfig[]
  className?: string
}) {
  const showAlternateNames = useMetaKeyPressed()

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {agents.map((agent) => (
        <AgentCard
          agent={agent}
          key={agent.id}
          showAlternateName={showAlternateNames}
        />
      ))}
    </div>
  )
}

function AgentCard({
  agent,
  showAlternateName,
}: {
  agent: AgentTemplateConfig
  showAlternateName: boolean
}) {
  const AgentIcon = AGENT_ICONS[agent.icon]
  const displayName = showAlternateName
    ? (getNameVariant(agent.id) ?? agent.name)
    : agent.name

  return (
    <section className="border-stroke bg-bg-1 flex min-h-44 flex-col rounded-lg border p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="border-stroke bg-bg flex size-9 shrink-0 items-center justify-center rounded-md border">
          <AgentIcon className="size-4" />
        </div>
        <div className="min-w-0">
          <h3 className="prose-body-highlight text-fg truncate">
            {displayName}
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
        <Link href={getLaunchHref(agent)}>
          Start
          <ExternalLinkIcon />
        </Link>
      </Button>
    </section>
  )
}
