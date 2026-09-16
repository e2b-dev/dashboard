import createClient from 'openapi-fetch'
import {
  resolveDashboardApiUrl,
  resolveInfraApiUrl,
} from '@/core/server/runtime-config'
import type { paths as DashboardPaths } from '@/core/shared/contracts/dashboard-api.types'
import type { paths as InfraPaths } from '@/core/shared/contracts/infra-api.types'

type CombinedPaths = InfraPaths

const INFRA_API_URL = resolveInfraApiUrl()

const DASHBOARD_API_URL = resolveDashboardApiUrl()

export const infra = createClient<CombinedPaths>({
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

export const api = createClient<DashboardPaths>({
  baseUrl: DASHBOARD_API_URL,
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
