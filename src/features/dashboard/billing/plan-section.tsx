import { TeamLimits } from '@/server/team/get-team-limits'
import { ConcurrentSandboxAddonSection } from './concurrent-sandboxes-addon-section'
import { TIER_NAMES } from './constants'
import BillingTierCard from './tier-card'
import { BillingAddonData, BillingTierData } from './types'
import { formatAddonQuantity, generateTierLimitFeatures } from './utils'

interface PlanSectionProps {
  tierData: BillingTierData
  addonData: BillingAddonData
  limits: TeamLimits
}

export function PlanSection({ tierData, addonData, limits }: PlanSectionProps) {
  const { base, pro, selected } = tierData
  const {
    current: currentAddon,
    available: availableAddon,
    canPurchase,
  } = addonData

  const addonDisplayItems = currentAddon?.quantity
    ? formatAddonQuantity(currentAddon.quantity, currentAddon.price_cents)
    : []

  return (
    <div className="mt-3 flex flex-col gap-12 overflow-x-auto max-lg:mb-6 lg:flex-row">
      {base && (
        <BillingTierCard
          tier={{
            id: base.id,
            name: TIER_NAMES[base.id as keyof typeof TIER_NAMES] || 'Hobby',
            price_cents: base.price_cents,
            features: [
              'Community support',
              ...generateTierLimitFeatures(base.limits),
            ],
          }}
          addons={[]}
          isSelected={base.id === selected?.id}
          className="min-w-[280px] shadow-xl lg:w-1/2 xl:min-w-0 flex-1"
        />
      )}

      {pro && (
        <BillingTierCard
          tier={{
            id: pro.id,
            name: TIER_NAMES[pro.id as keyof typeof TIER_NAMES] || 'Pro',
            price_cents: pro.price_cents,
            features: [
              'Everything in the Hobby tier',
              ...generateTierLimitFeatures(pro.limits),
            ],
          }}
          addons={addonDisplayItems}
          isSelectable
          isSelected={pro.id === selected?.id}
          className="min-w-[280px] shadow-xl lg:w-1/2 xl:min-w-0 flex-1"
          footer={
            canPurchase && availableAddon ? (
              <ConcurrentSandboxAddonSection
                priceCents={availableAddon.price_cents}
                currentConcurrentSandboxesLimit={limits.concurrentInstances}
              />
            ) : undefined
          }
        />
      )}
    </div>
  )
}
