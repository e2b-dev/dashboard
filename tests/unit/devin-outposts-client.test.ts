import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createDevinPool,
  DevinConnectionError,
  discoverDevinAccount,
  normalizeDevinApiUrl,
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
      .mockResolvedValue(Response.json({}, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      discoverDevinAccount('https://api.devin.ai', 'test-key')
    ).rejects.toMatchObject({ kind: 'response' })
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.devin.ai/opbeta/outposts/pools',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-key' },
      })
    )
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('discovers pools without requesting enterprise organizations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        items: [
          {
            metadata: { pool_id: 'pool-1' },
            spec: { name: 'Linux workers', platform: 'linux' },
          },
        ],
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      discoverDevinAccount('https://api.devin.ai', 'test-key')
    ).resolves.toEqual({
      pools: [{ id: 'pool-1', name: 'Linux workers', platform: 'linux' }],
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/v3/enterprise/organizations'),
      expect.anything()
    )
  })

  it('creates a Linux Outposts pool', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        metadata: { pool_id: 'pool-created' },
        spec: { name: 'new-pool', platform: 'linux' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createDevinPool('https://api.devin.ai', 'test-key', {
        description: 'A test pool',
        name: 'new-pool',
      })
    ).resolves.toEqual({
      id: 'pool-created',
      name: 'new-pool',
      platform: 'linux',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.devin.ai/opbeta/outposts/pools',
      expect.objectContaining({
        body: JSON.stringify({
          description: 'A test pool',
          name: 'new-pool',
          platform: 'linux',
        }),
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        },
      })
    )
  })

  it('reconciles a provider failure when the pool was committed', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({}, { status: 502 }))
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              metadata: { pool_id: 'pool-created' },
              spec: { name: 'new-pool', platform: 'linux' },
            },
          ],
        })
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createDevinPool('https://api.devin.ai', 'test-key', {
        description: 'A test pool',
        name: 'new-pool',
      })
    ).resolves.toMatchObject({ id: 'pool-created' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reports an unknown pool creation outcome without retrying the POST', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({}, { status: 502 }))
      .mockResolvedValueOnce(Response.json({ items: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createDevinPool('https://api.devin.ai', 'test-key', {
        description: 'A test pool',
        name: 'new-pool',
      })
    ).rejects.toThrow(
      'Could not confirm whether Devin created the pool. Check the account before retrying.'
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reports a malformed successful create response after reconciliation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createDevinPool('https://api.devin.ai', 'test-key', {
        description: 'A test pool',
        name: 'new-pool',
      })
    ).rejects.toMatchObject({ kind: 'response' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reconciles a malformed successful response when the pool was committed', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              metadata: { pool_id: 'pool-created' },
              spec: { name: 'new-pool', platform: 'linux' },
            },
          ],
        })
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createDevinPool('https://api.devin.ai', 'test-key', {
        description: 'A test pool',
        name: 'new-pool',
      })
    ).resolves.toMatchObject({ id: 'pool-created' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reconciles a network failure when the pool was committed', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('connection reset'))
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              metadata: { pool_id: 'pool-created' },
              spec: { name: 'new-pool', platform: 'linux' },
            },
          ],
        })
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createDevinPool('https://api.devin.ai', 'test-key', {
        description: 'A test pool',
        name: 'new-pool',
      })
    ).resolves.toMatchObject({ id: 'pool-created' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not reconcile a deterministic credential rejection', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({}, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createDevinPool('https://api.devin.ai', 'test-key', {
        description: 'A test pool',
        name: 'new-pool',
      })
    ).rejects.toMatchObject({ kind: 'credentials' })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([
    400, 409, 422,
  ])('does not reconcile a deterministic create rejection with status %s', async (status) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({}, { status }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createDevinPool('https://api.devin.ai', 'test-key', {
        description: 'A test pool',
        name: 'new-pool',
      })
    ).rejects.toMatchObject({ kind: 'provider', status })
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
