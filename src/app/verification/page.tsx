import { getVerificationFlow, type OryPageParams } from '@ory/nextjs/app'
import { redirect } from 'next/navigation'
import { isOryCustomUiEnabled } from '@/configs/env-flags'
import oryConfig from '@/configs/ory'
import { PROTECTED_URLS } from '@/configs/urls'
import { getOryConfigForRequest } from '@/core/server/auth/ory/request-config'
import { VerificationCard } from './verification-card'

export const dynamic = 'force-dynamic'

// Mirrors /login; see src/app/login/page.tsx. No legacy page, so the disabled
// fallback is the dashboard.
export default async function OryVerificationPage(props: OryPageParams) {
  if (!isOryCustomUiEnabled()) {
    redirect(PROTECTED_URLS.DASHBOARD)
  }

  const flow = await getVerificationFlow(oryConfig, props.searchParams)

  if (!flow) {
    return null
  }

  const config = await getOryConfigForRequest()

  return <VerificationCard flow={flow} config={config} />
}
