import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  absoluteExpiry,
  buildOryAuthorizationRequest,
  exchangeOryCallback,
} from '@/core/server/auth/ory/oauth-client'

const ISSUER = 'https://ory.example.com'
const REDIRECT_URI = 'https://app.e2b.dev/api/auth/oauth/callback/ory'

const discoveryDoc = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/oauth2/auth`,
  token_endpoint: `${ISSUER}/oauth2/token`,
  jwks_uri: `${ISSUER}/.well-known/jwks.json`,
  userinfo_endpoint: `${ISSUER}/userinfo`,
  end_session_endpoint: `${ISSUER}/oauth2/sessions/logout`,
  response_types_supported: ['code'],
  subject_types_supported: ['public'],
  id_token_signing_alg_values_supported: ['RS256'],
}

function stubDiscovery() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = input.toString()
      if (url.includes('/.well-known/openid-configuration')) {
        return Response.json(discoveryDoc)
      }
      throw new Error(`unexpected fetch ${url}`)
    })
  )
}

describe('oauth-client authorization request', () => {
  beforeEach(() => {
    vi.stubEnv('ORY_HYDRA_PUBLIC_URL', ISSUER)
    vi.stubEnv('ORY_OAUTH2_CLIENT_ID', 'dashboard-client')
    vi.stubEnv('ORY_OAUTH2_CLIENT_SECRET', 'dashboard-secret')
    vi.stubEnv('ORY_OAUTH2_AUDIENCE', 'https://api.e2b.dev')
    stubDiscovery()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('builds a PKCE S256 authorization URL with state + nonce', async () => {
    const request = await buildOryAuthorizationRequest('signin', REDIRECT_URI)
    const url = new URL(request.url)

    expect(url.origin + url.pathname).toBe(`${ISSUER}/oauth2/auth`)
    expect(url.searchParams.get('client_id')).toBe('dashboard-client')
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI)
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe(
      'openid offline_access email profile'
    )
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBeTruthy()
    expect(url.searchParams.get('audience')).toBe('https://api.e2b.dev')
    expect(url.searchParams.get('state')).toBe(request.state)
    expect(url.searchParams.get('nonce')).toBe(request.nonce)
    expect(request.codeVerifier).toBeTruthy()
    // No prompt for a plain sign-in.
    expect(url.searchParams.get('prompt')).toBeNull()
  })

  it('maps signup to prompt=registration and reauth to prompt=login', async () => {
    const signup = await buildOryAuthorizationRequest('signup', REDIRECT_URI)
    const reauth = await buildOryAuthorizationRequest('reauth', REDIRECT_URI)

    expect(new URL(signup.url).searchParams.get('prompt')).toBe('registration')
    expect(new URL(reauth.url).searchParams.get('prompt')).toBe('login')
  })

  it('generates a fresh verifier/state/nonce per request', async () => {
    const a = await buildOryAuthorizationRequest('signin', REDIRECT_URI)
    const b = await buildOryAuthorizationRequest('signin', REDIRECT_URI)

    expect(a.codeVerifier).not.toBe(b.codeVerifier)
    expect(a.state).not.toBe(b.state)
    expect(a.nonce).not.toBe(b.nonce)
  })

  it('rejects a callback whose state does not match', async () => {
    await expect(
      exchangeOryCallback({
        currentUrl: new URL(`${REDIRECT_URI}?code=abc&state=returned-state`),
        expectedState: 'different-state',
        expectedNonce: 'nonce',
        codeVerifier: 'verifier',
        redirectUri: REDIRECT_URI,
      })
    ).rejects.toThrow()
  })
})

describe('absoluteExpiry', () => {
  it('adds expires_in to now', () => {
    expect(absoluteExpiry(3600, 1_000)).toBe(4_600)
  })

  it('falls back to a short window when expires_in is missing', () => {
    expect(absoluteExpiry(undefined, 1_000)).toBe(1_300)
  })
})
