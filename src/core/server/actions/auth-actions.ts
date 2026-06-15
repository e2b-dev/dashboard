'use server'

import { auth } from '@/core/server/auth'

export async function reauthForAccountSettingsAction(): Promise<{
  url: string
}> {
  const dispatch = await auth.startReauthForAccountSettings()
  return { url: dispatch.to }
}
