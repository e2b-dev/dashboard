import { l } from '@/lib/clients/logger/logger'
import { TeamItems, TierLimits } from '@/types/billing.types'
import { ADDON_500_SANDBOXES_ID, TIER_BASE_ID, TIER_PRO_ID } from './constants'
import { BillingAddonData, BillingTierData } from './types'

// === Pure Formatters ===

/**
 * Generates a list of tier limit features for display
 */
export function generateTierLimitFeatures(limits?: TierLimits): string[] {
  if (!limits) return []

  const pluralize = (count: number, singular: string) =>
    count === 1 ? singular : `${singular}s`

  return [
    `Up to ${limits.max_sandbox_duration_hours} ${pluralize(limits.max_sandbox_duration_hours, 'hour')} sandbox session length`,
    `Up to ${limits.sandbox_concurrency} concurrently running sandboxes`,
    `Up to ${limits.max_cpu} vCPUs per sandbox`,
    `Up to ${(limits.max_ram_mib || 0) / 1024} GB RAM per sandbox`,
    `${(limits.disk_size_mib || 0) / 1024} GB disk per sandbox`,
  ]
}

/**
 * Formats addon quantity as an array of addon display items
 */
export function formatAddonQuantity(
  quantity: number,
  priceCents: number
): Array<{ label: string; price_cents: number }> {
  return Array.from({ length: quantity }, () => ({
    label: '+500 Concurrent Sandboxes',
    price_cents: priceCents,
  }))
}

// === Data Extraction (with side effects) ===

/**
 * Extracts and validates tier information from billing items
 */
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

/**
 * Extracts addon information and determines purchase eligibility
 */
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
