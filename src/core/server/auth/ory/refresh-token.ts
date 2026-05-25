import 'server-only'

import type { JWT } from 'next-auth/jwt'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'

type OryTokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string
  id_token?: string
}

export async function refreshOryToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) return { ...token, error: 'NoRefreshToken' }

  const sdkUrl = process.env.ORY_SDK_URL!.replace(/\/$/, '')
  const credentials = btoa(
    `${process.env.ORY_OAUTH2_CLIENT_ID}:${process.env.ORY_OAUTH2_CLIENT_SECRET}`
  )

  try {
    const res = await fetch(`${sdkUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    })

    if (!res.ok) {
      l.warn(
        {
          key: 'auth_provider:refresh_token:rejected',
          context: { status: res.status },
        },
        `Ory refresh_token rejected (${res.status})`
      )
      return { ...token, error: 'RefreshTokenError' }
    }

    const fresh = (await res.json()) as OryTokenResponse
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
      'Ory refresh_token threw'
    )
    return { ...token, error: 'RefreshTokenError' }
  }
}
