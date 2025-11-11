import { createCallerFactory, createTRPCRouter } from '@/server/api/trpc'
import { sandboxesRouter } from './routers/sandboxes'

export const trpcAppRouter = createTRPCRouter({
  sandboxes: sandboxesRouter,
})

export type TRPCAppRouter = typeof trpcAppRouter

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createTRPCCaller = createCallerFactory(trpcAppRouter)
