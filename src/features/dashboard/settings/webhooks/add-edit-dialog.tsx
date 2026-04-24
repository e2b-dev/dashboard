'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { useState } from 'react'
import { upsertWebhookAction } from '@/core/server/actions/webhooks-actions'
import { UpsertWebhookSchema } from '@/core/server/functions/webhooks/schema'
import {
  defaultErrorToast,
  defaultSuccessToast,
  toast,
} from '@/lib/hooks/use-toast'
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
import { WebhookAddEditDialogSteps } from './add-edit-dialog-steps'
import { WEBHOOK_EVENTS, type WebhookEvent } from './constants'
import type { Webhook } from './types'

type WebhookAddEditDialogProps =
  | {
      children: React.ReactNode
      mode: 'add'
      webhook?: undefined
    }
  | {
      children: React.ReactNode
      mode: 'edit'
      webhook: Webhook
    }

export default function WebhookAddEditDialog({
  children: trigger,
  mode,
  webhook,
}: WebhookAddEditDialogProps) {
  'use no memo'

  const { team } = useDashboard()
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [lastSelectedEvent, setLastSelectedEvent] =
    useState<WebhookEvent | null>(null)
  const [hasCopied, setHasCopied] = useState(false)

  const isEditMode = mode === 'edit'
  const totalSteps = isEditMode ? 1 : 2

  const {
    form,
    resetFormAndAction,
    handleSubmitWithAction,
    action: { isPending: isLoading },
  } = useHookFormAction(upsertWebhookAction, zodResolver(UpsertWebhookSchema), {
    formProps: {
      mode: 'onChange',
      disabled: !team.slug,
      defaultValues: {
        teamSlug: team.slug,
        webhookId: isEditMode ? webhook?.id : undefined,
        mode,
        name: webhook?.name || '',
        url: webhook?.url || '',
        events: webhook?.events || [],
        // only include signatureSecret in add mode
        ...(isEditMode ? {} : { signatureSecret: '' }),
      },
      values: {
        teamSlug: team.slug,
        webhookId: isEditMode ? webhook?.id : undefined,
        mode,
        name: webhook?.name || '',
        url: webhook?.url || '',
        events: webhook?.events || [],
        // only include signatureSecret in add mode
        ...(isEditMode ? {} : { signatureSecret: '' }),
      },
    },
    actionProps: {
      onSuccess: () => {
        toast(
          defaultSuccessToast(
            isEditMode
              ? 'Webhook updated successfully'
              : 'Webhook created successfully'
          )
        )
        handleDialogChange(false)
      },
      onError: ({ error }) => {
        toast(
          defaultErrorToast(
            error.serverError ||
              (isEditMode
                ? 'Failed to update webhook'
                : 'Failed to create webhook')
          )
        )
      },
    },
  })

  const handleDialogChange = (value: boolean) => {
    setOpen(value)

    if (value) return

    setCurrentStep(1)
    setHasCopied(false)
    resetFormAndAction()
  }

  // watch fields to trigger reactive updates
  const name = form.watch('name')
  const url = form.watch('url')
  const selectedEvents = form.watch('events') || []
  const signatureSecret = form.watch('signatureSecret')

  const allEventsSelected =
    selectedEvents.length === WEBHOOK_EVENTS.length &&
    WEBHOOK_EVENTS.every((event) => selectedEvents.includes(event))

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
      form.setValue('events', [...WEBHOOK_EVENTS])
    }
  }

  const handleEventToggle = (event: string) => {
    const currentEvents = form.getValues('events') || []
    if (currentEvents.includes(event)) {
      form.setValue(
        'events',
        currentEvents.filter((eventName: string) => eventName !== event)
      )
    } else {
      form.setValue('events', [...currentEvents, event])
      const matched = WEBHOOK_EVENTS.find((e) => e === event)
      if (matched) setLastSelectedEvent(matched)
    }
  }

  const exampleEventType: WebhookEvent =
    lastSelectedEvent && selectedEvents.includes(lastSelectedEvent)
      ? lastSelectedEvent
      : (WEBHOOK_EVENTS.find((event) => selectedEvents.includes(event)) ??
        WEBHOOK_EVENTS[0])

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
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="flex flex-col gap-4 px-6 pt-5 pb-6 h-[685px] max-h-[calc(100svh-2rem)] overflow-hidden">
        <DialogHeader className="gap-0.5">
          <DialogTitle>
            {isEditMode ? 'Edit Webhook' : 'Add Webhook'}
          </DialogTitle>
          {/* Step Counter - only show in add mode */}
          {!isEditMode && (
            <div className="flex items-center gap-2">
              <span className="text-fg-tertiary prose-label uppercase">
                Step {currentStep} / {totalSteps}
              </span>
            </div>
          )}
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={handleSubmitWithAction}
            className="flex flex-1 flex-col justify-between gap-4 min-w-0 min-h-0"
          >
            {/* Hidden fields */}
            <input type="hidden" {...form.register('mode')} />
            <input type="hidden" {...form.register('teamSlug')} />

            <div className="flex flex-1 flex-col gap-4 min-w-0 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <WebhookAddEditDialogSteps
                currentStep={currentStep}
                form={form}
                isLoading={isLoading}
                selectedEvents={selectedEvents}
                exampleEventType={exampleEventType}
                allEventsSelected={allEventsSelected}
                handleAllToggle={handleAllToggle}
                handleEventToggle={handleEventToggle}
                mode={mode}
                hasCopied={hasCopied}
                onCopied={() => setHasCopied(true)}
              />
            </div>

            <DialogFooter>
              {isLoading ? (
                <div className="flex items-center justify-center py-2 gap-2 w-full">
                  <Loader variant="slash" size="sm" />
                  <span className="prose-body text-fg-secondary">
                    {isEditMode ? 'Saving Changes...' : 'Adding Webhook...'}
                  </span>
                </div>
              ) : (
                <>
                  {/* Edit mode: show submit button directly */}
                  {isEditMode ? (
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={!isStep1Valid}
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
                        variant={hasCopied ? 'primary' : 'secondary'}
                        className="w-full"
                        disabled={!isStep2Valid}
                      >
                        <AddIcon />
                        Add
                      </Button>
                    </>
                  )}
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
