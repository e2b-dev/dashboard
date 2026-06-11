import { z } from 'zod'

export const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  KV_REST_API_TOKEN: z.string().min(1).optional(),
  KV_REST_API_URL: z.url().optional(),

  ENABLE_USER_BOOTSTRAP: z.string().optional(),
  DASHBOARD_API_ADMIN_TOKEN: z.string().min(1).optional(),

  BILLING_API_URL: z.url().optional(),
  ZEROBOUNCE_API_KEY: z.string().optional(),
  PLAIN_API_KEY: z.string().min(1).optional(),

  TURNSTILE_SECRET_KEY: z.string().optional(),

  AUTH_PROVIDER: z.enum(['supabase', 'ory']).optional(),
  AUTH_SECRET: z.string().min(1).optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  // Prefix for Auth.js cookie names to disambiguate multiple local
  // instances sharing localhost (cookies aren't scoped by port).
  // Leave unset in prod/preview.
  AUTH_COOKIE_PREFIX: z.string().min(1).optional(),
  ORY_SDK_URL: z.url().optional(),
  ORY_OAUTH2_CLIENT_ID: z.string().min(1).optional(),
  ORY_OAUTH2_CLIENT_SECRET: z.string().min(1).optional(),
  ORY_OAUTH2_AUDIENCE: z.string().min(1).optional(),
  ORY_PROJECT_API_TOKEN: z.string().min(1).optional(),
  ORY_KRATOS_ADMIN_URL: z.url().optional(),
  ORY_HYDRA_ADMIN_URL: z.url().optional(),

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
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_E2B_DOMAIN: z.string(),

  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_DASHBOARD_FEEDBACK_SURVEY_ID: z
    .string()
    .min(1)
    .optional(),

  NEXT_PUBLIC_INCLUDE_BILLING: z.string().optional(),
  NEXT_PUBLIC_INCLUDE_ARGUS: z.string().optional(),
  NEXT_PUBLIC_INCLUDE_REPORT_ISSUE: z.string().optional(),
  NEXT_PUBLIC_INCLUDE_STATUS_INDICATOR: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SCAN: z.string().optional(),
  NEXT_PUBLIC_MOCK_DATA: z.string().optional(),
  NEXT_PUBLIC_VERBOSE: z.string().optional(),
  NEXT_PUBLIC_AUTH_MIGRATION_IN_PROGRESS: z.string().optional(),

  NEXT_PUBLIC_CAPTCHA_ENABLED: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),

  NEXT_PUBLIC_INFRA_API_URL: z.url().optional(),
  NEXT_PUBLIC_E2B_SANDBOX_URL: z.url().optional(),
  NEXT_PUBLIC_DASHBOARD_API_URL: z.url().optional(),

  // Browser-facing Kratos public URL for the custom @ory/elements-react login
  // page. Read by @ory/nextjs and src/configs/ory.ts. Required when
  // AUTH_PROVIDER=ory; unused otherwise.
  NEXT_PUBLIC_ORY_SDK_URL: z.url().optional(),

  // Opt-in flag ("1") for the custom @ory/elements-react login/registration UI.
  // Set in non-production envs and by the local harness; unset in production
  // (which keeps the existing /sign-in flow). See isOryCustomUiEnabled().
  NEXT_PUBLIC_ORY_CUSTOM_UI: z.string().optional(),
})

const merged = serverSchema.extend(clientSchema.shape)

export type Env = z.infer<typeof merged>

export function validateEnv(schema: z.ZodSchema) {
  const parsed = schema.safeParse(process.env)

  if (!parsed.success) {
    console.error(z.prettifyError(parsed.error))
    process.exit(1)
  }

  console.log('✅ Environment variables validated successfully')
}
