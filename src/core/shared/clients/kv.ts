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

let redisClient: RedisClient | null = null
let redisConnectPromise: Promise<RedisClient> | null = null

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
  })

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

async function getRedisClient() {
  if (redisClient?.isReady) {
    return redisClient
  }

  if (!redisClient) {
    redisClient = createRedisClient()
  }

  if (!redisConnectPromise) {
    redisConnectPromise = redisClient.connect().catch((error) => {
      redisConnectPromise = null
      redisClient = null
      throw error
    })
  }

  return redisConnectPromise
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
    const redis = await getRedisClient()
    await redis.ping()
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
    const redis = await getRedisClient()
    const value = await redis.get(key)

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
    const redis = await getRedisClient()
    return {
      ok: true,
      configured: true,
      value: await redis.set(key, JSON.stringify(value)),
    }
  } catch (error) {
    return { ok: false, configured: true, reason: 'error', error }
  }
}
