import { z } from 'zod'
import { authActionClient } from '@/lib/clients/action'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { ERROR_CODES } from '@/configs/logs'
import { logError } from '@/lib/clients/logger'
import { returnServerError } from '@/lib/utils/action'
import Sandbox from 'e2b'

export const GetSandboxRootSchema = z.object({
  teamId: z.string().uuid(),
  sandboxId: z.string(),
  rootPath: z.string().default('/'),
})

export const getSandboxRoot = authActionClient
  .schema(GetSandboxRootSchema)
  .metadata({ serverFunctionName: 'getSandboxRoot' })
  .action(async ({ parsedInput, ctx }) => {
    const { teamId, sandboxId, rootPath } = parsedInput
    const { session } = ctx

    const headers = SUPABASE_AUTH_HEADERS(session.access_token, teamId)

    try {
      const sandbox = await Sandbox.connect(sandboxId, {
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        headers,
      })

      return {
        entries: await sandbox.files.list(rootPath),
      }
    } catch (err) {
      logError(ERROR_CODES.E2B_SDK, 'files.list', err)
      return returnServerError('Failed to list root directory.')
    }
  })
