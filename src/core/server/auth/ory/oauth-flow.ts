// Transient state bridging the authorization request (start route) and the
// callback: the PKCE code_verifier plus the state/nonce the callback validates,
// and the post-login destination. Lives in a short-lived httpOnly cookie. Its
// secrecy is not the security boundary — state/nonce/PKCE validation at the
// callback is — so it is stored as plain JSON, not encrypted.

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

// base64url so the JSON survives as a cookie value — Next's cookie helpers do
// not encode/decode, and raw JSON contains characters illegal in cookie values.
export function serializeOryFlowState(flow: OryFlowState): string {
  return Buffer.from(JSON.stringify(flow), 'utf8').toString('base64url')
}

export function parseOryFlowState(
  value: string | undefined | null
): OryFlowState | null {
  if (!value) return null

  try {
    const json = Buffer.from(value, 'base64url').toString('utf8')
    const parsed = JSON.parse(json) as Partial<OryFlowState>
    if (
      typeof parsed.state !== 'string' ||
      typeof parsed.nonce !== 'string' ||
      typeof parsed.codeVerifier !== 'string'
    ) {
      return null
    }

    return {
      state: parsed.state,
      nonce: parsed.nonce,
      codeVerifier: parsed.codeVerifier,
      returnTo:
        typeof parsed.returnTo === 'string' ? parsed.returnTo : undefined,
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
