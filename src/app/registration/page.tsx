import { getRegistrationFlow, type OryPageParams } from '@ory/nextjs/app'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isOryCustomUiEnabled } from '@/configs/flags'
import oryConfig from '@/configs/ory'
import { AUTH_URLS } from '@/configs/urls'
import { RegistrationCard } from './registration-card'

// Mirrors /login (see src/app/login/page.tsx for the flow-fetch and sdk.url reasoning).
export default async function OryRegistrationPage(props: OryPageParams) {
  // The custom Elements UI is staging/preview-only; production uses Ory's
  // existing flow via /sign-up.
  if (!isOryCustomUiEnabled()) {
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
