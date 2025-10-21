'use client'

import { useSelectedTeam } from '@/lib/hooks/use-teams'
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
import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
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

  const selectedTeam = useSelectedTeam()
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const isEditMode = mode === 'edit'
  const totalSteps = 2

  const {
    form,
    resetFormAndAction,
    handleSubmitWithAction,
    action: { isExecuting },
  } = useHookFormAction(upsertWebhookAction, zodResolver(UpsertWebhookSchema), {
    formProps: {
      defaultValues: {
        teamId: selectedTeam?.id,
        mode,
        name: (webhook as Webhook & { name?: string })?.name || '',
        url: webhook?.url || '',
        events: webhook?.events || [],
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

  const selectedEvents = form.watch('events') || []
  const allEventsSelected =
    selectedEvents.length === WEBHOOK_EVENTS.length &&
    WEBHOOK_EVENTS.every((event) => selectedEvents.includes(event))

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

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Webhook' : 'Add Webhook'}
          </DialogTitle>
          {/* Step Counter */}
          <div className="flex items-center gap-2">
            <span className="text-fg-tertiary prose-label uppercase">
              Step {currentStep} / {totalSteps}
            </span>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmitWithAction} className="min-w-0">
            {/* Hidden fields */}
            <input type="hidden" {...form.register('mode')} />
            <input type="hidden" {...form.register('teamId')} />

            <div className="flex flex-col gap-4 pb-6 min-w-0 overflow-hidden min-h-[350px]">
              <WebhookAddEditDialogSteps
                currentStep={currentStep}
                form={form}
                isExecuting={isExecuting}
                selectedEvents={selectedEvents}
                allEventsSelected={allEventsSelected}
                handleAllToggle={handleAllToggle}
                handleEventToggle={handleEventToggle}
              />
            </div>

            <DialogFooter>
              {currentStep === 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isExecuting || selectedEvents.length === 0}
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
                    disabled={isExecuting}
                    className="w-full"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isExecuting}
                    loading={isExecuting}
                    className="w-full"
                    variant="outline"
                  >
                    {isEditMode ? (
                      <>
                        <CheckIcon className="size-4" />
                        Confirm
                      </>
                    ) : (
                      <>
                        <PlusIcon className="size-4" />
                        Add
                      </>
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
