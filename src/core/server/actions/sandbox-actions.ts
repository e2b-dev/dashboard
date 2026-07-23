'use server'

import { z } from 'zod'
import { apiKeyHeaders } from '@/configs/api'
import { authActionClient } from '@/core/server/actions/client'
import { returnServerError } from '@/core/server/actions/utils'
import { infra } from '@/core/shared/clients/api'
import { l } from '@/core/shared/clients/logger/logger'

const KillSandboxSchema = z.object({
  sandboxId: z.string().min(1, 'Sandbox ID is required'),
})

export const killSandboxAction = authActionClient
  .schema(KillSandboxSchema)
  .metadata({ actionName: 'killSandbox' })
  .action(async ({ parsedInput, ctx }) => {
    const { sandboxId } = parsedInput
    const { apiKey } = ctx

    const res = await infra.DELETE('/sandboxes/{sandboxID}', {
      headers: {
        ...apiKeyHeaders(apiKey),
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
