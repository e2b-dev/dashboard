export type AuthUser = {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  providers: string[]
  canChangeEmail: boolean
  canChangePassword: boolean
}

export type AuthContext = {
  user: AuthUser
  accessToken: string
}

export type SignOutOptions = {
  scope?: 'local' | 'others' | 'global'
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

export type UpdateUserResult =
  | { ok: true; user: AuthUser }
  | { ok: false; code: UpdateUserErrorCode; message?: string }

// How the caller should drive the account-settings re-authentication step.
// Supabase signs the user out and bounces through /sign-in; Ory forces a
// fresh OAuth2 login via the oauth-start route.
export type ReauthDispatch =
  | { kind: 'sign-out'; returnTo: string }
  | { kind: 'redirect'; to: string }
