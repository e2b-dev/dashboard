import { type NextFetchEvent, NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const isKratosSessionActiveMock = vi.hoisted(() => vi.fn())
const openSessionCookieMock = vi.hoisted(() => vi.fn())
const isAccessTokenExpiringMock = vi.hoisted(() => vi.fn())
const refreshSessionTokensMock = vi.hoisted(() => vi.fn())
const sealSessionCookieMock = vi.hoisted(() => vi.fn())
const buildAuthorizationRequestMock = vi.hoisted(() => vi.fn())
const readSignupMetadataMock = vi.hoisted(() => vi.fn())
const encodeSignupMetadataMock = vi.hoisted(() => vi.fn())

vi.mock('@ory/nextjs/middleware', () => ({
  createOryMiddleware: () => vi.fn(),
}))

vi.mock('@/core/server/auth/ory/kratos-session-edge', () => ({
  isKratosSessionActive: isKratosSessionActiveMock,
}))

// Keep the real chunk helpers (split/join/reconcile/names) and cookie options;
// only the crypto seal/open are mocked so tests can drive token state directly.
vi.mock('@/core/server/auth/ory/session-cookie', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/core/server/auth/ory/session-cookie')
  >()),
  openSessionCookie: openSessionCookieMock,
  sealSessionCookie: sealSessionCookieMock,
}))

vi.mock('@/core/server/auth/ory/token-refresh', () => ({
  isAccessTokenExpiring: isAccessTokenExpiringMock,
  refreshSessionTokens: refreshSessionTokensMock,
}))

vi.mock('@/core/server/auth/ory/oauth-client', () => ({
  buildOryAuthorizationRequest: buildAuthorizationRequestMock,
}))

