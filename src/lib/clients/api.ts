import createClient from 'openapi-fetch'
import type { paths as ArgusPaths } from '@/types/argus-api.types'
import type { paths as InfraPaths } from '@/types/infra-api.types'

type CombinedPaths = InfraPaths & ArgusPaths

export const infra = createClient<CombinedPaths>({
  baseUrl: process.env.INFRA_API_URL,
  fetch: ({ url, headers, body, method, ...options }) => {
    return fetch(url, {
      headers,
      body,
      method,
      duplex: body ? 'half' : undefined,
      ...options,
    } as RequestInit)
  },
  querySerializer: {
    array: { style: 'form', explode: false },
  },
})
