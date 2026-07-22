'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { useTRPC } from '@/trpc/client'
import { AlertPopover } from '@/ui/alert-popover'
import { Button } from '@/ui/primitives/button'
import { PausedIcon } from '@/ui/primitives/icons'
import { useSandboxContext } from '../context'

interface PauseButtonProps {
  className?: string
}

export default function PauseButton({ className }: PauseButtonProps) {
  const [open, setOpen] = useState(false)
  const { sandboxInfo, refetchSandboxInfo } = useSandboxContext()
  const { sandboxId } = useRouteParams<'/sandboxes/[sandboxId]'>()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const canPause = sandboxInfo?.state === 'running'
  const detailsKey = trpc.sandbox.details.queryKey({ sandboxId })

  const { mutate: pause, isPending } = useMutation(
    trpc.sandbox.pause.mutationOptions({
      // Optimistically mark the sandbox as paused so the live terminal/filesystem
      // connections tear down immediately. Otherwise their envd traffic
      // auto-resumes the sandbox while the pause snapshot is being created.
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: detailsKey })
        const previous = queryClient.getQueryData(detailsKey)
        queryClient.setQueryData(detailsKey, (old) =>
          old?.state === 'running' ? { ...old, state: 'paused' as const } : old
        )
        return { previous }
      },
      onError: (_error, _variables, context) => {
        if (context?.previous !== undefined) {
          queryClient.setQueryData(detailsKey, context.previous)
        }
        toast.error('Failed to pause sandbox. Please try again.')
      },
      onSuccess: async () => {
        toast.success('Sandbox paused successfully')
        setOpen(false)
        refetchSandboxInfo()
      },
    })
  )

  const handlePause = () => {
    if (!canPause || !sandboxInfo?.sandboxID) return

    pause({ sandboxId: sandboxInfo.sandboxID })
  }

  if (!canPause) return null

  return (
    <AlertPopover
      open={open}
      onOpenChange={setOpen}
      title="Pause Sandbox"
      description="Are you sure you want to pause this sandbox? Its state will be preserved, and you can resume it later."
      confirm="Pause Sandbox"
      trigger={
        <Button variant="secondary" className={className}>
          <PausedIcon />
          Pause
        </Button>
      }
      confirmProps={{
        disabled: isPending,
        loading: isPending ? 'Pausing...' : undefined,
      }}
      onConfirm={handlePause}
      onCancel={() => setOpen(false)}
    />
  )
}
