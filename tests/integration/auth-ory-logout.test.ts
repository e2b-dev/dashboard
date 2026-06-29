import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const acceptLogoutMock = vi.hoisted(() => vi.fn())
const createBrowserLogoutFlowMock = vi.hoisted(() => vi.fn())

vi.mock('@/core/server/auth/ory/client', () => ({
  getOryOAuth2Api: () => ({ acceptOAuth2LogoutRequest: acceptLogoutMock }),
  getOryFrontendApi: () => ({
    createBrowserLogoutFlow: createBrowserLogoutFlowMock,
  }),
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { GET } = await import('@/app/logout/route')

const HYDRA_CONTINUE =
  'https://ory.example.com/oauth2/sessions/logout?logout_verifier=xyz'
const KRATOS_LOGOUT =
  'https://ory.example.com/self-service/logout?token=abc&return_to=' +
  encodeURIComponent(HYDRA_CONTINUE)

function logoutRequest({
  challenge = 'logout-challenge',
  cookie = 'ory_kratos_session=session-token',
}: {
  challenge?: string | null
  cookie?: string
} = {}): NextRequest {
  const url = new URL('https://app.e2b.dev/logout')
  if (challenge !== null) url.searchParams.set('logout_challenge', challenge)
  return new NextRequest(url, { headers: { cookie } })
}

describe('Ory logout provider', () => {
  beforeEach(() => {
    acceptLogoutMock
      .mockReset()
      .mockResolvedValue({ redirect_to: HYDRA_CONTINUE })
    createBrowserLogoutFlowMock
      .mockReset()
      .mockResolvedValue({ logout_url: KRATOS_LOGOUT, logout_token: 'tok' })
  })

  it('clears Kratos then routes the browser to the Kratos logout URL', async () => {
    const response = await GET(logoutRequest())

    expect(response.headers.get('location')).toBe(KRATOS_LOGOUT)
    expect(acceptLogoutMock).toHaveBeenCalledWith({
      logoutChallenge: 'logout-challenge',
    })
    // The browser cookie is forwarded so Kratos mints a logout token for this
    // session, and Hydra's continuation URL is the post-logout return target.
    expect(createBrowserLogoutFlowMock).toHaveBeenCalledWith({
      cookie: 'ory_kratos_session=session-token',
      returnTo: HYDRA_CONTINUE,
    })
  })

  it('redirects home when there is no logout_challenge', async () => {
    const response = await GET(logoutRequest({ challenge: null }))

    expect(response.headers.get('location')).toBe('https://app.e2b.dev/')
    expect(acceptLogoutMock).not.toHaveBeenCalled()
  })

  it('finalizes Hydra logout when no Kratos session is left to clear', async () => {
    createBrowserLogoutFlowMock.mockRejectedValueOnce(new Error('401'))

    const response = await GET(logoutRequest())

    expect(response.headers.get('location')).toBe(HYDRA_CONTINUE)
  })

  it('redirects home when accepting the Hydra logout fails', async () => {
    acceptLogoutMock.mockRejectedValueOnce(new Error('unknown challenge'))

    const response = await GET(logoutRequest())

    expect(response.headers.get('location')).toBe('https://app.e2b.dev/')
    expect(createBrowserLogoutFlowMock).not.toHaveBeenCalled()
  })
})
