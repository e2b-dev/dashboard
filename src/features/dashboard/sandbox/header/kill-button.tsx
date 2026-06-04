'use client'

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTRPC } from '@/trpc/client'
import { AlertPopover } from '@/ui/alert-popover'
import { Button } from '@/ui/primitives/button'
import { TrashIcon } from '@/ui/primitives/icons'
import { useDashboard } from '../../context'
import { useSandboxContext } from '../context'

interface KillButtonProps {
  className?: string
}

export default function KillButton({ className }: KillButtonProps) {
  const [open, setOpen] = useState(false)
  const { sandboxInfo, refetchSandboxInfo } = useSandboxContext()
  const { team } = useDashboard()
  const trpc = useTRPC()
  const canKill = Boolean(
    sandboxInfo?.sandboxID && sandboxInfo.state !== 'killed'
  )

  const killSandboxMutation = useMutation(
    trpc.sandbox.kill.mutationOptions({
      onSuccess: async () => {
        toast.success('Sandbox killed successfully')
        setOpen(false)
        refetchSandboxInfo()
      },
      onError: (error) => {
        toast.error(
          error.message || 'Failed to kill sandbox. Please try again.'
        )
      },
    })
  )

  const handleKill = () => {
    if (!canKill || !sandboxInfo?.sandboxID) return

    killSandboxMutation.mutate({
      teamSlug: team.slug,
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
        <Button variant="error" className={className} disabled={!canKill}>
          <TrashIcon />
          Kill
        </Button>
      }
      confirmProps={{
        disabled: killSandboxMutation.isPending,
        loading: killSandboxMutation.isPending ? 'Killing...' : undefined,
      }}
      onConfirm={handleKill}
      onCancel={() => setOpen(false)}
    />
  )
}
