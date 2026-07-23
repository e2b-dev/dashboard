'use client'

import SandboxLogs from './logs'

interface SandboxLogsViewProps {
  sandboxId: string
}

export default function SandboxLogsView({ sandboxId }: SandboxLogsViewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-3 md:p-6">
      <SandboxLogs sandboxId={sandboxId} />
    </div>
  )
}
