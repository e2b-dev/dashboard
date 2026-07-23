import 'server-only'

import { cookies } from 'next/headers'
import { apiKeyHeaders } from '@/configs/api'
import { COOKIE_KEYS, COOKIE_OPTIONS } from '@/configs/cookies'
import { infra } from '@/core/shared/clients/api'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

/**
 * Returns the team API key for the current request, or null when the user is
 * not "signed in".
 *
 * Sources, in order:
 * 1. `E2B_API_KEY` env var — single-user self-hosted deployments where the
 *    dashboard is pre-authenticated and the key form is skipped entirely.
 * 2. The httpOnly `e2b_api_key` cookie set by the key form on `/`.
 */
export async function getApiKey(): Promise<string | null> {
  const envApiKey = process.env.E2B_API_KEY
  if (envApiKey) return envApiKey

  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_KEYS.API_KEY)?.value ?? null
}

/**
 * True when the API key is provided via the E2B_API_KEY env var. In this mode
 * the key form and "change API key" affordances are hidden — the deployment is
 * permanently authenticated.
 */
export function isUsingEnvApiKey(): boolean {
  return Boolean(process.env.E2B_API_KEY)
}

export async function setApiKeyCookie(apiKey: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(
    COOKIE_KEYS.API_KEY,
    apiKey,
    COOKIE_OPTIONS[COOKIE_KEYS.API_KEY]
  )
}

export async function clearApiKeyCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_KEYS.API_KEY)
}

export type ValidateApiKeyResult =
  | { valid: true }
  | { valid: false; reason: 'unauthorized' | 'unavailable' }

/**
 * Validates an API key with a cheap infra-api call. Used by the key form on
 * `/` before persisting the cookie.
 */
export async function validateApiKey(
  apiKey: string
): Promise<ValidateApiKeyResult> {
  try {
    const result = await infra.GET('/v2/sandboxes', {
      params: {
        query: {
          limit: 1,
        },
      },
      headers: {
        ...apiKeyHeaders(apiKey),
      },
      cache: 'no-store',
    })

    if (result.response.ok) {
      return { valid: true }
    }

    const status = result.response.status
    if (status === 401 || status === 403) {
      return { valid: false, reason: 'unauthorized' }
    }

    l.error(
      {
        key: 'validate_api_key:unexpected_status',
        context: { status },
      },
      `API key validation failed with unexpected status ${status}`
    )

    return { valid: false, reason: 'unavailable' }
  } catch (error) {
    l.error(
      {
        key: 'validate_api_key:request_failed',
        error: serializeErrorForLog(error),
      },
      'API key validation request failed'
    )

    return { valid: false, reason: 'unavailable' }
  }
}
