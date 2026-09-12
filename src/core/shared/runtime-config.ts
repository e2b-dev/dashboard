/**
 * Server-resolved URLs the browser needs. Delivered by `GET /api/config`
 * rather than inlined at build time, so one prebuilt image works on any host.
 */
export interface BrowserRuntimeConfig {
  infraApiUrl: string | null
  sandboxUrl: string | null
}

const RUNTIME_CONFIG_URL = '/api/config'

/**
 * What a hosted deployment bakes into the browser bundle. Also the fallback
 * when the endpoint cannot be reached, so a browser is never worse off than
 * before the endpoint existed.
 */
function buildTimeConfig(): BrowserRuntimeConfig {
  return {
    infraApiUrl: process.env.NEXT_PUBLIC_INFRA_API_URL ?? null,
    sandboxUrl: process.env.NEXT_PUBLIC_E2B_SANDBOX_URL ?? null,
  }
}

let cached: Promise<BrowserRuntimeConfig> | null = null

/**
 * What the endpoint resolved, or null when it could not be reached. Never
 * rejects, so the caller below always gets to decide what to cache.
 */
async function requestRuntimeConfig(): Promise<BrowserRuntimeConfig | null> {
  try {
    const response = await fetch(RUNTIME_CONFIG_URL, { cache: 'no-store' })

    if (!response.ok) {
      return null
    }

    const body = (await response.json()) as Partial<BrowserRuntimeConfig>
    const fallback = buildTimeConfig()

    return {
      infraApiUrl: body.infraApiUrl ?? fallback.infraApiUrl,
      sandboxUrl: body.sandboxUrl ?? fallback.sandboxUrl,
    }
  } catch {
    return null
  }
}

export function fetchRuntimeConfig(): Promise<BrowserRuntimeConfig> {
  if (!cached) {
    const attempt: Promise<BrowserRuntimeConfig> = requestRuntimeConfig().then(
      (resolved) => {
        if (resolved) {
          return resolved
        }

        // The endpoint did not answer. Everyone already waiting on this
        // attempt shares its fallback, but the cache is dropped so the next
        // caller retries rather than being pinned to the build-time values
        // for the life of the page. Guarded so a slow failure cannot clear a
        // newer attempt that replaced it.
        if (cached === attempt) {
          cached = null
        }

        return buildTimeConfig()
      }
    )

    cached = attempt
  }

  return cached
}

export function resetRuntimeConfigCache(): void {
  cached = null
}
