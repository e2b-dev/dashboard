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

type LaunchDarklyGlobal = typeof globalThis & {
  __dashboardLaunchDarklyClient?: LDClient
  __dashboardLaunchDarklyInitialization?: Promise<LDClient | null>
  __dashboardLaunchDarklyReady?: boolean
}

function getLaunchDarklyGlobal() {
  return globalThis as LaunchDarklyGlobal
}

function getLaunchDarklySdkKey() {
  const key = process.env.LAUNCHDARKLY_SDK_KEY?.trim()
  return key || null
}

function getLaunchDarklyClient() {
  const sdkKey = getLaunchDarklySdkKey()

  if (!sdkKey) {
    return null
  }

  const ldGlobal = getLaunchDarklyGlobal()

  if (!ldGlobal.__dashboardLaunchDarklyClient) {
    ldGlobal.__dashboardLaunchDarklyClient = init(sdkKey, {
      logger: basicLogger({ level: 'warn' }),
    })
    ldGlobal.__dashboardLaunchDarklyReady = false
    ldGlobal.__dashboardLaunchDarklyInitialization = undefined
  }

  return ldGlobal.__dashboardLaunchDarklyClient
}

async function getInitializedLaunchDarklyClient() {
  const client = getLaunchDarklyClient()

  if (!client) {
    return null
  }

  const ldGlobal = getLaunchDarklyGlobal()

  if (ldGlobal.__dashboardLaunchDarklyReady) {
    return client
  }

  ldGlobal.__dashboardLaunchDarklyInitialization ??= client
    .waitForInitialization({
      timeout: INITIALIZATION_TIMEOUT_SECONDS,
    })
    .then(() => {
      ldGlobal.__dashboardLaunchDarklyReady = true
      return client
    })
    .catch((error: unknown) => {
      ldGlobal.__dashboardLaunchDarklyInitialization = undefined

      l.warn(
        {
          key: 'launchdarkly:initialization_failed',
          error: serializeErrorForLog(error),
        },
        'LaunchDarkly initialization failed'
      )

      return null
    })

  return ldGlobal.__dashboardLaunchDarklyInitialization
}

export function createLaunchDarklyContext({
  userId,
  teamId,
}: FeatureFlagContextInput): LDContext {
  if (!teamId) {
    return {
      kind: 'user',
      key: userId,
    }
  }

  return {
    kind: 'multi',
    user: {
      key: userId,
    },
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
