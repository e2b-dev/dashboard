'use client'

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import type { Stripe, StripeElements, StripeError } from '@stripe/stripe-js'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DASHBOARD_TEAMS_LIST_QUERY_OPTIONS } from '@/core/application/teams/queries'
import type { TeamModel } from '@/core/modules/teams/models'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils/ui'
import { useTRPC } from '@/trpc/client'
import { Button } from '@/ui/primitives/button'
import { ArrowRightIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { stripePromise, usePaymentElementAppearance } from '../billing/hooks'
import { useDashboard } from '../context'

const TEAM_UNBLOCK_POLL_ATTEMPTS = 30
const TEAM_UNBLOCK_POLL_INTERVAL_MS = 1000

type ToastInput = Parameters<ReturnType<typeof useToast>['toast']>[0]

interface LoadingStateProps {
  message: string
  className?: string
}

export const LoadingState = ({ message, className }: LoadingStateProps) => {
  return (
    <div
      className={cn('flex items-center justify-center py-6 gap-2', className)}
    >
      <Loader variant="slash" size="sm" />
      <span className="prose-body text-fg-secondary">{message}</span>
    </div>
  )
}

// Waits before retrying team status polling; 1000 -> resolves after 1 second.
const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

export const useTeamUnblockPolling = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { team } = useDashboard()

  const teamListQueryOptions = trpc.teams.list.queryOptions(
    undefined,
    DASHBOARD_TEAMS_LIST_QUERY_OPTIONS
  )

  const teamListQueryKey = teamListQueryOptions.queryKey

  const pollUntilTeamUnblocked = useCallback(async () => {
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
  }, [queryClient, team.id, team.slug, teamListQueryKey, teamListQueryOptions])

  return pollUntilTeamUnblocked
}

interface StripeReturnStatusResult {
  status?: string
  errorMessage?: string | null
}

interface StripeReturnHandlerOptions {
  open: boolean
  clientSecret: string | null
  clearReturnParams: () => void
  createPaymentSession: () => Promise<void>
  retrieveStatus: (
    stripe: Stripe,
    clientSecret: string
  ) => Promise<StripeReturnStatusResult>
  onSucceeded: () => Promise<void> | void
  onProcessing: () => void
  requiresPaymentMethodMessage: string
  retrieveErrorMessage: string
  fallbackErrorMessage: string
}

export const useStripeReturnHandler = ({
  open,
  clientSecret,
  clearReturnParams,
  createPaymentSession,
  retrieveStatus,
  onSucceeded,
  onProcessing,
  requiresPaymentMethodMessage,
  retrieveErrorMessage,
  fallbackErrorMessage,
}: StripeReturnHandlerOptions) => {
  const { toast } = useToast()
  const hasHandledStripeReturn = useRef(false)

  useEffect(() => {
    if (open) return

    hasHandledStripeReturn.current = false
  }, [open])

  useEffect(() => {
    if (!open) return
    if (hasHandledStripeReturn.current) return

    hasHandledStripeReturn.current = true

    if (!clientSecret) {
      void createPaymentSession()
      return
    }

    clearReturnParams()

    const checkStripeReturn = async () => {
      const stripe = await stripePromise

      if (!stripe) {
        toast(defaultErrorToast('Failed to load Stripe.'))
        await createPaymentSession()
        return
      }

      const result = await retrieveStatus(stripe, clientSecret)

      if (result.errorMessage) {
        toast(defaultErrorToast(result.errorMessage ?? retrieveErrorMessage))
        await createPaymentSession()
        return
      }

      if (result.status === 'succeeded') {
        await onSucceeded()
        return
      }

      if (result.status === 'processing') {
        onProcessing()
        return
      }

      if (result.status === 'requires_payment_method')
        toast(defaultErrorToast(requiresPaymentMethodMessage))

      await createPaymentSession()
    }

    checkStripeReturn().catch(() => {
      toast(defaultErrorToast(fallbackErrorMessage))
      void createPaymentSession()
    })
  }, [
    clearReturnParams,
    clientSecret,
    createPaymentSession,
    fallbackErrorMessage,
    onProcessing,
    onSucceeded,
    open,
    requiresPaymentMethodMessage,
    retrieveErrorMessage,
    retrieveStatus,
    toast,
  ])
}

interface StripePaymentElementWrapperProps {
  clientSecret: string
  customerSessionClientSecret?: string
  children: ReactNode
}

export const StripePaymentElementWrapper = ({
  clientSecret,
  customerSessionClientSecret,
  children,
}: StripePaymentElementWrapperProps) => {
  const appearance = usePaymentElementAppearance()

  return (
    <Elements
      key={clientSecret}
      stripe={stripePromise}
      options={{
        clientSecret,
        customerSessionClientSecret,
        appearance,
        loader: 'never',
      }}
    >
      {children}
    </Elements>
  )
}

