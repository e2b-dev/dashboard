import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
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
