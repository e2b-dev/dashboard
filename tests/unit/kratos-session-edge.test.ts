import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isKratosSessionActive } from '@/core/server/auth/ory/kratos-session-edge'

function requestWithCookie(cookie?: string): NextRequest {
  return new NextRequest('https://app.e2b.dev/dashboard', {
    headers: cookie ? { cookie } : {},
  })
}

describe('isKratosSessionActive', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ORY_SDK_URL', 'https://ory.example.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns false without calling whoami when the request has no cookie', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await isKratosSessionActive(requestWithCookie())).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns false when no Ory SDK URL is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_ORY_SDK_URL', '')
    vi.stubEnv('ORY_SDK_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(
      await isKratosSessionActive(requestWithCookie('ory_session=abc'))
    ).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('calls whoami with the request cookie and returns true for an active session', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ active: true, identity: { external_id: 'ext-1' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await isKratosSessionActive(
      requestWithCookie('ory_session=abc')
    )

    expect(result).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ory.example.com/sessions/whoami',
      { headers: { cookie: 'ory_session=abc', accept: 'application/json' } }
    )
  })

  it('strips app-owned cookies before forwarding to whoami', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ active: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await isKratosSessionActive(
      requestWithCookie(
        'ory_session=abc; e2b_session=secret; e2b-ory-signup-metadata=meta'
      )
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://ory.example.com/sessions/whoami',
      { headers: { cookie: 'ory_session=abc', accept: 'application/json' } }
    )
  })

  it('returns false when only app-owned cookies are present', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(
      await isKratosSessionActive(requestWithCookie('e2b_session=secret'))
    ).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns false for an inactive session', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ active: false }) })
    )

    expect(
      await isKratosSessionActive(requestWithCookie('ory_session=abc'))
    ).toBe(false)
  })

  it('returns false on a non-OK whoami response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })
    )

    expect(
      await isKratosSessionActive(requestWithCookie('ory_session=abc'))
    ).toBe(false)
  })

  it('returns false when the whoami request throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))

    expect(
      await isKratosSessionActive(requestWithCookie('ory_session=abc'))
    ).toBe(false)
  })

  it('strips a trailing slash from the SDK URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_ORY_SDK_URL', 'https://ory.example.com/')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ active: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await isKratosSessionActive(requestWithCookie('ory_session=abc'))

    expect(fetchMock).toHaveBeenCalledWith(
      'https://ory.example.com/sessions/whoami',
      expect.anything()
    )
  })
})
