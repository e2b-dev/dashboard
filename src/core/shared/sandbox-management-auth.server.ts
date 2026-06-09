import 'server-only'

import { authHeaders } from '@/configs/api'
import type { AuthContext } from '@/core/server/auth/types'
import type { SandboxManagementAuth } from './sandbox-management-auth'

export function createSandboxManagementAuth(
  authContext: AuthContext,
  teamId: string
): SandboxManagementAuth {
  return {
    headers: authHeaders(authContext.accessToken, teamId),
    userId: authContext.user.id,
  }
}
