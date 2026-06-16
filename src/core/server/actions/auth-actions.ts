'use server'

import { startReauthForAccountSettings } from '@/core/server/auth'

export async function reauthForAccountSettingsAction(): Promise<{
  url: string
}> {
  const dispatch = await startReauthForAccountSettings()
  return { url: dispatch.to }
}
