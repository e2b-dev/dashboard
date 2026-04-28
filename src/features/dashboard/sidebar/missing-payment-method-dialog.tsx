'use client'

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { DASHBOARD_TEAMS_LIST_QUERY_OPTIONS } from '@/core/application/teams/queries'
import type { TeamModel } from '@/core/modules/teams/models'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { capitalize } from '@/lib/utils/formatting'
import { useTRPC } from '@/trpc/client'
import { Alert, AlertDescription } from '@/ui/primitives/alert'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { AlertIcon, ArrowRightIcon, CardIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { stripePromise, usePaymentElementAppearance } from '../billing/hooks'
import { useDashboard } from '../context'

const TEAM_UNBLOCK_POLL_ATTEMPTS = 15
const TEAM_UNBLOCK_POLL_INTERVAL_MS = 2000
const PAYMENT_METHOD_LOADING_MESSAGE = 'Loading payment method...'

// Waits before retrying team status polling; 2000 -> resolves after 2 seconds.
const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

interface MissingPaymentMethodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MissingPaymentMethodDialog({
  open,
  onOpenChange,
}: MissingPaymentMethodDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <MissingPaymentMethodDialogContent onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}

function MissingPaymentMethodDialogContent({
  onOpenChange,
}: Pick<MissingPaymentMethodDialogProps, 'onOpenChange'>) {
  const { team } = useDashboard()
  const { toast } = useToast()
  const trpc = useTRPC()

  const paymentMethodsSessionMutation = useMutation(
    trpc.billing.createPaymentMethodsSession.mutationOptions({
      onError: (error) => {
        toast(
          defaultErrorToast(
            error.message || 'Failed to load payment method form.'
          )
        )
      },
    })
  )

  useEffect(() => {
    paymentMethodsSessionMutation.mutate({ teamSlug: team.slug })
  }, [paymentMethodsSessionMutation.mutate, team.slug])

  const session = paymentMethodsSessionMutation.data

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add payment method</DialogTitle>
        <DialogDescription>
          This team is blocked because there is no payment method on file. Add a
          card to continue using E2B.
        </DialogDescription>
      </DialogHeader>

      {paymentMethodsSessionMutation.isPending ? (
        <LoadingState message={PAYMENT_METHOD_LOADING_MESSAGE} />
      ) : paymentMethodsSessionMutation.isError ? (
        <PaymentMethodsSessionError
          onRetry={() =>
            paymentMethodsSessionMutation.mutate({ teamSlug: team.slug })
          }
        />
      ) : session ? (
        <PaymentMethodsSetupElements
          customerSessionClientSecret={session.client_secret}
          setupIntentClientSecret={session.setup_intent_client_secret}
          onRefreshSession={() =>
            paymentMethodsSessionMutation.mutate({ teamSlug: team.slug })
          }
          onOpenChange={onOpenChange}
        />
      ) : null}
    </>
  )
}

function PaymentMethodsSessionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-4">
      <Alert variant="error">
        <AlertIcon className="size-4" />
        <AlertDescription className="prose-label">
          We could not load the payment form. Please try again.
        </AlertDescription>
      </Alert>
      <Button
        variant="secondary"
        className="w-full justify-center"
        onClick={onRetry}
      >
        Retry
      </Button>
    </div>
  )
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-6 gap-2">
      <Loader variant="slash" size="sm" />
      <span className="prose-body text-fg-secondary">{message}</span>
    </div>
  )
}

interface PaymentMethodsSetupElementsProps {
  customerSessionClientSecret: string
  setupIntentClientSecret: string
  onRefreshSession: () => void
  onOpenChange: (open: boolean) => void
}

function PaymentMethodsSetupElements({
  customerSessionClientSecret,
  setupIntentClientSecret,
  onRefreshSession,
  onOpenChange,
}: PaymentMethodsSetupElementsProps) {
  const appearance = usePaymentElementAppearance()

  return (
    <Elements
      key={setupIntentClientSecret}
      stripe={stripePromise}
      options={{
        clientSecret: setupIntentClientSecret,
        customerSessionClientSecret,
        appearance,
        loader: 'never',
      }}
    >
      <PaymentMethodsSetupForm
        onRefreshSession={onRefreshSession}
        onOpenChange={onOpenChange}
      />
    </Elements>
  )
}

