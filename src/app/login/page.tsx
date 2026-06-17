import { getLoginFlow, type OryPageParams } from '@ory/nextjs/app'
import oryConfig from '@/configs/ory'
import { getOryConfigForRequest } from '@/core/server/auth/ory/request-config'
import { LoginCard } from './login-card'

// Dynamic: getLoginFlow reads per-request searchParams and headers.
export const dynamic = 'force-dynamic'

// Same-origin Kratos login flow. The user authenticates here directly; the
// backend's Hydra access token is minted server-side from the resulting Kratos
// session (see silent-grant), so there's no user-facing OAuth2 bounce.
export default async function OryLoginPage(props: OryPageParams) {
  const flow = await getLoginFlow(oryConfig, props.searchParams)

  // null only on unrecoverable error (getLoginFlow has already redirected).
  if (!flow) {
    return null
  }

  const config = await getOryConfigForRequest()

  return <LoginCard flow={flow} config={config} />
}
