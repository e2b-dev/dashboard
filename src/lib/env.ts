import { z } from 'zod'

export const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  INFRA_API_URL: z.string().url(),
  NO_INDEX: z.string().optional(),
  KV_REST_API_TOKEN: z.string().min(1),
  KV_REST_API_URL: z.string().url(),

  BILLING_API_URL: z.string().url().optional(),
  ZEROBOUNCE_API_KEY: z.string().optional(),
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  VERCEL_BRANCH_URL: z.string().optional(),
})

export const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_INCLUDE_BILLING: z.string().optional(),
  NEXT_PUBLIC_EXPOSE_STORYBOOK: z.string().optional(),
  NEXT_PUBLIC_SCAN: z.string().optional(),
  NEXT_PUBLIC_MOCK_DATA: z.string().optional(),
  NEXT_PUBLIC_VERBOSE: z.string().optional(),

  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DEBUG: z.string().optional(),
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
