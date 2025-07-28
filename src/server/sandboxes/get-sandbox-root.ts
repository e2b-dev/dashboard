import { z } from 'zod'
import { authActionClient } from '@/lib/clients/action'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { returnServerError } from '@/lib/utils/action'
import Sandbox from 'e2b'
import { l } from '@/lib/clients/logger'

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
      l.error('get_sandbox_root:unexpected_error', err)
      return returnServerError('Failed to list root directory.')
    }
  })
