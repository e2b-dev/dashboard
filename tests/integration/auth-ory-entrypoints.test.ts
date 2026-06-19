import { type NextFetchEvent, NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const isKratosSessionActiveMock = vi.hoisted(() => vi.fn())
const openOrySessionMock = vi.hoisted(() => vi.fn())
const isAccessTokenExpiringMock = vi.hoisted(() => vi.fn())
const refreshOrySessionMock = vi.hoisted(() => vi.fn())
const sealOrySessionMock = vi.hoisted(() => vi.fn())
const buildAuthorizationRequestMock = vi.hoisted(() => vi.fn())
const readSignupMetadataMock = vi.hoisted(() => vi.fn())
const encodeSignupMetadataMock = vi.hoisted(() => vi.fn())

vi.mock('@ory/nextjs/middleware', () => ({
  createOryMiddleware: () => vi.fn(),
}))

vi.mock('@/core/server/auth/ory/kratos-session-edge', () => ({
  isKratosSessionActive: isKratosSessionActiveMock,
}))

vi.mock('@/core/server/auth/ory/session-cookie', () => ({
  E2B_SESSION_COOKIE: 'e2b_session',
  openOrySession: openOrySessionMock,
  sealOrySession: sealOrySessionMock,
  orySessionCookieOptions: () => ({ httpOnly: true, path: '/' }),
  orySessionCookieDeleteOptions: () => ({ name: 'e2b_session', path: '/' }),
}))

vi.mock('@/core/server/auth/ory/token-refresh', () => ({
  isAccessTokenExpiring: isAccessTokenExpiringMock,
  refreshOrySession: refreshOrySessionMock,
}))

vi.mock('@/core/server/auth/ory/oauth-client', () => ({
  buildOryAuthorizationRequest: buildAuthorizationRequestMock,
}))

vi.mock('@/core/server/auth/ory/signup-metadata', () => ({
  ORY_SIGNUP_METADATA_COOKIE: 'e2b-ory-signup-metadata',
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

describe('Ory auth entrypoints — proxy gate', () => {
  beforeEach(() => {
    isKratosSessionActiveMock.mockReset().mockResolvedValue(false)
    openOrySessionMock.mockReset().mockResolvedValue(null)
    isAccessTokenExpiringMock.mockReset().mockReturnValue(false)
    refreshOrySessionMock.mockReset()
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
    openOrySessionMock.mockResolvedValue({
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
    openOrySessionMock.mockResolvedValue({
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
    openOrySessionMock.mockReset().mockResolvedValue(expiring)
    isKratosSessionActiveMock.mockReset().mockResolvedValue(true)
    isAccessTokenExpiringMock.mockReset().mockReturnValue(true)
    refreshOrySessionMock.mockReset()
    sealOrySessionMock.mockReset().mockResolvedValue('sealed-new')
  })

  it('refreshes an expiring token and persists it on the response', async () => {
    refreshOrySessionMock.mockResolvedValue({
      status: 'refreshed',
      tokens: { accessToken: 'new-access', expiresAt: 2_000 },
    })

    const response = await proxy(
      request('/dashboard/acme/sandboxes'),
      {} as NextFetchEvent
    )

    expect(refreshOrySessionMock).toHaveBeenCalledWith(expiring)
    expect(response.cookies.get('e2b_session')?.value).toBe('sealed-new')
    // Authenticated dashboard request is served (not redirected away).
    expect(response.headers.get('location')).toBeNull()
  })

  it('clears the cookie and redirects when the refresh is dead', async () => {
    refreshOrySessionMock.mockResolvedValue({ status: 'dead' })

    const response = await proxy(
      request('/dashboard/acme/sandboxes'),
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

    expect(refreshOrySessionMock).not.toHaveBeenCalled()
    expect(sealOrySessionMock).not.toHaveBeenCalled()
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
