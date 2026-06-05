import { beforeEach, describe, expect, it, vi } from 'vitest'

const signInMock = vi.hoisted(() => vi.fn())
const readSignupMetadataMock = vi.hoisted(() => vi.fn())
const setSignupMetadataCookieMock = vi.hoisted(() => vi.fn())

vi.mock('@/auth', () => ({
  signIn: signInMock,
}))

vi.mock('@/core/server/auth/ory/signup-metadata', () => ({
  readOrySignupMetadataFromHeaders: readSignupMetadataMock,
  setOrySignupMetadataCookie: setSignupMetadataCookieMock,
}))

const { GET } = await import('@/app/api/auth/oauth-start/route')

describe('oauth-start GET', () => {
  beforeEach(() => {
    signInMock.mockReset()
    signInMock.mockResolvedValue(undefined)
    readSignupMetadataMock.mockReset()
    readSignupMetadataMock.mockReturnValue({
      signup_ip: '203.0.113.10',
      signup_user_agent: 'Mozilla/5.0',
    })
    setSignupMetadataCookieMock.mockReset()
    setSignupMetadataCookieMock.mockResolvedValue(undefined)
  })

  it('captures signup metadata before starting Ory registration', async () => {
    const request = new Request(
      'https://app.e2b.dev/api/auth/oauth-start?intent=signup&returnTo=%2Fdashboard',
      {
        headers: {
          'x-forwarded-for': '203.0.113.10',
          'user-agent': 'Mozilla/5.0',
        },
      }
    )

    await GET(request)

    expect(readSignupMetadataMock).toHaveBeenCalledWith(request.headers)
    expect(setSignupMetadataCookieMock).toHaveBeenCalledWith({
      signup_ip: '203.0.113.10',
      signup_user_agent: 'Mozilla/5.0',
    })
    expect(signInMock).toHaveBeenCalledWith(
      'ory',
      { redirectTo: '/dashboard' },
      { prompt: 'registration' }
    )
  })

  it('does not capture signup metadata for sign-in', async () => {
    await GET(
      new Request('https://app.e2b.dev/api/auth/oauth-start?intent=signin')
    )

    expect(readSignupMetadataMock).not.toHaveBeenCalled()
    expect(setSignupMetadataCookieMock).not.toHaveBeenCalled()
    expect(signInMock).toHaveBeenCalledWith(
      'ory',
      { redirectTo: '/dashboard' },
      undefined
    )
  })
})
