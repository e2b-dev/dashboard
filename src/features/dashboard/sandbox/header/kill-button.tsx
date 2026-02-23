'use client'

import { cn } from '@/lib/utils/ui'
import { killSandboxAction } from '@/server/sandboxes/sandbox-actions'
import { AlertPopover } from '@/ui/alert-popover'
import { Button } from '@/ui/primitives/button'
import { TrashIcon } from '@/ui/primitives/icons'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { useDashboard } from '../../context'
import { useSandboxContext } from '../context'

interface KillButtonProps {
  className?: string
}

export default function KillButton({ className }: KillButtonProps) {
  const [open, setOpen] = useState(false)
  const { sandboxInfo, refetchSandboxInfo, isRunning } = useSandboxContext()
  const { team } = useDashboard()

  const { execute, isExecuting } = useAction(killSandboxAction, {
    onSuccess: async () => {
      toast.success('Sandbox killed successfully')
      setOpen(false)
      refetchSandboxInfo()
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || 'Failed to kill sandbox. Please try again.'
      )
    },
  })

  const handleKill = () => {
    if (!sandboxInfo?.sandboxID || !isRunning) return

    execute({
      teamIdOrSlug: team.id,
      sandboxId: sandboxInfo.sandboxID,
    })
  }

  return (
    <AlertPopover
      open={open}
      onOpenChange={setOpen}
      title="Kill Sandbox"
      description="Are you sure you want to kill this sandbox? The sandbox state will be lost and cannot be recovered."
      confirm="Kill Sandbox"
      trigger={
        <Button
          variant="ghost"
          size="slate"
          className={cn('text-accent-error-highlight', className)}
          disabled={!isRunning}
        >
          <TrashIcon className="size-3.5" />
          Kill
        </Button>
      }
      confirmProps={{
        disabled: isExecuting,
        loading: isExecuting,
      }}
      onConfirm={handleKill}
      onCancel={() => setOpen(false)}
    />
  )
}
