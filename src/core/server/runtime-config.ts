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

function parsedUrl(value: string | undefined): URL | undefined {
  if (!value) {
    return undefined
  }

  try {
    return new URL(value)
  } catch {
    return undefined
  }
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
 * The hostname of `protocol://host`, or undefined when the host is absent or
 * does not parse. A proxy header can carry anything, and an unparseable one
 * must fall through to the next candidate rather than take the endpoint down.
 */
function hostnameOf(
  protocol: string,
  host: string | undefined
): string | undefined {
  // Without this guard `http://undefined` parses, to the hostname
  // "undefined".
  if (!host) {
    return undefined
  }

  try {
    // Through URL so an IPv6 literal keeps its brackets and any port on the
    // incoming host is dropped before this one is appended.
    return new URL(`${protocol}://${host}`).hostname || undefined
  } catch {
    return undefined
  }
}

/**
 * The host the client reached this server on, with `port` substituted, or
 * undefined when the request carries no usable host at all. Built from the
 * proxy headers first so a reverse-proxied install advertises the public host
 * rather than its own internal one, falling back to the request URL.
 *
 * The request URL is optional because a tRPC procedure called from a server
 * component is given the request headers but no URL. http is the guess for a
 * request that carries neither a forwarded protocol nor a URL, which is the
 * plain self-hosted case; a proxied install sets X-Forwarded-Proto.
 */
function requestOrigin(
  headers: Headers,
  requestUrl: string | undefined,
  port: string
): string | undefined {
  const url = parsedUrl(requestUrl)
  const protocol =
    forwardedProtocol(headers) ?? url?.protocol.replace(/:$/, '') ?? 'http'

  // Each candidate is parsed in turn, so a malformed proxy header falls
  // through to the next one instead of discarding a good host below it.
  const hostname =
    hostnameOf(protocol, trimmed(headers.get('x-forwarded-host'))) ??
    hostnameOf(protocol, trimmed(headers.get('host'))) ??
    url?.hostname

  return hostname ? `${protocol}://${hostname}:${port}` : undefined
}

/**
 * The base URL for sandbox traffic that a server-side SDK call should use,
 * resolved per request: the configured value, then the request host on the
 * sandbox port for a runtime-configured install, then undefined so the SDK
 * derives the host from the domain.
 *
 * The request-host default applies only when E2B_INFRA_API_URL is set. Hosted
 * deployments set none of the E2B_* variables and must keep passing no sandbox
 * URL at all; a self-hosted install configured at runtime is the only
 * deployment that wants "the host this request arrived on, on the sandbox
 * port".
 *
 * The browser is told the same thing by `GET /api/config`, and the two have to
 * agree. A self-hosted install leaves E2B_SANDBOX_URL unset precisely so every
 * browser gets the host it reached the dashboard on, remote ones included —
 * resolving the server side from the environment alone left it on the
 * build-time domain, and calls such as killing a terminal's pty went to a host
 * that does not exist.
 */
export function resolveServerSandboxUrl(
  headers: Headers,
  requestUrl: string | undefined
): string | undefined {
  const configured = resolveSandboxUrl()

  if (configured) {
    return configured
  }

  if (!trimmed(process.env.E2B_INFRA_API_URL)) {
    return undefined
  }

  return requestOrigin(headers, requestUrl, SANDBOX_DEFAULT_PORT)
}

/**
 * The URLs a browser needs, resolved per request. The sandbox URL is whatever
 * the server itself would use, so the browser and the server-side SDK calls
 * never talk to different sandbox hosts.
 *
 * A null infra URL means the request carried no host to fall back to, which
 * leaves the browser on its build-time value rather than on a guess.
 */
export function resolveBrowserRuntimeConfig(
  headers: Headers,
  requestUrl: string
): BrowserRuntimeConfig {
  const domain = trimmed(process.env.NEXT_PUBLIC_E2B_DOMAIN)
  const configured = configuredInfraApiUrl()

  let infraApiUrl: string | null

  if (configured) {
    infraApiUrl = assertHttpUrl(configured)
  } else if (domain) {
    infraApiUrl = `https://api.${domain}`
  } else {
    infraApiUrl =
      requestOrigin(headers, requestUrl, INFRA_API_DEFAULT_PORT) ?? null
  }

  return {
    infraApiUrl,
    sandboxUrl: resolveServerSandboxUrl(headers, requestUrl) ?? null,
  }
}
