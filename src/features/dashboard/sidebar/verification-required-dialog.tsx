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
const VERIFICATION_PAYMENT_LOADING_MESSAGE = 'Loading verification payment...'

// Waits before retrying team status polling; 2000 -> resolves after 2 seconds.
const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

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
        <VerificationRequiredDialogContent onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}

const VerificationRequiredDialogContent = ({
  onOpenChange,
}: Pick<VerificationRequiredDialogProps, 'onOpenChange'>) => {
  const { team } = useDashboard()
  const { toast } = useToast()
  const trpc = useTRPC()

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

  useEffect(() => {
    verificationPaymentMutation.mutate({ teamSlug: team.slug })
  }, [team.slug, verificationPaymentMutation.mutate])

  const verificationPayment = verificationPaymentMutation.data

  return (
    <>
      <DialogHeader>
        <DialogTitle>Verify account</DialogTitle>
        <DialogDescription>
          This team requires payment verification. Make a $5 card payment to
          verify your account and continue using E2B.
        </DialogDescription>
      </DialogHeader>

      {verificationPaymentMutation.isPending ? (
        <LoadingState message={VERIFICATION_PAYMENT_LOADING_MESSAGE} />
      ) : verificationPayment ? (
        <VerificationPaymentElements
          clientSecret={verificationPayment.client_secret}
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

interface VerificationPaymentElementsProps {
  clientSecret: string
  onOpenChange: (open: boolean) => void
}

const VerificationPaymentElements = ({
  clientSecret,
  onOpenChange,
}: VerificationPaymentElementsProps) => {
  const appearance = usePaymentElementAppearance()

  return (
    <Elements
      key={clientSecret}
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance,
        loader: 'never',
      }}
    >
      <VerificationPaymentForm onOpenChange={onOpenChange} />
    </Elements>
  )
}

const VerificationPaymentForm = ({
  onOpenChange,
}: Pick<VerificationPaymentElementsProps, 'onOpenChange'>) => {
  const stripe = useStripe()
  const elements = useElements()
  const trpc = useTRPC()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { team } = useDashboard()
  const [isPaying, setIsPaying] = useState(false)
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

    setIsPaying(true)

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: window.location.href,
      },
    })

    if (error) {
      toast(
        defaultErrorToast(
          error.message ??
            'Failed to process verification payment. Please try again.'
        )
      )
      setIsPaying(false)
      return
    }

    toast({
      title: 'Verification payment submitted',
      description:
        'We are checking whether your team has been verified and unblocked.',
    })

    setIsCheckingTeamStatus(true)
    const isTeamUnblocked = await pollUntilTeamUnblocked()
    setIsCheckingTeamStatus(false)

    if (!isTeamUnblocked) {
      toast(
        defaultErrorToast(
          'Verification payment submitted, but your team is still blocked. Please wait a moment and try again.'
        )
      )
      setIsPaying(false)
      return
    }

    setIsPaying(false)
    router.refresh()
    onOpenChange(false)
  }

  const isProcessing = isPaying || isCheckingTeamStatus
  const paymentSubmitLoadingLabel = isCheckingTeamStatus
    ? 'Checking team status...'
    : 'Processing...'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Alert variant="warning">
        <CardIcon className="size-4" />
        <AlertDescription className="prose-label">
          A $5 card payment will be charged and added back to your team as
          credits.
        </AlertDescription>
      </Alert>

      {!isPaymentElementReady && (
        <LoadingState message={VERIFICATION_PAYMENT_LOADING_MESSAGE} />
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
        Pay $5 and verify
        <ArrowRightIcon className="size-4" />
      </Button>
    </form>
  )
}
