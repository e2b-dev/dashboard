import createClient from 'openapi-fetch'
import type { paths as ArgusPaths } from '@/core/shared/contracts/argus-api.types'
import type { paths as DashboardPaths } from '@/core/shared/contracts/dashboard-api.types'
import type { paths as InfraPaths } from '@/core/shared/contracts/infra-api.types'

type CombinedPaths = InfraPaths & ArgusPaths

const INFRA_API_URL =
  process.env.NEXT_PUBLIC_INFRA_API_URL ||
  `https://api.${process.env.NEXT_PUBLIC_E2B_DOMAIN}`

const DASHBOARD_API_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_API_URL ||
  `https://dashboard-api.${process.env.NEXT_PUBLIC_E2B_DOMAIN}`

// openapi-fetch passes a fully-built Request; forward it as-is. Destructuring
// and rebuilding the call read `request.body` (a one-shot stream), which
// consumes it and triggers "ReadableStream has already been used".
export const infra = createClient<CombinedPaths>({
  baseUrl: INFRA_API_URL,
  fetch: (request) => fetch(request),
  querySerializer: {
    array: { style: 'form', explode: false },
  },
})

export const api = createClient<DashboardPaths>({
  baseUrl: DASHBOARD_API_URL,
  fetch: (request) => fetch(request),
  querySerializer: {
    array: { style: 'form', explode: false },
  },
})
