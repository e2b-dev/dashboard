'use client'

import SandboxLogs from './logs'

interface SandboxLogsViewProps {
  teamSlug: string
  sandboxId: string
}

export default function SandboxLogsView({
  teamSlug,
  sandboxId,
}: SandboxLogsViewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border bg-bg">
        <SandboxLogs teamSlug={teamSlug} sandboxId={sandboxId} />
      </div>
    </div>
  )
}
