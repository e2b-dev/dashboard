import 'server-only'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import type { AuthContext } from '@/core/server/auth/types'
import type { SandboxManagementAuth } from './sandbox-management-auth'

export function createSandboxManagementAuth(
  authContext: AuthContext,
  teamId: string
): SandboxManagementAuth {
  return {
    headers: SUPABASE_AUTH_HEADERS(authContext.accessToken, teamId),
    userId: authContext.user.id,
  }
}
