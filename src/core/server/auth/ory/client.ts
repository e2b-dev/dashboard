import 'server-only'

import { Configuration, IdentityApi } from '@ory/client-fetch'

let cached: IdentityApi | null = null

// the IdentityApi requires the Ory project admin token (PAT). callers should
// ensure ORY_PROJECT_API_TOKEN is set at deploy time when AUTH_PROVIDER=ory.
export function getOryIdentityApi(): IdentityApi {
  if (cached) return cached

  const basePath = process.env.ORY_SDK_URL
  const accessToken = process.env.ORY_PROJECT_API_TOKEN

  if (!basePath) {
    throw new Error('ORY_SDK_URL is not configured')
  }
  if (!accessToken) {
    throw new Error('ORY_PROJECT_API_TOKEN is not configured')
  }

  cached = new IdentityApi(
    new Configuration({
      basePath: basePath.replace(/\/$/, ''),
      accessToken,
    })
  )
  return cached
}
