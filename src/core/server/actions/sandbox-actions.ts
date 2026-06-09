'use server'

import { z } from 'zod'
import { authHeaders } from '@/configs/api'
import {
  authActionClient,
  withTeamSlugResolution,
} from '@/core/server/actions/client'
import { returnServerError } from '@/core/server/actions/utils'
import { infra } from '@/core/shared/clients/api'
import { l } from '@/core/shared/clients/logger/logger'
import { TeamSlugSchema } from '@/core/shared/schemas/team'

const KillSandboxSchema = z.object({
  teamSlug: TeamSlugSchema,
  sandboxId: z.string().min(1, 'Sandbox ID is required'),
})

export const killSandboxAction = authActionClient
  .schema(KillSandboxSchema)
  .metadata({ actionName: 'killSandbox' })
  .use(withTeamSlugResolution)
  .action(async ({ parsedInput, ctx }) => {
    const { sandboxId } = parsedInput
    const { session, teamId } = ctx

    const res = await infra.DELETE('/sandboxes/{sandboxID}', {
      headers: {
        ...authHeaders(session.access_token, teamId),
      },
      params: {
        path: {
          sandboxID: sandboxId,
        },
      },
    })

    if (res.error) {
      const status = res.response.status

      l.error(
        {
          key: 'kill_sandbox_action:infra_error',
          error: res.error,
          user_id: session.user.id,
          team_id: teamId,
          sandbox_id: sandboxId,
          context: {
            status,
          },
        },
        `Failed to kill sandbox: ${res.error.message}`
      )

      if (status === 404) {
        return returnServerError('Sandbox not found')
      }

      return returnServerError('Failed to kill sandbox')
    }
  })
