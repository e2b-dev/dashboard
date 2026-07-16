import 'server-only'

const REQUEST_TIMEOUT_MS = 15_000
const ALLOWED_API_HOST_SUFFIXES = ['.devin.ai', '.devinenterprise.com']

export type DevinPool = {
  id: string
  name: string
  platform: string
}

export type DevinDiscovery = {
  pools: DevinPool[]
}

export class DevinConnectionError extends Error {
  constructor(
    message: string,
    readonly kind: 'credentials' | 'provider' | 'response' | 'url',
    readonly status?: number
  ) {
    super(message)
  }
}

export function normalizeDevinApiUrl(value: string) {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new DevinConnectionError('Enter a valid Devin API URL', 'url')
  }

  const hostname = url.hostname.toLowerCase()
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    (url.pathname !== '/' && url.pathname !== '') ||
    url.search ||
    url.hash ||
    !ALLOWED_API_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix)
    )
  ) {
    throw new DevinConnectionError(
      'Use the HTTPS API origin supplied by Devin',
      'url'
    )
  }

  return url.origin
}

export async function discoverDevinAccount(
  apiUrlInput: string,
  apiKey: string
): Promise<DevinDiscovery> {
  const apiUrl = normalizeDevinApiUrl(apiUrlInput)
  const credentials = { apiKey, apiUrl }
  const pools = poolsFromPayload(
    await devinRequest(credentials, '/opbeta/outposts/pools')
  )
  return { pools }
}

export async function createDevinPool(
  apiUrlInput: string,
  apiKey: string,
  input: { name: string; description: string }
) {
  const apiUrl = normalizeDevinApiUrl(apiUrlInput)
  const credentials = { apiKey, apiUrl }
  let payload: Record<string, unknown>

  try {
    payload = await devinRequest(credentials, '/opbeta/outposts/pools', {
      body: JSON.stringify({
        description: input.description,
        name: input.name,
        platform: 'linux',
      }),
      method: 'POST',
    })
  } catch (error) {
    if (
      error instanceof DevinConnectionError &&
      error.kind === 'provider' &&
      (!error.status || error.status >= 500)
    ) {
      const matchingPool = await reconcileCreatedPool(credentials, input.name)
      if (matchingPool) return matchingPool
      throw new DevinConnectionError(
        'Could not confirm whether Devin created the pool. Check the account before retrying.',
        'provider'
      )
    }
    throw error
  }

  const pool = poolFromPayload(payload)
  if (!pool) {
    const matchingPool = await reconcileCreatedPool(credentials, input.name)
    if (matchingPool) return matchingPool
    throw new DevinConnectionError(
      'Devin accepted the pool request but returned an unexpected response. Check the account before retrying.',
      'response'
    )
  }
  return pool
}

async function reconcileCreatedPool(
  credentials: { apiUrl: string; apiKey: string },
  name: string
) {
  try {
    return poolsFromPayload(
      await devinRequest(credentials, '/opbeta/outposts/pools')
    ).find((pool) => pool.name === name)
  } catch {
    return undefined
  }
}

export function poolsFromPayload(payload: Record<string, unknown>) {
  return collectionItems(payload)
    .map(poolFromPayload)
    .filter((item): item is DevinPool => Boolean(item))
}

async function devinRequest(
  credentials: { apiUrl: string; apiKey: string },
  path: string,
  init?: Pick<RequestInit, 'body' | 'method'>
) {
  let response: Response
  try {
    response = await fetch(`${credentials.apiUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new DevinConnectionError('Could not reach the Devin API', 'provider')
  }

  if (response.status === 401 || response.status === 403) {
    throw new DevinConnectionError(
      'Devin rejected this API credential',
      'credentials'
    )
  }
  if (!response.ok) {
    throw new DevinConnectionError(
      init?.method !== 'POST'
        ? 'Devin account discovery is unavailable'
        : response.status === 409
          ? 'An Outposts pool with this name already exists'
          : response.status === 400 || response.status === 422
            ? 'Devin rejected the Outposts pool configuration'
            : 'Devin could not create the Outposts pool',
      'provider',
      response.status
    )
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('application/json')) {
    throw new DevinConnectionError(
      'Devin returned an unexpected response',
      'response'
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new DevinConnectionError(
      'Devin returned an unexpected response',
      'response'
    )
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new DevinConnectionError(
      'Devin returned an unexpected response',
      'response'
    )
  }
  return payload as Record<string, unknown>
}

function poolFromPayload(item: Record<string, unknown>) {
  const metadata = recordField(item, 'metadata')
  const spec = recordField(item, 'spec')
  const id = stringField(metadata, 'pool_id')
  const name = stringField(spec, 'name')
  if (!id || !name) return undefined
  return { id, name, platform: stringField(spec, 'platform') }
}

function records(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item)
  )
}

function collectionItems(payload: Record<string, unknown>) {
  if (!Array.isArray(payload.items)) {
    throw new DevinConnectionError(
      'Devin returned an unexpected response',
      'response'
    )
  }
  return records(payload.items)
}

function recordField(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringField(record: Record<string, unknown>, key: string) {
  return typeof record[key] === 'string' ? record[key] : ''
}
