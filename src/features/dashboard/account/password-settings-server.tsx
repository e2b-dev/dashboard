import { checkSessionAge } from '@/server/auth/check-session-age'
import { PasswordSettings } from './password-settings'

interface PasswordSettingsServerProps {
  className?: string
}

export async function PasswordSettingsServer({
  className,
}: PasswordSettingsServerProps) {
  const result = await checkSessionAge()

  if (!result || result.serverError) {
    return <PasswordSettings className={className} requiresReauth={true} />
  }

  return (
    <PasswordSettings
      className={className}
      requiresReauth={result.data?.requiresReauth ?? true}
    />
  )
}
