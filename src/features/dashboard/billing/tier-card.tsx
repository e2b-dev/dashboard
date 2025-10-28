'use client'

import {
  MONTHLY_ADD_ON_500_SANDBOXES_PRICE_DOLLARS,
  MONTHLY_PRO_PRICE_DOLLARS,
  Tier,
} from '@/configs/billing'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { redirectToCheckoutAction } from '@/server/billing/billing-actions'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { Label } from '@/ui/primitives/label'
import { useAction } from 'next-safe-action/hooks'
import { forwardRef } from 'react'

interface BillingTierCardProps {
  tier: Tier
  isHighlighted?: boolean
  className?: string
}

const BillingTierCard = forwardRef<HTMLDivElement, BillingTierCardProps>(
  ({ tier, isHighlighted = false, className }, ref) => {
    const team = useSelectedTeam()

    const { toast } = useToast()

    const { execute: redirectToCheckout, status } = useAction(
      redirectToCheckoutAction,
      {
        onError: ({ error }) => {
          toast(
            defaultErrorToast(
              error.serverError ?? 'Failed to redirect to checkout'
            )
          )
        },
      }
    )

    // NOTE: this is a temporary check to see if the team is on a custom pro tier
    // TODO: remove this once we have a proper way to handle custom tiers
    const isCustomProTier =
      tier.id === 'pro_v1' &&
      (team?.tier.includes('pro') || team?.tier.includes('enterprise'))
    const isSelected = isCustomProTier || team?.tier === tier.id
    const isPending = status === 'executing'

    const handleRedirectToCheckout = () => {
      if (!team) return

      redirectToCheckout({
        teamId: team.id,
        tierId: tier.id,
      })
    }

    const isProTier = tier.id === 'pro_v1'
    const tierPrice = isProTier ? `$${MONTHLY_PRO_PRICE_DOLLARS}/mo` : 'Free'

    return (
      <div
        ref={ref}
        className={cn(
          'from-bg bg-bg flex h-full flex-col border overflow-hidden',
          className
        )}
      >
        <div className="mb-3 flex items-center justify-between px-5 pt-5">
          <h5>{tier.name}</h5>
          {isSelected && (
            <Badge size="lg" className="uppercase" variant="info">
              Your Plan {'<<'}
            </Badge>
          )}
        </div>
        <ul className="mb-4 space-y-1 pl-9 pr-5">
          {tier.prose.map((prose, i) => (
            <li
              className="text-fg-tertiary marker:text-fg pl-2 font-sans text-xs marker:content-['▪']"
              key={`tier-${tier.id}-prose-${i}`}
            >
              {prose}
            </li>
          ))}
        </ul>

        {/* Price Section */}
        <div
          className={cn(
            'border-stroke mt-auto border-t pt-4 px-5',
            !isProTier && 'pb-5'
          )}
        >
          <div className="flex items-center justify-between">
            <Label>Price</Label>
            <span className="prose-body-highlight">{tierPrice}</span>
          </div>
        </div>

        {/* Available Add-ons Section - Only for Pro tier */}
        {isProTier && (
          <div className="border-stroke mt-4 border-t pt-4 px-5 pb-5">
            <Label className="mb-3 block">Available Add-ons</Label>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex-1">
                <p className="prose-body text-fg">+500 concurrent sandboxes</p>
                <p className="text-fg-tertiary prose-label mt-0.5 uppercase">
                  +${MONTHLY_ADD_ON_500_SANDBOXES_PRICE_DOLLARS}/mo - Stackable
                  2x
                </p>
              </div>
              <Button
                variant="default"
                size="default"
                className="w-full sm:w-auto sm:shrink-0"
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
              loading={isPending}
              onClick={handleRedirectToCheckout}
            >
              Select
            </Button>
          </div>
        )}
      </div>
    )
  }
)

BillingTierCard.displayName = 'BillingTierCard'

export default BillingTierCard
