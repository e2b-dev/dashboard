import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { flattenError, ZodError } from 'zod'
import type { AuthUser } from '@/core/server/auth'
import type { RequestObservabilityContext } from '@/core/shared/clients/logger/request-observability'

type AuthenticatedSession = {
  access_token: string
  user: AuthUser
}

/**
 * TRPC Context Factory
 *
 * Auth is resolved per-procedure by the auth middleware (Kratos whoami +
 * e2b_session), not threaded through the context.
 */
export const createTRPCContext = async (opts: {
  headers: Headers
  requestUrl?: string
  requestObservability?: RequestObservabilityContext
}) => {
  return {
    ...opts,
    requestOrigin: getRequestOrigin(opts.requestUrl),
    session: undefined as AuthenticatedSession | undefined,
    user: undefined as AuthUser | undefined,
    teamId: undefined as string | undefined,
  }
}

function getRequestOrigin(requestUrl: string | undefined): string | undefined {
  if (!requestUrl) return undefined

  try {
    return new URL(requestUrl).origin
  } catch {
    return undefined
  }
}

export const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? flattenError(error.cause) : null,
      },
    }
  },
})

export const createCallerFactory = t.createCallerFactory
export const createTRPCRouter = t.router
