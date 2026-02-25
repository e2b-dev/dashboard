import 'server-only'

import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import {
  TRPCQueryOptions,
  createTRPCOptionsProxy,
} from '@trpc/tanstack-react-query'
import { headers } from 'next/headers'
import { cache } from 'react'

import { createTRPCContext } from '@/server/api/init'
import { createTRPCCaller, trpcAppRouter } from '@/server/api/routers'
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

export const getQueryClient = cache(createQueryClient)

/**
 * Server-side tRPC proxy for generating query options in React Server Components.
 *
 * Use this to create query options that can be passed to prefetch functions or
 * used with TanStack Query's prefetchQuery/prefetchInfiniteQuery methods.
 *
 * @example
 * ```tsx
 * // In a Server Component
 * const queryOptions = trpc.posts.getAll.queryOptions({ limit: 10 })
 * prefetch(queryOptions)
 * ```
 */
export const trpc = createTRPCOptionsProxy({
  ctx: createContext,
  router: trpcAppRouter,
  queryClient: getQueryClient,
})

/**
 * Server-side tRPC caller for direct procedure invocation in React Server Components.
 *
 * Use this when you need to call tRPC procedures directly on the server without
 * going through the HTTP layer. Ideal for fetching data in Server Components,
 * API routes, or server actions where you want the actual data, not query options.
 *
 * @example
 * ```tsx
 * // In a Server Component
 * const posts = await trpcCaller.posts.getAll({ limit: 10 })
 * ```
 */
export const trpcCaller = createTRPCCaller(createContext)

// SERVER-CLIENT HYDRATION HELPERS

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  )
}

// NOTE - prefetches do not have to be awaited. pending queries will be hydrated and streamed to the client
// not awaiting the queries is useful for not blocking route trees

export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptions: T
) {
  const queryClient = getQueryClient()
  if (queryOptions.queryKey[1]?.type === 'infinite') {
    void queryClient.prefetchInfiniteQuery(queryOptions as any)
  } else {
    void queryClient.prefetchQuery(queryOptions)
  }
}

export async function prefetchAsync<
  T extends ReturnType<TRPCQueryOptions<any>>,
>(queryOptions: T) {
  const queryClient = getQueryClient()
  if (queryOptions.queryKey[1]?.type === 'infinite') {
    await queryClient.prefetchInfiniteQuery(queryOptions as any)
  } else {
    await queryClient.prefetchQuery(queryOptions)
  }
}
