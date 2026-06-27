import type { OryPageParams } from '@ory/nextjs/app'
import { getOryConfigForRequest } from '@/core/server/auth/ory/request-config'
import { getServerRecoveryFlow } from '@/core/server/auth/ory/server-flow'
import { RecoveryCard } from './recovery-card'

export const dynamic = 'force-dynamic'

// Mirrors /login; see src/app/login/page.tsx.
export default async function OryRecoveryPage(props: OryPageParams) {
  const flow = await getServerRecoveryFlow(await props.searchParams)

  if (!flow) {
    return null
  }

  const config = await getOryConfigForRequest()

  return <RecoveryCard flow={flow} config={config} />
}
