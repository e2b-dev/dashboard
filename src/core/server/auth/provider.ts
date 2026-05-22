import type { AuthContext, SignOutOptions, SignOutResult } from './types'

export interface AuthProvider {
  getAuthContext(): Promise<AuthContext | null>
  signOut(options?: SignOutOptions): Promise<SignOutResult>
}
