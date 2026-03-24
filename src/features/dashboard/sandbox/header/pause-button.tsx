'use client'

import { Pause } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { pauseSandboxAction } from '@/server/sandboxes/sandbox-actions'
import { AlertDialog } from '@/ui/alert-dialog'
import { Button } from '@/ui/primitives/button'
import { useDashboard } from '../../context'
import { useSandboxContext } from '../context'

export default function PauseButton() {
  const [open, setOpen] = useState(false)
  const { sandboxInfo, refetchSandboxInfo } = useSandboxContext()
  const { team } = useDashboard()
  const canPause = sandboxInfo?.state === 'running'

  const { execute, isExecuting } = useAction(pauseSandboxAction, {
    onSuccess: async () => {
      toast.success('Sandbox paused successfully')
      setOpen(false)
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
    <AlertDialog
      open={open}
      onOpenChange={setOpen}
      title="Pause Sandbox"
      description="Are you sure you want to pause this sandbox? The sandbox will be suspended and can be resumed later."
      confirm="Pause Sandbox"
      trigger={
        <Button variant="ghost" size="slate" disabled={!canPause}>
          <Pause className="size-3.5" />
          Pause
        </Button>
      }
      confirmProps={{
        disabled: isExecuting,
        loading: isExecuting,
      }}
      onConfirm={handlePause}
    />
  )
}
