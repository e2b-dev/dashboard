export type AuthContext = {
  userId: string
  accessToken: string
  email: string | null
}

export type AuthUser = {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  providers: string[]
  createdAt: string | null
}

export type SignOutOptions = {
  scope?: 'local' | 'others' | 'global'
}
