import 'server-only'

import { Configuration, IdentityApi, OAuth2Api } from '@ory/client-fetch'

let cachedIdentityApi: IdentityApi | null = null
let cachedOAuth2Api: OAuth2Api | null = null

// IdentityApi resolution:
//   1. ORY_KRATOS_ADMIN_URL — self-hosted Kratos admin (e.g. local devenv :4434).
//   2. ORY_SDK_URL          — Ory Network (identity admin co-located on the SDK host).
//
// OAuth2Api resolution:
//   1. ORY_HYDRA_ADMIN_URL  — self-hosted Hydra admin (e.g. local devenv :4445).
//   2. ORY_SDK_URL          — Ory Network (OAuth2 admin co-located on the SDK host).
//
// The PAT is attached only when configured: Ory Network gates on it,
// self-hosted admin surfaces are gated by network reachability instead.
export function getOryIdentityApi(): IdentityApi {
  if (cachedIdentityApi) return cachedIdentityApi

  cachedIdentityApi = new IdentityApi(
    getOryConfiguration(process.env.ORY_KRATOS_ADMIN_URL)
  )

  return cachedIdentityApi
}

export function getOryOAuth2Api(): OAuth2Api {
  if (cachedOAuth2Api) return cachedOAuth2Api

  cachedOAuth2Api = new OAuth2Api(
    getOryConfiguration(process.env.ORY_HYDRA_ADMIN_URL)
  )
  return cachedOAuth2Api
}

function getOryConfiguration(basePathOverride?: string): Configuration {
  const basePath = basePathOverride ?? process.env.ORY_SDK_URL

  if (!basePath) {
    throw new Error('ORY_SDK_URL is not configured')
  }

  const accessToken = process.env.ORY_PROJECT_API_TOKEN

  return new Configuration({
    basePath: basePath.replace(/\/$/, ''),
    ...(accessToken ? { accessToken } : {}),
  })
}
