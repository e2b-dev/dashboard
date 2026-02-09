import { createCallerFactory, createTRPCRouter } from '../init'
import { billingRouter } from './billing'
import { buildsRouter } from './builds'
import { sandboxRouter } from './sandbox'
import { sandboxesRouter } from './sandboxes'
import { templatesRouter } from './templates'

export const trpcAppRouter = createTRPCRouter({
  sandbox: sandboxRouter,
  sandboxes: sandboxesRouter,
  templates: templatesRouter,
  builds: buildsRouter,
  billing: billingRouter,
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
