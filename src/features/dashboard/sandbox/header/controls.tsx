import KillButton from './kill-button'
import PauseButton from './pause-button'

export default function SandboxDetailsControls() {
  return (
    <div className="flex items-center gap-2 md:pb-2">
      <PauseButton />
      <KillButton />
    </div>
  )
}
