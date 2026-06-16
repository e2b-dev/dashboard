import { loadEnvConfig } from '@next/env'
import { appEnvSchema, validateEnv } from '../src/lib/env'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

const schema = appEnvSchema
  .refine(
    (data) => Boolean(data.KV_REST_API_URL) === Boolean(data.KV_REST_API_TOKEN),
    {
      message: 'KV_REST_API_URL and KV_REST_API_TOKEN must be set together',
      path: ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
    }
  )
  .refine(
    (data) => {
      if (data.NEXT_PUBLIC_INCLUDE_BILLING === '1') {
        return (
          !!data.BILLING_API_URL && !!data.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        )
      }

      return true
    },
    {
      message:
        'NEXT_PUBLIC_INCLUDE_BILLING is enabled, but BILLING_API_URL or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing',
      path: ['BILLING_API_URL', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
    }
  )
  .refine(
    (data) => {
      if (data.NEXT_PUBLIC_INCLUDE_REPORT_ISSUE === '1') {
        return !!data.PLAIN_API_KEY
      }
      return true
    },
    {
      message:
        'NEXT_PUBLIC_INCLUDE_REPORT_ISSUE is enabled, but PLAIN_API_KEY is missing',
      path: ['PLAIN_API_KEY'],
    }
  )

validateEnv(schema)
