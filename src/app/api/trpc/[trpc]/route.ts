import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { NextRequest } from 'next/server'

import { trpcAppRouter } from '@/core/server/api/routers'
import { createTRPCContext } from '@/core/server/trpc/init'
import { createRequestObservabilityContext } from '@/core/shared/clients/logger/request-observability'

/**
 * Adapts tRPC to the App Router fetch handler. Auth is resolved per-procedure by
 * the auth middleware (Kratos whoami + e2b_session), so the request is not
 * wrapped by any session helper here.
 */
const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: trpcAppRouter,
    createContext: () =>
      createTRPCContext({
        headers: req.headers,
        requestUrl: req.url,
        requestObservability: createRequestObservabilityContext({
          requestUrl: req.headers.get('referer') ?? req.url,
          fallbackPath: '/api/trpc',
          transport: 'trpc',
          handlerName: 'http',
        }),
      }),
  })

export { handler as GET, handler as POST }
