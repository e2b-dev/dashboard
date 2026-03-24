'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/ui'
import { resumeSandboxAction } from '@/server/sandboxes/sandbox-actions'
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
  const canResume = sandboxInfo?.state === 'paused'

  const { execute, isExecuting } = useAction(resumeSandboxAction, {
    onSuccess: async () => {
      toast.success('Sandbox resumed successfully')
      refetchSandboxInfo()
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || 'Failed to resume sandbox. Please try again.'
      )
    },
  })

  const handleResume = () => {
    if (!canResume || !sandboxInfo?.sandboxID) return

    execute({
      teamIdOrSlug: team.id,
      sandboxId: sandboxInfo.sandboxID,
      timeout: 60,
    })
  }

  return (
    <Button
      variant="ghost"
      size="slate"
      className={cn('text-accent-positive-highlight', className)}
      disabled={!canResume || isExecuting}
      onClick={handleResume}
      loading={isExecuting}
    >
      <PlayIcon className="size-3.5" />
      Resume
    </Button>
  )
}
