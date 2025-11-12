import 'server-only'

import { createHydrationHelpers } from '@trpc/react-query/rsc'
import { headers } from 'next/headers'
import { cache } from 'react'

import { createTRPCContext } from '@/server/api/init'
import { createTRPCCaller, type TRPCAppRouter } from '@/server/api/routers'
import { createQueryClient } from './query-client'

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers())
  heads.set('x-trpc-source', 'rsc')

  return createTRPCContext({
    headers: heads,
  })
})

const getQueryClient = cache(createQueryClient)
const caller = createTRPCCaller(createContext)

export const { trpc, HydrateClient } = createHydrationHelpers<TRPCAppRouter>(
  caller,
  getQueryClient
)
