import createClient from 'openapi-fetch'
import { resolveInfraApiUrl } from '@/core/server/runtime-config'
import type { paths as InfraPaths } from '@/core/shared/contracts/infra-api.types'

const INFRA_API_URL = resolveInfraApiUrl()

export const infra = createClient<InfraPaths>({
  baseUrl: INFRA_API_URL,
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
