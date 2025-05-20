'use client'

import { Button } from '@/ui/primitives/button'
import { Tier } from '@/configs/tiers'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { useToast } from '@/lib/hooks/use-toast'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { redirectToCheckoutAction } from '@/server/billing/billing-actions'
import { Badge } from '@/ui/primitives/badge'
import { useAction } from 'next-safe-action/hooks'
import { defaultErrorToast } from '@/lib/hooks/use-toast'

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

    return (
      <div
        ref={ref}
        className={cn(
          'from-bg bg-bg flex h-full flex-col border p-5',
          className
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <h5 className="text-lg font-semibold">{tier.name}</h5>
          {isSelected && <Badge variant="accent"> Your Plan {'<<'} </Badge>}
        </div>
        <ul className="mb-4 space-y-1 pl-4">
          {tier.prose.map((prose, i) => (
            <li
              className="text-fg-500 marker:text-accent-200 pl-2 font-sans text-xs marker:content-['▪']"
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
