import type { OryPageParams } from '@ory/nextjs/app'
import { getOryConfigForRequest } from '@/core/server/auth/ory/request-config'
import { getServerLoginFlow } from '@/core/server/auth/ory/server-flow'
import { LoginCard } from './login-card'

// Dynamic: the flow fetch reads per-request searchParams and headers.
export const dynamic = 'force-dynamic'

// getServerLoginFlow handles both legs of the OAuth2 login: a `login_challenge`
// from Hydra (creates the Kratos flow) and the resulting `?flow=` from Kratos.
export default async function OryLoginPage(props: OryPageParams) {
  const flow = await getServerLoginFlow(await props.searchParams)

  // null only on unrecoverable error (the getter has already redirected).
  if (!flow) {
    return null
  }

  const config = await getOryConfigForRequest()

  return <LoginCard flow={flow} config={config} />
}
