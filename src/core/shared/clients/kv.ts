import 'server-only'
import { createClient } from 'redis'
import { l, serializeErrorForLog } from './logger/logger'

export type OptionalKvResult<T> =
  | { ok: true; configured: true; value: T }
  | {
      ok: false
      configured: false
      reason: 'not_configured' | 'misconfigured'
    }
  | { ok: false; configured: true; reason: 'error'; error: unknown }

export type KvCapabilityStatus =
  | { configured: false; available: false; status: 'not_configured' }
  | { configured: false; available: false; status: 'misconfigured' }
  | { configured: true; available: true; status: 'ok' }
  | { configured: true; available: false; status: 'error'; error: unknown }

type KvConfigStatus = 'not_configured' | 'misconfigured' | 'configured'
type RedisClient = ReturnType<typeof createClient>

function isValidRedisUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === 'redis:' || parsedUrl.protocol === 'rediss:'
  } catch {
    return false
  }
}

function getKvConfigStatus(): KvConfigStatus {
  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    return 'not_configured'
  }

  if (!isValidRedisUrl(redisUrl)) {
    return 'misconfigured'
  }

  return 'configured'
}

function createRedisClient() {
  const client = createClient({
    url: process.env.REDIS_URL,
    // Fail commands fast instead of queueing them behind an auto-reconnect.
    disableOfflineQueue: true,
    socket: {
      socketTimeout: 10_000,
    },
  })

  // Required even for a short-lived client: an unhandled 'error' event would
  // crash the process.
  client.on('error', (error) => {
    l.error(
      {
        key: 'redis_client:error',
        error: serializeErrorForLog(error),
      },
      'Redis client error'
    )
  })

  return client
}

// Open a dedicated connection per operation. Serverless instances freeze
// between bursts and Upstash closes idle TCP connections, so a long-lived
// socket goes stale while the client still reports itself ready and the next
// command races a dead socket. A connect → command → close cycle sidesteps
// that; KV is off the hot path here (a CDN-cached health probe and a rare
// signup dedupe flag), so the per-call handshake is cheap.
async function withRedis<T>(
  op: (client: RedisClient) => Promise<T>
): Promise<T> {
  const client = createRedisClient()

  try {
    await client.connect()
    return await op(client)
  } finally {
    // Immediate, synchronous socket release that can't hang on a half-dead
    // connection. Guarded so teardown never masks the original error.
    try {
      client.destroy()
    } catch {}
  }
}

export function isKvConfigured() {
  return getKvConfigStatus() === 'configured'
}

export async function pingKv(): Promise<KvCapabilityStatus> {
  const configStatus = getKvConfigStatus()

  if (configStatus !== 'configured') {
    return { configured: false, available: false, status: configStatus }
  }

  try {
    await withRedis((client) => client.ping())
    return { configured: true, available: true, status: 'ok' }
  } catch (error) {
    return { configured: true, available: false, status: 'error', error }
  }
}

export async function getKvValue<T>(
  key: string
): Promise<OptionalKvResult<T | null>> {
  const configStatus = getKvConfigStatus()

  if (configStatus !== 'configured') {
    return { ok: false, configured: false, reason: configStatus }
  }

  try {
    const value = await withRedis((client) => client.get(key))

    return {
      ok: true,
      configured: true,
      value: value === null ? null : (JSON.parse(value) as T),
    }
  } catch (error) {
    return { ok: false, configured: true, reason: 'error', error }
  }
}

export async function setKvValue(
  key: string,
  value: unknown
): Promise<OptionalKvResult<unknown>> {
  const configStatus = getKvConfigStatus()

  if (configStatus !== 'configured') {
    return { ok: false, configured: false, reason: configStatus }
  }

  try {
    return {
      ok: true,
      configured: true,
      value: await withRedis((client) =>
        client.set(key, JSON.stringify(value))
      ),
    }
  } catch (error) {
    return { ok: false, configured: true, reason: 'error', error }
  }
}
