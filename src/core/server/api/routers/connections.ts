import { TRPCError } from '@trpc/server'
import { Sandbox } from 'e2b'
import { z } from 'zod'
import { authHeaders } from '@/configs/api'
import {
  DevinConnectionError,
  discoverDevinAccount,
  normalizeDevinApiUrl,
} from '@/core/modules/devin-outposts/client.server'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedTeamProcedure } from '@/core/server/trpc/procedures'
import { l } from '@/core/shared/clients/logger/logger'
import { TERMINAL_SANDBOX_TIMEOUT_MS } from '@/features/dashboard/terminal/constants'

const DEFAULT_DEVIN_TEMPLATE = 'devin-outposts'

export const connectionsRouter = createTRPCRouter({
  discoverDevin: protectedTeamProcedure
    .input(
      z.object({
        apiKey: z.string().trim().min(1).max(4096),
        apiUrl: z.string().trim().min(1).max(512),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await discoverDevinAccount(input.apiUrl, input.apiKey)
      } catch (error) {
        if (error instanceof DevinConnectionError) {
          throw new TRPCError({
            code:
              error.kind === 'credentials'
                ? 'UNAUTHORIZED'
                : error.kind === 'url'
                  ? 'BAD_REQUEST'
                  : 'BAD_GATEWAY',
            message: error.message,
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not check the Devin account',
        })
      }
    }),

  launchDevinWorker: protectedTeamProcedure
    .input(
      z.object({
        apiUrl: z.string().trim().min(1).max(512),
        operationId: z.string().uuid(),
        outpostsToken: z.string().trim().min(1).max(4096),
        poolId: z.string().trim().min(1).max(256),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let apiUrl: string
      try {
        apiUrl = normalizeDevinApiUrl(input.apiUrl)
      } catch (error) {
        if (error instanceof DevinConnectionError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
        }
        throw error
      }
      const acceptorId = `e2b-dashboard-${input.operationId.replaceAll('-', '').slice(0, 16)}`
      const stateDir = `/home/user/.devin/worker/sessions/${acceptorId}`
      const template =
        process.env.DEVIN_OUTPOSTS_TEMPLATE || DEFAULT_DEVIN_TEMPLATE
      const connectionOpts = {
        apiUrl: process.env.NEXT_PUBLIC_INFRA_API_URL,
        domain: process.env.NEXT_PUBLIC_E2B_DOMAIN,
        sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL,
        headers: authHeaders(ctx.session.access_token, ctx.teamId),
      }
      let sandbox: Sandbox | undefined

      try {
        const existingLaunches = Sandbox.list({
          ...connectionOpts,
          limit: 1,
          query: {
            metadata: {
              devinLaunchOperationId: input.operationId,
              source: 'dashboard-devin-outposts',
              userId: ctx.session.user.id,
            },
          },
        })
        const [existingLaunch] = await existingLaunches.nextItems()
        if (existingLaunch) {
          return {
            acceptorId,
            reused: true,
            sandboxId: existingLaunch.sandboxId,
            workerPid: null,
          }
        }

        sandbox = await Sandbox.create(template, {
          ...connectionOpts,
          timeoutMs: TERMINAL_SANDBOX_TIMEOUT_MS,
          lifecycle: { onTimeout: 'pause', autoResume: true },
          envs: {
            DEVIN_API_URL: apiUrl,
            DEVIN_OUTPOSTS_TOKEN: input.outpostsToken,
            DEVIN_OUTPOST_POOL_ID: input.poolId,
            DEVIN_REMOTE_STATE_DIR: stateDir,
            DEVIN_WORKER_ACCEPTOR_ID: acceptorId,
          },
          metadata: {
            devinLaunchOperationId: input.operationId,
            source: 'dashboard-devin-outposts',
            userId: ctx.session.user.id,
          },
        })

        const result = await sandbox.commands.run(
          [
            `mkdir -p ${shellQuote(stateDir)}`,
            'cd /mnt/repos',
            `nohup devin worker start --api-url=${shellQuote(apiUrl)} --pool=${shellQuote(input.poolId)} --acceptor-id=${shellQuote(acceptorId)} </dev/null > /home/user/devin-worker.log 2>&1 &`,
            'worker_pid=$!',
            'sleep 2',
            'kill -0 "$worker_pid" 2>/dev/null',
            'printf "%s" "$worker_pid"',
          ].join(' && '),
          { timeoutMs: 30_000 }
        )
        if (result.exitCode !== 0 || !/^\d+$/.test(result.stdout.trim())) {
          throw new Error('worker_start_failed')
        }

        return {
          acceptorId,
          reused: false,
          sandboxId: sandbox.sandboxId,
          workerPid: result.stdout.trim(),
        }
      } catch {
        let orphanedSandboxId: string | undefined
        if (sandbox) {
          try {
            await sandbox.kill()
          } catch {
            orphanedSandboxId = sandbox.sandboxId
            l.error(
              {
                key: 'devin:worker_sandbox_cleanup_failed',
                sandbox_id: sandbox.sandboxId,
                team_id: ctx.teamId,
                user_id: ctx.session.user.id,
              },
              '[Devin] Failed to clean up worker sandbox after launch failure'
            )
          }
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: orphanedSandboxId
            ? `Failed to start the Devin worker. Sandbox ${orphanedSandboxId} may require cleanup.`
            : 'Failed to start the Devin Outposts worker',
        })
      }
    }),
})

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`
}
