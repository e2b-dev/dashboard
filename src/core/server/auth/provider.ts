import type { AuthContext, SignOutOptions } from './types'

export interface AuthProvider {
  getAuthContext(): Promise<AuthContext | null>
  signOut(options?: SignOutOptions): Promise<void>
}
