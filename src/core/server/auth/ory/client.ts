import 'server-only'

import { Configuration, IdentityApi, OAuth2Api } from '@ory/client-fetch'

let cachedIdentityApi: IdentityApi | null = null
let cachedOAuth2Api: OAuth2Api | null = null

// the IdentityApi requires the Ory project admin token (PAT). callers should
// ensure ORY_PROJECT_API_TOKEN is set at deploy time when AUTH_PROVIDER=ory.
export function getOryIdentityApi(): IdentityApi {
  if (cachedIdentityApi) return cachedIdentityApi

  cachedIdentityApi = new IdentityApi(getOryConfiguration())
  return cachedIdentityApi
}

export function getOryOAuth2Api(): OAuth2Api {
  if (cachedOAuth2Api) return cachedOAuth2Api

  cachedOAuth2Api = new OAuth2Api(getOryConfiguration())
  return cachedOAuth2Api
}

function getOryConfiguration(): Configuration {
  const basePath = process.env.ORY_SDK_URL
  const accessToken = process.env.ORY_PROJECT_API_TOKEN

  if (!basePath) {
    throw new Error('ORY_SDK_URL is not configured')
  }
  if (!accessToken) {
    throw new Error('ORY_PROJECT_API_TOKEN is not configured')
  }

  return new Configuration({
    basePath: basePath.replace(/\/$/, ''),
    accessToken,
  })
}
