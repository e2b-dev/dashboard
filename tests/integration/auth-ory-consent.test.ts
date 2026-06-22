import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getConsentMock = vi.hoisted(() => vi.fn())
const acceptConsentMock = vi.hoisted(() => vi.fn())
const getIdentityMock = vi.hoisted(() => vi.fn())

vi.mock('@/core/server/auth/ory/client', () => ({
  getOryOAuth2Api: () => ({
    getOAuth2ConsentRequest: getConsentMock,
    acceptOAuth2ConsentRequest: acceptConsentMock,
  }),
  getOryIdentityApi: () => ({ getIdentity: getIdentityMock }),
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { GET } = await import('@/app/consent/route')

const HYDRA_CONTINUE =
  'https://ory.example.com/oauth2/auth?consent_verifier=xyz'

function consentRequest(challenge: string | null = 'consent-challenge') {
  const url = new URL('https://app.e2b.dev/consent')
  if (challenge !== null) url.searchParams.set('consent_challenge', challenge)
  return new NextRequest(url)
}

describe('Ory consent provider', () => {
  beforeEach(() => {
    getConsentMock.mockReset().mockResolvedValue({
      subject: 'identity-uuid',
      requested_scope: ['openid', 'offline_access', 'email', 'profile'],
      requested_access_token_audience: ['dashboard-api'],
    })
    getIdentityMock.mockReset().mockResolvedValue({
      traits: {
        email: 'local-dev@e2b.dev',
        name: 'Local Dev',
      },
    })
    acceptConsentMock
      .mockReset()
      .mockResolvedValue({ redirect_to: HYDRA_CONTINUE })
  })

  it('folds the identity profile traits into the id_token and redirects', async () => {
    const response = await GET(consentRequest())

    expect(response.headers.get('location')).toBe(HYDRA_CONTINUE)
    expect(getIdentityMock).toHaveBeenCalledWith({ id: 'identity-uuid' })
    expect(acceptConsentMock).toHaveBeenCalledWith({
      consentChallenge: 'consent-challenge',
      acceptOAuth2ConsentRequest: {
        grant_scope: ['openid', 'offline_access', 'email', 'profile'],
        grant_access_token_audience: ['dashboard-api'],
        session: {
          id_token: { email: 'local-dev@e2b.dev', name: 'Local Dev' },
        },
      },
    })
  })

  it('omits the email claim when the email scope is not granted', async () => {
    getConsentMock.mockResolvedValueOnce({
      subject: 'identity-uuid',
      requested_scope: ['openid'],
      requested_access_token_audience: [],
    })

    await GET(consentRequest())

    expect(acceptConsentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        acceptOAuth2ConsentRequest: expect.objectContaining({
          session: { id_token: {} },
        }),
      })
    )
  })

  it('still accepts (without profile claims) when the identity lookup fails', async () => {
    getIdentityMock.mockRejectedValueOnce(new Error('404'))

    const response = await GET(consentRequest())

    expect(response.headers.get('location')).toBe(HYDRA_CONTINUE)
    expect(acceptConsentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        acceptOAuth2ConsentRequest: expect.objectContaining({
          session: { id_token: {} },
        }),
      })
    )
  })

  it('redirects home when there is no consent_challenge', async () => {
    const response = await GET(consentRequest(null))

    expect(response.headers.get('location')).toBe('https://app.e2b.dev/')
    expect(getConsentMock).not.toHaveBeenCalled()
  })
})
