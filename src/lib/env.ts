import { z } from 'zod'

export const serverSchema = z.object({
  DASHBOARD_API_ADMIN_TOKEN: z.string().min(1).optional(),

  BILLING_API_URL: z.url().optional(),
  PLAIN_API_KEY: z.string().min(1).optional(),

  POSTHOG_API_KEY: z.string().min(1).optional(),
  POSTHOG_PROJECT_ID: z.string().min(1).optional(),

  LAUNCHDARKLY_SDK_KEY: z.string().min(1).optional(),
  APP_URL: z.url().optional(),

  // JWE key for the e2b_session cookie. Generate with `openssl rand -hex 32`.
  E2B_SESSION_SECRET: z.string().min(1).optional(),
  ORY_SDK_URL: z.url().optional(),
  // OIDC issuer (Hydra public URL). Falls back to ORY_SDK_URL on Ory Network;
  // set explicitly for self-hosted Hydra (e.g. http://localhost:4444).
  ORY_HYDRA_PUBLIC_URL: z.url().optional(),
  ORY_OAUTH2_CLIENT_ID: z.string().min(1).optional(),
  ORY_OAUTH2_CLIENT_SECRET: z.string().min(1).optional(),
  ORY_OAUTH2_CLI_CLIENT_ID: z.string().min(1).optional(),
  ORY_OAUTH2_AUDIENCE: z.string().min(1).optional(),
  ORY_PROJECT_API_TOKEN: z.string().min(1).optional(),
  ORY_KRATOS_ADMIN_URL: z.url().optional(),
  ORY_HYDRA_ADMIN_URL: z.url().optional(),
  // Fixed host whose OAuth callback/logout relays are registered in Hydra. Set
  // on preview deployments (dynamic hosts can't register their own redirect
  // URIs); unset on staging/production/local, where the flow stays host-direct.
  ORY_OAUTH_RELAY_ORIGIN: z.url().optional(),

  OTEL_SERVICE_NAME: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  OTEL_EXPORTER_OTLP_PROTOCOL: z
    .enum(['grpc', 'http/protobuf', 'http/json'])
    .optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  OTEL_TRACES_EXPORTER: z.enum(['otlp', 'none']).optional(),
  OTEL_METRICS_EXPORTER: z.enum(['otlp', 'none']).optional(),
  OTEL_LOGS_EXPORTER: z.enum(['otlp', 'none']).optional(),
  OTEL_NODE_RESOURCE_DETECTORS: z.string().optional(),
  OTEL_RESOURCE_ATTRIBUTES: z.string().optional(),

  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  VERCEL_BRANCH_URL: z.string().optional(),
  VERCEL_REGION: z.string().optional(),
  VERCEL_DEPLOYMENT_ID: z.string().optional(),
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),
  VERCEL_GIT_COMMIT_MESSAGE: z.string().optional(),
  VERCEL_GIT_COMMIT_AUTHOR_NAME: z.string().optional(),
  VERCEL_GIT_REPO_SLUG: z.string().optional(),
  VERCEL_GIT_REPO_OWNER: z.string().optional(),
  VERCEL_GIT_PROVIDER: z.string().optional(),
})

export const clientSchema = z.object({
  NEXT_PUBLIC_E2B_DOMAIN: z.string(),

  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_DASHBOARD_FEEDBACK_SURVEY_ID: z
    .string()
    .min(1)
    .optional(),
  NEXT_PUBLIC_VERCEL_ENV: z
    .enum(['production', 'preview', 'development'])
    .optional(),

  NEXT_PUBLIC_INCLUDE_BILLING: z.string().optional(),
  NEXT_PUBLIC_INCLUDE_ARGUS: z.string().optional(),
  NEXT_PUBLIC_INCLUDE_REPORT_ISSUE: z.string().optional(),
  NEXT_PUBLIC_INCLUDE_STATUS_INDICATOR: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SCAN: z.string().optional(),
  NEXT_PUBLIC_MOCK_DATA: z.string().optional(),
  NEXT_PUBLIC_VERBOSE: z.string().optional(),
  NEXT_PUBLIC_INFRA_API_URL: z.url().optional(),
  NEXT_PUBLIC_E2B_SANDBOX_URL: z.url().optional(),
  NEXT_PUBLIC_DASHBOARD_API_URL: z.url().optional(),

  // Browser-facing Kratos public URL for the Elements UI; falls back to ORY_SDK_URL.
  NEXT_PUBLIC_ORY_SDK_URL: z.url().optional(),
})

const merged = serverSchema.merge(clientSchema)

type MergedEnv = z.infer<typeof merged>

const oryRequiredEnvVars = [
  'E2B_SESSION_SECRET',
  'ORY_SDK_URL',
  'ORY_OAUTH2_CLIENT_ID',
  'ORY_OAUTH2_CLIENT_SECRET',
  'ORY_OAUTH2_CLI_CLIENT_ID',
  'ORY_OAUTH2_AUDIENCE',
  'DASHBOARD_API_ADMIN_TOKEN',
] as const satisfies readonly (keyof MergedEnv)[]

function requireEnvVars(
  data: MergedEnv,
  ctx: z.RefinementCtx,
  envVars: readonly (keyof MergedEnv)[]
) {
  for (const envVar of envVars) {
    if (data[envVar]) continue

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Ory requires ${envVar}`,
      path: [envVar],
    })
  }
}

function validateOryAdminEnv(data: MergedEnv, ctx: z.RefinementCtx) {
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
        path: ['ORY_KRATOS_ADMIN_URL'],
      })
    }
  } else if (!hasProjectToken) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'Ory requires ORY_PROJECT_API_TOKEN (Ory Network) or both ORY_KRATOS_ADMIN_URL and ORY_HYDRA_ADMIN_URL (self-hosted)',
      path: ['ORY_PROJECT_API_TOKEN'],
    })
  }
}

export const appEnvSchema = merged.superRefine((data, ctx) => {
  requireEnvVars(data, ctx, oryRequiredEnvVars)
  validateOryAdminEnv(data, ctx)
})

export type Env = z.infer<typeof appEnvSchema>

export function validateEnv(schema: z.ZodSchema) {
  const parsed = schema.safeParse(process.env)

  if (!parsed.success) {
    console.error(z.prettifyError(parsed.error))
    process.exit(1)
  }

  console.log('✅ Environment variables validated successfully')
}
