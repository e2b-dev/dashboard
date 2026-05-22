export type AuthUser = {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  providers: string[]
}

export type AuthContext = {
  user: AuthUser
  accessToken: string
}

export type SignOutOptions = {
  scope?: 'local' | 'others' | 'global'
}

export type AuthError = {
  message: string
  code?: string
  status?: number
}

export type SignOutResult = { error: AuthError | null }
