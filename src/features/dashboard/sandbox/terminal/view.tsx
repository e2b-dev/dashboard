'use client'

import { useDashboard } from '@/features/dashboard/context'
import DashboardTerminal from '@/features/dashboard/terminal/dashboard-terminal'

interface SandboxTerminalViewProps {
  sandboxId: string
}

export default function SandboxTerminalView({
  sandboxId,
}: SandboxTerminalViewProps) {
  const { team } = useDashboard()

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden p-3 md:p-6">
      <DashboardTerminal
        autoStart
        initialSandboxId={sandboxId}
        sandboxScoped
        teamId={team.id}
      />
    </div>
  )
}
