import { Recovery } from '@ory/elements-react/theme'
import { getRecoveryFlow, type OryPageParams } from '@ory/nextjs/app'
import { redirect } from 'next/navigation'
import { isOryAuthEnabled } from '@/configs/flags'
import { AUTH_URLS } from '@/configs/urls'
import oryConfig from '@/ory.config'

export default async function RecoveryPage(props: OryPageParams) {
  if (!isOryAuthEnabled()) redirect(AUTH_URLS.FORGOT_PASSWORD)

  const flow = await getRecoveryFlow(oryConfig, props.searchParams)
  if (!flow) return null

  return <Recovery flow={flow} config={oryConfig} />
}
