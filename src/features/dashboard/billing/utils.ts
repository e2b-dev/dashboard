import { l } from '@/lib/clients/logger/logger'
import { TeamItems } from '@/types/billing.types'
import { ADDON_500_SANDBOXES_ID, TIER_BASE_ID, TIER_PRO_ID } from './constants'
import { BillingAddonData, BillingTierData } from './types'

export const MIB_TO_GB = 1024

export function formatMibToGb(mib: number): string {
  const gb = Math.round(mib / MIB_TO_GB)
  return `${gb}GB`
}

export function formatHours(hours: number): string {
  return `${hours}h`
}

export function formatAddonQuantity(
  quantity: number,
  priceCents: number
): Array<{ label: string; price_cents: number }> {
  return Array.from({ length: quantity }, () => ({
    label: '+500 Concurrent Sandboxes',
    price_cents: priceCents,
  }))
}

export function extractTierData(items: TeamItems): BillingTierData {
  const { tiers } = items

  const base = tiers.available.find((t) => t.id === TIER_BASE_ID)
  const pro = tiers.available.find((t) => t.id === TIER_PRO_ID)
  const selected = tiers.available.find((t) => t.id === tiers.current)

  if (!selected) {
    l.error(
      {
        key: 'billing_page:missing_selected_tier',
        context: {
          currentTier: tiers.current,
          availableTiers: tiers.available?.map((t) => t.id) || [],
        },
      },
      'billing_page: Could not find selected tier in available tiers'
    )
  }

  if (!pro || !base) {
    l.error(
      {
        key: 'billing_page:missing_expected_tiers',
        context: {
          pro: !!pro,
          base: !!base,
          availableTiers: tiers.available?.map((t) => t.id) || [],
        },
      },
      `billing_page: Expected "pro" and "base" tiers, found pro: ${!!pro}, base: ${!!base}`
    )
  }

  return { base, pro, selected }
}

export function extractAddonData(
  items: TeamItems,
  selectedTierId?: string
): BillingAddonData {
  const { addons } = items

  const current = addons.current?.find((a) => a.id === ADDON_500_SANDBOXES_ID)
  const available = addons.available.find(
    (a) => a.id === ADDON_500_SANDBOXES_ID
  )

  const isOnProTier = selectedTierId === TIER_PRO_ID
  const canPurchase = isOnProTier && !!available

  return { current, available, canPurchase }
}
