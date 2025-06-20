// src/server/sandboxes/get-sandbox-root.ts
import { z } from 'zod'
import { authActionClient } from '@/lib/clients/action'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { ERROR_CODES } from '@/configs/logs'
import { logError } from '@/lib/clients/logger'
import { returnServerError } from '@/lib/utils/action'
import { SandboxPool } from '@/lib/clients/sandbox-pool'
import { FsFileType } from '@/types/filesystem'
import { FileType } from 'e2b'

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

    let entries
    try {
      const sandbox = await SandboxPool.acquire(sandboxId, {
        headers,
      })
      const raw = await sandbox.files.list(rootPath)
      entries = raw.map((e) => ({
        name: e.name,
        path: e.path,
        type:
          e.type === FileType.DIR
            ? ('dir' as FsFileType)
            : ('file' as FsFileType),
      }))
    } catch (err) {
      logError(ERROR_CODES.INFRA, 'files.list', 500, err)
      return returnServerError('Failed to list sandbox directory.')
    } finally {
      await SandboxPool.release(sandboxId)
    }

    return {
      entries,
    }
  })
