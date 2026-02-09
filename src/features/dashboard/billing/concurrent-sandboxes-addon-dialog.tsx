'use client'

import { useRouteParams } from '@/lib/hooks/use-route-params'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { useTRPC } from '@/trpc/client'
import { AsciiSandbox } from '@/ui/patterns'
import { Alert, AlertDescription } from '@/ui/primitives/alert'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { SandboxIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  CircleDollarSign,
  CreditCard,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useDashboard } from '../context'
import {
  ADDON_PURCHASE_ACTION_ERRORS,
  ADDON_PURCHASE_MESSAGES,
  SANDBOXES_PER_ADDON,
} from './constants'
import {
  stripePromise,
  usePaymentConfirmation,
  usePaymentElementAppearance,
} from './hooks'

interface ConcurrentSandboxAddOnPurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  monthlyPriceCents: number
  amountDueCents: number
  currentConcurrentSandboxesLimit?: number
}

function DialogContent_Inner({
  onOpenChange,
  orderId,
  monthlyPriceCents,
  amountDueCents,
  currentConcurrentSandboxesLimit,
}: Omit<ConcurrentSandboxAddOnPurchaseDialogProps, 'open'>) {
  const { team } = useDashboard()
  const { toast } = useToast()
  const { teamIdOrSlug } =
    useRouteParams<'/dashboard/[teamIdOrSlug]/billing/plan'>()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [customerSessionClientSecret, setCustomerSessionClientSecret] =
    useState<string | null>(null)

  const customerSessionMutation = useMutation(
    trpc.billing.getCustomerSession.mutationOptions({
      onSuccess: (data) => {
        if (data?.client_secret) {
          setCustomerSessionClientSecret(data.client_secret)
        }
      },
      onError: (error) => {
        console.error(
          '[Payment] Failed to get customer session:',
          error.message
        )
        toast(defaultErrorToast(ADDON_PURCHASE_MESSAGES.error.generic))
      },
    })
  )

  const handleSwitchToPaymentElement = (clientSecret: string) => {
    if (!team) return
    setClientSecret(clientSecret)
    setShowPaymentForm(true)
    customerSessionMutation.mutate({ teamIdOrSlug })
  }

  const itemsQueryKey = trpc.billing.getItems.queryOptions({
    teamIdOrSlug,
  }).queryKey
  const teamLimitsQueryKey = trpc.billing.getTeamLimits.queryOptions({
    teamIdOrSlug,
  }).queryKey

  const { confirmPayment, isConfirming } = usePaymentConfirmation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemsQueryKey })
      queryClient.invalidateQueries({ queryKey: teamLimitsQueryKey })
      onOpenChange(false)
    },
    onFallbackToPaymentElement: handleSwitchToPaymentElement,
  })

  const confirmOrderMutation = useMutation(
    trpc.billing.confirmOrder.mutationOptions({
      onSuccess: async (data) => {
        if (data?.client_secret && !isConfirming) {
          await confirmPayment(data.client_secret)
        }
      },
      onError: (error) => {
        console.error('[Payment] Failed to confirm order:', error.message)
        if (
          error.message === ADDON_PURCHASE_ACTION_ERRORS.missingPaymentMethod
        ) {
          toast(
            defaultErrorToast(
              ADDON_PURCHASE_MESSAGES.error.missingPaymentMethod
            )
          )
        } else {
          toast(defaultErrorToast(ADDON_PURCHASE_MESSAGES.error.generic))
        }
      },
    })
  )

  const handlePurchase = () => {
    if (!team) return

    confirmOrderMutation.mutate({ teamIdOrSlug, orderId })
  }

  const limitIncreaseText = currentConcurrentSandboxesLimit ? (
    <>
      Increases total concurrent sandbox limit from{' '}
      <b>{currentConcurrentSandboxesLimit.toLocaleString()}</b> to{' '}
      <b>
        {(
          currentConcurrentSandboxesLimit + SANDBOXES_PER_ADDON
        ).toLocaleString()}
      </b>
    </>
  ) : (
    <>
      Increases total concurrent sandbox limit by <b>{SANDBOXES_PER_ADDON}</b>
    </>
  )

  const isProcessing = confirmOrderMutation.isPending || isConfirming

  return (
    <>
      <DialogSidebar />
      <div className="p-5 flex-1 space-y-6 overflow-y-auto max-h-[calc(100svh-2rem)]">
        <DialogHeader>
          <DialogTitle>+500 Sandboxes Add-on</DialogTitle>
        </DialogHeader>

        {showPaymentForm && <PaymentAuthFailedAlert />}

        {showPaymentForm && customerSessionClientSecret && clientSecret ? (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <PaymentElementWrapper
              clientSecret={clientSecret}
              customerSessionClientSecret={customerSessionClientSecret}
              onOpenChange={onOpenChange}
              isLoading={isProcessing}
            />
          </div>
        ) : showPaymentForm ? (
          <LoadingState
            message={ADDON_PURCHASE_MESSAGES.loading.loadingPaymentMethods}
          />
        ) : null}

        <AddonFeaturesList
          limitIncreaseText={limitIncreaseText}
          monthlyPriceCents={monthlyPriceCents}
          amountDueCents={amountDueCents}
        />

        {!showPaymentForm && !isProcessing ? (
          <Button
            variant="default"
            size="lg"
            className="w-full justify-center"
            onClick={handlePurchase}
            loading={isProcessing}
            disabled={isProcessing}
          >
            Increase Concurrency Limit
            <ArrowRight className="size-4" />
          </Button>
        ) : !showPaymentForm ? (
          <LoadingState message={ADDON_PURCHASE_MESSAGES.loading.processing} />
        ) : null}
      </div>
    </>
  )
}

