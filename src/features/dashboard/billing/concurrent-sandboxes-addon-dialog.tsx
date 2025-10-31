'use client'

import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import {
  confirmOrderAction,
  getCustomerSessionAction,
} from '@/server/billing/billing-actions'
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
import { loadStripe } from '@stripe/stripe-js'
import {
  AlertCircle,
  ArrowRight,
  CircleDollarSign,
  CreditCard,
} from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

// stripe payment element appearance for fallback flow
function usePaymentElementAppearance() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return {
    theme: 'flat' as const,
    variables: {
      colorPrimary: isDark ? '#ff8800' : '#e56f00',
      colorBackground: isDark ? '#1f1f1f' : '#f2f2f2',
      colorText: isDark ? '#ffffff' : '#0a0a0a',
      colorDanger: isDark ? '#f54545' : '#ff4400',
      colorSuccess: isDark ? '#00d992' : '#00a670',
      fontFamily:
        '"IBM Plex Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSizeBase: '14px',
      fontLineHeight: '20px',
      borderRadius: '6px',
      colorTextPlaceholder: isDark ? '#848484' : '#707070',
      colorIconCardError: isDark ? '#f54545' : '#ff4400',
    },
    rules: {
      '.Input': {
        border: isDark ? '1px solid #292929' : '1px solid #d6d6d6',
        boxShadow: 'none',
      },
      '.Input:focus': {
        border: isDark ? '1px solid #424242' : '1px solid #c2c2c2',
        boxShadow: 'none',
      },
      '.Label': {
        fontSize: '12px',
        fontWeight: '400',
        marginBottom: '6px',
      },
    },
  }
}

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
  const team = useSelectedTeam()
  const { toast } = useToast()
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [customerSessionClientSecret, setCustomerSessionClientSecret] =
    useState<string | null>(null)

  const { execute: getCustomerSession } = useAction(getCustomerSessionAction, {
    onSuccess: ({ data }) => {
      if (data?.client_secret) {
        setCustomerSessionClientSecret(data.client_secret)
      }
    },
    onError: ({ error }) => {
      toast(
        defaultErrorToast(
          error.serverError ?? 'Something went wrong. Please try again.'
        )
      )
    },
  })

  const handleSwitchToPaymentElement = (clientSecret: string) => {
    if (!team) return

    setClientSecret(clientSecret)
    setShowPaymentForm(true)

    // fetch customer session to show saved cards
    getCustomerSession({ teamId: team.id })
  }

  const { execute: confirmOrder, isPending: isLoading } = useAction(
    confirmOrderAction,
    {
      onSuccess: async ({ data }) => {
        if (data?.client_secret && !isConfirmingPayment) {
          setIsConfirmingPayment(true)

          try {
            const stripe = await stripePromise

            if (!stripe) {
              toast(
                defaultErrorToast('Something went wrong. Please try again.')
              )
              setIsConfirmingPayment(false)
              return
            }

            const { paymentIntent, error: retrieveError } =
              await stripe.retrievePaymentIntent(data.client_secret)

            if (retrieveError) {
              console.error('Failed to retrieve payment intent:', retrieveError)
              toast(
                defaultErrorToast('Something went wrong. Please try again.')
              )
              // fallback to PaymentElement with saved cards
              handleSwitchToPaymentElement(data.client_secret)
              setIsConfirmingPayment(false)
              return
            }

            if (paymentIntent.status === 'requires_payment_method') {
              // fallback to PaymentElement with saved cards
              handleSwitchToPaymentElement(data.client_secret)
              setIsConfirmingPayment(false)
              return
            }

            if (paymentIntent.status === 'requires_action') {
              const { error: actionError } = await stripe.handleNextAction({
                clientSecret: data.client_secret,
              })

              if (actionError) {
                console.error('Failed to authenticate card:', actionError)
                toast(
                  defaultErrorToast(
                    'Failed to authenticate card. Please try again or add a new payment method.'
                  )
                )
                // fallback to PaymentElement with saved cards
                handleSwitchToPaymentElement(data.client_secret)
                setIsConfirmingPayment(false)
                return
              }

              const { paymentIntent: finalIntent, error: finalError } =
                await stripe.retrievePaymentIntent(data.client_secret)

              if (finalError || finalIntent.status !== 'succeeded') {
                console.error(
                  'Failed to activate add-on. Please try again.',
                  finalError?.message
                )
                toast(
                  defaultErrorToast(
                    'Failed to activate add-on. Please try again.'
                  )
                )
                setIsConfirmingPayment(false)
                return
              }
            } else if (paymentIntent.status !== 'succeeded') {
              console.error(
                'Final payment check failed:',
                paymentIntent?.status
              )
              toast(
                defaultErrorToast(
                  'Failed to activate add-on. Please try again.'
                )
              )
              setIsConfirmingPayment(false)
              return
            }

            toast({
              title: 'Add-on activated',
              description:
                '500 additional concurrent sandboxes have been added to your subscription',
            })
            onOpenChange(false)
            setIsConfirmingPayment(false)
          } catch (err) {
            toast(defaultErrorToast('Failed to activate add-on'))
            setIsConfirmingPayment(false)
          }
        }
      },
      onError: ({ error }) => {
        toast(
          defaultErrorToast(
            error.serverError ?? 'Failed to upgrade subscription'
          )
        )
      },
    }
  )

  const handlePurchase = () => {
    if (!team) {
      return
    }

    confirmOrder({
      teamId: team.id,
      orderId,
    })
  }

  const limitIncreaseText = currentConcurrentSandboxesLimit ? (
    <>
      Increases total concurrent sandbox limit from{' '}
      <b>{currentConcurrentSandboxesLimit.toLocaleString()}</b> to{' '}
      <b>{(currentConcurrentSandboxesLimit + 500).toLocaleString()}</b>
    </>
  ) : (
    <>
      Increases total concurrent sandbox limit by <b>500</b>
    </>
  )

  return (
    <>
      <div className="hidden w-32 border-r relative md:flex items-center justify-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <AsciiSandbox className="scale-85 text-fg-tertiary" />
        </div>
        <div className="p-1 bg-bg-1 relative z-10">
          <SandboxIcon className="size-7 text-fg-tertiary" />
        </div>
      </div>
      <div className="p-5 flex-1 space-y-6 overflow-y-auto max-h-[calc(100svh-2rem)]">
        <DialogHeader>
          <DialogTitle>+500 Sandboxes Add-on</DialogTitle>
        </DialogHeader>

        {showPaymentForm && (
          <Alert
            variant="warning"
            className="animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <AlertCircle className="size-4" />
            <AlertDescription className="prose-label">
              Payment authentication failed in the last attempt. Please select a
              new payment method or enter the same card details again to retry.
            </AlertDescription>
          </Alert>
        )}

        {showPaymentForm && customerSessionClientSecret && clientSecret ? (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <PaymentElementWrapper
              clientSecret={clientSecret}
              customerSessionClientSecret={customerSessionClientSecret}
              onOpenChange={onOpenChange}
              amountDueCents={amountDueCents}
              isLoading={isLoading || isConfirmingPayment}
            />
          </div>
        ) : showPaymentForm ? (
          <div className="flex items-center justify-center py-4 gap-2">
            <Loader variant="slash" size="sm" />
            <span className="prose-body text-fg-secondary">
              Loading your saved payment methods...
            </span>
          </div>
        ) : null}

        <ul className="space-y-2 w-full">
          <li className="flex items-start gap-2 text-left">
            <SandboxIcon className="text-icon-tertiary shrink-0 size-4 translate-y-0.5" />
            <p className="prose-body text-fg">{limitIncreaseText}</p>
          </li>

          <li className="flex items-start gap-2 text-left">
            <CircleDollarSign className="text-icon-tertiary shrink-0 size-4 translate-y-0.5" />
            <p className="prose-body text-fg">
              Raises current subscription by <b>${monthlyPriceCents / 100}</b>
              /month
            </p>
          </li>

          <li className="flex items-start gap-2 text-left">
            <CreditCard className="text-icon-tertiary shrink-0 size-4 translate-y-0.5" />
            <p className="prose-body text-fg">
              Pay <b>${(amountDueCents / 100).toFixed(2)}</b> now for the
              remaining time of the month
            </p>
          </li>
        </ul>

        {!showPaymentForm && !isLoading && !isConfirmingPayment ? (
          <Button
            variant="default"
            size="lg"
            className="w-full justify-center"
            onClick={handlePurchase}
            loading={isLoading || isConfirmingPayment}
            disabled={isLoading || isConfirmingPayment}
          >
            Increase Concurrency Limit
            <ArrowRight className="size-4" />
          </Button>
        ) : !showPaymentForm ? (
          <div className="flex items-center justify-center py-3 gap-2">
            <Loader variant="slash" size="sm" />
            <span className="prose-body text-fg-secondary">
              Processing subscription upgrade...
            </span>
          </div>
        ) : null}
      </div>
    </>
  )
}

