import type { JWT } from 'next-auth/jwt'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: {
    error: vi.fn(),
    warn: vi.fn(),
  },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { refreshOryToken } = await import('@/core/server/auth/ory/refresh-token')

describe('refreshOryToken', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('builds Basic auth credentials from UTF-8 client credentials', async () => {
    vi.stubEnv('ORY_SDK_URL', 'https://ory.test')
    vi.stubEnv('ORY_OAUTH2_CLIENT_ID', 'client')
    vi.stubEnv('ORY_OAUTH2_CLIENT_SECRET', 'päss')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: 'fresh-access-token',
        expires_in: 3600,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await refreshOryToken({ refreshToken: 'refresh-token' } as JWT)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://ory.test/oauth2/token',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from('client:päss', 'utf8').toString(
            'base64'
          )}`,
        }),
      })
    )
  })
})
