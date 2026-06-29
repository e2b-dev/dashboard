'use client'

import { type ReactNode, useMemo, useState } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import DashboardTerminal from '@/features/dashboard/terminal/dashboard-terminal'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { useDashboard } from '../../context'
import { useSandboxContext } from '../context'
import SandboxInspectNotFound from '../inspect/not-found'

interface SandboxTerminalViewProps {
  command?: string
  userId: string
}

const SANDBOX_TERMINAL_RESUME_TIMEOUT_MS = 70_000

export default function SandboxTerminalView({
  command,
  userId,
}: SandboxTerminalViewProps) {
  const [shouldResumeSandbox, setShouldResumeSandbox] = useState(false)
  const [terminalResumeError, setTerminalResumeError] = useState<string>()
  const { team } = useDashboard()
  const { sandboxId } =
    useRouteParams<'/dashboard/[teamSlug]/sandboxes/[sandboxId]'>()
  const {
    sandboxInfo,
    isSandboxInfoLoading,
    isSandboxNotFound,
    refetchSandboxInfo,
  } = useSandboxContext()
  const sandboxTemplate = sandboxInfo?.alias ?? sandboxInfo?.templateID
  const launchTarget = useMemo(
    () => ({
      command,
      sandboxId,
      template: sandboxTemplate,
    }),
    [command, sandboxId, sandboxTemplate]
  )

  const finishSandboxResume = async () => {
    const nextSandboxInfo = await refetchSandboxInfo()
    if (nextSandboxInfo?.state === 'running') {
      setTerminalResumeError(undefined)
      setShouldResumeSandbox(false)
    }
  }

  const handleSandboxAttachFailed = async () => {
    const nextSandboxInfo = await refetchSandboxInfo()
    if (shouldResumeSandbox && nextSandboxInfo?.state !== 'running') {
      setTerminalResumeError(
        'Failed to resume sandbox terminal. Please try again.'
      )
      setShouldResumeSandbox(false)
    }
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
          onResumeSandbox={() => {
            setTerminalResumeError(undefined)
            setShouldResumeSandbox(true)
          }}
          resumeError={terminalResumeError}
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
          void finishSandboxResume()
        }}
        onSandboxAttachFailed={() => {
          void handleSandboxAttachFailed()
        }}
        sandboxConnectRequestTimeoutMs={
          shouldResumeSandbox ? SANDBOX_TERMINAL_RESUME_TIMEOUT_MS : undefined
        }
        sandboxScoped
        teamSlug={team.slug}
        userId={userId}
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
