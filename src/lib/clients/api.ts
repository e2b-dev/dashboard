import type { paths as ArgusPaths } from '@/types/argus-api.types'
import type { paths as DashboardPaths } from '@/types/dashboard-api.types'
import type { paths as InfraPaths } from '@/types/infra-api.types'
import createClient from 'openapi-fetch'

type CombinedPaths = InfraPaths & ArgusPaths

const INFRA_API_URL =
  process.env.NEXT_PUBLIC_INFRA_API_URL ||
  `https://api.${process.env.NEXT_PUBLIC_E2B_DOMAIN}`

const DASHBOARD_API_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_API_URL ||
  `https://dashboard-api.${process.env.NEXT_PUBLIC_E2B_DOMAIN}`

export const infra = createClient<CombinedPaths>({
  baseUrl: INFRA_API_URL,
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
  baseUrl: DASHBOARD_API_URL,
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
