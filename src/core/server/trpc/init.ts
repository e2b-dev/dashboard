import type { Session, User } from '@supabase/supabase-js'
import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { flattenError, ZodError } from 'zod'
import type { RequestContextServices } from '@/core/server/context/request-context'

/**
 * TRPC Context Factory
 *
 * Factory function that creates a TRPC context. If a session exists, we are trying resolve the correct user data.
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    ...opts,
    session: undefined as Session | undefined,
    user: undefined as User | undefined,
    teamId: undefined as string | undefined,
    services: undefined as RequestContextServices | undefined,
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
