import { loadEnvConfig } from '@next/env'
import { z } from 'zod'
import { clientSchema, serverSchema, validateEnv } from '../src/lib/env'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

// Always required when AUTH_PROVIDER=ory, regardless of deploy target.
const oryRequiredEnvVars = [
  'ORY_SDK_URL',
  'NEXT_PUBLIC_ORY_SDK_URL',
  'ORY_OAUTH2_CLIENT_ID',
  'ORY_OAUTH2_CLIENT_SECRET',
  'ORY_OAUTH2_AUDIENCE',
  'DASHBOARD_API_ADMIN_TOKEN',
] as const

// Admin surface resolution must be mode-coherent:
//   - Ory Network:  ORY_PROJECT_API_TOKEN (bearer for the unified SDK host
//                   covers both Kratos and Hydra admin).
//   - Self-hosted:  BOTH ORY_KRATOS_ADMIN_URL and ORY_HYDRA_ADMIN_URL
//                   (each admin surface lives on its own port; either alone
//                   leaks the other call back to the public ORY_SDK_URL).

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

    const hasKratosAdmin = !!data.ORY_KRATOS_ADMIN_URL
    const hasHydraAdmin = !!data.ORY_HYDRA_ADMIN_URL
    const isSelfHosted = hasKratosAdmin || hasHydraAdmin
    const hasProjectToken = !!data.ORY_PROJECT_API_TOKEN

    if (isSelfHosted) {
      const missingSelfHostedVars: string[] = []
      if (!hasKratosAdmin) missingSelfHostedVars.push('ORY_KRATOS_ADMIN_URL')
      if (!hasHydraAdmin) missingSelfHostedVars.push('ORY_HYDRA_ADMIN_URL')

      if (missingSelfHostedVars.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Self-hosted Ory is missing ${missingSelfHostedVars.join(', ')}`,
          path: ['AUTH_PROVIDER'],
        })
      }
    } else if (!hasProjectToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'AUTH_PROVIDER=ory requires ORY_PROJECT_API_TOKEN (Ory Network) or both ORY_KRATOS_ADMIN_URL and ORY_HYDRA_ADMIN_URL (self-hosted)',
        path: ['AUTH_PROVIDER'],
      })
    }
  })

validateEnv(schema)
