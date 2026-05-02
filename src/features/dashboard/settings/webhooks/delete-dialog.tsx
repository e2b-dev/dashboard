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
import { AlertDialog } from '@/ui/alert-dialog'
import { TrashIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { Label } from '@/ui/primitives/label'
import { Loader } from '@/ui/primitives/loader'
import type { Webhook } from './types'

interface WebhookDeleteDialogProps {
  children: React.ReactNode
  webhook: Webhook
}

export default function WebhookDeleteDialog({
  children: trigger,
  webhook,
}: WebhookDeleteDialogProps) {
  const { team } = useDashboard()
  const { toast } = useToast()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [confirmationUrl, setConfirmationUrl] = useState('')

  const isUrlMatch = confirmationUrl === webhook.url

  const listQueryKey = trpc.webhooks.list.queryOptions({
    teamSlug: team.slug,
  }).queryKey

  const deleteMutation = useMutation(
    trpc.webhooks.delete.mutationOptions({
      onSuccess: () => {
        toast(defaultSuccessToast('Webhook deleted successfully'))
        void queryClient.invalidateQueries({ queryKey: listQueryKey })
        setOpen(false)
        setConfirmationUrl('')
      },
      onError: (err) => {
        toast(defaultErrorToast(err.message || 'Failed to delete webhook'))
      },
    })
  )

  const isDeleting = deleteMutation.isPending

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (!value) {
      setConfirmationUrl('')
    }
  }

  const webhookName = webhook.name

  return (
    <AlertDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={trigger}
      title={`Delete '${webhookName}'`}
      description={`You will no longer receive events at ${webhook.url}`}
      confirm={
        isDeleting ? (
          <>
            <Loader variant="slash" />
            <span>Deleting Webhook...</span>
          </>
        ) : (
          <>
            <TrashIcon className="size-4" />
            Delete
          </>
        )
      }
      confirmProps={{
        variant: 'error',
        disabled: isDeleting || !isUrlMatch,
      }}
      onConfirm={() => {
        deleteMutation.mutate({
          teamSlug: team.slug,
          webhookId: webhook.id,
        })
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm-url" className="text-fg-secondary">
          Type the webhook URL to confirm deletion
        </Label>
        <Input
          id="confirm-url"
          value={confirmationUrl}
          onChange={(e) => setConfirmationUrl(e.target.value)}
          placeholder={webhook.url}
          disabled={isDeleting}
          autoComplete="off"
          className="min-w-0"
        />
        {confirmationUrl && !isUrlMatch && (
          <p className="text-accent-error-highlight prose-body">
            URL does not match
          </p>
        )}
      </div>
    </AlertDialog>
  )
}
