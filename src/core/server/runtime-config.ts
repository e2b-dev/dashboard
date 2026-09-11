import 'server-only'

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

interface ResolvedValue {
  name: string
  value: string
}

function firstSet(
  ...candidates: Array<[name: string, value: string | undefined]>
): ResolvedValue | undefined {
  for (const [name, value] of candidates) {
    const trimmed = value?.trim()

    if (trimmed) {
      return { name, value: trimmed }
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
      `${name} is not a URL: "${value}" (include the scheme, e.g. http://127.0.0.1:3000)`
    )
  }

  return value
}

export function resolveInfraApiUrl(): string {
  const configured = firstSet(
    ['E2B_INFRA_API_URL', process.env.E2B_INFRA_API_URL],
    ['NEXT_PUBLIC_INFRA_API_URL', process.env.NEXT_PUBLIC_INFRA_API_URL]
  )

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
