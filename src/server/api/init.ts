import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { ZodError, flattenError } from 'zod'

/**
 * TRPC Context Factory
 *
 * Factory function that creates a TRPC context. If a session exists, we are trying resolve the correct user data.
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    ...opts,
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
