import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'
import { l } from '@/lib/clients/logger'
import { returnServerError } from '@/lib/utils/action'
import Sandbox, { NotFoundError } from 'e2b'
import { z } from 'zod'

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

    let sandbox: Sandbox | null = null

    try {
      sandbox = await Sandbox.connect(sandboxId, {
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        headers,
      })

      return {
        entries: await sandbox.files.list(rootPath, {
          user: 'root',
          requestTimeoutMs: 20_000,
        }),
      }
    } catch (err) {
      if (err instanceof NotFoundError && sandbox) {
        l.warn('get_sandbox_root:not_found', err)
        return returnServerError('ROOT_PATH_NOT_FOUND')
      }

      l.error('get_sandbox_root:unexpected_error', err)

      return returnServerError('Failed to list root directory.')
    }
  })
