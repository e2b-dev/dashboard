import { AccessTokenSettings } from '@/features/dashboard/account/access-token-settings'
import { EmailSettings } from '@/features/dashboard/account/email-settings'
import { NameSettings } from '@/features/dashboard/account/name-settings'
import { PasswordSettingsServer } from '@/features/dashboard/account/password-settings-server'
import { Suspense } from 'react'

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
      <Suspense fallback={null}>
        <NameSettings />
      </Suspense>

      <Suspense fallback={null}>
        <EmailSettings />
      </Suspense>

      <Suspense fallback={null}>
        <AccessTokenSettings />
      </Suspense>

      <Suspense fallback={null}>
        <PasswordSettingsServer searchParams={await searchParams} />
      </Suspense>
    </div>
  )
}
