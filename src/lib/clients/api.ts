import createClient from 'openapi-fetch'
import type { paths as InfraPaths } from '@/types/infra-api'

export const infra = createClient<InfraPaths>({
  baseUrl: process.env.INFRA_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
