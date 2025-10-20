'use client'

import { Tier } from '@/configs/tiers'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { redirectToCheckoutAction } from '@/server/billing/billing-actions'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { useAction } from 'next-safe-action/hooks'
import { forwardRef } from 'react'
import { useDashboard } from '../context'

interface BillingTierCardProps {
  tier: Tier
  isHighlighted?: boolean
  className?: string
}

const BillingTierCard = forwardRef<HTMLDivElement, BillingTierCardProps>(
  ({ tier, isHighlighted = false, className }, ref) => {
    const { team } = useDashboard()

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
        teamIdOrSlug: team.id,
        tierId: tier.id,
      })
    }

    return (
      <div
        ref={ref}
        className={cn(
          'from-bg bg-bg flex h-full flex-col border p-5',
          className
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <h5>{tier.name}</h5>
          {isSelected && (
            <Badge size="lg" className="uppercase" variant="info">
              Your Plan {'<<'}
            </Badge>
          )}
        </div>
        <ul className="mb-4 space-y-1 pl-4">
          {tier.prose.map((prose, i) => (
            <li
              className="text-fg-tertiary marker:text-fg pl-2 font-sans text-xs marker:content-['▪']"
              key={`tier-${tier.id}-prose-${i}`}
            >
              {prose}
            </li>
          ))}
        </ul>
        {isSelected === false && isHighlighted && (
          <Button
            variant={isHighlighted ? 'default' : 'outline'}
            className="mt-4 w-full rounded-none"
            size="lg"
            loading={isPending}
            onClick={handleRedirectToCheckout}
          >
            Select
          </Button>
        )}
      </div>
    )
  }
)

BillingTierCard.displayName = 'BillingTierCard'

export default BillingTierCard
