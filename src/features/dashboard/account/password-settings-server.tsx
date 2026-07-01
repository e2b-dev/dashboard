import type { AccountPageSearchParams } from '@/app/dashboard/[teamSlug]/account/page'
import { isCurrentSessionFresh } from '@/core/server/auth'
import { PasswordSettings } from './password-settings'

interface PasswordSettingsServerProps {
  className?: string
  searchParams: Promise<AccountPageSearchParams>
}

export async function PasswordSettingsServer({
  className,
  searchParams,
}: PasswordSettingsServerProps) {
  const [{ reauth = '0' }, isSessionFresh] = await Promise.all([
    searchParams,
    isCurrentSessionFresh(),
  ])

  const showPasswordChangeForm = reauth === '1'

  return (
    <PasswordSettings
      className={className}
      showPasswordChangeForm={showPasswordChangeForm}
      isSessionFresh={isSessionFresh}
    />
  )
}
