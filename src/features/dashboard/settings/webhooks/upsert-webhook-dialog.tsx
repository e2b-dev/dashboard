'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  type SandboxLifecycleEventType,
  SandboxLifecycleEventTypeSchema,
} from '@/core/modules/sandboxes/lifecycle-event-types'
import {
  type UpsertWebhookInput,
  UpsertWebhookInputSchema,
} from '@/core/server/functions/webhooks/schema'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog'
import { Form } from '@/ui/primitives/form'
import { AddIcon, CheckIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { useDashboard } from '../../context'
import { DiscardWebhookChangesDialog } from './discard-webhook-changes-dialog'
import { FinishWebhookSetupDialog } from './finish-webhook-setup-dialog'
import type { Webhook } from './types'
import {
  type SecretType,
  UpsertWebhookDialogSteps,
} from './upsert-webhook-dialog-steps'

type UpsertWebhookDialogProps =
  | {
      children: React.ReactNode
      mode: 'create'
      webhook?: undefined
    }
  | {
      children: React.ReactNode
      mode: 'update'
      webhook: Webhook
    }

export function UpsertWebhookDialog({
  children: trigger,
  mode,
  webhook,
}: UpsertWebhookDialogProps) {
  'use no memo'

  const { team } = useDashboard()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [lastSelectedEvent, setLastSelectedEvent] =
    useState<SandboxLifecycleEventType | null>(null)
  const [hasCopied, setHasCopied] = useState(false)
  const [secretType, setSecretType] = useState<SecretType>('pre-generated')
  const [finishSetupDialogOpen, setFinishSetupDialogOpen] = useState(false)
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)

  const isUpdateMode = mode === 'update'
  const totalSteps = isUpdateMode ? 1 : 2

  const listQueryKey = trpc.webhooks.list.queryOptions({
    teamSlug: team.slug,
  }).queryKey

  const defaultValues: UpsertWebhookInput = {
    webhookId: isUpdateMode ? webhook?.id : undefined,
    mode,
    name: webhook?.name || '',
    url: webhook?.url || '',
    enabled: webhook?.enabled ?? true,
    events:
      webhook?.events?.filter(
        (event): event is SandboxLifecycleEventType =>
          SandboxLifecycleEventTypeSchema.safeParse(event).success
      ) ?? [],
    ...(isUpdateMode ? {} : { signatureSecret: '' }),
  }

  const form = useForm<UpsertWebhookInput>({
    resolver: zodResolver(UpsertWebhookInputSchema),
    mode: 'onChange',
    disabled: !team.slug,
    defaultValues,
    values: defaultValues,
  })

  const upsertMutation = useMutation(
    trpc.webhooks.upsert.mutationOptions({
      onSuccess: () => {
        toast(
          defaultSuccessToast(
            isUpdateMode
              ? 'Webhook edited successfully'
              : 'Webhook created successfully'
          )
        )
        void queryClient.invalidateQueries({ queryKey: listQueryKey })

        setOpen(false)
        resetDialogState()

        if (!isUpdateMode) {
          setFinishSetupDialogOpen(true)
        }
      },
      onError: (err) => {
        toast(
          defaultErrorToast(
            err.message ||
              (isUpdateMode
                ? 'Failed to edit webhook'
                : 'Failed to create webhook')
          )
        )
      },
    })
  )

  const isLoading = upsertMutation.isPending

  const resetDialogState = () => {
    setCurrentStep(1)
    setHasCopied(false)
    setSecretType('pre-generated')
    form.reset()
    upsertMutation.reset()
  }

  const handleDialogChange = (value: boolean) => {
    if (!value && isUpdateMode && hasChanges && !upsertMutation.isPending) {
      setDiscardConfirmOpen(true)
      return
    }

    setOpen(value)
    if (!value) resetDialogState()
  }

  const handleConfirmDiscard = () => {
    setDiscardConfirmOpen(false)
    setOpen(false)
    resetDialogState()
  }

  const handleSubmit = form.handleSubmit((values) => {
    upsertMutation.mutate({
      ...values,
      teamSlug: team.slug,
    })
  })

  const name = form.watch('name')
  const url = form.watch('url')
  const selectedEvents = form.watch('events') || []
  const signatureSecret = form.watch('signatureSecret')

  const allEventsSelected =
    selectedEvents.length === SandboxLifecycleEventTypeSchema.options.length &&
    SandboxLifecycleEventTypeSchema.options.every((event) =>
      selectedEvents.includes(event)
    )

  const hasChanges = isUpdateMode
    ? name !== webhook.name ||
      url !== webhook.url ||
      selectedEvents.length !== webhook.events.length ||
      [...selectedEvents].sort().join('|') !==
        [...webhook.events].sort().join('|')
    : false

  const { errors } = form.formState

  const isStep1Valid =
    !errors.name &&
    !errors.url &&
    !errors.events &&
    selectedEvents.length > 0 &&
    name.trim().length > 0 &&
    url.trim().length > 0

  const isStep2Valid =
    !errors.signatureSecret && signatureSecret && signatureSecret.length >= 32

  const handleAllToggle = () => {
    if (allEventsSelected) {
      form.setValue('events', [])
    } else {
      form.setValue('events', [...SandboxLifecycleEventTypeSchema.options])
    }
  }

  const handleEventToggle = (event: SandboxLifecycleEventType) => {
    const currentEvents = form.getValues('events') || []
    if (currentEvents.includes(event)) {
      form.setValue(
        'events',
        currentEvents.filter((eventName) => eventName !== event)
      )
    } else {
      form.setValue('events', [...currentEvents, event])
      setLastSelectedEvent(event)
    }
  }

  const exampleEventType: SandboxLifecycleEventType =
    lastSelectedEvent && selectedEvents.includes(lastSelectedEvent)
      ? lastSelectedEvent
      : (SandboxLifecycleEventTypeSchema.options.find((event) =>
          selectedEvents.includes(event)
        ) ?? 'sandbox.lifecycle.created')

  const handleNext = async () => {
    if (currentStep === 1) {
      const isNameValid = await form.trigger('name')
      const isUrlValid = await form.trigger('url')
      const isEventsValid = await form.trigger('events')
      if (isNameValid && isUrlValid && isEventsValid) {
        setCurrentStep(2)
      }
    }
  }

  const handleBack = () => {
    setCurrentStep(1)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>

        <DialogContent className="flex flex-col gap-4 px-6 pt-5 pb-6 h-[685px] max-h-[calc(100svh-2rem)] overflow-hidden">
          <DialogHeader className="gap-0.5">
            <DialogTitle>
              {isUpdateMode ? 'Edit Webhook' : 'Add Webhook'}
            </DialogTitle>
            {!isUpdateMode && (
              <div className="flex items-center gap-2">
                <span className="text-fg-tertiary prose-label uppercase">
                  Step {currentStep} / {totalSteps}
                </span>
              </div>
            )}
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={handleSubmit}
              className="flex flex-1 flex-col justify-between gap-4 min-w-0 min-h-0"
            >
              <input type="hidden" {...form.register('mode')} />

              <div className="flex flex-1 flex-col gap-4 min-w-0 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <UpsertWebhookDialogSteps
                  currentStep={currentStep}
                  form={form}
                  isLoading={isLoading}
                  selectedEvents={selectedEvents}
                  exampleEventType={exampleEventType}
                  allEventsSelected={allEventsSelected}
                  handleAllToggle={handleAllToggle}
                  handleEventToggle={handleEventToggle}
                  mode={mode}
                  secretType={secretType}
                  onSecretTypeChange={setSecretType}
                  hasCopied={hasCopied}
                  onCopied={() => setHasCopied(true)}
                />
              </div>

              <DialogFooter>
                {isLoading ? (
                  <div className="flex items-center justify-center py-2 gap-2 w-full">
                    <Loader variant="slash" size="sm" />
                    <span className="prose-body text-fg-secondary">
                      {isUpdateMode ? 'Saving Changes...' : 'Adding Webhook...'}
                    </span>
                  </div>
                ) : isUpdateMode ? (
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!isStep1Valid || !hasChanges}
                  >
                    <CheckIcon className="size-4" />
                    Confirm
                  </Button>
                ) : currentStep === 1 ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNext}
                    disabled={!isStep1Valid}
                    className="w-full"
                  >
                    Next
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="tertiary"
                      onClick={handleBack}
                      className="w-full"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      variant={
                        (secretType === 'custom' ? isStep2Valid : hasCopied)
                          ? 'primary'
                          : 'secondary'
                      }
                      className="w-full"
                      disabled={!isStep2Valid}
                    >
                      <AddIcon />
                      Add
                    </Button>
                  </>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <FinishWebhookSetupDialog
        open={finishSetupDialogOpen}
        onOpenChange={setFinishSetupDialogOpen}
      />
      <DiscardWebhookChangesDialog
        open={discardConfirmOpen}
        onOpenChange={setDiscardConfirmOpen}
        onDiscard={handleConfirmDiscard}
      />
    </>
  )
}
