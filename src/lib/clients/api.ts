import type { paths as InfraPaths } from '@/types/infra-api'
import createClient from 'openapi-fetch'

export const infra = createClient<InfraPaths>({
  baseUrl: process.env.INFRA_API_URL,
  fetch: ({ url, headers, body, method, ...options }) => {
    return fetch(url, {
      headers,
      body,
      method,
      // @ts-expect-error -- duplex not on type, keep it for now
      duplex: !!body ? 'half' : undefined,
      ...options,
    })
  },
  querySerializer: {
    array: { style: 'form', explode: false },
  },
})
