import NextAuth from 'next-auth'
import OryHydra from 'next-auth/providers/ory-hydra'
import {
  applyTokenToSession,
  resolveOryJwt,
} from '@/core/server/auth/ory/auth-callbacks'
import { bootstrapOryUser } from '@/core/server/auth/ory/bootstrap'

const oryOAuth2Audience = process.env.ORY_OAUTH2_AUDIENCE

export const { handlers, auth, signIn, signOut } = NextAuth({
  // isolates from existing /api/auth/{callback,email-callback,verify-otp}
  basePath: '/api/auth/oauth',
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  // route handler that logs the failure and redirects to /sign-in so users
  // never see Auth.js's built-in error page; see oauth-recover/route.ts.
  pages: {
    error: '/api/auth/oauth-recover',
  },
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
    jwt: ({ token, account, profile }) =>
      resolveOryJwt({ token, account, profile }),
    session: ({ session, token }) => applyTokenToSession(session, token),
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
