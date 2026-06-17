import 'server-only'

import { PostHog } from 'posthog-node'

const POSTHOG_HOST = 'https://us.i.posthog.com'

let postHogClient: PostHog | null | undefined

function getPostHogProjectKey() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()
  return key || null
}

export function getPostHogServerClient() {
  if (postHogClient !== undefined) {
    return postHogClient
  }

  const projectKey = getPostHogProjectKey()

  if (!projectKey) {
    postHogClient = null
    return postHogClient
  }

  postHogClient = new PostHog(projectKey, {
    host: POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
    requestTimeout: 3000,
    featureFlagsRequestTimeoutMs: 1500,
    disableGeoip: true,
    featureFlagsLogWarnings: false,
  })

  return postHogClient
}
