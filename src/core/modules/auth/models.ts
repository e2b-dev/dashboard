export type AuthUser = {
  // public.users.id, sourced from the Kratos identity's external_id.
  id: string
  // Ory Kratos identity id (the OAuth2 subject).
  identity_id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  providers: string[]
  canChangeEmail: boolean
  canChangePassword: boolean
}
