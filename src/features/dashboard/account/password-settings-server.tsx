import { PasswordSettings } from './password-settings'
import { AccountPageSearchParams } from '@/app/dashboard/account/page'

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
