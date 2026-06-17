import { getLoginFlow, type OryPageParams } from '@ory/nextjs/app'
import { redirect } from 'next/navigation'
import { isOryCustomUiEnabled } from '@/configs/env-flags'
import oryConfig from '@/configs/ory'
import { AUTH_URLS } from '@/configs/urls'
import { getOryConfigForRequest } from '@/core/server/auth/ory/request-config'
import { LoginCard } from './login-card'

// Dynamic: getLoginFlow reads per-request searchParams and headers.
export const dynamic = 'force-dynamic'

// getLoginFlow handles both legs of the OAuth2 login: a `login_challenge` from
// Hydra (creates the Kratos flow) and the resulting `?flow=` from Kratos.
export default async function OryLoginPage(props: OryPageParams) {
  if (!isOryCustomUiEnabled()) {
    redirect(AUTH_URLS.SIGN_IN)
  }

  const flow = await getLoginFlow(oryConfig, props.searchParams)

  // null only on unrecoverable error (getLoginFlow has already redirected).
  if (!flow) {
    return null
  }

  const config = await getOryConfigForRequest()

  return <LoginCard flow={flow} config={config} />
}
