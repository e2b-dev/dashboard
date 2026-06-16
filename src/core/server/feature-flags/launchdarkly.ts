import 'server-only'

import {
  basicLogger,
  init,
  type LDClient,
  type LDContext,
} from '@launchdarkly/node-server-sdk'
import type {
  BooleanFeatureFlagDefinition,
  JsonFeatureFlagDefinition,
} from '@/configs/flags'
import type { FeatureFlagContextInput } from '@/core/server/feature-flags/context'
import type { FeatureFlagProvider } from '@/core/server/feature-flags/flags.server'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

const INITIALIZATION_TIMEOUT_SECONDS = 5

let launchDarklyClient: LDClient | undefined
let launchDarklyInitialization: Promise<LDClient | null> | undefined
let launchDarklyReady = false

function getLaunchDarklySdkKey() {
  const key = process.env.LAUNCHDARKLY_SDK_KEY?.trim()
  return key || null
}

function getLaunchDarklyClient() {
  const sdkKey = getLaunchDarklySdkKey()

  if (!sdkKey) {
    return null
  }

  if (!launchDarklyClient) {
    launchDarklyClient = init(sdkKey, {
      logger: basicLogger({ level: 'warn' }),
    })
    launchDarklyReady = false
    launchDarklyInitialization = undefined
  }

  return launchDarklyClient
}

async function getInitializedLaunchDarklyClient() {
  const client = getLaunchDarklyClient()

  if (!client) {
    return null
  }

  if (launchDarklyReady) {
    return client
  }

  launchDarklyInitialization ??= client
    .waitForInitialization({
      timeout: INITIALIZATION_TIMEOUT_SECONDS,
    })
    .then(() => {
      launchDarklyReady = true
      return client
    })
    .catch((error: unknown) => {
      launchDarklyInitialization = undefined

      l.warn(
        {
          key: 'launchdarkly:initialization_failed',
          error: serializeErrorForLog(error),
        },
        'LaunchDarkly initialization failed'
      )

      return null
    })

  return launchDarklyInitialization
}

const ANONYMOUS_USER_KEY = 'anonymous'

export function createLaunchDarklyContext({
  userId,
  teamId,
}: FeatureFlagContextInput): LDContext {
  const userContext = userId
    ? { key: userId }
    : { key: ANONYMOUS_USER_KEY, anonymous: true as const }

  if (!teamId) {
    return {
      kind: 'user',
      ...userContext,
    }
  }

  return {
    kind: 'multi',
    user: userContext,
    team: {
      key: teamId,
    },
  }
}

async function getBooleanVariation(
  flag: BooleanFeatureFlagDefinition,
  context: FeatureFlagContextInput
) {
  const client = await getInitializedLaunchDarklyClient()

  if (!client) {
    return flag.defaultValue
  }

  try {
    return await client.boolVariation(
      flag.key,
      createLaunchDarklyContext(context),
      flag.defaultValue
    )
  } catch (error) {
    l.warn(
      {
        key: 'launchdarkly:boolean_evaluation_failed',
        context: { flagKey: flag.key },
        error: serializeErrorForLog(error),
      },
      'LaunchDarkly boolean flag evaluation failed'
    )

    return flag.defaultValue
  }
}

async function getJsonVariation<T>(
  flag: JsonFeatureFlagDefinition<T>,
  context: FeatureFlagContextInput
) {
  const client = await getInitializedLaunchDarklyClient()

  if (!client) {
    return flag.defaultValue
  }

  try {
    return await client.jsonVariation(
      flag.key,
      createLaunchDarklyContext(context),
      flag.defaultValue
    )
  } catch (error) {
    l.warn(
      {
        key: 'launchdarkly:json_evaluation_failed',
        context: { flagKey: flag.key },
        error: serializeErrorForLog(error),
      },
      'LaunchDarkly JSON flag evaluation failed'
    )

    return flag.defaultValue
  }
}

export const launchDarklyFeatureFlagProvider: FeatureFlagProvider = {
  getBoolean: getBooleanVariation,
  getJson: getJsonVariation,
}
