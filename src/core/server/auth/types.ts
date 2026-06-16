import type { AuthUser } from '@/core/modules/auth/models'

export type { AuthUser } from '@/core/modules/auth/models'

export type AuthContext = {
  user: AuthUser
  accessToken: string
}

export type SignOutOptions = {
  origin?: string
  returnTo?: string
}

export type AuthError = {
  message: string
  code?: string
  status?: number
}

export type SignOutResult = {
  redirectTo: string
  error?: AuthError | null
}

export type UpdateUserInput = {
  name?: string
  email?: string
  password?: string
}

// Expected, user-facing update failures. Anything else throws and is handled
// as an unexpected server error by the action client.
export type UpdateUserErrorCode =
  | 'email_exists'
  | 'email_invalid'
  | 'weak_password'
  | 'same_password'
  | 'reauthentication_needed'
  | 'account_credentials_not_changeable'

export type UpdateUserResult =
  | { ok: true; user: AuthUser }
  | { ok: false; code: UpdateUserErrorCode; message?: string }

export type ReauthDispatch = { to: string }
