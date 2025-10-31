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
)

validateEnv(schema)
