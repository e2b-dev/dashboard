'use server'

import { USER_ACCESS_TOKEN_HEADER } from '@/configs/constants'
import { PROTECTED_URLS } from '@/configs/urls'
import {
  checkAuthenticated,
  getUserAccessToken,
  guard,
} from '@/lib/utils/server'
import { E2BError, UnknownError } from '@/types/errors'
import { revalidateTag } from 'next/cache'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// Checkout

const RedirectToCheckoutParamsSchema = z.object({
  teamId: z.string().uuid(),
  tierId: z.string(),
})

export const redirectToCheckoutAction = guard(
  RedirectToCheckoutParamsSchema,
  async (params) => {
    await checkAuthenticated()

    const res = await fetch(`${process.env.BILLING_API_URL}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        teamID: params.teamId,
        tierID: params.tierId,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(text ?? 'Failed to redirect to checkout')
    }

    const data = (await res.json()) as { url: string; error?: string }

    if (data.error) {
      throw new Error(data.error)
    }

    throw redirect(data.url)
  }
)

// Limits

function typeToKey(type: 'limit' | 'alert') {
  return type === 'limit' ? 'limit_amount_gte' : 'alert_amount_gte'
}

const SetLimitParamsSchema = z.object({
  teamId: z.string().uuid(),
  type: z.enum(['limit', 'alert']),
  value: z.number().min(1),
})

export const setLimitAction = guard(SetLimitParamsSchema, async (params) => {
  const { user } = await checkAuthenticated()

  const accessToken = await getUserAccessToken(user.id)

  const res = await fetch(
    `${process.env.BILLING_API_URL}/teams/${params.teamId}/billing-limits`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        [USER_ACCESS_TOKEN_HEADER]: accessToken,
      },
      body: JSON.stringify({
        [typeToKey(params.type)]: params.value,
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new E2BError('BILLING_API_ERROR', text ?? 'Failed to set limit')
  }

  revalidatePath(`/dashboard/[teamIdOrSlug]/budget`)
})

const ClearLimitParamsSchema = z.object({
  teamId: z.string().uuid(),
  type: z.enum(['limit', 'alert']),
})

export const clearLimitAction = guard(
  ClearLimitParamsSchema,
  async (params) => {
    const { user } = await checkAuthenticated()

    const accessToken = await getUserAccessToken(user.id)

    const res = await fetch(
      `${process.env.BILLING_API_URL}/teams/${params.teamId}/billing-limits/${typeToKey(params.type)}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          [USER_ACCESS_TOKEN_HEADER]: accessToken,
        },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      throw new E2BError('BILLING_API_ERROR', text ?? 'Failed to clear limit')
    }

    revalidatePath(`/dashboard/[teamIdOrSlug]/budget`)
  }
)
