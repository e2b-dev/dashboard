import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { ping } = vi.hoisted(() => ({
  ping: vi.fn(),
}))

vi.mock('@vercel/kv', () => ({
  kv: {
    ping,
  },
}))

import { pingKv } from '@/core/shared/clients/kv'

const originalKvEnv = {
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  KV_REST_API_URL: process.env.KV_REST_API_URL,
}

function resetKvEnv() {
  if (originalKvEnv.KV_REST_API_TOKEN === undefined) {
    delete process.env.KV_REST_API_TOKEN
  } else {
    process.env.KV_REST_API_TOKEN = originalKvEnv.KV_REST_API_TOKEN
  }

  if (originalKvEnv.KV_REST_API_URL === undefined) {
    delete process.env.KV_REST_API_URL
  } else {
    process.env.KV_REST_API_URL = originalKvEnv.KV_REST_API_URL
  }
}

describe('optional KV client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.KV_REST_API_TOKEN
    delete process.env.KV_REST_API_URL
  })

  afterEach(() => {
    resetKvEnv()
  })

  it('reports KV as not configured when both env values are omitted', async () => {
    await expect(pingKv()).resolves.toEqual({
      configured: false,
      available: false,
      status: 'not_configured',
    })
    expect(ping).not.toHaveBeenCalled()
  })
})
