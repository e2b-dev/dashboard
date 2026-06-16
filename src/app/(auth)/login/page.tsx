import { Login } from '@ory/elements-react/theme'
import { getLoginFlow, type OryPageParams } from '@ory/nextjs/app'
import { redirect } from 'next/navigation'
import { isOryAuthEnabled } from '@/configs/flags'
import { AUTH_URLS } from '@/configs/urls'
import oryConfig from '@/ory.config'

// Same-origin Kratos login flow. Kratos' login_ui_url (proxied to this origin)
// lands here; @ory/elements renders + submits the flow through the @ory/nextjs
// self-service proxy, so the whole flow stays on the visiting origin (previews).
export default async function LoginPage(props: OryPageParams) {
  if (!isOryAuthEnabled()) redirect(AUTH_URLS.SIGN_IN)

  const flow = await getLoginFlow(oryConfig, props.searchParams)
  if (!flow) return null

  return <Login flow={flow} config={oryConfig} />
}
