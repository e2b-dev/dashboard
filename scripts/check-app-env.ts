import { loadEnvConfig } from '@next/env'
import { z } from 'zod'
import { clientSchema, serverSchema, validateEnv } from '../src/lib/env'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

// Always required when AUTH_PROVIDER=ory, regardless of deploy target.
const oryRequiredEnvVars = [
  'AUTH_SECRET',
  'ORY_SDK_URL',
  'ORY_OAUTH2_CLIENT_ID',
  'ORY_OAUTH2_CLIENT_SECRET',
  'ORY_OAUTH2_AUDIENCE',
  'DASHBOARD_API_ADMIN_TOKEN',
] as const

// Identity admin surface (Kratos): pick exactly one.
//   - ORY_PROJECT_API_TOKEN: Ory Network. Bearer for the unified SDK host.
//   - ORY_KRATOS_ADMIN_URL:  self-hosted Kratos admin (gated by network).
// At least one must be set so IdentityApi calls can resolve.
const oryIdentityAdminEnvVars = [
  'ORY_PROJECT_API_TOKEN',
  'ORY_KRATOS_ADMIN_URL',
] as const

// OAuth2 admin surface (Hydra): pick exactly one.
//   - ORY_PROJECT_API_TOKEN: Ory Network. Bearer for the unified SDK host.
//   - ORY_HYDRA_ADMIN_URL:   self-hosted Hydra admin (gated by network).
// At least one must be set so OAuth2Api session revocations can resolve.
const oryOAuth2AdminEnvVars = [
  'ORY_PROJECT_API_TOKEN',
  'ORY_HYDRA_ADMIN_URL',
] as const

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
  .superRefine((data, ctx) => {
    if (data.AUTH_PROVIDER !== 'ory') return

    const missingEnvVars = oryRequiredEnvVars.filter((envVar) => !data[envVar])

    if (missingEnvVars.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `AUTH_PROVIDER=ory is missing ${missingEnvVars.join(', ')}`,
        path: ['AUTH_PROVIDER'],
      })
    }

    const hasIdentityAdmin = oryIdentityAdminEnvVars.some(
      (envVar) => !!data[envVar]
    )
    if (!hasIdentityAdmin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `AUTH_PROVIDER=ory requires either ${oryIdentityAdminEnvVars.join(' (Ory Network) or ')} (self-hosted Kratos admin)`,
        path: ['AUTH_PROVIDER'],
      })
    }

    const hasOAuth2Admin = oryOAuth2AdminEnvVars.some(
      (envVar) => !!data[envVar]
    )
    if (!hasOAuth2Admin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `AUTH_PROVIDER=ory requires either ${oryOAuth2AdminEnvVars.join(' (Ory Network) or ')} (self-hosted Hydra admin)`,
        path: ['AUTH_PROVIDER'],
      })
    }
  })

validateEnv(schema)
