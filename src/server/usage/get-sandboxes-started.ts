import 'server-cli-only'

import { checkUserTeamAuthorization } from '@/lib/utils/server'
import pg from '@/lib/clients/pg'
import { logDebug } from '@/lib/clients/logger'
import { z } from 'zod'
import { authActionClient } from '@/lib/clients/action'
import { returnServerError } from '@/lib/utils/action'

const GetSandboxesStartedSchema = z.object({
  teamId: z.string().uuid(),
})

export const getSandboxesStarted = authActionClient
  .schema(GetSandboxesStartedSchema)
  .metadata({ serverFunctionName: 'getSandboxesStarted' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput
    const { session } = ctx

    const isAuthorized = await checkUserTeamAuthorization(
      session.user.id,
      teamId
    )

    if (!isAuthorized) {
      return returnServerError('Forbidden')
    }

    const result = await pg`
      SELECT
          DATE(created_at) as date,
          COUNT(*) as count
      FROM
          billing.sandbox_logs
      WHERE
          team_id = ${teamId}
      GROUP BY
          DATE(created_at)
      ORDER BY
          date;
    `

    logDebug('result', result)

    return {
      sandboxesStarted: result.map(({ date, count }) => ({
        date: new Date(date),
        count: Number(count),
      })),
    }
  })
