'use server'

import Sandbox, { TimeoutError } from 'e2b'
import { z } from 'zod'
import { authHeaders } from '@/configs/api'
import {
  authActionClient,
  withTeamSlugResolution,
} from '@/core/server/actions/client'
import { returnServerError } from '@/core/server/actions/utils'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { SandboxIdSchema } from '@/core/shared/schemas/api'
import { TeamSlugSchema } from '@/core/shared/schemas/team'
import {
  TERMINAL_SANDBOX_TIMEOUT_ERROR,
  TERMINAL_SANDBOX_TIMEOUT_MS,
} from '@/features/dashboard/terminal/constants'
import { normalizeTerminalTemplate } from '@/features/dashboard/terminal/template'

const OpenTerminalSandboxSchema = z.object({
  teamSlug: TeamSlugSchema,
  template: z.string().min(1, 'Template is required'),
  sandboxId: SandboxIdSchema.optional(),
  requestTimeoutMs: z.number().int().positive().optional(),
})

/**
 * Sandbox-scoped credentials returned to the client. These authenticate only
 * against the sandbox's envd daemon (PTY/filesystem) — the account-level
 * access token used for the control-plane create/connect never leaves the
 * server.
 */
export interface TerminalSandboxConnection {
  sandboxId: string
  sandboxDomain?: string
  envdVersion: string
  envdAccessToken: string
}

/**
 * Create (or connect to) a terminal sandbox server-side. The control-plane
 * calls (`Sandbox.create`/`Sandbox.connect`) require the user's account-level
 * access token, so they must run here; the client then builds an envd-only
 * client from the returned sandbox-scoped credentials.
 */
export const openTerminalSandboxAction = authActionClient
  .schema(OpenTerminalSandboxSchema)
  .metadata({ actionName: 'openTerminalSandbox' })
  .use(withTeamSlugResolution)
  .action(async ({ parsedInput, ctx }): Promise<TerminalSandboxConnection> => {
    const { sandboxId, template, requestTimeoutMs } = parsedInput
    const { session, teamId } = ctx

    const normalizedTemplate = normalizeTerminalTemplate(template)
    if (!normalizedTemplate) {
      return returnServerError('Invalid terminal template')
    }

    const connectionOpts = {
      apiUrl: process.env.NEXT_PUBLIC_INFRA_API_URL,
      domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
      sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL,
      apiHeaders: {
        ...authHeaders(session.access_token, teamId),
      },
    }

    let resolvedSandboxId: string
    try {
      if (sandboxId) {
        const sandbox = await Sandbox.connect(sandboxId, {
          ...connectionOpts,
          timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS,
          requestTimeoutMs,
        })
        resolvedSandboxId = sandbox.sandboxId
      } else {
        const sandbox = await Sandbox.create(normalizedTemplate, {
          ...connectionOpts,
          timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS,
          lifecycle: {
            onTimeout: 'pause',
            autoResume: true,
          },
          metadata: {
            source: 'dashboard-terminal',
            template: normalizedTemplate,
            userId: session.user.id,
          },
        })
        resolvedSandboxId = sandbox.sandboxId
      }
    } catch (error) {
      l.warn(
        {
          key: 'open_terminal_sandbox_action:control_plane_error',
          error: serializeErrorForLog(error),
          user_id: session.user.id,
          team_id: teamId,
          sandbox_id: sandboxId,
        },
        `Failed to open terminal sandbox: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )

      // Surface timeouts with a stable sentinel so the client can rethrow a
      // TimeoutError and let the attach-retry logic recognize them.
      if (error instanceof TimeoutError) {
        return returnServerError(TERMINAL_SANDBOX_TIMEOUT_ERROR, {
          cause: error,
        })
      }

      return returnServerError(
        sandboxId
          ? 'Failed to connect to terminal sandbox'
          : 'Failed to create terminal sandbox',
        { cause: error }
      )
    }

    // `Sandbox.create`/`connect` build a full SDK instance but only expose the
    // sandbox id/domain publicly; fetch the envd credentials via the public
    // info endpoint rather than reading the SDK's internal fields.
    const info = await Sandbox.getFullInfo(resolvedSandboxId, connectionOpts)

    if (!info.envdAccessToken) {
      return returnServerError('Sandbox is not ready for terminal access')
    }

    return {
      sandboxId: resolvedSandboxId,
      sandboxDomain: info.sandboxDomain,
      envdVersion: info.envdVersion,
      envdAccessToken: info.envdAccessToken,
    }
  })
