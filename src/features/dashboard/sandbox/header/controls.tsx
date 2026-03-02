import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/cookies'
import KillButton from './kill-button'
import RefreshControl from './refresh'

export default async function SandboxDetailsControls() {
  const initialPollingInterval = (await cookies()).get(
    COOKIE_KEYS.SANDBOX_INSPECT_POLLING_INTERVAL
  )?.value

  return (
    <div className="flex items-center gap-2 md:pb-2">
      <RefreshControl
        initialPollingInterval={
          initialPollingInterval ? parseInt(initialPollingInterval) : undefined
        }
      />
      <KillButton />
    </div>
  )
}
