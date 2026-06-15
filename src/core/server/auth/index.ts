import 'server-only'

import type { Session } from 'next-auth'
import { createOryAuthProvider, oryAuthProvider } from './ory/provider'
import type { AuthProvider } from './provider'

export const auth: AuthProvider = oryAuthProvider

export function createAuthForSession(
  authSession?: Session | null
): AuthProvider {
  return createOryAuthProvider(authSession)
}

export type { AuthUser } from '@/core/modules/auth/models'
