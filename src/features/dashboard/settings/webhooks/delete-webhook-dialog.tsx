'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useDashboard } from '@/features/dashboard/context'
import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import { RemoveIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import type { Webhook } from './types'

interface DeleteWebhookDialogProps {
  children?: React.ReactNode
  webhook: Webhook
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const DeleteWebhookDialog = ({
  children: trigger,
  webhook,
  open: controlledOpen,
  onOpenChange,
}: DeleteWebhookDialogProps) => {
  const { team } = useDashboard()
  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen

  const listQueryKey = trpc.webhooks.list.queryOptions({
    teamSlug: team.slug,
  }).queryKey

  const deleteMutation = useMutation(
    trpc.webhooks.delete.mutationOptions({
      onSuccess: () => {
        toast(defaultSuccessToast('Webhook deleted successfully'))
        void queryClient.invalidateQueries({ queryKey: listQueryKey })
        setOpen(false)
      },
      onError: (err) => {
        toast(defaultErrorToast(err.message || 'Failed to delete webhook'))
      },
    })
  )

  const isDeleting = deleteMutation.isPending

  const handleDelete = () => {
    deleteMutation.mutate({
      teamSlug: team.slug,
      webhookId: webhook.id,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        hideClose
        className="flex flex-row items-center gap-6 sm:max-w-[516px] py-4 pr-8 pl-5"
      >
        <DialogHeader className="flex-1 gap-2 text-left">
          <DialogTitle>Delete webhook?</DialogTitle>
          <DialogDescription>
            You will no longer receive events at
            <br />
            <span className="break-all">{webhook.url}</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="shrink-0 gap-5 sm:gap-5">
          <Button
            size="none"
            variant="quaternary"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button variant="error" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader variant="slash" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <RemoveIcon className="size-4" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
