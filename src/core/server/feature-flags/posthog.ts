import 'server-only'

import { PostHog } from 'posthog-node'
import type {
  BooleanFeatureFlagDefinition,
  JsonFeatureFlagDefinition,
} from '@/configs/flags'
import type { FeatureFlagContextInput } from '@/core/server/feature-flags/context'
import type { FeatureFlagProvider } from '@/core/server/feature-flags/flags.server'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

// Direct PostHog ingestion host (not the client `/ph-proxy` reverse proxy) so
// the flag-evaluation request works the same in Edge middleware and Node.
const POSTHOG_HOST = 'https://us.i.posthog.com'

// The flags this provider serves target environment/release conditions rather
// than a single user, so bucketing is immaterial — a constant id keeps anonymous
// pre-auth evaluation stable and consistent across middleware and pages.
const ANONYMOUS_DISTINCT_ID = 'anonymous-server'

let postHogClient: PostHog | null | undefined

function getPostHogClient(): PostHog | null {
  if (postHogClient !== undefined) {
    return postHogClient
  }

  // Prefer a server-only key so flag evaluation can run without exposing a
  // public key — self-hosted/local-dev can set POSTHOG_FLAGS_KEY for flags-only
  // (no browser analytics, since the client never gets NEXT_PUBLIC_POSTHOG_KEY).
  // Falls back to the public key for deployments that share one.
  const apiKey =
    process.env.POSTHOG_FLAGS_KEY?.trim() ||
    process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()
  if (!apiKey) {
    postHogClient = null
    return null
  }

  // Flag-only client: feature-flag events are disabled per evaluation, so there
  // is nothing to flush and no shutdown is needed between requests. Reused as a
  // module singleton across invocations.
  postHogClient = new PostHog(apiKey, {
    host: POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
    disableGeoip: true,
  })

  return postHogClient
}

// PostHog release conditions target this person property, sent on every
// evaluation so anonymous, pre-auth visitors are still gated by deploy stage.
// On Vercel VERCEL_ENV is 'production' | 'preview' | 'development' and its
// build-time value matches the deployment target; falls back to NODE_ENV for
// non-Vercel (self-hosted/local) builds, defaulting to 'production' so
// production-like environments stay off unless explicitly targeted.
function resolveEnvironment(): string {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'production'
}

function evaluationProperties(
  context: FeatureFlagContextInput
): Record<string, string> {
  return {
    environment: resolveEnvironment(),
    ...(context.teamId ? { team_id: context.teamId } : {}),
  }
}

function distinctIdFor(context: FeatureFlagContextInput): string {
  return context.userId ?? ANONYMOUS_DISTINCT_ID
}

async function getBoolean(
  flag: BooleanFeatureFlagDefinition,
  context: FeatureFlagContextInput
): Promise<boolean> {
  const client = getPostHogClient()

  if (!client) {
    return flag.defaultValue
  }

  try {
    const enabled = await client.isFeatureEnabled(
      flag.key,
      distinctIdFor(context),
      {
        // Pure gate: don't emit `$feature_flag_called` from the Edge/serverless
        // hot path (those events would queue and need flushing).
        sendFeatureFlagEvents: false,
        personProperties: evaluationProperties(context),
      }
    )

    return enabled ?? flag.defaultValue
  } catch (error) {
    l.warn(
      {
        key: 'posthog:boolean_evaluation_failed',
        context: { flagKey: flag.key },
        error: serializeErrorForLog(error),
      },
      'PostHog boolean flag evaluation failed'
    )

    return flag.defaultValue
  }
}

async function getJson<T>(
  flag: JsonFeatureFlagDefinition<T>,
  context: FeatureFlagContextInput
): Promise<unknown> {
  const client = getPostHogClient()

  if (!client) {
    return flag.defaultValue
  }

  try {
    const payload = await client.getFeatureFlagPayload(
      flag.key,
      distinctIdFor(context),
      undefined,
      {
        personProperties: evaluationProperties(context),
      }
    )

    return payload ?? flag.defaultValue
  } catch (error) {
    l.warn(
      {
        key: 'posthog:json_evaluation_failed',
        context: { flagKey: flag.key },
        error: serializeErrorForLog(error),
      },
      'PostHog JSON flag evaluation failed'
    )

    return flag.defaultValue
  }
}

export const postHogFeatureFlagProvider: FeatureFlagProvider = {
  getBoolean,
  getJson,
}
