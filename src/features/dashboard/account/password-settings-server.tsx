import { AccountPageSearchParams } from '@/app/dashboard/[teamIdOrSlug]/account/page'
import { PasswordSettings } from './password-settings'

interface PasswordSettingsServerProps {
  className?: string
  searchParams: Promise<AccountPageSearchParams>
}

export async function PasswordSettingsServer({
  className,
  searchParams,
}: PasswordSettingsServerProps) {
  'use cache'
  const reauth = (await searchParams).reauth ?? '0'

  const showPasswordChangeForm = reauth === '1'

  return (
    <PasswordSettings
      className={className}
      showPasswordChangeForm={showPasswordChangeForm}
    />
  )
}
