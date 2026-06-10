import 'server-only'

import { Configuration, OAuth2Api } from '@ory/client-fetch'

// Hydra's admin API exposes the OAuth2 login/consent/logout flow endpoints
// (acceptOAuth2LoginRequest, etc.) that any login-provider must call to
// complete a challenge. This is a *different* surface from the IdentityApi
// in client.ts:
//   - IdentityApi talks to Ory Network's identity admin (gated by a PAT).
//   - OAuth2Api talks to Hydra's admin endpoints — when self-hosting Hydra
//     these are unauthenticated on a private network (`:4445` in our
//     devenv); on Ory Network they ride the same PAT.
//
// We therefore resolve the admin URL with the following precedence:
//   1. ORY_HYDRA_ADMIN_URL (explicit; set for self-hosted Hydra where
//      admin is on a different port from the public SDK).
//   2. ORY_SDK_URL (Ory Network: admin === public).
//
// The PAT is attached *only* when one is configured (ORY_PROJECT_API_TOKEN),
// matching the IdentityApi behaviour. Local-dev Hydra ignores it; Ory
// Network requires it. Same code path, different deploy targets.

let cached: OAuth2Api | null = null

export function getHydraOAuth2Api(): OAuth2Api {
  if (cached) return cached

  const basePath =
    process.env.ORY_HYDRA_ADMIN_URL ?? process.env.ORY_SDK_URL ?? null
  if (!basePath) {
    throw new Error('Neither ORY_HYDRA_ADMIN_URL nor ORY_SDK_URL is configured')
  }

  const accessToken = process.env.ORY_PROJECT_API_TOKEN

  cached = new OAuth2Api(
    new Configuration({
      basePath: basePath.replace(/\/$/, ''),
      ...(accessToken ? { accessToken } : {}),
    })
  )
  return cached
}
