'use client'

import { openDashboardTerminal } from '@/features/dashboard/terminal/events'
import { CpuIcon, TerminalCustomIcon } from '@/ui/primitives/icons'
import type { AgentLauncher } from './agent-launchers'

interface AgentLaunchCardProps {
  agent: AgentLauncher
}

export default function AgentLaunchCard({ agent }: AgentLaunchCardProps) {
  const openAgent = () => {
    openDashboardTerminal({
      command: agent.command,
      template: agent.template,
    })
  }

  return (
    <button
      type="button"
      onClick={openAgent}
      className="group flex min-h-52 w-full min-w-0 flex-col justify-between border bg-bg text-left transition-colors hover:border-stroke-active hover:bg-bg-1"
    >
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center border bg-bg-1 text-fg">
            <CpuIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="prose-body-highlight truncate">{agent.name}</h2>
            <p className="prose-caption text-fg-tertiary">
              {agent.template} sandbox
            </p>
          </div>
        </div>
        <span className="prose-label rounded-none border px-2 py-1 text-fg-tertiary">
          {agent.badge}
        </span>
      </div>

      <div className="min-w-0 space-y-4 px-5 pb-5">
        <p className="prose-body text-fg-secondary">{agent.description}</p>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <code className="min-w-0 truncate font-mono text-xs text-fg-tertiary">
            {agent.command}
          </code>
          <span className="prose-body-highlight inline-flex h-8 shrink-0 items-center justify-center gap-1 border px-3 transition-colors group-hover:border-stroke-active">
            <TerminalCustomIcon className="size-4" />
            Open
          </span>
        </div>
      </div>
    </button>
  )
}
