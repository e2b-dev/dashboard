'use client'

import { type ReactNode, useState } from 'react'
import type { SandboxManagementAuth } from '@/core/shared/sandbox-management-auth'
import LoadingLayout from '@/features/dashboard/loading-layout'
import DashboardTerminal from '@/features/dashboard/terminal/dashboard-terminal'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { useDashboard } from '../../context'
import { useSandboxContext } from '../context'
import SandboxInspectNotFound from '../inspect/not-found'

interface SandboxTerminalViewProps {
  sandboxManagementAuth: SandboxManagementAuth
}

export default function SandboxTerminalView({
  sandboxManagementAuth,
}: SandboxTerminalViewProps) {
  const [shouldResumeSandbox, setShouldResumeSandbox] = useState(false)
  const { team } = useDashboard()
  const { sandboxId } =
    useRouteParams<'/dashboard/[teamSlug]/sandboxes/[sandboxId]'>()
  const {
    sandboxInfo,
    isSandboxInfoLoading,
    isSandboxNotFound,
    refetchSandboxInfo,
  } = useSandboxContext()
  const sandboxTemplateId = sandboxInfo?.templateID
  const launchTarget = {
    sandboxId,
    template: sandboxTemplateId,
  }

  const refetchSandbox = () => {
    void refetchSandboxInfo()
  }

  if (isSandboxInfoLoading && !sandboxInfo) {
    return <LoadingLayout />
  }

  if (
    isSandboxNotFound ||
    !sandboxInfo ||
    (sandboxInfo.state !== 'running' && !shouldResumeSandbox)
  ) {
    return (
      <SandboxTerminalEmptyState>
        <SandboxInspectNotFound
          resource="terminal"
          onResumeSandbox={() => setShouldResumeSandbox(true)}
        />
      </SandboxTerminalEmptyState>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden p-3 md:p-6">
      <DashboardTerminal
        autoStart
        launchTarget={launchTarget}
        onSandboxAttached={() => {
          setShouldResumeSandbox(false)
          refetchSandbox()
        }}
        onSandboxAttachFailed={() => {
          refetchSandbox()
        }}
        sandboxManagementAuth={sandboxManagementAuth}
        sandboxScoped
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
