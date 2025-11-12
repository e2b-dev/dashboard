import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { type NextRequest } from 'next/server'

import { l } from '@/lib/clients/logger/logger'
import { createTRPCContext } from '@/server/api/init'
import { trpcAppRouter } from '@/server/api/routers'

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  })
}

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: trpcAppRouter,
    createContext: () => createContext(req),
    onError: ({ path, error }) => {
      if (process.env.NODE_ENV === 'development') {
        l.error(
          {
            key: 'trpc_handler:error',
            error,
          },
          `trpc_handler:error: tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
        )
      }
    },
  })

export { handler as GET, handler as POST }
