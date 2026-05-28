'use client'

import { type ReactNode, useState } from 'react'
import { useDashboard } from '@/features/dashboard/context'
import LoadingLayout from '@/features/dashboard/loading-layout'
import DashboardTerminal from '@/features/dashboard/terminal/dashboard-terminal'
import { useSandboxContext } from '../context'
import SandboxInspectNotFound from '../inspect/not-found'

export default function SandboxTerminalView() {
  const { team } = useDashboard()
  const {
    sandboxInfo,
    isSandboxInfoLoading,
    isSandboxNotFound,
    refetchSandboxInfo,
  } = useSandboxContext()
  const [resumeRequestedSandboxId, setResumeRequestedSandboxId] = useState<
    string | null
  >(null)

  if (isSandboxInfoLoading && !sandboxInfo) {
    return <LoadingLayout />
  }

  if (isSandboxNotFound || !sandboxInfo) {
    return (
      <SandboxTerminalEmptyState>
        <SandboxInspectNotFound resource="terminal" />
      </SandboxTerminalEmptyState>
    )
  }

  const shouldOpenTerminal =
    sandboxInfo.state === 'running' ||
    resumeRequestedSandboxId === sandboxInfo.sandboxID

  if (!shouldOpenTerminal) {
    return (
      <SandboxTerminalEmptyState>
        <SandboxInspectNotFound
          resource="terminal"
          onResumeSandbox={() =>
            setResumeRequestedSandboxId(sandboxInfo.sandboxID)
          }
        />
      </SandboxTerminalEmptyState>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden p-3 md:p-6">
      <DashboardTerminal
        autoStart
        launchTarget={{
          sandboxId: sandboxInfo.sandboxID,
          template: sandboxInfo.templateID,
        }}
        onSandboxAttached={() => void refetchSandboxInfo()}
        onSandboxAttachFailed={() => void refetchSandboxInfo()}
        sandboxScoped
        teamId={team.id}
      />
    </div>
  )
}

function SandboxTerminalEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden p-3 md:p-6">
      <div className="min-h-0 flex-1 overflow-hidden border bg-bg">
        {children}
      </div>
    </div>
  )
}
