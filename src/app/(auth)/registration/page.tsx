import { Registration } from '@ory/elements-react/theme'
import { getRegistrationFlow, type OryPageParams } from '@ory/nextjs/app'
import { redirect } from 'next/navigation'
import { isOryAuthEnabled } from '@/configs/flags'
import { AUTH_URLS } from '@/configs/urls'
import oryConfig from '@/ory.config'

export default async function RegistrationPage(props: OryPageParams) {
  if (!isOryAuthEnabled()) redirect(AUTH_URLS.SIGN_UP)

  const flow = await getRegistrationFlow(oryConfig, props.searchParams)
  if (!flow) return null

  return <Registration flow={flow} config={oryConfig} />
}
