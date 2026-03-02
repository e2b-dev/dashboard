'use client'

import {
  defaultErrorToast,
  defaultSuccessToast,
  toast,
} from '@/lib/hooks/use-toast'
import { UpdateWebhookSecretSchema } from '@/server/webhooks/schema'
import { updateWebhookSecretAction } from '@/server/webhooks/webhooks-actions'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/ui/primitives/form'
import { CheckIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { Loader } from '@/ui/primitives/loader'
import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { useState } from 'react'
import { Webhook } from './types'

interface WebhookEditSecretDialogProps {
  children: React.ReactNode
  webhook: Webhook
}

export default function WebhookEditSecretDialog({
  children: trigger,
  webhook,
}: WebhookEditSecretDialogProps) {
  'use no memo'

  const [open, setOpen] = useState(false)

  const webhookName = webhook.name

  const {
    form,
    resetFormAndAction,
    handleSubmitWithAction,
    action: { isPending: isLoading },
  } = useHookFormAction(
    updateWebhookSecretAction,
    zodResolver(UpdateWebhookSecretSchema),
    {
      formProps: {
        mode: 'onChange',
        defaultValues: {
          teamIdOrSlug: webhook.teamId,
          webhookId: webhook.id,
          signatureSecret: '',
        },
      },
      actionProps: {
        onSuccess: () => {
          toast(defaultSuccessToast('Webhook secret rotated successfully'))
          handleDialogChange(false)
        },
        onError: ({ error }) => {
          toast(
            defaultErrorToast(
              error.serverError || 'Failed to rotate webhook secret'
            )
          )
        },
      },
    }
  )

  const handleDialogChange = (value: boolean) => {
    setOpen(value)

    if (value) return

    resetFormAndAction()
  }

  // watch field to trigger reactive updates
  const signatureSecret = form.watch('signatureSecret')

  // use form state for validation - sync with zod schema
  const { errors } = form.formState
  const isSecretValid =
    !errors.signatureSecret && signatureSecret && signatureSecret.length >= 32

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Rotate Secret for {webhookName ? `"${webhookName}"` : 'Webhook'}
          </DialogTitle>
          <div className="flex flex-col gap-3 pt-2">
            <p className="text-fg-tertiary prose-body">
              <strong className="text-fg-secondary">Important:</strong> E2B
              sends only one signature secret at a time. Once you change it, the
              old secret immediately stops working.
            </p>
            <div className="flex flex-col gap-2">
              <p className="text-fg-secondary prose-body font-medium">
                To rotate safely without downtime:
              </p>
              <ol className="text-fg-tertiary prose-body list-decimal list-inside space-y-1 pl-1">
                <li>Generate a new custom secret</li>
                <li>
                  Update your endpoint to accept{' '}
                  <strong className="text-fg">both</strong> current and new
                  custom secrets
                </li>
                <li>Deploy your changes</li>
                <li>
                  Then roll confirm your new custom secret here — E2B will start
                  using the new secret
                </li>
                <li>Remove old secret validation from your code later</li>
              </ol>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmitWithAction} className="min-w-0">
            {/* Hidden fields */}
            <input type="hidden" {...form.register('teamIdOrSlug')} />
            <input type="hidden" {...form.register('webhookId')} />

            <div className="flex flex-col gap-4 pb-6 min-w-0">
              <FormField
                control={form.control}
                name="signatureSecret"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormControl>
                      <Input
                        placeholder="Enter new secret"
                        disabled={isLoading}
                        className="min-w-0"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-fg-tertiary prose-body">
                      {'> 32 characters'}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              {isLoading ? (
                <div className="flex items-center justify-center py-2 gap-2 w-full">
                  <Loader variant="slash" size="sm" />
                  <span>Rotating Secret...</span>
                </div>
              ) : (
                <Button
                  type="submit"
                  disabled={!isSecretValid}
                  className="w-full"
                  variant="outline"
                >
                  <CheckIcon className="size-4" />
                  Confirm
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
