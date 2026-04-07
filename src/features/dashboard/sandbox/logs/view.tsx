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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-3 md:p-6">
      <SandboxLogs teamSlug={teamSlug} sandboxId={sandboxId} />
    </div>
  )
}
