import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    // Ory access token forwarded to dashboard-api/infra from server code.
    accessToken?: string
    // Ory ID token used server-side for re-auth freshness and Ory logout.
    idToken?: string
    // Kratos identity id resolved from Ory at sign-in. This can differ from
    // user.id, which is the OIDC subject / dashboard E2B user id.
    identityId?: string
    error?: string
    user: {
      id: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    idToken?: string
    identityId?: string
    expiresAt?: number | null
    error?: string
  }
}
