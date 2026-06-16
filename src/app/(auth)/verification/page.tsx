import { Verification } from '@ory/elements-react/theme'
import { getVerificationFlow, type OryPageParams } from '@ory/nextjs/app'
import { redirect } from 'next/navigation'
import { isOryAuthEnabled } from '@/configs/flags'
import { PROTECTED_URLS } from '@/configs/urls'
import oryConfig from '@/ory.config'

export default async function VerificationPage(props: OryPageParams) {
  if (!isOryAuthEnabled()) redirect(PROTECTED_URLS.DASHBOARD)

  const flow = await getVerificationFlow(oryConfig, props.searchParams)
  if (!flow) return null

  return <Verification flow={flow} config={oryConfig} />
}
