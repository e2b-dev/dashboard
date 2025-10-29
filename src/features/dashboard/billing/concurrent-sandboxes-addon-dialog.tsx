'use client'

import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { confirmOrderAction } from '@/server/billing/billing-actions'
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
  CardElement,
  Elements,
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
import { useState } from 'react'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

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
  const stripe = useStripe()
  const elements = useElements()
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const { execute: confirmOrder, isPending: isLoading } = useAction(
    confirmOrderAction,
    {
      onSuccess: async ({ data }) => {
        if (data?.client_secret && !isConfirmingPayment) {
          setIsConfirmingPayment(true)

          try {
            const stripe = await loadStripe(
              process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
            )

            if (!stripe) {
              toast(defaultErrorToast('Failed to load Stripe'))
              setIsConfirmingPayment(false)
              return
            }

            const { paymentIntent, error: retrieveError } =
              await stripe.retrievePaymentIntent(data.client_secret)

            if (retrieveError) {
              console.error('Payment intent retrieval failed:', retrieveError)

              toast(
                defaultErrorToast(retrieveError.message ?? 'Payment failed')
              )
              setIsConfirmingPayment(false)
              return
            }

            if (paymentIntent.status === 'requires_payment_method') {
              setClientSecret(data.client_secret)
              setShowPaymentForm(true)
              setIsConfirmingPayment(false)
              return
            }

            if (paymentIntent.status === 'requires_action') {
              const { error: actionError } = await stripe.handleNextAction({
                clientSecret: data.client_secret,
              })

              if (actionError) {
                console.error('3D Secure authentication failed:', actionError)

                toast(
                  defaultErrorToast(
                    actionError.message ?? '3D Secure authentication failed'
                  )
                )
                setIsConfirmingPayment(false)
                return
              }

              const { paymentIntent: finalIntent, error: finalError } =
                await stripe.retrievePaymentIntent(data.client_secret)

              if (finalError || finalIntent.status !== 'succeeded') {
                console.error(
                  'Final payment check failed:',
                  finalError,
                  finalIntent?.status
                )

                toast(defaultErrorToast('Payment failed'))
                setIsConfirmingPayment(false)
                return
              }
            } else if (paymentIntent.status !== 'succeeded') {
              console.error(
                'Final payment check failed:',
                paymentIntent?.status
              )

              toast(
                defaultErrorToast(`Payment status: ${paymentIntent.status}`)
              )
              setIsConfirmingPayment(false)
              return
            }

            toast({
              title: 'Payment successful',
              description: 'Your add-on has been activated',
            })
            onOpenChange(false)
            setIsConfirmingPayment(false)
          } catch (err) {
            toast(defaultErrorToast('Payment failed'))
            setIsConfirmingPayment(false)
          }
        }
      },
      onError: ({ error }) => {
        toast(defaultErrorToast(error.serverError ?? 'Failed to confirm order'))
      },
    }
  )

  const handlePurchase = () => {
    if (!team) {
      toast(defaultErrorToast('Team not ready'))
      return
    }

    confirmOrder({
      teamId: team.id,
      orderId,
    })
  }

  const handleConfirmPayment = async () => {
    if (!stripe || !elements || !clientSecret) {
      toast(defaultErrorToast('Payment system not ready'))
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      toast(defaultErrorToast('Card element not found'))
      return
    }

    setIsConfirmingPayment(true)

    const { error: confirmError } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
        },
      }
    )

    if (confirmError) {
      console.error('Payment confirmation failed:', confirmError)
      toast(defaultErrorToast(confirmError.message ?? 'Payment failed'))
      setIsConfirmingPayment(false)
      return
    }

    toast({
      title: 'Payment successful',
      description: 'Your add-on has been activated',
    })
    onOpenChange(false)
    setIsConfirmingPayment(false)
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
      <div className="p-5 flex-1 space-y-6">
        {!showPaymentForm ? (
          <>
            <DialogHeader>
              <DialogTitle>+500 Sandboxes Add-on</DialogTitle>
            </DialogHeader>

            <ul className="space-y-2 w-full">
              <li className="flex items-start gap-2 text-left">
                <SandboxIcon className="text-icon-tertiary shrink-0 size-4 translate-y-0.5" />
                <p className="prose-body text-fg">{limitIncreaseText}</p>
              </li>

              <li className="flex items-start gap-2 text-left">
                <CircleDollarSign className="text-icon-tertiary shrink-0 size-4 translate-y-0.5" />
                <p className="prose-body text-fg">
                  Raises current subscription by{' '}
                  <b>${monthlyPriceCents / 100}</b>
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

            {/* Action Button */}
            {!isLoading ? (
              <Button
                variant="default"
                size="lg"
                className="w-full justify-center"
                onClick={handlePurchase}
              >
                Increase Concurrency Limit
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <div className="flex items-center justify-center py-3 gap-2">
                <Loader variant="slash" size="sm" />
                <span className="prose-body text-fg-secondary">
                  Processing payment...
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Alert variant="warning">
                <AlertCircle className="size-4" />
                <AlertDescription className="prose-label">
                  Card issuer confirmation failed in the last attempt. You can
                  either add a new payment method or enter the same card details
                  again to retry.
                </AlertDescription>
              </Alert>

              <div className="p-3 bg-bg-highlight border border-stroke">
                <CardElement />
              </div>

              <ul className="space-y-2 w-full">
                <li className="flex items-start gap-2 text-left">
                  <SandboxIcon className="text-icon-tertiary shrink-0 size-4 translate-y-0.5" />
                  <p className="prose-body text-fg">{limitIncreaseText}</p>
                </li>

                <li className="flex items-start gap-2 text-left">
                  <CircleDollarSign className="text-icon-tertiary shrink-0 size-4 translate-y-0.5" />
                  <p className="prose-body text-fg">
                    Raises current subscription by{' '}
                    <b>${monthlyPriceCents / 100}</b>
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

              <Button
                variant="default"
                size="lg"
                className="w-full justify-center"
                onClick={handleConfirmPayment}
                disabled={!stripe || isConfirmingPayment}
              >
                {isConfirmingPayment ? (
                  <>
                    <Loader variant="slash" size="sm" />
                    Processing...
                  </>
                ) : (
                  <>
                    Increase Concurrency Limit
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
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
        <Elements stripe={stripePromise}>
          <DialogContent_Inner {...props} onOpenChange={onOpenChange} />
        </Elements>
      </DialogContent>
    </Dialog>
  )
}
