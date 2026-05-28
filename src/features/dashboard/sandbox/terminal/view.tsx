'use client'

import { type ReactNode, useCallback, useMemo, useState } from 'react'
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

  const launchTarget = useMemo(
    () =>
      sandboxInfo
        ? {
            sandboxId: sandboxInfo.sandboxID,
            template: sandboxInfo.templateID,
          }
        : undefined,
    [sandboxInfo]
  )

  const refetchSandbox = useCallback(() => {
    void refetchSandboxInfo()
  }, [refetchSandboxInfo])

  const handleSandboxAttachFailed = useCallback(() => {
    setResumeRequestedSandboxId(null)
    void refetchSandboxInfo()
  }, [refetchSandboxInfo])

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
        launchTarget={launchTarget}
        onSandboxAttached={refetchSandbox}
        onSandboxAttachFailed={handleSandboxAttachFailed}
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
