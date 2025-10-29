'use client'

import { MONTHLY_ADD_ON_500_SANDBOXES_PRICE_DOLLARS } from '@/configs/billing'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { confirmOrderAction } from '@/server/billing/billing-actions'
import { AsciiSandbox } from '@/ui/patterns'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { SandboxIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { loadStripe } from '@stripe/stripe-js'
import { ArrowRight, CircleDollarSign } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useEffect, useRef } from 'react'

interface AddOnPurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderData: { id: string } | null
}

export function AddOnPurchaseDialog({
  open,
  onOpenChange,
  orderData,
}: AddOnPurchaseDialogProps) {
  const team = useSelectedTeam()
  const { toast } = useToast()
  const isConfirmingPayment = useRef(false)

  useEffect(() => {
    if (!open) {
      isConfirmingPayment.current = false
    }
  }, [open])

  const { execute: confirmOrder, status: confirmStatus } = useAction(
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
        toast(defaultErrorToast(error.serverError ?? 'Failed to confirm order'))
      },
    }
  )

  const handlePurchase = () => {
    if (!team || !orderData?.id) {
      toast(defaultErrorToast('Order not ready'))
      return
    }

    confirmOrder({
      teamId: team.id,
      orderId: orderData.id,
    })
  }

  const isLoading = confirmStatus === 'executing'

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
        <div className="p-3 md:p-6 flex-1 space-y-4">
          {/* Hidden title for accessibility */}
          <DialogHeader>
            <DialogTitle>+500 Sandboxes Add-on</DialogTitle>
            <DialogDescription>
              <Badge variant="default" className="bg-bg-highlight uppercase">
                ${MONTHLY_ADD_ON_500_SANDBOXES_PRICE_DOLLARS}/mo
              </Badge>
            </DialogDescription>
          </DialogHeader>

          {/* Benefits List */}
          <ul className="space-y-2 w-full">
            {/* Bullet 1 - Increases limit */}
            <li className="flex items-start gap-2 text-left">
              <SandboxIcon className="text-icon-tertiary shrink-0 size-4 translate-y-0.5" />
              <p className="prose-body text-fg">
                Increases total concurrent sandbox limit from 1,000 to 1,500
              </p>
            </li>

            {/* Bullet 2 - Raises subscription */}
            <li className="flex items-start gap-2 text-left">
              <CircleDollarSign className="text-icon-tertiary shrink-0 size-4 translate-y-0.5" />
              <p className="prose-body text-fg">
                Raises current subscription from $150/mo to $250/mo
              </p>
            </li>
          </ul>

          {/* CTA Button */}
          {!isLoading ? (
            <Button
              variant="default"
              size="lg"
              className="w-full justify-center uppercase"
              onClick={handlePurchase}
              disabled={!orderData?.id}
            >
              Add for +${MONTHLY_ADD_ON_500_SANDBOXES_PRICE_DOLLARS}/mo
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <span className="flex items-center justify-center ">
              <Loader variant="slash" size="sm" /> Processing Payment...
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
