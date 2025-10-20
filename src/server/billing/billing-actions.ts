'use server'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient, withTeamIdResolution } from '@/lib/clients/action'
import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { handleDefaultInfraError, returnServerError } from '@/lib/utils/action'
import { CustomerPortalResponse } from '@/types/billing'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// Checkout

const RedirectToCheckoutParamsSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
  tierId: z.string(),
})

export const redirectToCheckoutAction = authActionClient
  .schema(RedirectToCheckoutParamsSchema)
  .use(withTeamIdResolution)
  .metadata({ actionName: 'redirectToCheckout' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, session } = ctx
    const { tierId } = parsedInput

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
  teamIdOrSlug: TeamIdOrSlugSchema,
  type: z.enum(['limit', 'alert']),
  value: z.number().min(1),
})

export const setLimitAction = authActionClient
  .schema(SetLimitParamsSchema)
  .use(withTeamIdResolution)
  .metadata({ actionName: 'setLimit' })
  .action(async ({ parsedInput, ctx }) => {
    const { type, value } = parsedInput
    const { session, teamId } = ctx

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
  teamIdOrSlug: TeamIdOrSlugSchema,
  type: z.enum(['limit', 'alert']),
})

export const clearLimitAction = authActionClient
  .schema(ClearLimitParamsSchema)
  .use(withTeamIdResolution)
  .metadata({ actionName: 'clearLimit' })
  .action(async ({ parsedInput, ctx }) => {
    const { session, teamId } = ctx
    const { type } = parsedInput

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
  teamIdOrSlug: TeamIdOrSlugSchema,
})

export const redirectToCustomerPortal = authActionClient
  .schema(RedirectToCustomerPortalParamsSchema)
  .use(withTeamIdResolution)
  .metadata({ actionName: 'redirectToCustomerPortal' })
  .action(async ({ ctx }) => {
    const { teamId } = ctx
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
