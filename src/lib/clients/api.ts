import type { paths as ArgusPaths } from '@/types/argus-api.types'
import type { paths as DashboardPaths } from '@/types/dashboard-api.types'
import type { paths as InfraPaths } from '@/types/infra-api.types'
import createClient from 'openapi-fetch'

type CombinedPaths = InfraPaths & ArgusPaths

export const infra = createClient<CombinedPaths>({
  baseUrl: process.env.NEXT_PUBLIC_INFRA_API_URL || process.env.INFRA_API_URL,
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

export const api = createClient<DashboardPaths>({
  baseUrl: process.env.NEXT_PUBLIC_DASHBOARD_API_URL,
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
