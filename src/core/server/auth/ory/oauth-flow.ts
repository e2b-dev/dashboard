// Transient state bridging the authorization request (start route) and the
// callback: the PKCE code_verifier plus the state/nonce the callback validates,
// and the post-login destination. Lives in a short-lived httpOnly cookie, sealed
// as a JWE via the shared cookie crypto. Its secrecy is not the security
// boundary — state/nonce/PKCE validation at the callback is — encryption only
// adds tamper-resistance and keeps one sealing convention with e2b_session.

import { EncryptJWT, jwtDecrypt } from 'jose'
import { CONTENT_ENCRYPTION, deriveKey, KEY_ALGORITHM } from './cookie-crypto'

export const E2B_OAUTH_FLOW_COOKIE = 'e2b_oauth_flow'

// The registered redirect_uri. Must be byte-identical between the authorization
// request and the token exchange, so both routes derive it from this constant.
export const OAUTH_CALLBACK_PATH = '/api/auth/oauth/callback/ory'

const FLOW_COOKIE_MAX_AGE_SECONDS = 60 * 10

export type OryFlowState = {
  state: string
  nonce: string
  codeVerifier: string
  returnTo?: string
}

export type OryFlowCookieOptions = {
  httpOnly: true
  sameSite: 'lax'
  path: '/'
  secure: boolean
  maxAge: number
}

export async function sealOryFlowState(flow: OryFlowState): Promise<string> {
  return new EncryptJWT({
    state: flow.state,
    nonce: flow.nonce,
    codeVerifier: flow.codeVerifier,
    returnTo: flow.returnTo,
  })
    .setProtectedHeader({ alg: KEY_ALGORITHM, enc: CONTENT_ENCRYPTION })
    .setIssuedAt()
    .encrypt(await deriveKey())
}

export async function openOryFlowState(
  value: string | undefined | null
): Promise<OryFlowState | null> {
  if (!value) return null

  try {
    const { payload } = await jwtDecrypt(value, await deriveKey())
    const { state, nonce, codeVerifier, returnTo } = payload
    if (
      typeof state !== 'string' ||
      typeof nonce !== 'string' ||
      typeof codeVerifier !== 'string'
    ) {
      return null
    }

    return {
      state,
      nonce,
      codeVerifier,
      returnTo: typeof returnTo === 'string' ? returnTo : undefined,
    }
  } catch {
    return null
  }
}

export function oryFlowCookieOptions(): OryFlowCookieOptions {
  return {
    httpOnly: true,
    // Lax so the cookie rides along on the top-level redirect back from Hydra.
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: FLOW_COOKIE_MAX_AGE_SECONDS,
  }
}
