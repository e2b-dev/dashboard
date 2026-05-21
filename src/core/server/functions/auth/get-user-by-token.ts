import 'server-only'

import { cache } from 'react'
import { authAdmin } from '@/core/server/auth'
import type { AuthUser } from '@/core/server/auth'

async function getUserByToken(
  accessToken: string | undefined
): Promise<AuthUser | null> {
  const trimmed = accessToken?.trim()
  if (!trimmed) {
    return null
  }

  return authAdmin.getUserByAccessToken(trimmed)
}

export default cache(getUserByToken)
