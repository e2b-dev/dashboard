'use client'

import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/formatting'
import { redirectToCheckoutAction } from '@/server/billing/billing-actions'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { Label } from '@/ui/primitives/label'
import { useAction } from 'next-safe-action/hooks'
import { forwardRef, ReactNode } from 'react'
import { useDashboard } from '../context'

interface BillingTierCardProps {
  tier: {
    id: string
    name: string
    price_cents: number
    features: string[]
  }
  addons: {
    label: string
    price_cents: number
  }[]
  isSelectable?: boolean
  isSelected?: boolean
  className?: string
  footer?: ReactNode
}

const BillingTierCard = forwardRef<HTMLDivElement, BillingTierCardProps>(
  (
    {
      tier,
      addons,
      isSelected = false,
      isSelectable = false,
      className,
      footer,
    },
    ref
  ) => {
    const { team } = useDashboard()

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

    const handleRedirectToCheckout = () => {
      redirectToCheckout({
        teamIdOrSlug: team.id,
        tierId: tier.id,
      })
    }

    const tierPrice =
      tier.price_cents > 0
        ? `${formatCurrency(tier.price_cents / 100)}/mo`
        : 'Free'

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
              Current Plan {'<<'}
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
        <div className="border-stroke border-t py-4 px-5 space-y-1">
          <div className="flex items-center justify-between">
            <Label>Price</Label>
            <span className="prose-body-highlight">{tierPrice}</span>
          </div>
        </div>

        {!!addons.length && (
          <div className="border-stroke border-t py-4 px-5 flex flex-col gap-1">
            <Label className="mb-1 block">Bought Add-Ons</Label>
            {addons.map((addon, i) => (
              <div
                key={`addon-${i}`}
                className="flex items-center justify-between"
              >
                <span className="text-fg-secondary">{addon.label}</span>
                <span className="prose-body-highlight">
                  {formatCurrency(addon.price_cents / 100)}/mo
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer (e.g., add-on section or select button) */}
        {footer}

        {isSelectable && !isSelected && (
          <div className="mt-4 px-5 pb-5">
            <Button
              variant="default"
              className="w-full rounded-none"
              size="lg"
              loading={isCheckoutLoading}
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
