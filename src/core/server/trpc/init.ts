import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { flattenError, ZodError } from 'zod'
import type { RequestObservabilityContext } from '@/core/shared/clients/logger/request-observability'

/**
 * TRPC Context Factory
 *
 * Auth is resolved per-procedure by the auth middleware (api key cookie / env),
 * not threaded through the context.
 */
export const createTRPCContext = async (opts: {
  headers: Headers
  requestUrl?: string
  requestObservability?: RequestObservabilityContext
}) => {
  return {
    ...opts,
    requestOrigin: getRequestOrigin(opts.requestUrl),
    apiKey: undefined as string | undefined,
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
