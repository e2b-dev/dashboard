'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  type UpdateWebhookSecretInput,
  UpdateWebhookSecretInputSchema,
} from '@/core/server/functions/webhooks/schema'
import { useDashboard } from '@/features/dashboard/context'
import {
  defaultErrorToast,
  defaultSuccessToast,
  toast,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/ui/primitives/form'
import { CheckmarkIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import { Loader } from '@/ui/primitives/loader'
import type { Webhook } from './types'

interface UpdateWebhookSecretDialogProps {
  children?: React.ReactNode
  webhook: Webhook
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const UpdateWebhookSecretDialog = ({
  children: trigger,
  webhook,
  open: controlledOpen,
  onOpenChange,
}: UpdateWebhookSecretDialogProps) => {
  'use no memo'

  const { team } = useDashboard()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen

  const listQueryKey = trpc.webhooks.list.queryOptions({
    teamSlug: team.slug,
  }).queryKey

  const form = useForm<UpdateWebhookSecretInput>({
    resolver: zodResolver(UpdateWebhookSecretInputSchema),
    mode: 'onChange',
    defaultValues: {
      webhookId: webhook.id,
      signatureSecret: '',
    },
  })

  const updateSecretMutation = useMutation(
    trpc.webhooks.updateSecret.mutationOptions({
      onSuccess: () => {
        toast(defaultSuccessToast('Webhook secret edited successfully'))
        void queryClient.invalidateQueries({ queryKey: listQueryKey })
        handleDialogChange(false)
      },
      onError: (err) => {
        toast(defaultErrorToast(err.message || 'Failed to edit webhook secret'))
      },
    })
  )

  const isLoading = updateSecretMutation.isPending

  const handleDialogChange = (value: boolean) => {
    setOpen(value)
    if (value) return
    form.reset()
    updateSecretMutation.reset()
  }

  const handleSubmit = form.handleSubmit((values) => {
    updateSecretMutation.mutate({
      ...values,
      teamSlug: team.slug,
    })
  })

  const signatureSecret = form.watch('signatureSecret')

  const { errors } = form.formState
  const isSecretValid =
    !errors.signatureSecret && signatureSecret && signatureSecret.length >= 32

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader className="gap-2">
          <DialogTitle>Edit '{webhook.name}' secret</DialogTitle>
          <DialogDescription className="text-fg-tertiary">
            Replacing the secret will deactivate the current one. Make sure to
            update any systems using it.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 min-w-0">
            <input type="hidden" {...form.register('webhookId')} />

            <FormField
              control={form.control}
              name="signatureSecret"
              render={({ field }) => (
                <FormItem className="min-w-0 gap-2">
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      className="min-w-0"
                      autoComplete="off"
                      autoFocus
                      clearable
                      onClear={() =>
                        form.setValue('signatureSecret', '', {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                      {...field}
                    />
                  </FormControl>
                  {errors.signatureSecret ? (
                    <FormMessage />
                  ) : (
                    <p className="text-fg-tertiary prose-body">
                      {'> 32 characters'}
                    </p>
                  )}
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={!isSecretValid || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader variant="slash" size="sm" />
                    <span>Editing secret...</span>
                  </>
                ) : (
                  <>
                    <CheckmarkIcon className="size-4" />
                    Confirm
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
