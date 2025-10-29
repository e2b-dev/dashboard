'use server'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'
import { handleDefaultInfraError, returnServerError } from '@/lib/utils/action'
import { resolveTeamSlugInServerComponent } from '@/lib/utils/server'
import {
  AddOnOrderConfirmResponse,
  AddOnOrderCreateResponse,
  CustomerPortalResponse,
} from '@/types/billing'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// Checkout

const RedirectToCheckoutParamsSchema = z.object({
  teamId: z.uuid(),
  tierId: z.string(),
})

export const redirectToCheckoutAction = authActionClient
  .schema(RedirectToCheckoutParamsSchema)
  .metadata({ actionName: 'redirectToCheckout' })
  .action(async ({ parsedInput, ctx }) => {
    const { session } = ctx
    const { teamId, tierId } = parsedInput

    const accessToken = session.access_token

    const res = await fetch(`${process.env.BILLING_API_URL}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...SUPABASE_AUTH_HEADERS(accessToken, teamId),
      },
      body: JSON.stringify({
        teamID: teamId,
        tierID: tierId,
      }),
    })

    if (!res.ok) {
      return handleDefaultInfraError(res.status)
    }

    const data = (await res.json()) as { url: string; error?: string }

    if (data.error) {
      throw new Error(data.error)
    }

    throw redirect(data.url)
  })

// Limits

function typeToKey(type: 'limit' | 'alert') {
  return type === 'limit' ? 'limit_amount_gte' : 'alert_amount_gte'
}

const SetLimitParamsSchema = z.object({
  teamId: z.uuid(),
  type: z.enum(['limit', 'alert']),
  value: z.number().min(1),
})

export const setLimitAction = authActionClient
  .schema(SetLimitParamsSchema)
  .metadata({ actionName: 'setLimit' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, type, value } = parsedInput
    const { session } = ctx

    const res = await fetch(
      `${process.env.BILLING_API_URL}/teams/${teamId}/billing-limits`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...SUPABASE_AUTH_HEADERS(session.access_token),
        },
        body: JSON.stringify({
          [typeToKey(type)]: value,
        }),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return returnServerError(text ?? 'Failed to set limit')
    }

    revalidatePath(`/dashboard/[teamIdOrSlug]/budget`, 'page')
  })

const ClearLimitParamsSchema = z.object({
  teamId: z.uuid(),
  type: z.enum(['limit', 'alert']),
})

export const clearLimitAction = authActionClient
  .schema(ClearLimitParamsSchema)
  .metadata({ actionName: 'clearLimit' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, type } = parsedInput
    const { session } = ctx

    const res = await fetch(
      `${process.env.BILLING_API_URL}/teams/${teamId}/billing-limits/${typeToKey(type)}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...SUPABASE_AUTH_HEADERS(session.access_token),
        },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return returnServerError(text ?? 'Failed to clear limit')
    }

    revalidatePath(`/dashboard/[teamIdOrSlug]/budget`, 'page')
  })

// CUSTOMER PORTAL

const RedirectToCustomerPortalParamsSchema = z.object({
  teamId: z.uuid(),
})

export const redirectToCustomerPortal = authActionClient
  .schema(RedirectToCustomerPortalParamsSchema)
  .metadata({ actionName: 'redirectToCustomerPortal' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput
    const { session } = ctx

    const origin = (await headers()).get('origin')

    const res = await fetch(`${process.env.BILLING_API_URL}/stripe/portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(origin && { Origin: origin }),
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(text ?? 'Failed to redirect to customer portal')
    }

    const data = (await res.json()) as CustomerPortalResponse

    throw redirect(data.url)
  })

// ORDERS - Addon Purchase

const CreateOrderParamsSchema = z.object({
  teamId: z.uuid(),
  itemId: z.union([z.literal('addon_500_sandboxes')]),
})

export const createOrderAction = authActionClient
  .schema(CreateOrderParamsSchema)
  .metadata({ actionName: 'createOrder' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, itemId } = parsedInput
    const { session } = ctx

    const res = await fetch(
      `${process.env.BILLING_API_URL}/teams/${teamId}/orders`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
        body: JSON.stringify({
          items: [
            {
              name: itemId,
              quantity: 1,
            },
          ],
        }),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      throw new Error(text ?? 'Failed to create order')
    }

    const data: AddOnOrderCreateResponse = await res.json()
    return data
  })

const ConfirmOrderParamsSchema = z.object({
  teamId: z.uuid(),
  orderId: z.uuid(),
})

export const confirmOrderAction = authActionClient
  .schema(ConfirmOrderParamsSchema)
  .metadata({ actionName: 'confirmOrder' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, orderId } = parsedInput
    const { session } = ctx

    const res = await fetch(
      `${process.env.BILLING_API_URL}/teams/${teamId}/orders/${orderId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
        },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      throw new Error(text ?? 'Failed to confirm order')
    }

    const data: AddOnOrderConfirmResponse = await res.json()

    const slug = await resolveTeamSlugInServerComponent()
    revalidatePath(`/dashboard/${slug}/billing`, 'page')

    return data
  })
