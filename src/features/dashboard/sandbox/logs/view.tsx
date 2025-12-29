'use client'

import { cn } from '@/lib/utils'
import SandboxLogs from './logs'

interface SandboxLogsViewProps {
  teamIdOrSlug: string
  sandboxId: string
}

export default function SandboxLogsView({
  teamIdOrSlug,
  sandboxId,
}: SandboxLogsViewProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col gap-4 overflow-hidden p-3 md:p-6',
        'max-md:sticky max-md:top-0 max-md:min-h-[calc(100vh-var(--protected-navbar-height))]'
      )}
    >
      <SandboxLogs teamIdOrSlug={teamIdOrSlug} sandboxId={sandboxId} />
    </div>
  )
}
