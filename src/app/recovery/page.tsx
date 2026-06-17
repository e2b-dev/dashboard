import { getRecoveryFlow, type OryPageParams } from '@ory/nextjs/app'
import { redirect } from 'next/navigation'
import { isOryCustomUiEnabled } from '@/configs/flags'
import oryConfig from '@/configs/ory'
import { AUTH_URLS } from '@/configs/urls'
import { getOryConfigForRequest } from '@/core/server/auth/ory/request-config'
import { RecoveryCard } from './recovery-card'

export const dynamic = 'force-dynamic'

// Mirrors /login; see src/app/login/page.tsx.
export default async function OryRecoveryPage(props: OryPageParams) {
  if (!isOryCustomUiEnabled()) {
    redirect(AUTH_URLS.FORGOT_PASSWORD)
  }

  const flow = await getRecoveryFlow(oryConfig, props.searchParams)

  if (!flow) {
    return null
  }

  const config = await getOryConfigForRequest()

  return <RecoveryCard flow={flow} config={config} />
}
