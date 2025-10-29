'use client'

import { MONTHLY_ADD_ON_500_SANDBOXES_PRICE_DOLLARS } from '@/configs/billing'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { purchaseAddonAction } from '@/server/billing/billing-actions'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { SandboxIcon } from '@/ui/primitives/icons'
import { loadStripe } from '@stripe/stripe-js'
import { ArrowRight, CircleDollarSign } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useEffect, useRef } from 'react'

interface AddOnPurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddOnPurchaseDialog({
  open,
  onOpenChange,
}: AddOnPurchaseDialogProps) {
  const team = useSelectedTeam()
  const { toast } = useToast()
  const isConfirmingPayment = useRef(false)

  useEffect(() => {
    if (!open) {
      isConfirmingPayment.current = false
    }
  }, [open])

  const { execute: purchaseAddon, isTransitioning } = useAction(
    purchaseAddonAction,
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

            // retrieve the PaymentIntent to check its status
            const { paymentIntent, error: retrieveError } =
              await stripe.retrievePaymentIntent(data.client_secret)

            if (retrieveError) {
              toast(
                defaultErrorToast(retrieveError.message ?? 'Payment failed')
              )
              isConfirmingPayment.current = false
              return
            }

            // Check if 3DS or other action is required
            if (paymentIntent.status === 'requires_action') {
              const { error: actionError } = await stripe.handleNextAction({
                clientSecret: data.client_secret,
              })

              if (actionError) {
                toast(
                  defaultErrorToast(
                    actionError.message ?? '3D Secure authentication failed'
                  )
                )
                isConfirmingPayment.current = false
                return
              }

              // after handling action, retrieve again to check final status
              const { paymentIntent: finalIntent, error: finalError } =
                await stripe.retrievePaymentIntent(data.client_secret)

              if (finalError || finalIntent.status !== 'succeeded') {
                toast(defaultErrorToast('Payment failed'))
                isConfirmingPayment.current = false
                return
              }
            } else if (paymentIntent.status !== 'succeeded') {
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
        toast(
          defaultErrorToast(error.serverError ?? 'Failed to purchase add-on')
        )
      },
    }
  )

  const handlePurchase = () => {
    if (!team) {
      toast(defaultErrorToast('No team selected'))
      return
    }

    purchaseAddon({
      teamId: team.id,
      quantity: 1,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-8">
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">
          +500 Sandboxes Add-on Purchase
        </DialogTitle>
        <DialogDescription className="sr-only">
          Purchase additional sandbox concurrency for your team
        </DialogDescription>

        <div className="flex flex-col items-center text-center">
          {/* Title */}
          <h2 className="mb-3">+500 Sandboxes Add-on</h2>

          {/* Price Badge */}
          <Badge variant="default" size="lg" className="mb-8">
            ${MONTHLY_ADD_ON_500_SANDBOXES_PRICE_DOLLARS}/mo
          </Badge>

          {/* Benefits List */}
          <div className="space-y-4 mb-8 w-full max-w-xl">
            {/* Bullet 1 - Increases limit */}
            <div className="flex items-start gap-3 text-left">
              <SandboxIcon className="text-icon-tertiary mt-0.5 shrink-0 size-5" />
              <p className="prose-body text-fg">
                Increases total concurrent sandbox limit from 1,000 to 1,500
              </p>
            </div>

            {/* Bullet 2 - Raises subscription */}
            <div className="flex items-start gap-3 text-left">
              <CircleDollarSign className="text-icon-tertiary mt-0.5 shrink-0 size-5" />
              <p className="prose-body text-fg">
                Raises current subscription from $150/mo to $250/mo
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            variant="default"
            size="lg"
            className="w-full max-w-xl justify-center uppercase"
            onClick={handlePurchase}
            loading={isTransitioning}
            disabled={isTransitioning}
          >
            Add for +${MONTHLY_ADD_ON_500_SANDBOXES_PRICE_DOLLARS}/mo
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
