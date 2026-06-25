import { getSettingsFlow, type OryPageParams } from '@ory/nextjs/app'
import oryConfig from '@/configs/ory'
import { getUserProfile } from '@/core/server/auth'
import { getOryConfigForRequest } from '@/core/server/auth/ory/request-config'
import { SettingsCards } from './settings-cards'

export const dynamic = 'force-dynamic'

// Ory-driven settings page, intentionally separate from /dashboard/account.
// It needs only a Kratos session (getSettingsFlow + getUserProfile read the
// session/identity, not e2b_session) — so the post-recovery password reset works
// before any Hydra token exists. Name/e-mail are shown read-only for reference;
// editing the account profile stays on the gated /dashboard/account page.
export default async function SettingsPage(props: OryPageParams) {
  const flow = await getSettingsFlow(oryConfig, props.searchParams)

  // getSettingsFlow has already redirected (created a flow / surfaced login).
  if (!flow) {
    return null
  }

  const [config, user] = await Promise.all([
    getOryConfigForRequest(),
    getUserProfile(),
  ])

  return (
    <SettingsCards
      flow={flow}
      config={config}
      name={user?.name ?? null}
      email={user?.email ?? null}
    />
  )
}
