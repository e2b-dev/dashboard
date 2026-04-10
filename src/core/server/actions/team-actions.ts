'use server'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import type { CreateTeamsResponse } from '@/core/modules/billing/models'
import { CreateTeamSchema } from '@/core/modules/teams/schemas'
import { authActionClient } from '@/core/server/actions/client'
import {
  handleDefaultInfraError,
  returnServerError,
} from '@/core/server/actions/utils'

export const createTeamAction = authActionClient
  .schema(CreateTeamSchema)
  .metadata({ actionName: 'createTeam' })
  .action(async ({ parsedInput, ctx }) => {
    const { name } = parsedInput
    const { session } = ctx

    const response = await fetch(`${process.env.BILLING_API_URL}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...SUPABASE_AUTH_HEADERS(session.access_token),
      },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      const status = response.status
      const error = await response.json()

      if (status === 400) {
        return returnServerError(error?.message ?? 'Failed to create team')
      }

      return handleDefaultInfraError(status, error)
    }

    const data = (await response.json()) as CreateTeamsResponse

    return data
  })
