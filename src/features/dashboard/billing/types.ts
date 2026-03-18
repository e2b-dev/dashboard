import type { TeamItems } from '@/core/domains/billing/models'
import type { TeamLimits } from '@/core/server/functions/team/get-team-limits'

export interface BillingData {
  items: TeamItems
  limits: TeamLimits
}

export interface BillingTierData {
  base: TeamItems['tiers']['available'][0] | undefined
  pro: TeamItems['tiers']['available'][0] | undefined
  selected: TeamItems['tiers']['available'][0] | undefined
}

export interface BillingAddonData {
  current: TeamItems['addons']['current'][0] | undefined
  available: TeamItems['addons']['available'][0] | undefined
  canPurchase: boolean
}
