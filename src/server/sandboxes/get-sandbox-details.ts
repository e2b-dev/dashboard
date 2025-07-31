import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger'
import { handleDefaultInfraError, returnServerError } from '@/lib/utils/action'
import { z } from 'zod'

export const GetSandboxDetailsSchema = z.object({
  teamId: z.string().uuid(),
  sandboxId: z.string(),
})

export const getSandboxDetails = authActionClient
  .schema(GetSandboxDetailsSchema)
  .metadata({ serverFunctionName: 'getSandboxDetails' })
  .action(async ({ parsedInput, ctx }) => {
    const { session } = ctx
    const { teamId, sandboxId } = parsedInput

    const res = await infra.GET('/sandboxes/{sandboxID}', {
      params: {
        path: {
          sandboxID: sandboxId,
        },
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(session.access_token, teamId),
      },
      cache: 'no-store',
    })

    if (res.error) {
      const status = res.response.status

      l.error({
        key: 'get_sandbox_details:infra_error',
        message: res.error.message,
        error: res.error,
        team_id: teamId,
        user_id: session.user.id,
        context: {
          status,
          sandboxId,
        },
      })

      if (status === 404) {
        return returnServerError('SANDBOX_NOT_FOUND')
      }

      return handleDefaultInfraError(status)
    }

    return res.data
  })
