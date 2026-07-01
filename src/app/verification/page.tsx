import { getVerificationFlow, type OryPageParams } from '@ory/nextjs/app'
import oryConfig from '@/configs/ory'
import { normalizeOryPageParams } from '@/core/server/auth/ory/page-params'
import { getOryConfigForRequest } from '@/core/server/auth/ory/request-config'
import { VerificationCard } from './verification-card'

export const dynamic = 'force-dynamic'

// Mirrors /login; see src/app/login/page.tsx.
export default async function OryVerificationPage(props: OryPageParams) {
  const flow = await getVerificationFlow(
    oryConfig,
    normalizeOryPageParams(props.searchParams)
  )

  if (!flow) {
    return null
  }

  const config = await getOryConfigForRequest()

  return <VerificationCard flow={flow} config={config} />
}