vi.mock('@/core/server/auth/ory/signup-metadata', () => ({
  readOrySignupMetadataFromHeaders: readSignupMetadataMock,
  encodeOrySignupMetadata: encodeSignupMetadataMock,
  signupMetadataCookieOptions: () => ({ httpOnly: true, path: '/' }),
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn(), warn: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { proxy } = await import('@/proxy')
const { GET: oauthStartGET } = await import('@/app/api/auth/oauth/start/route')

function request(path: string): NextRequest {
  return new NextRequest(`https://app.e2b.dev${path}`)
}

// A request carrying an e2b_session cookie — the realistic state when a token is
// present, so the refresh's reconcile/clear paths have a cookie to act on.
function requestWithSession(path: string): NextRequest {
  return new NextRequest(`https://app.e2b.dev${path}`, {
    headers: { cookie: 'e2b_session=old-sealed' },
  })
}

describe('Ory auth entrypoints — proxy gate', () => {
  beforeEach(() => {
    isKratosSessionActiveMock.mockReset().mockResolvedValue(false)
    openSessionCookieMock.mockReset().mockResolvedValue(null)
    isAccessTokenExpiringMock.mockReset().mockReturnValue(false)
    refreshSessionTokensMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('routes unauthenticated auth pages to the OAuth start route', async () => {
    const signIn = await proxy(request('/sign-in/'), {} as NextFetchEvent)
    const signUp = await proxy(
      request('/sign-up?returnTo=%2Fdashboard'),
      {} as NextFetchEvent
    )

    expect(signIn.headers.get('location')).toContain(
      '/api/auth/oauth/start?intent=signin'
    )
    expect(signUp.headers.get('location')).toContain(
      '/api/auth/oauth/start?intent=signup&returnTo=%2Fdashboard'
    )
  })

  it('treats a request without an e2b_session token as unauthenticated', async () => {
    // No token → the gate need not even consult Kratos.
    const response = await proxy(request('/sign-in'), {} as NextFetchEvent)

    expect(response.headers.get('location')).toContain(
      '/api/auth/oauth/start?intent=signin'
    )
    expect(isKratosSessionActiveMock).not.toHaveBeenCalled()
  })

  it('treats a token without a live Kratos session as unauthenticated', async () => {
    openSessionCookieMock.mockResolvedValue({
      accessToken: 'a',
      expiresAt: 1_900_000_000,
    })
    isKratosSessionActiveMock.mockResolvedValue(false)

    const response = await proxy(request('/sign-in'), {} as NextFetchEvent)

    expect(response.headers.get('location')).toContain(
      '/api/auth/oauth/start?intent=signin'
    )
    expect(isKratosSessionActiveMock).toHaveBeenCalled()
  })

  it('redirects authenticated users away from auth pages', async () => {
    openSessionCookieMock.mockResolvedValue({
      accessToken: 'a',
      expiresAt: 1_900_000_000,
    })
    isKratosSessionActiveMock.mockResolvedValue(true)

    const response = await proxy(request('/sign-in'), {} as NextFetchEvent)

    expect(response.headers.get('location')).toBe(
      'https://app.e2b.dev/dashboard'
    )
  })

  it('does not gate API routes on the Kratos session', async () => {
    await proxy(request('/api/trpc/user.update'), {} as NextFetchEvent)
    await proxy(request('/api/health'), {} as NextFetchEvent)
    await proxy(request('/api/auth/oauth/callback/ory'), {} as NextFetchEvent)

    expect(isKratosSessionActiveMock).not.toHaveBeenCalled()
  })
})

describe('Ory auth entrypoints — middleware refresh (Pattern B)', () => {
  const expiring = {
    accessToken: 'old-access',
    refreshToken: 'old-refresh',
    expiresAt: 1_000,
  }

  beforeEach(() => {
    openSessionCookieMock.mockReset().mockResolvedValue(expiring)
    isKratosSessionActiveMock.mockReset().mockResolvedValue(true)
    isAccessTokenExpiringMock.mockReset().mockReturnValue(true)
    refreshSessionTokensMock.mockReset()
    sealSessionCookieMock.mockReset().mockResolvedValue('sealed-new')
  })

  it('refreshes an expiring token and persists it on the response', async () => {
    refreshSessionTokensMock.mockResolvedValue({
      status: 'refreshed',
      tokens: { accessToken: 'new-access', expiresAt: 2_000 },
    })

    const response = await proxy(
      requestWithSession('/dashboard/acme/sandboxes'),
      {} as NextFetchEvent
    )

    expect(refreshSessionTokensMock).toHaveBeenCalledWith(expiring)
    expect(response.cookies.get('e2b_session')?.value).toBe('sealed-new')
    // Authenticated dashboard request is served (not redirected away).
    expect(response.headers.get('location')).toBeNull()
  })

  it('clears the cookie and redirects when the refresh is dead', async () => {
    refreshSessionTokensMock.mockResolvedValue({ status: 'dead' })

    const response = await proxy(
      requestWithSession('/dashboard/acme/sandboxes'),
      {} as NextFetchEvent
    )

    expect(response.cookies.get('e2b_session')?.value).toBe('')
    expect(response.headers.get('location')).toContain('/sign-in')
    // A dead token short-circuits the gate before consulting Kratos.
    expect(isKratosSessionActiveMock).not.toHaveBeenCalled()
  })

  it('does not refresh a token that is not yet expiring', async () => {
    isAccessTokenExpiringMock.mockReturnValue(false)

    const response = await proxy(
      request('/dashboard/acme/sandboxes'),
      {} as NextFetchEvent
    )

    expect(refreshSessionTokensMock).not.toHaveBeenCalled()
    expect(sealSessionCookieMock).not.toHaveBeenCalled()
    expect(response.cookies.get('e2b_session')).toBeUndefined()
  })

  it('skips the refresh for auth endpoints so sign-out keeps its id_token', async () => {
    // A dead refresh would otherwise delete e2b_session out of the propagated
    // request before the sign-out handler reads the id_token from it, dropping
    // RP-initiated logout so Kratos/Hydra never end the session.
    refreshSessionTokensMock.mockResolvedValue({ status: 'dead' })

    const response = await proxy(
      request('/api/auth/sign-out'),
      {} as NextFetchEvent
    )

    expect(openSessionCookieMock).not.toHaveBeenCalled()
    expect(refreshSessionTokensMock).not.toHaveBeenCalled()
    expect(response.cookies.get('e2b_session')).toBeUndefined()
  })
})

describe('Ory OAuth start route', () => {
  beforeEach(() => {
    buildAuthorizationRequestMock.mockReset().mockResolvedValue({
      url: 'https://ory.example.com/oauth2/auth?client_id=x&state=s',
      state: 'state-value',
      nonce: 'nonce-value',
      codeVerifier: 'verifier-value',
    })
    readSignupMetadataMock
      .mockReset()
      .mockReturnValue({ signup_ip: '203.0.113.10' })
    encodeSignupMetadataMock.mockReset().mockReturnValue('encoded-metadata')
  })

  it('builds the authorize URL and stashes the flow-state cookie', async () => {
    const response = await oauthStartGET(
      new NextRequest('https://app.e2b.dev/api/auth/oauth/start?intent=signin')
    )

    expect(response.headers.get('location')).toBe(
      'https://ory.example.com/oauth2/auth?client_id=x&state=s'
    )
    expect(buildAuthorizationRequestMock).toHaveBeenCalledWith(
      'signin',
      'https://app.e2b.dev/api/auth/oauth/callback/ory'
    )
    expect(response.cookies.get('e2b_oauth_flow')?.value).toBeTruthy()
    // No signup metadata captured for a plain sign-in.
    expect(readSignupMetadataMock).not.toHaveBeenCalled()
  })

  it('captures signup metadata for the signup intent', async () => {
    const response = await oauthStartGET(
      new NextRequest('https://app.e2b.dev/api/auth/oauth/start?intent=signup')
    )

    expect(buildAuthorizationRequestMock).toHaveBeenCalledWith(
      'signup',
      'https://app.e2b.dev/api/auth/oauth/callback/ory'
    )
    expect(readSignupMetadataMock).toHaveBeenCalled()
    expect(response.cookies.get('e2b-ory-signup-metadata')?.value).toBe(
      'encoded-metadata'
    )
  })

  it('rejects an invalid auth intent', async () => {
    const response = await oauthStartGET(
      new NextRequest('https://app.e2b.dev/api/auth/oauth/start?intent=nope')
    )

    expect(response.status).toBe(400)
  })
})
