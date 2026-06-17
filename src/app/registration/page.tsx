import { getRegistrationFlow, type OryPageParams } from '@ory/nextjs/app'
import { redirect } from 'next/navigation'
import { isOryCustomUiEnabled } from '@/configs/flags'
import oryConfig from '@/configs/ory'
import { AUTH_URLS } from '@/configs/urls'
import { getOryConfigForRequest } from '@/core/server/auth/ory/request-config'
import { RegistrationCard } from './registration-card'

export const dynamic = 'force-dynamic'

// Mirrors /login; see src/app/login/page.tsx.
export default async function OryRegistrationPage(props: OryPageParams) {
  if (!isOryCustomUiEnabled()) {
    redirect(AUTH_URLS.SIGN_UP)
  }

  const flow = await getRegistrationFlow(oryConfig, props.searchParams)

  if (!flow) {
    return null
  }

  const config = await getOryConfigForRequest()

  return <RegistrationCard flow={flow} config={config} />
}
