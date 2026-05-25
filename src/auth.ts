import 'next-auth/jwt'

import NextAuth from 'next-auth'
import OryHydra from 'next-auth/providers/ory-hydra'
import { bootstrapOryUser } from '@/core/server/auth/ory/bootstrap'
import { refreshOryToken } from '@/core/server/auth/ory/refresh-token'

const oryOAuth2Audience = process.env.ORY_OAUTH2_AUDIENCE

export const { handlers, auth, signIn, signOut } = NextAuth({
  // isolates from existing /api/auth/{callback,email-callback,verify-otp}
  basePath: '/api/auth/oauth',
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    OryHydra({
      id: 'ory',
      name: 'Ory',
      issuer: process.env.ORY_SDK_URL,
      clientId: process.env.ORY_OAUTH2_CLIENT_ID,
      clientSecret: process.env.ORY_OAUTH2_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid offline_access email profile',
          ...(oryOAuth2Audience ? { audience: oryOAuth2Audience } : {}),
        },
      },
      checks: ['state'],
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          idToken: account.id_token,
          expiresAt: account.expires_at ?? null,
        }
      }

      if (token.expiresAt && Date.now() / 1000 > token.expiresAt - 60) {
        return refreshOryToken(token)
      }

      return token
    },

    async session({ session, token }) {
      session.user.id = token.sub ?? session.user.id
      session.accessToken = token.accessToken
      session.idToken = token.idToken
      session.error = token.error
      return session
    },
  },

  events: {
    async signIn({ account }) {
      if (!account?.access_token) return
      await bootstrapOryUser({
        accessToken: account.access_token,
        idToken: account.id_token,
        provider: account.provider,
      })
    },
  },
})

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    idToken?: string
    error?: string
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    idToken?: string
    expiresAt?: number | null
    error?: string
  }
}
