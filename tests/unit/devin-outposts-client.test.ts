import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DevinConnectionError,
  discoverDevinAccount,
  normalizeDevinApiUrl,
  organizationsFromPayload,
  poolsFromPayload,
} from '@/core/modules/devin-outposts/client.server'

describe('Devin Outposts API boundary', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('accepts Devin API origins and strips the trailing slash', () => {
    expect(normalizeDevinApiUrl('https://api.devin.ai/')).toBe(
      'https://api.devin.ai'
    )
    expect(normalizeDevinApiUrl('https://api.beta.devinenterprise.com')).toBe(
      'https://api.beta.devinenterprise.com'
    )
  })

  it.each([
    'http://api.devin.ai',
    'https://example.com',
    'https://api.devin.ai/admin',
    'https://user:password@api.devin.ai',
    'https://api.devin.ai:8443',
    'https://api.devin.ai?target=internal',
    'https://api.devin.ai#fragment',
    'https://api.devin.ai.example.com',
    'not a URL',
  ])('rejects unsafe server-side API URL %s', (value) => {
    expect(() => normalizeDevinApiUrl(value)).toThrow(DevinConnectionError)
  })

  it('parses organizations and ignores malformed records', () => {
    expect(
      organizationsFromPayload({
        items: [
          { org_id: 'org-1', name: 'Engineering' },
          { name: 'Missing ID' },
          null,
        ],
      })
    ).toEqual([{ id: 'org-1', name: 'Engineering' }])
  })

  it('parses Outposts pools and ignores incomplete records', () => {
    expect(
      poolsFromPayload({
        items: [
          {
            metadata: { pool_id: 'pool-1' },
            spec: { name: 'Linux workers', platform: 'linux' },
          },
          { metadata: { pool_id: 'missing-name' }, spec: {} },
        ],
      })
    ).toEqual([{ id: 'pool-1', name: 'Linux workers', platform: 'linux' }])
  })

  it('rejects malformed collection payloads', () => {
    expect(() => organizationsFromPayload({})).toThrow(
      'Devin returned an unexpected response'
    )
    expect(() => poolsFromPayload({ items: null })).toThrow(
      'Devin returned an unexpected response'
    )
  })

  it('classifies rejected credentials without continuing discovery', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{}', {
        headers: { 'content-type': 'application/json' },
        status: 401,
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      discoverDevinAccount('https://api.devin.ai', 'test-key')
    ).rejects.toMatchObject({ kind: 'credentials' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects malformed pool responses after authenticated discovery', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ org_id: 'org-1' }, { status: 200 })
      )
      .mockResolvedValueOnce(Response.json({}, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      discoverDevinAccount('https://api.devin.ai', 'test-key')
    ).rejects.toMatchObject({ kind: 'response' })
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.devin.ai/v3/self',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-key' },
      })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.devin.ai/opbeta/outposts/pools',
      expect.any(Object)
    )
  })
})