interface StripePaymentElementFormProps {
  onSubmit: (params: {
    stripe: Stripe
    elements: StripeElements
  }) => Promise<void>
  submitLabel: ReactNode
  processingLabel: string
  loadingMessage: string
  readyErrorMessage?: string
  paymentElementDefaultCollapsed?: boolean
  alert?: ReactNode
  isProcessing?: boolean
  className?: string
  buttonClassName?: string
  processingFallbackMessage?: string
  onLoadError?: (error: StripeError) => void
}

export const StripePaymentElementForm = ({
  onSubmit,
  submitLabel,
  processingLabel,
  loadingMessage,
  readyErrorMessage = 'Payment form is still loading.',
  paymentElementDefaultCollapsed = false,
  alert,
  isProcessing = false,
  className,
  buttonClassName,
  processingFallbackMessage,
  onLoadError,
}: StripePaymentElementFormProps) => {
  const stripe = useStripe()
  const elements = useElements()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!stripe || !elements || !isPaymentElementReady) {
      toast(defaultErrorToast(readyErrorMessage))
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({ stripe, elements })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormProcessing = isProcessing || isSubmitting

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-5', className)}>
      {alert}

      {!isPaymentElementReady && <LoadingState message={loadingMessage} />}

      <PaymentElement
        onReady={() => {
          setIsPaymentElementReady(true)
        }}
        onLoadError={(event) => {
          setIsPaymentElementReady(false)
          onLoadError?.(event.error)
        }}
        options={{
          layout: {
            type: 'tabs',
            defaultCollapsed: paymentElementDefaultCollapsed,
          },
        }}
      />

      {processingFallbackMessage && isFormProcessing ? (
        <LoadingState message={processingFallbackMessage} className="py-4" />
      ) : (
        <Button
          type="submit"
          className={cn('w-full justify-center', buttonClassName)}
          disabled={
            !stripe || !elements || !isPaymentElementReady || isFormProcessing
          }
          loading={isFormProcessing ? processingLabel : undefined}
        >
          {submitLabel}
          <ArrowRightIcon className="size-4" />
        </Button>
      )}
    </form>
  )
}

interface TeamBlockedRecoveryPaymentElementProps {
  clientSecret: string
  customerSessionClientSecret?: string
  onOpenChange: (open: boolean) => void
  confirmPayment: (params: {
    stripe: Stripe
    elements: StripeElements
    returnUrl: string
  }) => Promise<{ error?: StripeError }>
  alert: ReactNode
  loadingMessage: string
  submitLabel: ReactNode
  processingLabel: string
  submittedToast: ToastInput
  successToast: ToastInput
  errorMessages: {
    ready: string
    confirm: string
    stillBlocked: string
    statusCheck: string
    load: string
  }
}

export const TeamBlockedRecoveryPaymentElement = ({
  clientSecret,
  customerSessionClientSecret,
  onOpenChange,
  confirmPayment,
  alert,
  loadingMessage,
  submitLabel,
  processingLabel,
  submittedToast,
  successToast,
  errorMessages,
}: TeamBlockedRecoveryPaymentElementProps) => {
  const router = useRouter()
  const { toast } = useToast()
  const pollUntilTeamUnblocked = useTeamUnblockPolling()
  const [isCheckingTeamStatus, setIsCheckingTeamStatus] = useState(false)

  const handleSubmit = async ({
    stripe,
    elements,
  }: {
    stripe: Stripe
    elements: StripeElements
  }) => {
    const { error } = await confirmPayment({
      stripe,
      elements,
      returnUrl: window.location.href,
    })

    if (error) {
      toast(defaultErrorToast(error.message ?? errorMessages.confirm))
      return
    }

    toast(submittedToast)
    setIsCheckingTeamStatus(true)

    try {
      const isTeamUnblocked = await pollUntilTeamUnblocked()

      if (!isTeamUnblocked) {
        toast(defaultErrorToast(errorMessages.stillBlocked))
        return
      }

      toast(successToast)
      router.refresh()
      onOpenChange(false)
    } catch {
      toast(defaultErrorToast(errorMessages.statusCheck))
    } finally {
      setIsCheckingTeamStatus(false)
    }
  }

  return (
    <StripePaymentElementWrapper
      clientSecret={clientSecret}
      customerSessionClientSecret={customerSessionClientSecret}
    >
      <StripePaymentElementForm
        alert={alert}
        loadingMessage={loadingMessage}
        submitLabel={submitLabel}
        processingLabel={
          isCheckingTeamStatus ? 'Checking team status...' : processingLabel
        }
        readyErrorMessage={errorMessages.ready}
        isProcessing={isCheckingTeamStatus}
        onSubmit={handleSubmit}
        onLoadError={(error) => {
          toast(defaultErrorToast(error.message ?? errorMessages.load))
          onOpenChange(false)
        }}
      />
    </StripePaymentElementWrapper>
  )
}
