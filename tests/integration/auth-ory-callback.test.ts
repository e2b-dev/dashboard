import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  E2B_OAUTH_FLOW_COOKIE,
  sealOryFlowState,
} from '@/core/server/auth/ory/oauth-flow'
import {
  E2B_SESSION_COOKIE,
  ORY_SIGNUP_METADATA_COOKIE,
  openSessionCookie,
} from '@/core/server/auth/ory/session-cookie'

const exchangeMock = vi.hoisted(() => vi.fn())
const bootstrapMock = vi.hoisted(() => vi.fn())
const readExternalIdMock = vi.hoisted(() => vi.fn())
const readAuthMethodMock = vi.hoisted(() => vi.fn())
const trackSignUpMock = vi.hoisted(() => vi.fn())

vi.mock('@/core/server/auth/ory/oauth-client', () => ({
  exchangeOryCallback: exchangeMock,
}))

vi.mock('@/core/server/auth/ory/dashboard-bootstrap', () => ({
  ensureOryUserBootstrapped: bootstrapMock,
}))

vi.mock('@/core/server/auth/ory/session', () => ({
  readKratosExternalId: readExternalIdMock,
  readKratosAuthMethod: readAuthMethodMock,
}))

vi.mock('@/core/server/auth/ory/signup-tracking', () => ({
  trackOrySignUpEvent: trackSignUpMock,
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { GET } = await import('@/app/api/auth/oauth/callback/ory/route')

const tokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  idToken: 'id-token',
  expiresAt: 1_900_000_000,
}

async function callbackRequest({
  withFlow = true,
  returnTo,
}: {
  withFlow?: boolean
  returnTo?: string
} = {}): Promise<NextRequest> {
  const headers: Record<string, string> = {}
  if (withFlow) {
    const flow = await sealOryFlowState({
      state: 'state-value',
      nonce: 'nonce-value',
      codeVerifier: 'verifier-value',
      returnTo,
    })
    headers.cookie = `${E2B_OAUTH_FLOW_COOKIE}=${flow}`
  }
  return new NextRequest(
    'https://app.e2b.dev/api/auth/oauth/callback/ory?code=abc&state=state-value',
    { headers }
  )
}

describe('Ory OAuth callback', () => {
  beforeEach(() => {
    vi.stubEnv('E2B_SESSION_SECRET', 'callback-test-secret')
    vi.stubEnv('ORY_HYDRA_PUBLIC_URL', 'https://ory.example.com')
    exchangeMock.mockReset().mockResolvedValue(tokens)
    bootstrapMock.mockReset().mockResolvedValue(true)
    // Default to an unprovisioned identity so bootstrap runs as before.
    readExternalIdMock.mockReset().mockResolvedValue(null)
    readAuthMethodMock.mockReset().mockResolvedValue('github')
    trackSignUpMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('seals e2b_session and redirects to returnTo on success', async () => {
    const response = await GET(
      await callbackRequest({ returnTo: '/dashboard/team' })
    )

    expect(response.headers.get('location')).toBe(
      'https://app.e2b.dev/dashboard/team'
    )

    const sealed = response.cookies.get(E2B_SESSION_COOKIE)?.value
    expect(await openSessionCookie(sealed)).toEqual(tokens)

    // The transient cookies are cleared on the way out.
    expect(response.cookies.get(E2B_OAUTH_FLOW_COOKIE)?.value).toBe('')
    expect(response.cookies.get(ORY_SIGNUP_METADATA_COOKIE)?.value).toBe('')
  })

  it('defaults to the dashboard when no returnTo is present', async () => {
    const response = await GET(await callbackRequest())

    expect(response.headers.get('location')).toBe(
      'https://app.e2b.dev/dashboard'
    )
  })

  it('routes to recover when the flow-state cookie is missing', async () => {
    const response = await GET(await callbackRequest({ withFlow: false }))

    expect(response.headers.get('location')).toBe(
      'https://app.e2b.dev/api/auth/oauth/recover'
    )
    expect(exchangeMock).not.toHaveBeenCalled()
    expect(response.cookies.get(E2B_SESSION_COOKIE)?.value).toBeUndefined()
  })

  it('routes to recover when the code exchange fails', async () => {
    exchangeMock.mockRejectedValueOnce(new Error('state mismatch'))

    const response = await GET(await callbackRequest())

    expect(response.headers.get('location')).toBe(
      'https://app.e2b.dev/api/auth/oauth/recover'
    )
    expect(response.cookies.get(E2B_SESSION_COOKIE)?.value).toBeUndefined()
  })

  it('bootstraps and tracks sign_up when the identity has no external_id yet', async () => {
    await GET(await callbackRequest())

    expect(bootstrapMock).toHaveBeenCalledOnce()
    expect(trackSignUpMock).toHaveBeenCalledOnce()
    expect(trackSignUpMock).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'github' })
    )
  })

  it('skips bootstrap and sign_up tracking when the identity already has an external_id', async () => {
    readExternalIdMock.mockResolvedValueOnce('user-ext-123')

    const response = await GET(
      await callbackRequest({ returnTo: '/dashboard' })
    )

    expect(bootstrapMock).not.toHaveBeenCalled()
    expect(trackSignUpMock).not.toHaveBeenCalled()
    // The session is still sealed and the user lands on their destination.
    const sealed = response.cookies.get(E2B_SESSION_COOKIE)?.value
    expect(await openSessionCookie(sealed)).toEqual(tokens)
    expect(response.headers.get('location')).toBe(
      'https://app.e2b.dev/dashboard'
    )
  })

  it('RP-logs-out (no dashboard cookie) when bootstrap fails', async () => {
    bootstrapMock.mockResolvedValueOnce(false)

    const response = await GET(await callbackRequest())
    const location = response.headers.get('location') ?? ''

    expect(location).toContain('https://ory.example.com/oauth2/sessions/logout')
    expect(location).toContain('id_token_hint=id-token')
    expect(response.cookies.get(E2B_SESSION_COOKIE)?.value).toBeUndefined()
  })
})
