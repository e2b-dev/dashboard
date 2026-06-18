import 'server-only'

import { LaunchDarklyProvider } from '@launchdarkly/openfeature-node-server'
import { type Client, OpenFeature } from '@openfeature/server-sdk'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

const OPENFEATURE_DOMAIN = 'dashboard-feature-flags'
const LAUNCHDARKLY_INIT_TIMEOUT_SECONDS = 3

let openFeatureClientPromise: Promise<Client | null> | undefined
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

    return OpenFeature.getClient(OPENFEATURE_DOMAIN)
  } catch (error) {
    openFeatureClientPromise = undefined
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

export function getOpenFeatureServerClient() {
  if (openFeatureClientPromise !== undefined) {
    return openFeatureClientPromise
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
