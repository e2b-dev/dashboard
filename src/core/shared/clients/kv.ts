import { kv } from '@vercel/kv'

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

function getKvConfigStatus() {
  const hasUrl = Boolean(process.env.KV_REST_API_URL)
  const hasToken = Boolean(process.env.KV_REST_API_TOKEN)

  if (!(hasUrl || hasToken)) {
    return 'not_configured'
  }

  if (hasUrl && hasToken) {
    return 'configured'
  }

  return 'misconfigured'
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
    await kv.ping()
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
    return { ok: true, configured: true, value: await kv.get<T>(key) }
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
    return { ok: true, configured: true, value: await kv.set(key, value) }
  } catch (error) {
    return { ok: false, configured: true, reason: 'error', error }
  }
}
