export type AuthUser = {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  providers: string[]
  canChangeEmail: boolean
  canChangePassword: boolean
}
