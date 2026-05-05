'use client'

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { parseAsString, useQueryStates } from 'nuqs'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { DASHBOARD_TEAMS_LIST_QUERY_OPTIONS } from '@/core/application/teams/queries'
import type { TeamModel } from '@/core/modules/teams/models'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
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
import { ArrowRightIcon, CardIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { stripePromise, usePaymentElementAppearance } from '../billing/hooks'
import { useDashboard } from '../context'

const TEAM_UNBLOCK_POLL_ATTEMPTS = 15
const TEAM_UNBLOCK_POLL_INTERVAL_MS = 2000
const PAYMENT_METHOD_LOADING_MESSAGE = 'Loading payment method...'
const stripeSetupIntentParams = {
  setup_intent: parseAsString,
  setup_intent_client_secret: parseAsString,
  redirect_status: parseAsString,
}

// Waits before retrying team status polling; 2000 -> resolves after 2 seconds.
const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

interface MissingPaymentMethodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const MissingPaymentMethodDialog = ({
  open,
  onOpenChange,
}: MissingPaymentMethodDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <MissingPaymentMethodDialogContent onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}

const MissingPaymentMethodDialogContent = ({
  onOpenChange,
}: Pick<MissingPaymentMethodDialogProps, 'onOpenChange'>) => {
  const { team } = useDashboard()
  const { toast } = useToast()
  const trpc = useTRPC()
  const router = useRouter()
  const hasHandledSetupIntent = useRef(false)
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
        onOpenChange(false)
      },
    })
  )

  useEffect(() => {
    const setupIntentClientSecret = setupIntentParams.setup_intent_client_secret

    const createPaymentMethodsSession = () => {
      paymentMethodsSessionMutation.mutate({ teamSlug: team.slug })
    }

    if (hasHandledSetupIntent.current) return
    hasHandledSetupIntent.current = true

    if (!setupIntentClientSecret) {
      createPaymentMethodsSession()
      return
    }

    setSetupIntentParams({
      setup_intent: null,
      setup_intent_client_secret: null,
      redirect_status: null,
    })

    const checkSetupIntent = async () => {
      const stripe = await stripePromise

      if (!stripe) {
        toast(defaultErrorToast('Failed to load Stripe.'))
        createPaymentMethodsSession()
        return
      }

      const { setupIntent, error } = await stripe.retrieveSetupIntent(
        setupIntentClientSecret
      )

      if (error) {
        toast(
          defaultErrorToast(
            error.message ?? 'Failed to check payment method status.'
          )
        )
        createPaymentMethodsSession()
        return
      }

      if (setupIntent.status === 'succeeded') {
        toast({
          variant: 'success',
          title: 'Payment method added',
          description: 'Your payment method was added successfully.',
        })
        router.refresh()
        onOpenChange(false)
        return
      }

      if (setupIntent.status === 'processing') {
        toast({
          title: 'Payment method processing',
          description:
            'Your bank is still processing this payment method. Please check again in a moment.',
        })
        router.refresh()
        onOpenChange(false)
        return
      }

      if (setupIntent.status === 'requires_payment_method')
        toast(
          defaultErrorToast(
            'Payment method setup was not completed. Please try again.'
          )
        )

      createPaymentMethodsSession()
    }

    checkSetupIntent().catch(() => {
      toast(defaultErrorToast('Failed to check payment method status.'))
      createPaymentMethodsSession()
    })
  }, [
    paymentMethodsSessionMutation.mutate,
    router,
    setupIntentParams.setup_intent_client_secret,
    setSetupIntentParams,
    team.slug,
    toast,
    onOpenChange,
  ])

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
      ) : session ? (
        <PaymentMethodsSetupElements
          customerSessionClientSecret={session.client_secret}
          setupIntentClientSecret={session.setup_intent_client_secret}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </>
  )
}

const LoadingState = ({ message }: { message: string }) => {
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
  onOpenChange: (open: boolean) => void
}

const PaymentMethodsSetupElements = ({
  customerSessionClientSecret,
  setupIntentClientSecret,
  onOpenChange,
}: PaymentMethodsSetupElementsProps) => {
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
      <PaymentMethodsSetupForm onOpenChange={onOpenChange} />
    </Elements>
  )
}

const PaymentMethodsSetupForm = ({
  onOpenChange,
}: Pick<PaymentMethodsSetupElementsProps, 'onOpenChange'>) => {
  const stripe = useStripe()
  const elements = useElements()
  const trpc = useTRPC()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { team } = useDashboard()
  const [isSaving, setIsSaving] = useState(false)
  const [isCheckingTeamStatus, setIsCheckingTeamStatus] = useState(false)
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(false)

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

      if (activeTeam && !activeTeam.isBlocked) {
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
      setIsSaving(false)
      return
    }

    toast({
      title: 'Payment method added',
      description: 'We are checking whether your team has been unblocked.',
    })

    setIsCheckingTeamStatus(true)

    try {
      const isTeamUnblocked = await pollUntilTeamUnblocked()

      if (!isTeamUnblocked) {
        toast(
          defaultErrorToast(
            'Payment method added, but your team is still blocked. Please wait a moment and try again.'
          )
        )
        return
      }

      toast({
        variant: 'success',
        title: 'Team unblocked',
        description:
          'Your payment method was added and your team has been unblocked.',
      })

      router.refresh()
      onOpenChange(false)
    } catch {
      toast(
        defaultErrorToast(
          'Payment method added, but we could not check your team status. Please refresh or try again in a moment.'
        )
      )
    } finally {
      setIsCheckingTeamStatus(false)
      setIsSaving(false)
    }
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

      {!isPaymentElementReady && (
        <LoadingState message={PAYMENT_METHOD_LOADING_MESSAGE} />
      )}

      <PaymentElement
        onReady={() => {
          setIsPaymentElementReady(true)
        }}
        onLoadError={(event) => {
          setIsPaymentElementReady(false)
          toast(
            defaultErrorToast(
              event.error.message ??
                'Failed to load payment details. Please refresh and try again.'
            )
          )
          onOpenChange(false)
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
          !stripe || !elements || !isPaymentElementReady || isProcessing
        }
        loading={isProcessing ? paymentSubmitLoadingLabel : undefined}
      >
        Save payment method
        <ArrowRightIcon className="size-4" />
      </Button>
    </form>
  )
}
