import 'next-auth/jwt'

import NextAuth from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import OryHydra from 'next-auth/providers/ory-hydra'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

const oryOAuth2Audience = process.env.ORY_OAUTH2_AUDIENCE

const oryProvider = OryHydra({
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
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  // isolates from existing /api/auth/{callback,email-callback,verify-otp}
  basePath: '/api/auth/oauth',
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [oryProvider],
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
      const { bootstrapOryUser } = await import(
        '@/core/server/auth/ory/bootstrap'
      )
      await bootstrapOryUser({
        accessToken: account.access_token,
        idToken: account.id_token,
        provider: account.provider,
      })
    },
  },
})

async function refreshOryToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    return { ...token, error: 'NoRefreshToken' }
  }

  const sdkUrl = process.env.ORY_SDK_URL
  const clientId = process.env.ORY_OAUTH2_CLIENT_ID
  const clientSecret = process.env.ORY_OAUTH2_CLIENT_SECRET

  if (!sdkUrl || !clientId || !clientSecret) {
    l.error(
      { key: 'auth_provider:refresh_token:misconfigured' },
      'Ory token refresh attempted but ORY_SDK_URL / ORY_OAUTH2_CLIENT_ID / ORY_OAUTH2_CLIENT_SECRET are not all set'
    )
    return { ...token, error: 'RefreshTokenError' }
  }

  try {
    const credentials = btoa(`${clientId}:${clientSecret}`)
    const tokenEndpoint = `${sdkUrl.replace(/\/$/, '')}/oauth2/token`
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }).toString(),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      l.warn(
        {
          key: 'auth_provider:refresh_token:rejected',
          context: {
            status: response.status,
            body: text.slice(0, 200),
          },
        },
        `Ory rejected refresh_token (status ${response.status})`
      )
      return { ...token, error: 'RefreshTokenError' }
    }

    const fresh = (await response.json()) as {
      access_token: string
      token_type: string
      expires_in: number
      refresh_token?: string
      id_token?: string
      scope?: string
    }

    return {
      ...token,
      accessToken: fresh.access_token,
      refreshToken: fresh.refresh_token ?? token.refreshToken,
      idToken: fresh.id_token ?? token.idToken,
      expiresAt: Math.floor(Date.now() / 1000) + fresh.expires_in,
      error: undefined,
    }
  } catch (error) {
    l.error(
      {
        key: 'auth_provider:refresh_token:exception',
        error: serializeErrorForLog(error),
      },
      'Ory refresh_token request threw unexpected exception'
    )
    return { ...token, error: 'RefreshTokenError' }
  }
}

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
