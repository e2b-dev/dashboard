import NextAuth from 'next-auth'
import OryHydra from 'next-auth/providers/ory-hydra'
import {
  handleOryAuthJsSignIn,
  persistOryTokensInAuthJsJwt,
  projectOryJwtToAuthJsSession,
} from '@/core/server/auth/ory/authjs-callbacks'

const oryOAuth2Audience = process.env.ORY_OAUTH2_AUDIENCE

const useSecureCookies = process.env.VERCEL_ENV === 'production'
// Standard Auth.js secure-cookie convention.
const securePrefix = useSecureCookies ? '__Secure-' : ''
// Cookies are scoped by host+path+name, NOT by port. Running two local
// dashboards on different localhost ports makes them share the default
// session cookie and clobber each other. AUTH_COOKIE_PREFIX lets each
// instance use a distinct cookie name. Unset in prod/preview.
const cookiePrefix = process.env.AUTH_COOKIE_PREFIX
  ? `${process.env.AUTH_COOKIE_PREFIX}.`
  : ''

export const { handlers, auth, signIn, signOut } = NextAuth({
  // isolates from existing /api/auth/{callback,email-callback,verify-otp}
  basePath: '/api/auth/oauth',
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  useSecureCookies,
  cookies: {
    sessionToken: {
      name: `${securePrefix}${cookiePrefix}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
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
    signIn: ({ account }) => handleOryAuthJsSignIn({ account }),
    jwt: ({ token, account, profile }) =>
      persistOryTokensInAuthJsJwt({ token, account, profile }),
    session: ({ session, token }) =>
      projectOryJwtToAuthJsSession({ session, token }),
  },
})
