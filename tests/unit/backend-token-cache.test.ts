import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mintBackendTokenMock = vi.hoisted(() => vi.fn())

vi.mock('@/core/server/auth/ory/silent-grant', () => ({
  mintBackendToken: mintBackendTokenMock,
}))

const { getBackendToken, __resetBackendTokenCacheForTests } = await import(
  '@/core/server/auth/ory/backend-token'
)

const nowSeconds = () => Math.floor(Date.now() / 1000)

describe('backend-token cache', () => {
  beforeEach(() => {
    mintBackendTokenMock.mockReset()
    __resetBackendTokenCacheForTests()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mints once and reuses the cached token for the same session', async () => {
    mintBackendTokenMock.mockResolvedValue({
      accessToken: 'token-a',
      expiresAt: nowSeconds() + 3600,
    })

    const first = await getBackendToken({ sessionId: 's1', subject: 'u1' })
    const second = await getBackendToken({ sessionId: 's1', subject: 'u1' })

    expect(first).toBe('token-a')
    expect(second).toBe('token-a')
    expect(mintBackendTokenMock).toHaveBeenCalledTimes(1)
  })

  it('never serves one session a token minted for another', async () => {
    mintBackendTokenMock
      .mockResolvedValueOnce({
        accessToken: 'token-u1',
        expiresAt: nowSeconds() + 3600,
      })
      .mockResolvedValueOnce({
        accessToken: 'token-u2',
        expiresAt: nowSeconds() + 3600,
      })

    const u1 = await getBackendToken({ sessionId: 's1', subject: 'u1' })
    const u2 = await getBackendToken({ sessionId: 's2', subject: 'u2' })

    expect(u1).toBe('token-u1')
    expect(u2).toBe('token-u2')
    expect(mintBackendTokenMock).toHaveBeenCalledTimes(2)
  })

  it('does not reuse a token across a changed session id (re-login)', async () => {
    mintBackendTokenMock.mockResolvedValue({
      accessToken: 'token',
      expiresAt: nowSeconds() + 3600,
    })

    // Same subject, but the session id rotated (new login) → fresh mint.
    await getBackendToken({ sessionId: 's-old', subject: 'u1' })
    await getBackendToken({ sessionId: 's-new', subject: 'u1' })

    expect(mintBackendTokenMock).toHaveBeenCalledTimes(2)
  })

  it('re-mints once the cached token nears expiry', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

    mintBackendTokenMock.mockResolvedValue({
      accessToken: 'token',
      expiresAt: nowSeconds() + 100, // within the skew window soon
    })

    await getBackendToken({ sessionId: 's1', subject: 'u1' })
    // Advance past (expiresAt - skew); the entry is now stale.
    vi.advanceTimersByTime(60_000)
    await getBackendToken({ sessionId: 's1', subject: 'u1' })

    expect(mintBackendTokenMock).toHaveBeenCalledTimes(2)
  })

  it('does not cache mint failures', async () => {
    mintBackendTokenMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      accessToken: 'token',
      expiresAt: nowSeconds() + 3600,
    })

    const failed = await getBackendToken({ sessionId: 's1', subject: 'u1' })
    const retried = await getBackendToken({ sessionId: 's1', subject: 'u1' })

    expect(failed).toBeNull()
    expect(retried).toBe('token')
    expect(mintBackendTokenMock).toHaveBeenCalledTimes(2)
  })

  it('fails closed when the session id or subject is missing', async () => {
    const noSession = await getBackendToken({ sessionId: '', subject: 'u1' })
    const noSubject = await getBackendToken({ sessionId: 's1', subject: '' })

    expect(noSession).toBeNull()
    expect(noSubject).toBeNull()
    expect(mintBackendTokenMock).not.toHaveBeenCalled()
  })

  it('coalesces concurrent mints for the same session into one exchange', async () => {
    let resolveMint: (v: { accessToken: string; expiresAt: number }) => void =
      () => {}
    mintBackendTokenMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMint = resolve
        })
    )

    const p1 = getBackendToken({ sessionId: 's1', subject: 'u1' })
    const p2 = getBackendToken({ sessionId: 's1', subject: 'u1' })
    resolveMint({ accessToken: 'token', expiresAt: nowSeconds() + 3600 })

    expect(await p1).toBe('token')
    expect(await p2).toBe('token')
    expect(mintBackendTokenMock).toHaveBeenCalledTimes(1)
  })
})
