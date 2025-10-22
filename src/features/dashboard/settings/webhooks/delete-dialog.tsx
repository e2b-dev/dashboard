'use client'

import {
  defaultErrorToast,
  defaultSuccessToast,
  useToast,
} from '@/lib/hooks/use-toast'
import { deleteWebhookAction } from '@/server/webhooks/webhooks-actions'
import { AlertDialog } from '@/ui/alert-dialog'
import { TrashIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { useAction } from 'next-safe-action/hooks'
import { Webhook } from './types'

interface WebhookDeleteDialogProps {
  children: React.ReactNode
  webhook: Webhook
}

export default function WebhookDeleteDialog({
  children: trigger,
  webhook,
}: WebhookDeleteDialogProps) {
  const { toast } = useToast()

  const { execute: executeDeleteWebhook, isExecuting: isDeleting } = useAction(
    deleteWebhookAction,
    {
      onSuccess: () => {
        toast(defaultSuccessToast('Webhook deleted successfully'))
      },
      onError: ({ error }) => {
        toast(
          defaultErrorToast(error.serverError || 'Failed to delete webhook')
        )
      },
    }
  )

  return (
    <AlertDialog
      trigger={trigger}
      title="DELETE WEBHOOK?"
      description={`You will no longer receive events at ${webhook.url}`}
      confirm={
        <>
          {isDeleting ? (
            <Loader className="size-4" />
          ) : (
            <TrashIcon className="size-4" />
          )}
          Delete
        </>
      }
      confirmProps={{
        variant: 'error',
        disabled: isDeleting,
      }}
      onConfirm={() => {
        executeDeleteWebhook({
          teamId: webhook.teamId,
          webhookId: webhook.id,
        })
      }}
    />
  )
}
