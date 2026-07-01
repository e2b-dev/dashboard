import { getLoginFlow, type OryPageParams } from '@ory/nextjs/app'
import oryConfig from '@/configs/ory'
import { normalizeOryPageParams } from '@/core/server/auth/ory/page-params'
import { getOryConfigForRequest } from '@/core/server/auth/ory/request-config'
import { LoginCard } from './login-card'

// Dynamic: getLoginFlow reads per-request searchParams and headers.
export const dynamic = 'force-dynamic'

// getLoginFlow handles both legs of the OAuth2 login: a `login_challenge` from
// Hydra (creates the Kratos flow) and the resulting `?flow=` from Kratos.
export default async function OryLoginPage(props: OryPageParams) {
  const flow = await getLoginFlow(
    oryConfig,
    normalizeOryPageParams(props.searchParams)
  )

  // null only on unrecoverable error (getLoginFlow has already redirected).
  if (!flow) {
    return null
  }

  const config = await getOryConfigForRequest()

  return <LoginCard flow={flow} config={config} />
}
