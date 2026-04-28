import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { NextRequest } from 'next/server'

import { trpcAppRouter } from '@/core/server/api/routers'
import { createTRPCContext } from '@/core/server/trpc/init'
import { createRequestObservabilityContext } from '@/core/shared/clients/logger/request-observability'

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
    requestObservability: createRequestObservabilityContext({
      requestUrl: req.headers.get('referer') ?? req.url,
      fallbackPath: '/api/trpc',
      transport: 'trpc',
      handlerName: 'http',
    }),
  })
}

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: trpcAppRouter,
    createContext: () => createContext(req),
  })

export { handler as GET, handler as POST }
