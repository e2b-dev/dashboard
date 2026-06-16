import 'server-only'

import { isOryAuthEnabled, ORY_CUSTOM_UI_FLAG } from '@/configs/flags'
import { postHogFeatureFlags } from '@/core/server/feature-flags/flags.server'

// Gates the custom @ory/elements-react login/registration UI (the /login &
// /registration pages and the Ory SDK proxy forwarding in the middleware).
//
// Replaces the former NEXT_PUBLIC_ORY_CUSTOM_UI env flag with the PostHog
// `ory-custom-ui` flag so the rollout can be flipped per environment without a
// redeploy. The flag targets the `environment` person property the PostHog
// provider sends (preview/staging + local dev → on, production → off), so it
// evaluates consistently for anonymous, pre-auth visitors. On PostHog
// misconfiguration/outage it falls back to the flag default (off).
export async function isOryCustomUiEnabled(): Promise<boolean> {
  if (!isOryAuthEnabled()) {
    return false
  }

  return postHogFeatureFlags.getBoolean(ORY_CUSTOM_UI_FLAG, {})
}
