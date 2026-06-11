'use client'

import Sandbox from 'e2b'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { supabase } from '@/core/shared/clients/supabase/client'
import { cn } from '@/lib/utils/ui'
import { Button } from '@/ui/primitives/button'
import { PlayIcon } from '@/ui/primitives/icons'
import { useDashboard } from '../../context'
import { useSandboxContext } from '../context'

interface ResumeButtonProps {
  className?: string
}

export default function ResumeButton({ className }: ResumeButtonProps) {
  const { sandboxInfo, refetchSandboxInfo } = useSandboxContext()
  const { team } = useDashboard()
  const [isExecuting, setIsExecuting] = useState(false)
  const canResume = sandboxInfo?.state === 'paused'

  const handleResume = useCallback(async () => {
    if (!canResume || !sandboxInfo?.sandboxID) return

    setIsExecuting(true)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data?.session) {
        toast.error('Session expired. Please sign in again.')
        return
      }

      await Sandbox.connect(sandboxInfo.sandboxID, {
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        headers: {
          ...SUPABASE_AUTH_HEADERS(data.session.access_token, team.id),
        },
      })

      toast.success('Sandbox resumed successfully')
      refetchSandboxInfo()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to resume sandbox. Please try again.'
      )
    } finally {
      setIsExecuting(false)
    }
  }, [canResume, sandboxInfo?.sandboxID, team.id, refetchSandboxInfo])

  return (
    <Button
      variant="secondary"
      className={cn('text-accent-positive-highlight', className)}
      disabled={!canResume || isExecuting}
      onClick={handleResume}
      loading={isExecuting ? 'Resuming...' : undefined}
    >
      <PlayIcon className="size-3.5" />
      Resume
    </Button>
  )
}
