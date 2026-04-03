'use client'

import { useSandboxContext } from '../context'
import KillButton from './kill-button'
import PauseButton from './pause-button'
import ResumeButton from './resume-button'

export default function SandboxDetailsControls() {
  const { sandboxInfo } = useSandboxContext()

  const isPaused = sandboxInfo?.state === 'paused'
  const isRunning = sandboxInfo?.state === 'running'

  return (
    <div className="flex items-center gap-2 md:pb-2">
      {isRunning && <PauseButton />}
      {isPaused && <ResumeButton />}
      <KillButton />
    </div>
  )
}
