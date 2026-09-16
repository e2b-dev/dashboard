import 'server-only'
import type { BrowserRuntimeConfig } from '@/core/shared/runtime-config'
import { runtimeEnvSchema } from '@/lib/env'

export function resolveE2BDomain(): string {
  return runtimeEnvSchema.parse(process.env).PUBLIC_E2B_DOMAIN
}

export function resolveInfraApiUrl(): string {
  const env = runtimeEnvSchema.parse(process.env)
  return env.E2B_INFRA_API_URL ?? `https://api.${env.PUBLIC_E2B_DOMAIN}`
}

export function resolveDashboardApiUrl(): string {
  const env = runtimeEnvSchema.parse(process.env)
  return (
    env.E2B_DASHBOARD_API_URL ??
    `https://dashboard-api.${env.PUBLIC_E2B_DOMAIN}`
  )
}

export function resolveSandboxUrl(): string | undefined {
  return runtimeEnvSchema.parse(process.env).PUBLIC_SANDBOX_URL
}

/** Only operator configuration may select a sandbox destination. */
export function resolveBrowserRuntimeConfig(): BrowserRuntimeConfig {
  const env = runtimeEnvSchema.parse(process.env)
  return {
    domain: env.PUBLIC_E2B_DOMAIN,
    sandboxUrl: env.PUBLIC_SANDBOX_URL ?? null,
  }
}
