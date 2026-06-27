import type { OryPageParams } from '@ory/nextjs/app'
import { getOryConfigForRequest } from '@/core/server/auth/ory/request-config'
import { getServerRegistrationFlow } from '@/core/server/auth/ory/server-flow'
import { RegistrationCard } from './registration-card'

export const dynamic = 'force-dynamic'

// Mirrors /login; see src/app/login/page.tsx.
export default async function OryRegistrationPage(props: OryPageParams) {
  const flow = await getServerRegistrationFlow(await props.searchParams)

  if (!flow) {
    return null
  }

  const config = await getOryConfigForRequest()

  return <RegistrationCard flow={flow} config={config} />
}
