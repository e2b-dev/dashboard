'use server'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger/logger'
import { returnServerError } from '@/lib/utils/action'
import { z } from 'zod'

const KillSandboxSchema = z.object({
  teamId: z.uuid({ message: 'Team ID is required' }),
  sandboxId: z.string().min(1, 'Sandbox ID is required'),
})

export const killSandboxAction = authActionClient
  .schema(KillSandboxSchema)
  .metadata({ actionName: 'killSandbox' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, sandboxId } = parsedInput
    const { session } = ctx

    const res = await infra.DELETE('/sandboxes/{sandboxID}', {
      headers: {
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
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
