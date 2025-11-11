import { postRouter } from '@/server/api/routers/post'
import { createCallerFactory, createTRPCRouter } from '@/server/api/trpc'

export const trpcAppRouter = createTRPCRouter({
  post: postRouter,
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
