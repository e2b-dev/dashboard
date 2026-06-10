import { getRegistrationFlow, type OryPageParams } from '@ory/nextjs/app'
import { headers } from 'next/headers'
import oryConfig from '@/configs/ory'
import { RegistrationCard } from './registration-card'

// Custom registration page rendered with @ory/elements-react, mirroring the
// /login page. Kratos bounces the browser here (`flows.registration.ui_url` /
// our `registration_ui_url`).
//
// `getRegistrationFlow` mirrors `getLoginFlow`:
//   - arriving without `?flow=...`: it creates a browser registration flow in
//     Kratos, which redirects back here with `?flow=...`.
//   - arriving with `?flow=...`: it fetches the flow and rewrites the Kratos
//     action URLs onto this origin so the form posts through the proxy in
//     src/proxy.ts.
export default async function OryRegistrationPage(props: OryPageParams) {
  const flow = await getRegistrationFlow(oryConfig, props.searchParams)

  // getRegistrationFlow redirects (to create or restart a flow) in the cases
  // above; a null return only happens on an unrecoverable error, where it has
  // already pointed the browser at the error UI.
  if (!flow) {
    return null
  }

  // See src/app/login/page.tsx for why sdk.url must be this request's own
  // origin: the browser submits to /self-service/* on our domain, which the
  // proxy in src/proxy.ts forwards to Kratos.
  const requestHeaders = await headers()
  const host = requestHeaders.get('host')
  const proto = requestHeaders.get('x-forwarded-proto') ?? 'http'
  const config = host
    ? { ...oryConfig, sdk: { ...oryConfig.sdk, url: `${proto}://${host}` } }
    : oryConfig

  return <RegistrationCard flow={flow} config={config} />
}
