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
  // Ory organization id when the identity belongs to an SSO organization,
  // otherwise null. `isSso` is a convenience flag derived from it. SSO members
  // are managed by their identity provider: they can't create teams or add
  // members.
  organizationId: string | null
  isSso: boolean
}
