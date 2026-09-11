import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchRuntimeConfig,
  resetRuntimeConfigCache,
} from '@/core/shared/runtime-config'

const savedSandboxUrl = process.env.NEXT_PUBLIC_E2B_SANDBOX_URL
const savedInfraUrl = process.env.NEXT_PUBLIC_INFRA_API_URL

beforeEach(() => {
  resetRuntimeConfigCache()
  delete process.env.NEXT_PUBLIC_E2B_SANDBOX_URL
  delete process.env.NEXT_PUBLIC_INFRA_API_URL
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (savedSandboxUrl === undefined) {
    delete process.env.NEXT_PUBLIC_E2B_SANDBOX_URL
  } else {
    process.env.NEXT_PUBLIC_E2B_SANDBOX_URL = savedSandboxUrl
  }
  if (savedInfraUrl === undefined) {
    delete process.env.NEXT_PUBLIC_INFRA_API_URL
  } else {
    process.env.NEXT_PUBLIC_INFRA_API_URL = savedInfraUrl
  }
})

describe('fetchRuntimeConfig', () => {
  it('returns what the config endpoint resolved', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        infraApiUrl: 'http://127.0.0.1:3000',
        sandboxUrl: 'http://host.example:3002',
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchRuntimeConfig()).resolves.toEqual({
      infraApiUrl: 'http://127.0.0.1:3000',
      sandboxUrl: 'http://host.example:3002',
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/config', {
      cache: 'no-store',
    })
  })

  it('coalesces concurrent callers into one request', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ infraApiUrl: null, sandboxUrl: null })
    )
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([fetchRuntimeConfig(), fetchRuntimeConfig()])

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to the build-time values when the endpoint fails', async () => {
    process.env.NEXT_PUBLIC_E2B_SANDBOX_URL = 'http://sandbox.lvh.me:3002'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 }))
    )

    await expect(fetchRuntimeConfig()).resolves.toEqual({
      infraApiUrl: null,
      sandboxUrl: 'http://sandbox.lvh.me:3002',
    })
  })

  it('falls back to the build-time values when the request throws', async () => {
    process.env.NEXT_PUBLIC_E2B_SANDBOX_URL = 'http://sandbox.lvh.me:3002'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      })
    )

    await expect(fetchRuntimeConfig()).resolves.toEqual({
      infraApiUrl: null,
      sandboxUrl: 'http://sandbox.lvh.me:3002',
    })
  })

  it('retries after a failed attempt instead of pinning the fallback', async () => {
    process.env.NEXT_PUBLIC_E2B_SANDBOX_URL = 'http://sandbox.lvh.me:3002'
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('nope', { status: 500 }))
      .mockResolvedValueOnce(
        Response.json({
          infraApiUrl: 'http://127.0.0.1:3000',
          sandboxUrl: 'http://host.example:3002',
        })
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchRuntimeConfig()).resolves.toEqual({
      infraApiUrl: null,
      sandboxUrl: 'http://sandbox.lvh.me:3002',
    })
    await expect(fetchRuntimeConfig()).resolves.toEqual({
      infraApiUrl: 'http://127.0.0.1:3000',
      sandboxUrl: 'http://host.example:3002',
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps caching a successful result', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ infraApiUrl: null, sandboxUrl: 'http://ok.example:3002' })
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchRuntimeConfig()
    await fetchRuntimeConfig()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
