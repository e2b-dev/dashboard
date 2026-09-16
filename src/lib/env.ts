import { z } from 'zod'

function optionalValue<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() || undefined : value),
    schema.optional()
  )
}

const httpUrl = optionalValue(
  z.url({
    protocol: /^https?$/,
    error: 'Must be an http(s) URL, including the scheme',
  })
)

function deprecatedVariable(replacement: string) {
  return z.undefined({
    error: `Deprecated variable; remove it and use ${replacement} instead`,
  })
}

export const runtimeEnvSchema = z.object({
  PUBLIC_E2B_DOMAIN: z.string().trim().min(1, 'Set PUBLIC_E2B_DOMAIN'),
  PUBLIC_SANDBOX_URL: httpUrl,
  E2B_INFRA_API_URL: httpUrl,
  E2B_DASHBOARD_API_URL: httpUrl,

  // Reject the SDK alias too, or its own environment fallback can override routing.
  E2B_SANDBOX_URL: deprecatedVariable('PUBLIC_SANDBOX_URL'),
  NEXT_PUBLIC_E2B_DOMAIN: deprecatedVariable('PUBLIC_E2B_DOMAIN'),
  NEXT_PUBLIC_INFRA_API_URL: deprecatedVariable('E2B_INFRA_API_URL'),
  NEXT_PUBLIC_DASHBOARD_API_URL: deprecatedVariable('E2B_DASHBOARD_API_URL'),
  NEXT_PUBLIC_E2B_SANDBOX_URL: deprecatedVariable('PUBLIC_SANDBOX_URL'),
})

export const serverSchema = runtimeEnvSchema.extend({
  // Pre-authenticates the deployment and skips the API key form.
  E2B_API_KEY: z.string().min(1).optional(),
  DASHBOARD_COOKIE_SECURE: optionalValue(
    z
      .string()
      .toLowerCase()
      .pipe(
        z.enum(['true', 'false'], {
          error: 'DASHBOARD_COOKIE_SECURE must be true or false',
        })
      )
  ),

  OTEL_SERVICE_NAME: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalValue(z.url()),
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
  NEXT_PUBLIC_VERCEL_ENV: z
    .enum(['production', 'preview', 'development'])
    .optional(),
})

export const appEnvSchema = serverSchema.merge(clientSchema)

export type Env = z.infer<typeof appEnvSchema>

export function validateEnv(schema: z.ZodSchema) {
  const parsed = schema.safeParse(process.env)

  if (!parsed.success) {
    console.error(z.prettifyError(parsed.error))
    process.exit(1)
  }

  console.log('✅ Environment variables validated successfully')
}
