import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { NextRequest } from 'next/server'
import type { Session } from 'next-auth'
import { auth as authjs } from '@/auth'

import { trpcAppRouter } from '@/core/server/api/routers'
import { createTRPCContext } from '@/core/server/trpc/init'
import { createRequestObservabilityContext } from '@/core/shared/clients/logger/request-observability'

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (
  req: NextRequest,
  authSession?: Session | null
) => {
  return createTRPCContext({
    headers: req.headers,
    authSession,
    requestUrl: req.url,
    requestObservability: createRequestObservabilityContext({
      requestUrl: req.headers.get('referer') ?? req.url,
      fallbackPath: '/api/trpc',
      transport: 'trpc',
      handlerName: 'http',
    }),
  })
}

const handler = (req: NextRequest, authSession?: Session | null) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: trpcAppRouter,
    createContext: () => createContext(req, authSession),
  })

const oryHandler = authjs((req) => handler(req, req.auth))

type RouteContext = { params: Promise<{ trpc: string }> }

function route(req: NextRequest, context: RouteContext) {
  return oryHandler(req, context)
}

export { route as GET, route as POST }
