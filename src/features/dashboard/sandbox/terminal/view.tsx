'use client'

import { type ReactNode, useCallback, useMemo } from 'react'
import { useDashboard } from '@/features/dashboard/context'
import LoadingLayout from '@/features/dashboard/loading-layout'
import DashboardTerminal from '@/features/dashboard/terminal/dashboard-terminal'
import { useSandboxContext } from '../context'
import SandboxInspectNotFound from '../inspect/not-found'

export default function SandboxTerminalView() {
  const { team } = useDashboard()
  const {
    getSandbox,
    sandboxInfo,
    isSandboxInfoLoading,
    isSandboxNotFound,
    refetchSandboxInfo,
  } = useSandboxContext()
  const sandboxTemplateId = sandboxInfo?.templateID
  const launchTarget = useMemo(
    () =>
      sandboxTemplateId
        ? {
            template: sandboxTemplateId,
          }
        : undefined,
    [sandboxTemplateId]
  )

  const refetchSandbox = useCallback(() => {
    void refetchSandboxInfo()
  }, [refetchSandboxInfo])

  const handleSandboxAttachFailed = refetchSandbox

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

  if (sandboxInfo.state !== 'running') {
    return (
      <SandboxTerminalEmptyState>
        <SandboxInspectNotFound resource="terminal" />
      </SandboxTerminalEmptyState>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden p-3 md:p-6">
      <DashboardTerminal
        autoStart
        getSandbox={getSandbox}
        launchTarget={launchTarget}
        onSandboxAttached={refetchSandbox}
        onSandboxAttachFailed={handleSandboxAttachFailed}
        sandboxScoped
        teamId={team.id}
        teamSlug={team.slug}
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
