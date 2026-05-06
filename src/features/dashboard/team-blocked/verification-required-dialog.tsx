'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { parseAsString, useQueryStates } from 'nuqs'
import { useCallback, useEffect, useState } from 'react'
import type { VerificationPaymentResponse } from '@/core/modules/billing/models'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { formatCurrency } from '@/lib/utils/formatting'
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
import {
  LoadingState,
  TeamBlockedRecoveryPaymentElement,
  useStripeReturnHandler,
  useTeamUnblockPolling,
} from './team-blocked-recovery'

const VERIFICATION_PAYMENT_LOADING_MESSAGE = 'Loading verification payment...'

const stripePaymentIntentParams = {
  payment_intent: parseAsString,
  payment_intent_client_secret: parseAsString,
  redirect_status: parseAsString,
}

interface VerificationRequiredDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const VerificationRequiredDialog = ({
  open,
  onOpenChange,
}: VerificationRequiredDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <VerificationRequiredDialogContent
          open={open}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  )
}

const VerificationRequiredDialogContent = ({
  open,
  onOpenChange,
}: VerificationRequiredDialogProps) => {
  const { team } = useDashboard()
  const { toast } = useToast()
  const trpc = useTRPC()
  const router = useRouter()
  const pollUntilTeamUnblocked = useTeamUnblockPolling()
  const [verificationPayment, setVerificationPayment] =
    useState<VerificationPaymentResponse | null>(null)
  const [isLoadingVerificationPayment, setIsLoadingVerificationPayment] =
    useState(false)
  const [paymentIntentParams, setPaymentIntentParams] = useQueryStates(
    stripePaymentIntentParams,
    {
      history: 'replace',
      shallow: true,
    }
  )

  const verificationPaymentMutation = useMutation(
    trpc.billing.createVerificationPayment.mutationOptions({
      onError: (error) => {
        toast(
          defaultErrorToast(
            error.message || 'Failed to load verification payment form.'
          )
        )
        onOpenChange(false)
      },
    })
  )

  const createVerificationPayment = useCallback(async () => {
    setIsLoadingVerificationPayment(true)

    try {
      const payment = await verificationPaymentMutation.mutateAsync({
        teamSlug: team.slug,
      })
      setVerificationPayment(payment)
    } catch {
      // The mutation onError handler owns the user-facing toast and close.
    } finally {
      setIsLoadingVerificationPayment(false)
    }
  }, [verificationPaymentMutation.mutateAsync, team.slug])

  useEffect(() => {
    if (open) return

    setVerificationPayment(null)
    setIsLoadingVerificationPayment(false)
    verificationPaymentMutation.reset()
  }, [open, verificationPaymentMutation.reset])

  useStripeReturnHandler({
    open,
    clientSecret: paymentIntentParams.payment_intent_client_secret,
    clearReturnParams: () => {
      setPaymentIntentParams({
        payment_intent: null,
        payment_intent_client_secret: null,
        redirect_status: null,
      })
    },
    createPaymentSession: createVerificationPayment,
    retrieveStatus: async (stripe, clientSecret) => {
      const { paymentIntent, error } =
        await stripe.retrievePaymentIntent(clientSecret)

      return {
        status: paymentIntent?.status,
        errorMessage: error?.message,
      }
    },
    onSucceeded: async () => {
      toast({
        title: 'Verification payment submitted',
        description:
          'We are checking whether your team has been verified and unblocked.',
      })

      try {
        const isTeamUnblocked = await pollUntilTeamUnblocked()

        if (!isTeamUnblocked) {
          toast(
            defaultErrorToast(
              'Verification payment submitted, but your team is still blocked. Please wait a moment and try again.'
            )
          )
          router.refresh()
          onOpenChange(false)
          return
        }

        toast({
          variant: 'success',
          title: 'Team unblocked',
          description: 'Your team has been verified and unblocked.',
        })
      } catch {
        toast(
          defaultErrorToast(
            'Verification payment submitted, but we could not check your team status. Please refresh or try again in a moment.'
          )
        )
      }

      router.refresh()
      onOpenChange(false)
    },
    onProcessing: () => {
      toast({
        title: 'Verification payment processing',
        description:
          'Your bank is still processing this payment. Please check again in a moment.',
      })
      router.refresh()
      onOpenChange(false)
    },
    requiresPaymentMethodMessage:
      'Verification payment was not completed. Please try again.',
    retrieveErrorMessage: 'Failed to check verification payment status.',
    fallbackErrorMessage: 'Failed to check verification payment status.',
  })

  const paymentAmountLabel = verificationPayment
    ? formatCurrency(verificationPayment.amount_due_cents / 100)
    : null

  return (
    <>
      <DialogHeader>
        <DialogTitle>Verify team</DialogTitle>
        <DialogDescription>
          This team is blocked because verification is required. Make a
          verification payment to continue using E2B.
        </DialogDescription>
      </DialogHeader>

      {isLoadingVerificationPayment ? (
        <LoadingState message={VERIFICATION_PAYMENT_LOADING_MESSAGE} />
      ) : verificationPayment ? (
        <TeamBlockedRecoveryPaymentElement
          clientSecret={verificationPayment.client_secret}
          onOpenChange={onOpenChange}
          confirmPayment={({ stripe, elements, returnUrl }) =>
            stripe.confirmPayment({
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
                A {paymentAmountLabel} card payment will be charged and added
                back to your team as credits.
              </AlertDescription>
            </Alert>
          }
          loadingMessage={VERIFICATION_PAYMENT_LOADING_MESSAGE}
          submitLabel={`Pay ${paymentAmountLabel} and verify`}
          processingLabel="Processing..."
          submittedToast={{
            title: 'Verification payment submitted',
            description:
              'We are checking whether your team has been verified and unblocked.',
          }}
          successToast={{
            variant: 'success',
            title: 'Team unblocked',
            description: 'Your team has been verified and unblocked.',
          }}
          errorMessages={{
            ready: 'Payment form is still loading.',
            confirm:
              'Failed to process verification payment. Please try again.',
            stillBlocked:
              'Verification payment submitted, but your team is still blocked. Please wait a moment and try again.',
            statusCheck:
              'Verification payment submitted, but we could not check your team status. Please refresh or try again in a moment.',
            load: 'Failed to load payment details. Please refresh and try again.',
          }}
        />
      ) : null}
    </>
  )
}
