import { AccountPageSearchParams } from '@/app/dashboard/account/page'
import { PasswordSettings } from './password-settings'

interface PasswordSettingsServerProps {
  className?: string
  searchParams: AccountPageSearchParams
}

export async function PasswordSettingsServer({
  className,
  searchParams,
}: PasswordSettingsServerProps) {
  const showPasswordChangeForm = searchParams.reauth === '1'

  return (
    <PasswordSettings
      className={className}
      showPasswordChangeForm={showPasswordChangeForm}
    />
  )
}
