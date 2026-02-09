import { loadEnvConfig } from '@next/env'
import { clientSchema, serverSchema, validateEnv } from '../src/lib/env'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

const schema = serverSchema.merge(clientSchema).refine(
  (data) => {
    if (data.NEXT_PUBLIC_INCLUDE_BILLING === '1') {
      return !!data.BILLING_API_URL && !!data.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    }

    return true
  },
  {
    message:
      'NEXT_PUBLIC_INCLUDE_BILLING is enabled, but BILLING_API_URL or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing',
    path: ['BILLING_API_URL'],
  }
).refine(
  (data) => {
    if (data.NEXT_PUBLIC_CAPTCHA_ENABLED === '1') {
      return !!data.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !!data.TURNSTILE_SECRET_KEY
    }

    return true
  },
  {
    message:
      'NEXT_PUBLIC_CAPTCHA_ENABLED is enabled, but NEXT_PUBLIC_TURNSTILE_SITE_KEY or TURNSTILE_SECRET_KEY is missing',
    path: ['NEXT_PUBLIC_TURNSTILE_SITE_KEY'],
  }
)

validateEnv(schema)
