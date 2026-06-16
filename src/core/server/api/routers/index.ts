import { createCallerFactory, createTRPCRouter } from '@/core/server/trpc/init'
import { billingRouter } from './billing'
import { buildsRouter } from './builds'
import { sandboxRouter } from './sandbox'
import { sandboxesRouter } from './sandboxes'
import { supportRouter } from './support'
import { teamsRouter } from './teams'
import { templatesRouter } from './templates'
import { userRouter } from './user'
import { webhooksRouter } from './webhooks'

export const trpcAppRouter = createTRPCRouter({
  sandbox: sandboxRouter,
  sandboxes: sandboxesRouter,
  templates: templatesRouter,
  builds: buildsRouter,
  billing: billingRouter,
  support: supportRouter,
  teams: teamsRouter,
  user: userRouter,
  webhooks: webhooksRouter,
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
