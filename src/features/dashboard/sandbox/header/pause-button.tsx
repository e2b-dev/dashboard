'use client'

import Sandbox from 'e2b'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { supabase } from '@/lib/clients/supabase/client'
import { cn } from '@/lib/utils/ui'
import { Button } from '@/ui/primitives/button'
import { PausedIcon } from '@/ui/primitives/icons'
import { useDashboard } from '../../context'
import { useSandboxContext } from '../context'

interface PauseButtonProps {
  className?: string
}

export default function PauseButton({ className }: PauseButtonProps) {
  const { sandboxInfo, refetchSandboxInfo } = useSandboxContext()
  const { team } = useDashboard()
  const [isExecuting, setIsExecuting] = useState(false)
  const canPause = sandboxInfo?.state === 'running'

  const handlePause = useCallback(async () => {
    if (!canPause || !sandboxInfo?.sandboxID) return

    setIsExecuting(true)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data?.session) {
        toast.error('Session expired. Please sign in again.')
        return
      }

      await Sandbox.pause(sandboxInfo.sandboxID, {
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        headers: {
          ...SUPABASE_AUTH_HEADERS(data.session.access_token, team.id),
        },
      })

      toast.success('Sandbox paused successfully')
      refetchSandboxInfo()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to pause sandbox. Please try again.'
      )
    } finally {
      setIsExecuting(false)
    }
  }, [canPause, sandboxInfo?.sandboxID, team.id, refetchSandboxInfo])

  return (
    <Button
      variant="ghost"
      size="slate"
      className={cn(className)}
      disabled={!canPause || isExecuting}
      onClick={handlePause}
      loading={isExecuting}
    >
      <PausedIcon className="size-3.5" />
      Pause
    </Button>
  )
}
