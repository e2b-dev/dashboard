'use client'

import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { confirmOrderAction } from '@/server/billing/billing-actions'
import { AsciiSandbox } from '@/ui/patterns'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { SandboxIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { loadStripe } from '@stripe/stripe-js'
import { ArrowRight, CircleDollarSign, CreditCard } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useEffect, useRef } from 'react'

interface ConcurrentSandboxAddOnPurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  monthlyPriceCents: number
  amountDueCents: number
  currentConcurrentSandboxesLimit?: number
}

export function ConcurrentSandboxAddOnPurchaseDialog({
  open,
  onOpenChange,
  orderId,
  monthlyPriceCents,
  amountDueCents,
  currentConcurrentSandboxesLimit,
}: ConcurrentSandboxAddOnPurchaseDialogProps) {
  const team = useSelectedTeam()
  const { toast } = useToast()
  const isConfirmingPayment = useRef(false)

  useEffect(() => {
    if (!open) {
      isConfirmingPayment.current = false
    }
  }, [open])

  const { execute: confirmOrder, isPending: isLoading } = useAction(
    confirmOrderAction,
    {
      onSuccess: async ({ data }) => {
        if (data?.client_secret && !isConfirmingPayment.current) {
          isConfirmingPayment.current = true

          try {
            const stripe = await loadStripe(
              process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
            )

            if (!stripe) {
              toast(defaultErrorToast('Failed to load Stripe'))
              isConfirmingPayment.current = false
              return
            }

            const { paymentIntent, error: retrieveError } =
              await stripe.retrievePaymentIntent(data.client_secret)

            if (retrieveError) {
              console.error('Payment intent retrieval failed:', retrieveError)

              toast(
                defaultErrorToast(retrieveError.message ?? 'Payment failed')
              )
              isConfirmingPayment.current = false
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
                isConfirmingPayment.current = false
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
                isConfirmingPayment.current = false
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
              isConfirmingPayment.current = false
              return
            }

            toast({
              title: 'Payment successful',
              description: 'Your add-on has been activated',
            })
            onOpenChange(false)
            isConfirmingPayment.current = false
          } catch (err) {
            toast(defaultErrorToast('Payment failed'))
            isConfirmingPayment.current = false
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!p-0 md:max-w-[600px] md:min-w-[600px] flex gap-0">
        <div className="hidden w-32 border-r relative md:flex items-center justify-center overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <AsciiSandbox className="scale-85 text-fg-tertiary" />
          </div>
          <div className="p-1 bg-bg-1 relative z-10">
            <SandboxIcon className="size-7 text-fg-tertiary" />
          </div>
        </div>
        <div className="p-5 flex-1 space-y-6">
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

          {/* Action Button */}
          {!isLoading ? (
            <Button
              variant="default"
              size="lg"
              className="w-full justify-center"
              onClick={handlePurchase}
            >
              Add +500 Sandboxes
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
