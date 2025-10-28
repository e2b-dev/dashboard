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
  name: 'addon_500_sandboxes'
  quantity: number
}

interface AddOnOrderCreateResponse {
  id: string
  amount: number
  items: AddOnOrderItem[]
}

interface AddOnOrderConfirmResponse {
  client_secret: string
}

export type {
  AddOnOrderConfirmResponse,
  AddOnOrderCreateResponse,
  AddOnOrderItem,
  BillingLimit,
  CreateTeamsResponse,
  CustomerPortalResponse,
  Invoice,
  UsageResponse,
}
