/**
 * Where this deployment's APIs live.
 *
 * Hosted deployments are configured with NEXT_PUBLIC_* variables, which Next
 * inlines into the bundles at build time — a prebuilt container image cannot
 * use them. The E2B_* variables here carry no NEXT_PUBLIC_ prefix, so Node
 * reads them from the environment when the server starts and one image can
 * serve any install. The NEXT_PUBLIC_* values stay as the fallback, so a
 * deployment that sets none of the new variables resolves exactly as before.
 *
 * The chosen value is validated here and not only by the schema in
 * `src/lib/env.ts`, which runs in dev, prebuild and tests but never inside a
 * running container. `api.ts` calls these resolvers at module scope, so a
 * malformed URL fails on the first server import however the process was
 * started, rather than surfacing later as an opaque fetch failure.
 */

import 'server-only'
import type { BrowserRuntimeConfig } from '@/core/shared/runtime-config'

const INFRA_API_DEFAULT_PORT = '3000'
const SANDBOX_DEFAULT_PORT = '3002'

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

export function resolveInfraApiUrl(): string {
  const configured = configuredInfraApiUrl()

  return configured
    ? assertHttpUrl(configured)
    : `https://api.${process.env.NEXT_PUBLIC_E2B_DOMAIN}`
}

export function resolveDashboardApiUrl(): string {
  const configured = firstSet(
    ['E2B_DASHBOARD_API_URL', process.env.E2B_DASHBOARD_API_URL],
    ['NEXT_PUBLIC_DASHBOARD_API_URL', process.env.NEXT_PUBLIC_DASHBOARD_API_URL]
  )

  return configured
    ? assertHttpUrl(configured)
    : `https://dashboard-api.${process.env.NEXT_PUBLIC_E2B_DOMAIN}`
}

/**
 * The base URL for sandbox traffic, or undefined to let the SDK derive one
 * from the domain. E2B_SANDBOX_URL is also read by the SDK itself for the same
 * purpose, so the shared name is deliberate.
 */
export function resolveSandboxUrl(): string | undefined {
  const configured = firstSet(
    ['E2B_SANDBOX_URL', process.env.E2B_SANDBOX_URL],
    ['NEXT_PUBLIC_E2B_SANDBOX_URL', process.env.NEXT_PUBLIC_E2B_SANDBOX_URL]
  )

  return configured ? assertHttpUrl(configured) : undefined
}

/**
 * The forwarded protocol, accepted only when it is http or https. The result
 * is served to the browser and handed to the SDK, so an unrecognised scheme
 * from this header has to be dropped rather than echoed.
 */
function forwardedProtocol(headers: Headers): string | undefined {
  const value = trimmed(
    headers.get('x-forwarded-proto')?.split(',')[0]
  )?.toLowerCase()

  return value === 'http' || value === 'https' ? value : undefined
}

/**
 * The hostname of `protocol://host`, or undefined when the host does not
 * parse. A proxy header can carry anything, and an unparseable one must not
 * take the whole endpoint down.
 */
function hostnameOf(protocol: string, host: string): string | undefined {
  try {
    // Through URL so an IPv6 literal keeps its brackets and any port on the
    // incoming host is dropped before this one is appended.
    return new URL(`${protocol}://${host}`).hostname || undefined
  } catch {
    return undefined
  }
}

/**
 * The host the browser reached this server on, with `port` substituted. Built
 * from the proxy headers first so a reverse-proxied install advertises the
 * public host rather than its own internal one, falling back to the request
 * URL, which is the one input guaranteed to parse.
 */
function requestOrigin(
  headers: Headers,
  requestUrl: string,
  port: string
): string {
  const url = new URL(requestUrl)
  const protocol = forwardedProtocol(headers) ?? url.protocol.replace(/:$/, '')
  const host =
    trimmed(headers.get('x-forwarded-host')) ??
    trimmed(headers.get('host')) ??
    url.host
  const hostname = hostnameOf(protocol, host) ?? url.hostname

  return `${protocol}://${hostname}:${port}`
}

/**
 * The URLs a browser needs, resolved per request.
 *
 * The request-host default for the sandbox URL applies only when
 * E2B_INFRA_API_URL is set. Hosted deployments set none of the E2B_* variables
 * and must keep passing no sandbox URL at all, so the SDK derives the sandbox
 * host from the domain exactly as it does today; a self-hosted install
 * configured at runtime is the only deployment that wants "the host you are
 * reading this page from, on the sandbox port".
 */
export function resolveBrowserRuntimeConfig(
  headers: Headers,
  requestUrl: string
): BrowserRuntimeConfig {
  const domain = trimmed(process.env.NEXT_PUBLIC_E2B_DOMAIN)
  const isRuntimeConfigured = Boolean(trimmed(process.env.E2B_INFRA_API_URL))
  const configured = configuredInfraApiUrl()

  let infraApiUrl: string

  if (configured) {
    infraApiUrl = assertHttpUrl(configured)
  } else if (domain) {
    infraApiUrl = `https://api.${domain}`
  } else {
    infraApiUrl = requestOrigin(headers, requestUrl, INFRA_API_DEFAULT_PORT)
  }

  const sandboxUrl =
    resolveSandboxUrl() ??
    (isRuntimeConfigured
      ? requestOrigin(headers, requestUrl, SANDBOX_DEFAULT_PORT)
      : null)

  return { infraApiUrl, sandboxUrl }
}
