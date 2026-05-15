import { AccessTokenSettings } from '@/features/dashboard/account/access-token-settings'
import { EmailSettings } from '@/features/dashboard/account/email-settings'
import { NameSettings } from '@/features/dashboard/account/name-settings'
import { PasswordSettingsServer } from '@/features/dashboard/account/password-settings-server'

export interface AccountPageSearchParams {
  reauth?: '1'
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<AccountPageSearchParams>
}) {
  return (
    <div className="flex flex-col md:gap-6">
      <NameSettings />

      <EmailSettings />

      <AccessTokenSettings />

      <PasswordSettingsServer searchParams={searchParams} />
    </div>
  )
}
