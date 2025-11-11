'use client'

import { type TRPCAppRouter } from '@/server/api/root'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { httpBatchStreamLink, loggerLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server'
import { useState } from 'react'
import SuperJSON from 'superjson'
import { createQueryClient } from './query-client'

let clientQueryClientSingleton: QueryClient | undefined = undefined

const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient()
  }
  // Browser: use singleton pattern to keep the same query client
  clientQueryClientSingleton ??= createQueryClient()

  return clientQueryClientSingleton
}

export const trpc = createTRPCReact<TRPCAppRouter>()

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = TRPCRouterInputs['example']['hello']
 */
export type TRPCRouterInputs = inferRouterInputs<TRPCAppRouter>

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = TRPCRouterOutputs['example']['hello']
 */
export type TRPCRouterOutputs = inferRouterOutputs<TRPCAppRouter>

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === 'development' ||
            (op.direction === 'down' && op.result instanceof Error),
        }),
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + '/api/trpc',
          headers: () => {
            const headers = new Headers()
            headers.set('x-trpc-source', 'nextjs-react')
            return headers
          },
        }),
      ],
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </trpc.Provider>
    </QueryClientProvider>
  )
}

function getBaseUrl() {
  if (typeof window !== 'undefined') return window.location.origin
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT ?? 3000}`
}
