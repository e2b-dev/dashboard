import { createCallerFactory, createTRPCRouter } from '../init'
import { buildsRouter } from './builds'
import { sandboxRouter } from './sandbox'
import { sandboxesRouter } from './sandboxes'
import { templatesRouter } from './templates'

export const trpcAppRouter = createTRPCRouter({
  sandbox: sandboxRouter,
  sandboxes: sandboxesRouter,
  templates: templatesRouter,
  builds: buildsRouter,
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
