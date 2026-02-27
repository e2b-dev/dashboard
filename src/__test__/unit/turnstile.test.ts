import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the server-only dependencies before importing
vi.mock('@/configs/flags', () => ({
  CAPTCHA_REQUIRED_SERVER: true,
}))

vi.mock('@/lib/clients/logger/logger', () => ({
  l: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const { verifyTurnstileToken } = await import('@/lib/captcha/turnstile')

describe('verifyTurnstileToken', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret-key')
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('returns true when Turnstile verification succeeds', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })

    const result = await verifyTurnstileToken('valid-token')
    expect(result).toBe(true)
  })

  it('returns false when Turnstile verification fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: false,
          'error-codes': ['invalid-input-response'],
        }),
    })

    const result = await verifyTurnstileToken('invalid-token')
    expect(result).toBe(false)
  })

  it('returns false when no token is provided', async () => {
    const result = await verifyTurnstileToken(undefined)
    expect(result).toBe(false)
  })

  it('returns false when fetch throws a network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await verifyTurnstileToken('some-token')
    expect(result).toBe(false)
  })

  it('returns false when fetch times out', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new DOMException('Aborted', 'AbortError'))

    const result = await verifyTurnstileToken('some-token')
    expect(result).toBe(false)
  })

  it('returns false when response JSON parsing fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.reject(new Error('Invalid JSON')),
    })

    const result = await verifyTurnstileToken('some-token')
    expect(result).toBe(false)
  })
})
