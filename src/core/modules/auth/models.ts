export type AuthUser = {
  // public.users.id, sourced from the Kratos identity's external_id.
  id: string
  // Ory Kratos identity id (the OAuth2 subject); used for Kratos/admin ops.
  identityId: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  providers: string[]
  canChangeEmail: boolean
  canChangePassword: boolean
  // Ory organization id when the identity signed in via org SSO, else null.
  organizationId: string | null
  isSso: boolean
}
