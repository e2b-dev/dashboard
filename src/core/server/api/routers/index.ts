import { createCallerFactory, createTRPCRouter } from '@/core/server/trpc/init'
import { buildsRouter } from './builds'
import { sandboxRouter } from './sandbox'
import { sandboxesRouter } from './sandboxes'
import { teamsRouter } from './teams'
import { templatesRouter } from './templates'
import { userRouter } from './user'

export const trpcAppRouter = createTRPCRouter({
  sandbox: sandboxRouter,
  sandboxes: sandboxesRouter,
  templates: templatesRouter,
  builds: buildsRouter,
  teams: teamsRouter,
  user: userRouter,
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
