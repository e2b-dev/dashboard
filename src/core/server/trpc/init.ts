import type { User } from '@supabase/supabase-js'
import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { flattenError, ZodError } from 'zod'
import type { RequestObservabilityContext } from '@/core/shared/clients/logger/request-observability'

type AuthenticatedSession = {
  access_token: string
  user: User
}

/**
 * TRPC Context Factory
 *
 * Factory function that creates a TRPC context. If a session exists, we are trying resolve the correct user data.
 */
export const createTRPCContext = async (opts: {
  headers: Headers
  requestObservability?: RequestObservabilityContext
}) => {
  return {
    ...opts,
    session: undefined as AuthenticatedSession | undefined,
    user: undefined as User | undefined,
    teamId: undefined as string | undefined,
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
