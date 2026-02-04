'use client'

import {
  defaultErrorToast,
  defaultSuccessToast,
  toast,
} from '@/lib/hooks/use-toast'
import { UpsertWebhookSchema } from '@/server/webhooks/schema'
import { upsertWebhookAction } from '@/server/webhooks/webhooks-actions'
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
import { CheckIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useDashboard } from '../../context'
import { WebhookAddEditDialogSteps } from './add-edit-dialog-steps'
import { WEBHOOK_EVENTS } from './constants'
import { Webhook } from './types'

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
      disabled: !team.id,
      defaultValues: {
        teamIdOrSlug: team.id,
        webhookId: isEditMode ? webhook?.id : undefined,
        mode,
        name: webhook?.name || '',
        url: webhook?.url || '',
        events: webhook?.events || [],
        // only include signatureSecret in add mode
        ...(isEditMode ? {} : { signatureSecret: '' }),
      },
      values: {
        teamIdOrSlug: team.id,
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
        currentEvents.filter((e) => e !== event)
      )
    } else {
      form.setValue('events', [...currentEvents, event])
    }
  }

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

      <DialogContent className="overflow-y-auto max-h-[calc(100svh-2rem)]">
        <DialogHeader>
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
          <form onSubmit={handleSubmitWithAction} className="min-w-0">
            {/* Hidden fields */}
            <input type="hidden" {...form.register('mode')} />
            <input type="hidden" {...form.register('teamIdOrSlug')} />

            <div className="flex flex-col gap-4 pb-6 min-w-0 overflow-hidden min-h-[350px]">
              <WebhookAddEditDialogSteps
                currentStep={currentStep}
                form={form}
                isLoading={isLoading}
                selectedEvents={selectedEvents}
                allEventsSelected={allEventsSelected}
                handleAllToggle={handleAllToggle}
                handleEventToggle={handleEventToggle}
                mode={mode}
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
                  ) : (
                    /* Add mode: show next/back navigation */
                    <>
                      {currentStep === 1 ? (
                        <Button
                          type="button"
                          variant="outline"
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
                            variant="ghost"
                            onClick={handleBack}
                            className="w-full"
                          >
                            Back
                          </Button>
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={!isStep2Valid}
                          >
                            <PlusIcon className="size-4" />
                            Add
                          </Button>
                        </>
                      )}
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
