import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import type {
  AddOnOrderConfirmResponse,
  AddOnOrderCreateResponse,
  BillingLimit,
  CustomerPortalResponse,
  Invoice,
  PaymentMethodsCustomerSession,
  TeamItems,
  UsageResponse,
} from '@/core/modules/billing/models'
import { repoErrorFromHttp } from '@/core/shared/errors'
import type { TeamRequestScope } from '@/core/shared/repository-scope'
import { err, ok, type RepoResult } from '@/core/shared/result'

type BillingRepositoryDeps = {
  billingApiUrl: string
}

export type BillingScope = TeamRequestScope

export interface BillingRepository {
  createCheckout(tierId: string): Promise<RepoResult<{ url: string }>>
  createCustomerPortalSession(
    origin?: string | null
  ): Promise<RepoResult<CustomerPortalResponse>>
  getItems(): Promise<RepoResult<TeamItems>>
  getUsage(): Promise<RepoResult<UsageResponse>>
  getInvoices(): Promise<RepoResult<Invoice[]>>
  getLimits(): Promise<RepoResult<BillingLimit>>
  setLimit(key: string, value: number): Promise<RepoResult<void>>
  clearLimit(key: string): Promise<RepoResult<void>>
  createOrder(itemId: string): Promise<RepoResult<AddOnOrderCreateResponse>>
  confirmOrder(orderId: string): Promise<RepoResult<AddOnOrderConfirmResponse>>
  getCustomerSession(): Promise<RepoResult<PaymentMethodsCustomerSession>>
}

async function parseText(response: Response): Promise<string> {
  return (await response.text()) || 'Request failed'
}

export function createBillingRepository(
  scope: BillingScope,
  deps: BillingRepositoryDeps = {
    billingApiUrl: process.env.BILLING_API_URL ?? '',
  }
): BillingRepository {
  return {
    async createCheckout(tierId) {
      const res = await fetch(`${deps.billingApiUrl}/checkouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...SUPABASE_AUTH_HEADERS(scope.accessToken, scope.teamId),
        },
        body: JSON.stringify({
          teamID: scope.teamId,
          tierID: tierId,
        }),
      })

      if (!res.ok) {
        return err(repoErrorFromHttp(res.status, await parseText(res)))
      }

      const data = (await res.json()) as { url: string; error?: string }
      if (data.error) {
        return err(repoErrorFromHttp(500, data.error))
      }

      return ok({ url: data.url })
    },
    async createCustomerPortalSession(origin) {
      const res = await fetch(`${deps.billingApiUrl}/stripe/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(origin ? { Origin: origin } : {}),
          ...SUPABASE_AUTH_HEADERS(scope.accessToken, scope.teamId),
        },
      })

      if (!res.ok) {
        return err(repoErrorFromHttp(res.status, await parseText(res)))
      }

      return ok((await res.json()) as CustomerPortalResponse)
    },
    async getItems() {
      const res = await fetch(
        `${deps.billingApiUrl}/teams/${scope.teamId}/items`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...SUPABASE_AUTH_HEADERS(scope.accessToken, scope.teamId),
          },
        }
      )

      if (!res.ok) {
        return err(repoErrorFromHttp(res.status, await parseText(res)))
      }

      return ok((await res.json()) as TeamItems)
    },
    async getUsage() {
      const res = await fetch(
        `${deps.billingApiUrl}/v2/teams/${scope.teamId}/usage`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...SUPABASE_AUTH_HEADERS(scope.accessToken, scope.teamId),
          },
        }
      )

      if (!res.ok) {
        return err(repoErrorFromHttp(res.status, await parseText(res)))
      }

      const responseData = (await res.json()) as UsageResponse
      return ok({
        ...responseData,
        hour_usages: responseData.hour_usages.map((hour) => ({
          ...hour,
          timestamp: hour.timestamp * 1000,
        })),
      })
    },
    async getInvoices() {
      const res = await fetch(
        `${deps.billingApiUrl}/teams/${scope.teamId}/invoices`,
        {
          headers: {
            ...SUPABASE_AUTH_HEADERS(scope.accessToken, scope.teamId),
          },
        }
      )

      if (!res.ok) {
        return err(repoErrorFromHttp(res.status, await parseText(res)))
      }

      return ok((await res.json()) as Invoice[])
    },
    async getLimits() {
      const res = await fetch(
        `${deps.billingApiUrl}/teams/${scope.teamId}/billing-limits`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...SUPABASE_AUTH_HEADERS(scope.accessToken, scope.teamId),
          },
        }
      )

      if (!res.ok) {
        return err(repoErrorFromHttp(res.status, await parseText(res)))
      }

      const data = (await res.json()) as Partial<BillingLimit>
      return ok({
        limit_amount_gte: data.limit_amount_gte ?? null,
        alert_amount_gte: data.alert_amount_gte ?? null,
      })
    },
    async setLimit(key, value) {
      const res = await fetch(
        `${deps.billingApiUrl}/teams/${scope.teamId}/billing-limits`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...SUPABASE_AUTH_HEADERS(scope.accessToken, scope.teamId),
          },
          body: JSON.stringify({
            [key]: value,
          }),
        }
      )

      if (!res.ok) {
        return err(repoErrorFromHttp(res.status, await parseText(res)))
      }

      return ok(undefined)
    },
    async clearLimit(key) {
      const res = await fetch(
        `${deps.billingApiUrl}/teams/${scope.teamId}/billing-limits/${key}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...SUPABASE_AUTH_HEADERS(scope.accessToken, scope.teamId),
          },
        }
      )

      if (!res.ok) {
        return err(repoErrorFromHttp(res.status, await parseText(res)))
      }

      return ok(undefined)
    },
    async createOrder(itemId) {
      const res = await fetch(
        `${deps.billingApiUrl}/teams/${scope.teamId}/orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...SUPABASE_AUTH_HEADERS(scope.accessToken, scope.teamId),
          },
          body: JSON.stringify({
            items: [{ name: itemId, quantity: 1 }],
          }),
        }
      )

      if (!res.ok) {
        return err(repoErrorFromHttp(res.status, await parseText(res)))
      }

      return ok((await res.json()) as AddOnOrderCreateResponse)
    },
    async confirmOrder(orderId) {
      const res = await fetch(
        `${deps.billingApiUrl}/teams/${scope.teamId}/orders/${orderId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...SUPABASE_AUTH_HEADERS(scope.accessToken, scope.teamId),
          },
        }
      )

      if (!res.ok) {
        return err(repoErrorFromHttp(res.status, await parseText(res)))
      }

      return ok((await res.json()) as AddOnOrderConfirmResponse)
    },
    async getCustomerSession() {
      const res = await fetch(
        `${deps.billingApiUrl}/teams/${scope.teamId}/payment-methods/customer-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...SUPABASE_AUTH_HEADERS(scope.accessToken, scope.teamId),
          },
        }
      )

      if (!res.ok) {
        return err(repoErrorFromHttp(res.status, await parseText(res)))
      }

      return ok((await res.json()) as PaymentMethodsCustomerSession)
    },
  }
}
