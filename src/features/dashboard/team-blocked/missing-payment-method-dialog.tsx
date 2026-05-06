'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { parseAsString, useQueryStates } from 'nuqs'
import { usePostHog } from 'posthog-js/react'
import { useCallback, useState } from 'react'
import { useSessionStorage } from 'usehooks-ts'
import type { PaymentMethodsSession } from '@/core/modules/billing/models'
import { TEAM_BLOCKED_REASONS } from '@/core/modules/teams/constants'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import { Alert, AlertDescription } from '@/ui/primitives/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { CardIcon } from '@/ui/primitives/icons'
import { useDashboard } from '../context'
import { getBlockedDialogStorageKey } from './team-blocked-dialog-storage'
import {
  LoadingState,
  TeamBlockedRecoveryPaymentElement,
  useStripeReturnHandler,
} from './team-blocked-recovery'

const PAYMENT_METHOD_LOADING_MESSAGE = 'Loading payment method...'
const PAYMENT_METHOD_ADDED_EVENT = 'payment_method_added'

const stripeSetupIntentParams = {
  setup_intent: parseAsString,
  setup_intent_client_secret: parseAsString,
  redirect_status: parseAsString,
}

interface MissingPaymentMethodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDismiss: () => void
}

export const MissingPaymentMethodDialog = ({
  open,
  onOpenChange,
  onDismiss,
}: MissingPaymentMethodDialogProps) => {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) return onDismiss()

    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <MissingPaymentMethodDialogContent
          open={open}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

interface MissingPaymentMethodDialogContentProps {
  open: boolean
  onClose: () => void
}

const MissingPaymentMethodDialogContent = ({
  open,
  onClose,
}: MissingPaymentMethodDialogContentProps) => {
  const { team } = useDashboard()
  const { toast } = useToast()
  const posthog = usePostHog()
  const trpc = useTRPC()
  const router = useRouter()
  const [, , removeDismissedDialog] = useSessionStorage(
    getBlockedDialogStorageKey(team.slug, TEAM_BLOCKED_REASONS.missingPayment),
    false
  )
  const [paymentMethodsSession, setPaymentMethodsSession] =
    useState<PaymentMethodsSession | null>(null)
  const [isLoadingPaymentMethodsSession, setIsLoadingPaymentMethodsSession] =
    useState(false)
  const [setupIntentParams, setSetupIntentParams] = useQueryStates(
    stripeSetupIntentParams,
    {
      history: 'replace',
      shallow: true,
    }
  )

  const paymentMethodsSessionMutation = useMutation(
    trpc.billing.createPaymentMethodsSession.mutationOptions({
      onError: (error) => {
        toast(
          defaultErrorToast(
            error.message || 'Failed to load payment method form.'
          )
        )
        onClose()
      },
    })
  )

  const createPaymentMethodsSession = useCallback(async () => {
    setIsLoadingPaymentMethodsSession(true)

    try {
      const session = await paymentMethodsSessionMutation.mutateAsync({
        teamSlug: team.slug,
      })
      setPaymentMethodsSession(session)
    } catch {
      // The mutation onError handler owns the user-facing toast and close.
    } finally {
      setIsLoadingPaymentMethodsSession(false)
    }
  }, [paymentMethodsSessionMutation.mutateAsync, team.slug])

  useStripeReturnHandler({
    open,
    clientSecret: setupIntentParams.setup_intent_client_secret,
    clearReturnParams: () => {
      setSetupIntentParams({
        setup_intent: null,
        setup_intent_client_secret: null,
        redirect_status: null,
      })
    },
    createPaymentSession: createPaymentMethodsSession,
    retrieveStatus: async (stripe, clientSecret) => {
      const { setupIntent, error } =
        await stripe.retrieveSetupIntent(clientSecret)

      return {
        status: setupIntent?.status,
        errorMessage: error?.message,
      }
    },
    onSucceeded: () => {
      toast({
        variant: 'success',
        title: 'Payment method added',
        description: 'Your payment method was added successfully.',
      })
      posthog.capture(PAYMENT_METHOD_ADDED_EVENT)
      removeDismissedDialog()
      onClose()
      router.refresh()
    },
    onProcessing: () => {
      toast({
        title: 'Payment method processing',
        description:
          'Your bank is still processing this payment method. Please check again in a moment.',
      })
      router.refresh()
      onClose()
    },
    requiresPaymentMethodMessage:
      'Payment method setup was not completed. Please try again.',
    retrieveErrorMessage: 'Failed to check payment method status.',
    fallbackErrorMessage: 'Failed to check payment method status.',
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add payment method</DialogTitle>
        <DialogDescription>
          This team is blocked because there is no payment method on file. Add a
          card to continue using E2B.
        </DialogDescription>
      </DialogHeader>

      {isLoadingPaymentMethodsSession ? (
        <LoadingState message={PAYMENT_METHOD_LOADING_MESSAGE} />
      ) : paymentMethodsSession ? (
        <TeamBlockedRecoveryPaymentElement
          clientSecret={paymentMethodsSession.setup_intent_client_secret}
          customerSessionClientSecret={paymentMethodsSession.client_secret}
          onClose={onClose}
          confirmPayment={({ stripe, elements, returnUrl }) =>
            stripe.confirmSetup({
              elements,
              redirect: 'if_required',
              confirmParams: {
                return_url: returnUrl,
              },
            })
          }
          alert={
            <Alert variant="warning">
              <CardIcon className="size-4" />
              <AlertDescription className="prose-label">
                Your payment method will be saved to your team billing account.
              </AlertDescription>
            </Alert>
          }
          loadingMessage={PAYMENT_METHOD_LOADING_MESSAGE}
          submitLabel="Save payment method"
          processingLabel="Saving..."
          submittedToast={{
            title: 'Payment method added',
            description:
              'We are checking whether your team has been unblocked.',
          }}
          successToast={{
            variant: 'success',
            title: 'Team unblocked',
            description:
              'Your payment method was added and your team has been unblocked.',
          }}
          onSuccess={() => {
            posthog.capture(PAYMENT_METHOD_ADDED_EVENT)
            removeDismissedDialog()
          }}
          errorMessages={{
            ready: 'Payment form is still loading.',
            confirm: 'Failed to save payment method. Please try again.',
            stillBlocked:
              'Payment method added, but your team is still blocked. Please wait a moment and try again.',
            statusCheck:
              'Payment method added, but we could not check your team status. Please refresh or try again in a moment.',
            load: 'Failed to load payment details. Please refresh and try again.',
          }}
        />
      ) : null}
    </>
  )
}
