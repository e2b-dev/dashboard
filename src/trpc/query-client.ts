import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query'
import SuperJSON from 'superjson'
import { SIGN_OUT_URL } from '@/configs/urls'

/**
 * The api-key cookie is only presence-checked by the proxy; validity is
 * enforced lazily. When any tRPC call reports UNAUTHORIZED in the browser
 * (revoked/invalid key), clear the cookie via the sign-out route and land on
 * the key form.
 */
function handleUnauthorized(error: unknown) {
  if (typeof window === 'undefined') return

  const code = (error as { data?: { code?: string } })?.data?.code
  if (code !== 'UNAUTHORIZED') return

  window.location.href = SIGN_OUT_URL
}

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: handleUnauthorized,
    }),
    mutationCache: new MutationCache({
      onError: handleUnauthorized,
    }),
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  })
