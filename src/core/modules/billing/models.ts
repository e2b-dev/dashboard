export interface Invoice {
  cost: number
  paid: boolean
  url: string
  date_created: string
  credits_used: number
}

export interface BillingLimit {
  limit_amount_gte: number | null
  alert_amount_gte: number | null
}

export interface CustomerPortalResponse {
  url: string
}

export interface UsageResponse {
  credits: number
  day_usages: {
    date: string
    sandbox_count: number
    cpu_hours: number
    ram_gib_hours: number
    price_for_ram: number
    price_for_cpu: number
  }[]
  hour_usages: {
    timestamp: number
    sandbox_count: number
    cpu_hours: number
    ram_gib_hours: number
    price_for_ram: number
    price_for_cpu: number
  }[]
}

export interface CreateTeamsResponse {
  id: string
  slug: string
}

export interface AddOnOrderItem {
  name: string
  quantity: number
}

export interface AddOnOrderCreateResponse {
  id: string
  amount_due: number
  items: AddOnOrderItem[]
}

export interface AddOnOrderConfirmResponse {
  client_secret: string
}

export interface PaymentMethodsCustomerSession {
  client_secret: string
}

export interface PaymentMethodsSession {
  client_secret: string
  setup_intent_client_secret: string
}

export interface TierLimits {
  sandbox_concurrency: number
  max_cpu: number
  max_ram_mib: number
  max_sandbox_duration_hours: number
  disk_size_mib: number
}

export interface TierInfo {
  id: string
  name: string
  price_cents: number
  limits?: TierLimits
}

export interface AddonInfo {
  id: string
  name: string
  price_cents: number
  quantity?: number
}

export interface TeamAddons {
  current: AddonInfo[]
  available: AddonInfo[]
}

export interface TeamTiers {
  current: string
  available: TierInfo[]
}

export interface TeamItems {
  tiers: TeamTiers
  addons: TeamAddons
}
