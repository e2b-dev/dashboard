import { z } from 'zod'

const NumericBoolean = z.enum(['1', '0'])

// string that must parse as a positive number
const StringPositiveNumber = z.string().refine(
  (val) => {
    const num = Number(val)
    return !isNaN(num) && num > 0
  },
  {
    message: 'Must be a string that can be parsed as a positive number',
  }
)

export const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  INFRA_API_URL: z.string().url(),
  KV_REST_API_TOKEN: z.string().min(1),
  KV_REST_API_URL: z.string().url(),
  NEXT_PUBLIC_E2B_DOMAIN: z.string(),

  BILLING_API_URL: z.string().url().optional(),
  ZEROBOUNCE_API_KEY: z.string().optional(),

  ENABLE_SIGN_UP_RATE_LIMITING: NumericBoolean.optional(),
  SIGN_UP_LIMIT_PER_WINDOW: StringPositiveNumber.optional(),
  SIGN_UP_WINDOW_HOURS: StringPositiveNumber.optional(),

  OTEL_SERVICE_NAME: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
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
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_INCLUDE_BILLING: NumericBoolean.optional(),
  NEXT_PUBLIC_SCAN: NumericBoolean.optional(),
  NEXT_PUBLIC_MOCK_DATA: NumericBoolean.optional(),
  NEXT_PUBLIC_VERBOSE: NumericBoolean.optional(),
})

export const testEnvSchema = z.object({
  TEST_USER_EMAIL: z.string().email(),
  TEST_USER_PASSWORD: z.string().min(8),
})

/**
 * You can't destruct `process.env` as a regular object, so we do
 * a simple validation of the environment variables we need.
 */
export const formatErrors = (errors: z.inferFlattenedErrors<z.AnyZodObject>) =>
  Object.entries(errors.fieldErrors)
    .map(([name, value]) => {
      if (value) return `${name}: ${value.join(', ')}\n`
    })
    .filter(Boolean)

const merged = serverSchema.merge(clientSchema)
export type Env = z.infer<typeof merged>

export function validateEnv(schema: z.ZodSchema) {
  const parsed = schema.safeParse(process.env)

  if (!parsed.success) {
    console.error(
      '❌ Invalid environment variables:\n\n',
      ...formatErrors(parsed.error.flatten())
    )
    process.exit(1)
  }

  console.log('✅ Environment variables validated successfully')
}
