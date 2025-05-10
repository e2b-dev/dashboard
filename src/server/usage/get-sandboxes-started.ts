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
          DATE(timestamp_agg_start) as date,
          SUM(sandbox_count) as count
      FROM
          billing.agg_team_usage
      WHERE
          team_id = ${teamId}
      GROUP BY
          DATE(timestamp_agg_start)
      ORDER BY
          date;
    `

    return {
      sandboxesStarted: result.map(({ date, count }) => ({
        date: new Date(date),
        count: Number(count),
      })),
    }
  })
