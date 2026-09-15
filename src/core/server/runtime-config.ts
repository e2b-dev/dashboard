/**
 * Where this deployment's APIs live.
 *
 * Hosted deployments are configured with NEXT_PUBLIC_* variables, which Next
 * inlines into the bundles at build time. PUBLIC_* and E2B_* variables have no
 * special meaning to Next, so Node reads them at runtime and one image can
 * serve any install. The NEXT_PUBLIC_* values stay as the fallback, so a
 * deployment that sets none of the new variables resolves exactly as before.
 *
 * Runtime values are checked by the instrumentation hook before the server
 * is ready, and by these resolvers whenever they are used.
 */

import 'server-only'
import { isSecureCookie } from '@/configs/cookies'
import type { BrowserRuntimeConfig } from '@/core/shared/runtime-config'

interface ResolvedValue {
  name: string
  value: string
}

function trimmed(value: string | null | undefined): string | undefined {
  return value?.trim() || undefined
}

function firstSet(
  ...candidates: Array<[name: string, value: string | undefined]>
): ResolvedValue | undefined {
  for (const [name, value] of candidates) {
    const cleaned = trimmed(value)

    if (cleaned) {
      return { name, value: cleaned }
    }
  }

  return undefined
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)

    // A scheme-less "localhost:3010" parses as the scheme "localhost", so the
    // protocol has to be checked as well.
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

function assertHttpUrl({ name, value }: ResolvedValue): string {
  if (!isHttpUrl(value)) {
    throw new Error(
      `${name} is not an http(s) URL: "${value}" (include the scheme, e.g. http://127.0.0.1:3000)`
    )
  }

  return value
}

function configuredInfraApiUrl(): ResolvedValue | undefined {
  return firstSet(
    ['E2B_INFRA_API_URL', process.env.E2B_INFRA_API_URL],
    ['NEXT_PUBLIC_INFRA_API_URL', process.env.NEXT_PUBLIC_INFRA_API_URL]
  )
}

export function resolveE2BDomain(): string | undefined {
  return firstSet(
    ['PUBLIC_E2B_DOMAIN', process.env.PUBLIC_E2B_DOMAIN],
    ['NEXT_PUBLIC_E2B_DOMAIN', process.env.NEXT_PUBLIC_E2B_DOMAIN]
  )?.value
}

export function resolveInfraApiUrl(): string {
  const configured = configuredInfraApiUrl()

  return configured
    ? assertHttpUrl(configured)
    : `https://api.${resolveE2BDomain()}`
}

export function resolveDashboardApiUrl(): string {
  const configured = firstSet(
    ['E2B_DASHBOARD_API_URL', process.env.E2B_DASHBOARD_API_URL],
    ['NEXT_PUBLIC_DASHBOARD_API_URL', process.env.NEXT_PUBLIC_DASHBOARD_API_URL]
  )

  return configured
    ? assertHttpUrl(configured)
    : `https://dashboard-api.${resolveE2BDomain()}`
}

/**
 * The base URL for sandbox traffic, or undefined to let the SDK derive one
 * from the domain. E2B_SANDBOX_URL stays supported as an alias, including for
 * installs that share the setting with other E2B SDK consumers.
 */
export function resolveSandboxUrl(): string | undefined {
  const configured = firstSet(
    ['PUBLIC_SANDBOX_URL', process.env.PUBLIC_SANDBOX_URL],
    ['E2B_SANDBOX_URL', process.env.E2B_SANDBOX_URL],
    ['NEXT_PUBLIC_E2B_SANDBOX_URL', process.env.NEXT_PUBLIC_E2B_SANDBOX_URL]
  )

  return configured ? assertHttpUrl(configured) : undefined
}

/** Only operator configuration may select a sandbox destination. */
export function resolveBrowserRuntimeConfig(): BrowserRuntimeConfig {
  return {
    domain: resolveE2BDomain() ?? null,
    sandboxUrl: resolveSandboxUrl() ?? null,
  }
}

export function validateRuntimeConfig(): void {
  resolveInfraApiUrl()
  resolveDashboardApiUrl()
  resolveSandboxUrl()
  isSecureCookie()
}
