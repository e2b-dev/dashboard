import { getLoginFlow, type OryPageParams } from '@ory/nextjs/app'
import { headers } from 'next/headers'
import oryConfig from '@/configs/ory'
import { LoginCard } from './login-card'

// Custom login page rendered with @ory/elements-react. This is the URL both
// Hydra (`urls.login`) and Kratos (`flows.login.ui_url`) bounce the browser to
// in the harness — see devenv/configs/{hydra,kratos} in the harness repo.
//
// `getLoginFlow` handles both legs of the OAuth2 login sequence:
//   - arriving with `?login_challenge=...` (from Hydra): it forwards the
//     challenge to Kratos to create a browser login flow, which redirects back
//     here with `?flow=...`.
//   - arriving with `?flow=...` (from Kratos): it fetches the flow and rewrites
//     the Kratos action URLs onto this origin so the form posts through the
//     proxy wired in src/proxy.ts.
export default async function OryLoginPage(props: OryPageParams) {
  const flow = await getLoginFlow(oryConfig, props.searchParams)

  // getLoginFlow redirects (to create or restart a flow) in the cases above; a
  // null return only happens on an unrecoverable error, where it has already
  // pointed the browser at the error UI.
  if (!flow) {
    return null
  }

  // The Elements client builds its SDK base path from `config.sdk.url`, so it
  // must be this request's own origin: the browser then submits to
  // /self-service/* on our domain, which the proxy in src/proxy.ts forwards to
  // Kratos. Pointing it at Kratos directly triggers a cross-origin credentialed
  // request that Kratos' wildcard CORS rejects. Mirrors @ory/nextjs's own
  // getPublicUrl() (host header + x-forwarded-proto).
  const requestHeaders = await headers()
  const host = requestHeaders.get('host')
  const proto = requestHeaders.get('x-forwarded-proto') ?? 'http'
  const config = host
    ? { ...oryConfig, sdk: { ...oryConfig.sdk, url: `${proto}://${host}` } }
    : oryConfig

  return <LoginCard flow={flow} config={config} />
}