// payment element wrapper (fallback with saved cards)
function PaymentElementWrapper({
  clientSecret,
  customerSessionClientSecret,
  onOpenChange,
  amountDueCents,
  isLoading,
}: {
  clientSecret: string
  customerSessionClientSecret: string
  onOpenChange: (open: boolean) => void
  amountDueCents: number
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
          loader: 'auto',
        }}
      >
        <PaymentElementForm
          onOpenChange={onOpenChange}
          amountDueCents={amountDueCents}
          isLoading={isLoading}
        />
      </Elements>
    </div>
  )
}

// payment element form component (fallback)
function PaymentElementForm({
  onOpenChange,
  amountDueCents,
  isLoading,
}: {
  onOpenChange: (open: boolean) => void
  amountDueCents: number
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
      toast(defaultErrorToast('Failed to activate add-on'))
      return
    }

    setIsConfirmingPayment(true)

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (error) {
      toast(defaultErrorToast(error.message ?? 'Failed to activate add-on'))
      setIsConfirmingPayment(false)
      return
    }

    toast({
      title: 'Add-on activated',
      description:
        '500 additional concurrent sandboxes have been added to your subscription',
    })
    onOpenChange(false)
    setIsConfirmingPayment(false)

    // refresh to update billing history
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <PaymentElement />
      {!isLoading && !isConfirmingPayment ? (
        <Button
          type="submit"
          variant="default"
          size="lg"
          className="w-full justify-center mt-6"
          loading={isLoading || isConfirmingPayment}
          disabled={!stripe || isLoading || isConfirmingPayment}
        >
          Increase Concurrency Limit
          <ArrowRight className="size-4" />
        </Button>
      ) : (
        <div className="flex items-center justify-center py-3 gap-2">
          <Loader variant="slash" size="sm" />
          <span className="prose-body text-fg-secondary">
            Buying additional sandboxes...
          </span>
        </div>
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
