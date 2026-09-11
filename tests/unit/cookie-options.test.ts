import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadApiKeyCookieOptions() {
  vi.resetModules()
  const cookies = await import('@/configs/cookies')
  return cookies.COOKIE_OPTIONS[cookies.COOKIE_KEYS.API_KEY]
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('api key cookie options', () => {
  it('keeps the build-mode default when the flag is unset', async () => {
    vi.stubEnv('DASHBOARD_COOKIE_SECURE', undefined)
    vi.stubEnv('NODE_ENV', 'production')

    await expect(loadApiKeyCookieOptions()).resolves.toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    })
  })

  it('is not secure outside production when the flag is unset', async () => {
    vi.stubEnv('DASHBOARD_COOKIE_SECURE', undefined)
    vi.stubEnv('NODE_ENV', 'development')

    await expect(loadApiKeyCookieOptions()).resolves.toMatchObject({
      secure: false,
    })
  })

  it('drops the Secure flag when DASHBOARD_COOKIE_SECURE is false', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DASHBOARD_COOKIE_SECURE', 'false')

    await expect(loadApiKeyCookieOptions()).resolves.toMatchObject({
      secure: false,
    })
  })

  it('accepts the flag case-insensitively', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DASHBOARD_COOKIE_SECURE', 'FALSE')

    await expect(loadApiKeyCookieOptions()).resolves.toMatchObject({
      secure: false,
    })
  })

  it('ignores whitespace around the flag', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DASHBOARD_COOKIE_SECURE', '  false  ')

    await expect(loadApiKeyCookieOptions()).resolves.toMatchObject({
      secure: false,
    })
  })

  // An orchestrator that always passes the variable sends "" when it is
  // unset, which has to mean "unset" rather than "not false".
  it('treats an empty flag as unset', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DASHBOARD_COOKIE_SECURE', '')

    await expect(loadApiKeyCookieOptions()).resolves.toMatchObject({
      secure: true,
    })
  })

  it('treats a whitespace-only flag as unset', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DASHBOARD_COOKIE_SECURE', '   ')

    await expect(loadApiKeyCookieOptions()).resolves.toMatchObject({
      secure: true,
    })
  })

  it('keeps the Secure flag when DASHBOARD_COOKIE_SECURE is true', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DASHBOARD_COOKIE_SECURE', 'true')

    await expect(loadApiKeyCookieOptions()).resolves.toMatchObject({
      secure: true,
    })
  })
})
