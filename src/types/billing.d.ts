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
  day_usages: {
    date: string
    sandbox_count: number
  }[]
}

export type { Invoice, BillingLimit, CustomerPortalResponse, UsageResponse }
