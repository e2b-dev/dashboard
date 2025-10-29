'use client'

import {
  MONTHLY_ADD_ON_500_SANDBOXES_PRICE_DOLLARS,
  MONTHLY_PRO_PRICE_DOLLARS,
} from '@/configs/billing'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  createOrderAction,
  redirectToCheckoutAction,
} from '@/server/billing/billing-actions'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { Label } from '@/ui/primitives/label'
import { useAction } from 'next-safe-action/hooks'
import { forwardRef, useState } from 'react'
import { AddOnPurchaseDialog } from './addon-purchase-dialog'

interface BillingTierCardProps {
  tier: {
    id: string
    name: string
    features: string[]
  }
  isHighlighted?: boolean
  className?: string
}

const BillingTierCard = forwardRef<HTMLDivElement, BillingTierCardProps>(
  ({ tier, isHighlighted = false, className }, ref) => {
    const team = useSelectedTeam()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [orderData, setOrderData] = useState<{ id: string } | null>(null)

    const { toast } = useToast()

    const { execute: redirectToCheckout, isPending: isCheckoutLoading } =
      useAction(redirectToCheckoutAction, {
        onError: ({ error }) => {
          toast(
            defaultErrorToast(
              error.serverError ?? 'Failed to redirect to checkout'
            )
          )
        },
      })

    const { execute: createOrder, isPending: isCreateOrderLoading } = useAction(
      createOrderAction,
      {
        onSuccess: ({ data }) => {
          if (!data) return

          setOrderData(data)
          setIsDialogOpen(true)
        },
        onError: ({ error }) => {
          toast(
            defaultErrorToast(error.serverError ?? 'Failed to create order')
          )
        },
      }
    )

    // TODO: make this more explicit this once we migrated all customers to the available tiers
    const isProTier = tier.id === 'pro_v1'
    const isCustomProTier =
      isProTier &&
      (team?.tier.includes('pro') || team?.tier.includes('enterprise'))
    const isSelected = isCustomProTier || team?.tier === tier.id
    const isAbleToBuyAddOn = isProTier && isCustomProTier

    const handleRedirectToCheckout = () => {
      if (!team) return

      redirectToCheckout({
        teamId: team.id,
        tierId: tier.id,
      })
    }

    const tierPrice = isProTier ? `$${MONTHLY_PRO_PRICE_DOLLARS}/mo` : 'Free'

    return (
      <div
        ref={ref}
        className={cn(
          'from-bg bg-bg flex h-full flex-col border overflow-hidden',
          className
        )}
      >
        <div className="mb-3 flex items-center justify-between px-5 pt-5 h-10">
          <h5>{tier.name}</h5>
          {isSelected && (
            <Badge size="lg" className="uppercase" variant="info">
              Your Plan {'<<'}
            </Badge>
          )}
        </div>
        <ul className="mb-4 space-y-1 pl-9 pr-5">
          {tier.features.map((feature, i) => (
            <li
              className="text-fg-tertiary marker:text-fg pl-2 font-sans text-xs marker:content-['▪']"
              key={`tier-${tier.id}-feature-${i}`}
            >
              {feature}
            </li>
          ))}
        </ul>

        {/* Price Section */}
        <div
          className={cn(
            'border-stroke mt-auto border-t pt-4 px-5',
            !isAbleToBuyAddOn && 'pb-4'
          )}
        >
          <div className="flex items-center justify-between">
            <Label>Price</Label>
            <span className="prose-body-highlight">{tierPrice}</span>
          </div>
        </div>

        {/* Available Add-ons Section - Only for Pro tier */}
        {isAbleToBuyAddOn && (
          <div className="border-stroke mt-4 border-t pt-4 px-5 pb-5">
            <Label className="mb-3 block">Available Add-ons</Label>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex-1">
                <p className="prose-body text-fg">+500 concurrent sandboxes</p>
                <p className="text-fg-tertiary prose-label mt-0.5 uppercase">
                  +${MONTHLY_ADD_ON_500_SANDBOXES_PRICE_DOLLARS}/mo
                </p>
              </div>
              <Button
                variant="default"
                size="default"
                className="w-full sm:w-auto sm:shrink-0"
                loading={isCreateOrderLoading}
                disabled={isCreateOrderLoading || !team}
                onClick={() => {
                  if (!team) return

                  createOrder({
                    teamId: team.id,
                    itemId: 'addon_500_sandboxes',
                  })
                }}
              >
                Purchase for +${MONTHLY_ADD_ON_500_SANDBOXES_PRICE_DOLLARS}/mo
              </Button>
            </div>
          </div>
        )}

        {isSelected === false && isHighlighted && (
          <div className="mt-4 px-5 pb-5">
            <Button
              variant={isHighlighted ? 'default' : 'outline'}
              className="w-full rounded-none"
              size="lg"
              loading={isCheckoutLoading}
              onClick={handleRedirectToCheckout}
            >
              Select
            </Button>
          </div>
        )}

        {/* Add-on Purchase Dialog */}
        <AddOnPurchaseDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          orderData={orderData}
        />
      </div>
    )
  }
)

BillingTierCard.displayName = 'BillingTierCard'

export default BillingTierCard
