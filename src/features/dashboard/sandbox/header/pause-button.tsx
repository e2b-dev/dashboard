'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/ui'
import { pauseSandboxAction } from '@/server/sandboxes/sandbox-actions'
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
  const canPause = sandboxInfo?.state === 'running'

  const { execute, isExecuting } = useAction(pauseSandboxAction, {
    onSuccess: async () => {
      toast.success('Sandbox paused successfully')
      refetchSandboxInfo()
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || 'Failed to pause sandbox. Please try again.'
      )
    },
  })

  const handlePause = () => {
    if (!canPause || !sandboxInfo?.sandboxID) return

    execute({
      teamIdOrSlug: team.id,
      sandboxId: sandboxInfo.sandboxID,
    })
  }

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
