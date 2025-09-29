import { z } from 'zod'

export const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  INFRA_API_URL: z.url(),
  KV_REST_API_TOKEN: z.string().min(1),
  KV_REST_API_URL: z.url(),
  NEXT_PUBLIC_E2B_DOMAIN: z.string(),

  BILLING_API_URL: z.url().optional(),
  ZEROBOUNCE_API_KEY: z.string().optional(),

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

  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_DASHBOARD_FEEDBACK_SURVEY_ID: z
    .string()
    .min(1)
    .optional(),

  NEXT_PUBLIC_INCLUDE_BILLING: z.string().optional(),
  NEXT_PUBLIC_SCAN: z.string().optional(),
  NEXT_PUBLIC_MOCK_DATA: z.string().optional(),
  NEXT_PUBLIC_VERBOSE: z.string().optional(),
})

export const testEnvSchema = z.object({
  TEST_USER_EMAIL: z.email(),
  TEST_USER_PASSWORD: z.string().min(8),
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
