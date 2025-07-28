import type { paths as InfraPaths } from '@/types/infra-api'
import createClient from 'openapi-fetch'

export const infra = createClient<InfraPaths>({
  baseUrl: process.env.INFRA_API_URL,
  fetch: ({ url, headers, body, method, ...options }) => {
    return fetch(url, {
      headers,
      body,
      method,
      duplex: !!body ? 'half' : undefined,
      ...options,
    } as RequestInit)
  },
  querySerializer: {
    array: { style: 'form', explode: false },
  },
})
