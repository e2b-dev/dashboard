import { ADDON_500_SANDBOXES_ID } from '@/features/dashboard/billing/constants'

interface Invoice {
  cost: number
  paid: boolean
  url: string
  date_created: string
}

interface BillingLimit {
  limit_amount_gte: number | null
  alert_amount_gte: number | null
}

interface CustomerPortalResponse {
  url: string
}

interface UsageResponse {
  credits: number
  day_usages: {
    date: string
    sandbox_count: number
    cpu_hours: number
    ram_gib_hours: number
    price_for_ram: number
    price_for_cpu: number
  }[]
}

interface CreateTeamsResponse {
  id: string
  slug: string
}

interface AddOnOrderItem {
  name: typeof ADDON_500_SANDBOXES_ID
  quantity: number
}

interface AddOnOrderCreateResponse {
  id: string
  amount_due: number
  items: AddOnOrderItem[]
}

interface AddOnOrderConfirmResponse {
  client_secret: string
}

interface PaymentMethodsCustomerSession {
  client_secret: string
}

interface TierLimits {
  sandbox_concurrency: number
  max_cpu: number
  max_ram_mib: number
  max_sandbox_duration_hours: number
  disk_size_mib: number
}

interface TierInfo {
  id: string
  name: string
  price_cents: number
  limits?: TierLimits
}

interface AddonInfo {
  id: string
  name: string
  price_cents: number
  quantity?: number
}

interface TeamAddons {
  current: AddonInfo[]
  available: AddonInfo[]
}

interface TeamTiers {
  current: string
  available: TierInfo[]
}

interface TeamItems {
  tiers: TeamTiers
  addons: TeamAddons
}

export type {
  AddOnOrderConfirmResponse,
  AddOnOrderCreateResponse,
  AddOnOrderItem,
  AddonInfo,
  BillingLimit,
  CreateTeamsResponse,
  CustomerPortalResponse,
  Invoice,
  PaymentMethodsCustomerSession,
  TeamAddons,
  TeamItems,
  TeamTiers,
  TierInfo,
  TierLimits,
  UsageResponse,
}
