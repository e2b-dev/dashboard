'use client'

import { openDashboardTerminal } from '@/features/dashboard/terminal/dashboard-terminal'
import { CpuIcon, TerminalCustomIcon } from '@/ui/primitives/icons'

const DEVIN_INSTALL_COMMAND =
  'curl -fsSL https://cli.devin.ai/install.sh | bash && source /home/user/.bashrc'

export default function DevinAgentCard() {
  const startDevinInstall = () => {
    openDashboardTerminal(DEVIN_INSTALL_COMMAND)
  }

  return (
    <button
      type="button"
      onClick={startDevinInstall}
      className="group flex min-h-52 w-full min-w-0 flex-col justify-between border bg-bg text-left transition-colors hover:border-stroke-active hover:bg-bg-1"
    >
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center border bg-bg-1 text-fg">
            <CpuIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="prose-body-highlight truncate">Devin</h2>
            <p className="prose-caption text-fg-tertiary">
              Terminal coding agent
            </p>
          </div>
        </div>
        <span className="prose-label rounded-none border px-2 py-1 text-fg-tertiary">
          Interactive
        </span>
      </div>

      <div className="min-w-0 space-y-4 px-5 pb-5">
        <p className="prose-body text-fg-secondary">
          Opens a persistent E2B terminal sandbox and starts the Devin CLI
          installer.
        </p>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <code className="min-w-0 truncate font-mono text-xs text-fg-tertiary">
            curl -fsSL https://cli.devin.ai/install.sh | bash
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
