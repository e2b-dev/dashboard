import 'server-only'

import { LaunchDarklyProvider } from '@launchdarkly/openfeature-node-server'
import { type Client, OpenFeature } from '@openfeature/server-sdk'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

const OPENFEATURE_DOMAIN = 'dashboard-feature-flags'
const LAUNCHDARKLY_INIT_TIMEOUT_SECONDS = 3
const LAUNCHDARKLY_INIT_RETRY_INTERVAL_MS = 60_000

let openFeatureClientPromise: Promise<Client | null> | undefined
let launchDarklyInitializationFailedAt: number | undefined
let loggedMissingLaunchDarklyKey = false

function getLaunchDarklySdkKey() {
  const key = process.env.LAUNCHDARKLY_SDK_KEY?.trim()
  return key || null
}

async function initializeOpenFeatureClient(sdkKey: string) {
  try {
    const provider = new LaunchDarklyProvider(
      sdkKey,
      {
        sendEvents: false,
      },
      LAUNCHDARKLY_INIT_TIMEOUT_SECONDS
    )

    await OpenFeature.setProviderAndWait(OPENFEATURE_DOMAIN, provider)
    launchDarklyInitializationFailedAt = undefined

    return OpenFeature.getClient(OPENFEATURE_DOMAIN)
  } catch (error) {
    launchDarklyInitializationFailedAt = Date.now()
    l.warn(
      {
        key: 'feature_flags:launchdarkly_initialization_failed',
        error: serializeErrorForLog(error),
      },
      'LaunchDarkly OpenFeature provider initialization failed'
    )

    return null
  }
}

function shouldRetryFailedInitialization() {
  return (
    launchDarklyInitializationFailedAt !== undefined &&
    Date.now() - launchDarklyInitializationFailedAt >=
      LAUNCHDARKLY_INIT_RETRY_INTERVAL_MS
  )
}

export function getOpenFeatureServerClient() {
  if (openFeatureClientPromise !== undefined) {
    if (shouldRetryFailedInitialization()) {
      openFeatureClientPromise = undefined
      launchDarklyInitializationFailedAt = undefined
    } else {
      return openFeatureClientPromise
    }
  }

  const sdkKey = getLaunchDarklySdkKey()

  if (!sdkKey) {
    if (!loggedMissingLaunchDarklyKey) {
      loggedMissingLaunchDarklyKey = true
      l.warn(
        { key: 'feature_flags:launchdarkly_unconfigured' },
        'LaunchDarkly feature flags are disabled because LAUNCHDARKLY_SDK_KEY is missing'
      )
    }

    openFeatureClientPromise = Promise.resolve(null)
    return openFeatureClientPromise
  }

  openFeatureClientPromise = initializeOpenFeatureClient(sdkKey)
  return openFeatureClientPromise
}
