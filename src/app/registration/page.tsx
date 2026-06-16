import { getRegistrationFlow, type OryPageParams } from '@ory/nextjs/app'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import oryConfig from '@/configs/ory'
import { AUTH_URLS } from '@/configs/urls'
import { isOryCustomUiEnabled } from '@/core/server/feature-flags/ory-custom-ui.server'
import { RegistrationCard } from './registration-card'

// Evaluate the PostHog `ory-custom-ui` flag per request (not at build time) so
// the rollout can be flipped per environment without a redeploy.
export const dynamic = 'force-dynamic'

// Mirrors /login (see src/app/login/page.tsx for the flow-fetch and sdk.url reasoning).
export default async function OryRegistrationPage(props: OryPageParams) {
  // The custom Elements UI is staging/preview-only; production uses Ory's
  // existing flow via /sign-up.
  if (!(await isOryCustomUiEnabled())) {
    redirect(AUTH_URLS.SIGN_UP)
  }

  const flow = await getRegistrationFlow(oryConfig, props.searchParams)

  if (!flow) {
    return null
  }

  const requestHeaders = await headers()
  const host = requestHeaders.get('host')
  const proto = requestHeaders.get('x-forwarded-proto') ?? 'http'
  const config = host
    ? { ...oryConfig, sdk: { ...oryConfig.sdk, url: `${proto}://${host}` } }
    : oryConfig

  return <RegistrationCard flow={flow} config={config} />
}
