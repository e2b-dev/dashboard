import { loadEnvConfig } from '@next/env'
import { clientSchema, serverSchema, validateEnv } from '../src/lib/env'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

const schema = serverSchema
  .merge(clientSchema)
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
      if (data.NEXT_PUBLIC_CAPTCHA_ENABLED === '1') {
        return (
          !!data.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !!data.TURNSTILE_SECRET_KEY
        )
      }

      return true
    },
    {
      message:
        'NEXT_PUBLIC_CAPTCHA_ENABLED is enabled, but NEXT_PUBLIC_TURNSTILE_SITE_KEY or TURNSTILE_SECRET_KEY is missing',
      path: ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'],
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
  .refine(
    (data) => {
      if (data.AUTH_PROVIDER !== 'ory') return true

      return Boolean(
        data.AUTH_SECRET &&
          data.ORY_SDK_URL &&
          data.ORY_OAUTH2_CLIENT_ID &&
          data.ORY_OAUTH2_CLIENT_SECRET &&
          data.ORY_OAUTH2_AUDIENCE &&
          data.ORY_PROJECT_API_TOKEN &&
          data.DASHBOARD_API_ADMIN_TOKEN
      )
    },
    {
      message:
        'AUTH_PROVIDER=ory requires AUTH_SECRET, ORY_SDK_URL, ORY_OAUTH2_CLIENT_ID, ORY_OAUTH2_CLIENT_SECRET, ORY_OAUTH2_AUDIENCE, ORY_PROJECT_API_TOKEN, and DASHBOARD_API_ADMIN_TOKEN',
      path: ['AUTH_PROVIDER'],
    }
  )

validateEnv(schema)