function PaymentMethodsSetupForm({
  onRefreshSession,
  onOpenChange,
}: Pick<
  PaymentMethodsSetupElementsProps,
  'onRefreshSession' | 'onOpenChange'
>) {
  const stripe = useStripe()
  const elements = useElements()
  const trpc = useTRPC()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { team } = useDashboard()
  const [isSaving, setIsSaving] = useState(false)
  const [isCheckingTeamStatus, setIsCheckingTeamStatus] = useState(false)
  const [teamRecoveryError, setTeamRecoveryError] = useState<string | null>(
    null
  )
  const [paymentConfirmationError, setPaymentConfirmationError] = useState<
    string | null
  >(null)
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(false)
  const [paymentElementLoadError, setPaymentElementLoadError] = useState<
    string | null
  >(null)

  const teamListQueryOptions = trpc.teams.list.queryOptions(
    undefined,
    DASHBOARD_TEAMS_LIST_QUERY_OPTIONS
  )
  const teamListQueryKey = teamListQueryOptions.queryKey

  const pollUntilTeamUnblocked = async () => {
    for (let attempt = 0; attempt < TEAM_UNBLOCK_POLL_ATTEMPTS; attempt += 1) {
      await queryClient.invalidateQueries({ queryKey: teamListQueryKey })

      const teams = await queryClient.fetchQuery({
        ...teamListQueryOptions,
        staleTime: 0,
      })
      const activeTeam = teams.find(
        (candidate: TeamModel) =>
          candidate.id === team.id || candidate.slug === team.slug
      )

      if (activeTeam && !isTeamMissingPaymentMethodBlocked(activeTeam)) {
        await queryClient.invalidateQueries({ queryKey: teamListQueryKey })
        return true
      }

      if (attempt < TEAM_UNBLOCK_POLL_ATTEMPTS - 1)
        await wait(TEAM_UNBLOCK_POLL_INTERVAL_MS)
    }

    return false
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTeamRecoveryError(null)
    setPaymentConfirmationError(null)

    if (!stripe || !elements || !isPaymentElementReady) {
      toast(defaultErrorToast('Payment form is still loading.'))
      return
    }

    setIsSaving(true)

    const { error } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: window.location.href,
      },
    })

    if (error) {
      toast(
        defaultErrorToast(
          error.message ?? 'Failed to save payment method. Please try again.'
        )
      )
      setPaymentConfirmationError(
        error.message ??
          'Failed to save payment method. Reload the form and try again.'
      )
      setIsSaving(false)
      return
    }

    toast({
      title: 'Payment method added',
      description: 'We are checking whether your team has been unblocked.',
    })

    setIsCheckingTeamStatus(true)
    const isTeamUnblocked = await pollUntilTeamUnblocked()
    setIsCheckingTeamStatus(false)

    if (!isTeamUnblocked) {
      setTeamRecoveryError(
        'Payment method saved, but your team is still blocked. Please wait a moment and try checking again.'
      )
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    router.refresh()
    onOpenChange(false)
  }

  const isProcessing = isSaving || isCheckingTeamStatus
  const paymentSubmitLoadingLabel = isCheckingTeamStatus
    ? 'Checking team status...'
    : 'Saving...'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Alert variant="warning">
        <CardIcon className="size-4" />
        <AlertDescription className="prose-label">
          Your payment method will be saved to your team billing account.
        </AlertDescription>
      </Alert>

      {!isPaymentElementReady && !paymentElementLoadError && (
        <LoadingState message={PAYMENT_METHOD_LOADING_MESSAGE} />
      )}

      {paymentElementLoadError && (
        <div className="space-y-3">
          <Alert variant="error">
            <AlertIcon className="size-4" />
            <AlertDescription className="prose-label">
              {paymentElementLoadError}
            </AlertDescription>
          </Alert>
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-center"
            onClick={onRefreshSession}
          >
            Reload payment form
          </Button>
        </div>
      )}

      {paymentConfirmationError && (
        <div className="space-y-3">
          <Alert variant="error">
            <AlertIcon className="size-4" />
            <AlertDescription className="prose-label">
              {paymentConfirmationError}
            </AlertDescription>
          </Alert>
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-center"
            onClick={onRefreshSession}
          >
            Reload payment form
          </Button>
        </div>
      )}

      {teamRecoveryError && (
        <Alert variant="warning">
          <AlertIcon className="size-4" />
          <AlertDescription className="prose-label">
            {teamRecoveryError}
          </AlertDescription>
        </Alert>
      )}

      <PaymentElement
        onReady={() => {
          setPaymentElementLoadError(null)
          setIsPaymentElementReady(true)
        }}
        onLoadError={(event) => {
          setIsPaymentElementReady(false)
          setPaymentElementLoadError(
            event.error.message ??
              'Failed to load payment details. Please refresh and try again.'
          )
        }}
        options={{
          layout: {
            type: 'tabs',
            defaultCollapsed: false,
          },
        }}
      />

      <Button
        type="submit"
        className="w-full justify-center"
        disabled={
          !stripe ||
          !elements ||
          !isPaymentElementReady ||
          !!paymentElementLoadError ||
          isProcessing
        }
        loading={isProcessing ? paymentSubmitLoadingLabel : undefined}
      >
        Save payment method
        <ArrowRightIcon className="size-4" />
      </Button>
    </form>
  )
}

// Checks active team recovery status; { isBlocked: true, blockedReason: "payment_method_missing" } -> true.
const isTeamMissingPaymentMethodBlocked = (team: TeamModel) => {
  if (!team.isBlocked || !team.blockedReason) return false

  const formattedReason = capitalize(team.blockedReason).toLowerCase()

  return (
    formattedReason.includes('payment method missing') ||
    formattedReason.includes('missing payment method')
  )
}
