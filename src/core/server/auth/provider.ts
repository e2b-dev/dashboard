import type {
  AuthContext,
  AuthUser,
  ReauthDispatch,
  SignOutOptions,
  SignOutResult,
  UpdateUserInput,
  UpdateUserResult,
} from './types'

export interface AuthProvider {
  getAuthContext(): Promise<AuthContext | null>
  // Live profile lookup from the identity provider (Ory IdentityApi / Supabase
  // getUser). Unlike getAuthContext's cheap session path, this carries the full
  // traits and credential-derived providers. Heavier — call it once per
  // dashboard load behind a cache, not on every request.
  getUserProfile(): Promise<AuthUser | null>
  signOut(options?: SignOutOptions): Promise<SignOutResult>
  updateUser(input: UpdateUserInput): Promise<UpdateUserResult>
  startReauthForAccountSettings(): Promise<ReauthDispatch>
  handleCredentialChangeSuccess(): Promise<void>
}