// decorative sidebar with sandbox icon
function DialogSidebar() {
  return (
    <div className="hidden w-32 border-r relative md:flex items-center justify-center overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <AsciiSandbox className="scale-85 text-fg-tertiary" />
      </div>
      <div className="p-1 bg-bg-1 relative z-10">
        <SandboxIcon className="size-7 text-fg-tertiary" />
      </div>
    </div>
  )
}

function PaymentAuthFailedAlert() {
  return (
    <Alert
      variant="warning"
      className="animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <AlertCircle className="size-4" />
      <AlertDescription className="prose-label">
        Payment authentication failed in the last attempt. Please select a new
        payment method or enter the same card details again to retry.
      </AlertDescription>
    </Alert>
  )
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-4 gap-2">
      <Loader variant="slash" size="sm" />
      <span className="prose-body text-fg-secondary">{message}</span>
    </div>
  )
}

interface AddonFeaturesListProps {
  limitIncreaseText: React.ReactNode
  monthlyPriceCents: number
  amountDueCents: number
}

function AddonFeaturesList({
  limitIncreaseText,
  monthlyPriceCents,
  amountDueCents,
}: AddonFeaturesListProps) {
  return (
    <ul className="space-y-2 w-full">
      <li className="flex items-start gap-2 text-left">
        <SandboxIcon className="text-icon-tertiary shrink-0 size-4 translate-y-0.5" />
        <p className="prose-body text-fg">{limitIncreaseText}</p>
      </li>

      <li className="flex items-start gap-2 text-left">
        <CircleDollarSign className="text-icon-tertiary shrink-0 size-4 translate-y-0.5" />
        <p className="prose-body text-fg">
          Raises current subscription by <b>${monthlyPriceCents / 100}</b>/month
        </p>
      </li>

      <li className="flex items-start gap-2 text-left">
        <CreditCard className="text-icon-tertiary shrink-0 size-4 translate-y-0.5" />
        <p className="prose-body text-fg">
          Pay <b>${(amountDueCents / 100).toFixed(2)}</b> now for the remaining
          time of the month
        </p>
      </li>
    </ul>
  )
}

// wrapper for stripe elements with saved payment methods
function PaymentElementWrapper({
  clientSecret,
  customerSessionClientSecret,
  onOpenChange,
  isLoading,
}: {
  clientSecret: string
  customerSessionClientSecret: string
  onOpenChange: (open: boolean) => void
  isLoading: boolean
}) {
  const appearance = usePaymentElementAppearance()

  return (
    <div className="w-full">
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          customerSessionClientSecret,
          appearance,
          loader: 'never',
        }}
      >
        <PaymentElementForm onOpenChange={onOpenChange} isLoading={isLoading} />
      </Elements>
    </div>
  )
}

// payment element form component (fallback for manual payment entry)
function PaymentElementForm({
  onOpenChange,
  isLoading,
}: {
  onOpenChange: (open: boolean) => void
  isLoading: boolean
}) {
  const stripe = useStripe()
  const elements = useElements()
  const { toast } = useToast()
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      console.error('[Payment] Stripe or elements not loaded')
      toast(defaultErrorToast(ADDON_PURCHASE_MESSAGES.error.generic))
      return
    }

    setIsConfirmingPayment(true)

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (error) {
      console.error('[Payment] Manual payment confirmation failed:', error)
      toast(
        defaultErrorToast(
          error.message ?? ADDON_PURCHASE_MESSAGES.error.generic
        )
      )
      setIsConfirmingPayment(false)
      return
    }

    toast({
      title: ADDON_PURCHASE_MESSAGES.success.title,
      description: ADDON_PURCHASE_MESSAGES.success.description,
    })
    onOpenChange(false)
    setIsConfirmingPayment(false)
    router.refresh()
  }

  const isProcessing = isLoading || isConfirmingPayment

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <PaymentElement
        options={{
          layout: {
            type: 'tabs',
            defaultCollapsed: true,
          },
        }}
      />
      {!isProcessing ? (
        <Button
          type="submit"
          variant="default"
          size="lg"
          className="w-full justify-center mt-6"
          loading={isProcessing}
          disabled={!stripe || isProcessing}
        >
          Increase Concurrency Limit
          <ArrowRight className="size-4" />
        </Button>
      ) : (
        <LoadingState message={ADDON_PURCHASE_MESSAGES.loading.processing} />
      )}
    </form>
  )
}

export function ConcurrentSandboxAddOnPurchaseDialog({
  open,
  onOpenChange,
  ...props
}: ConcurrentSandboxAddOnPurchaseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!p-0 md:max-w-[600px] md:min-w-[600px] flex gap-0">
        <DialogContent_Inner {...props} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}
