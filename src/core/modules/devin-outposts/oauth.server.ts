import 'server-only'

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { z } from 'zod'
import { normalizeDevinApiUrl } from './client.server'

const DEFAULT_DEVIN_CONNECT_URL = 'https://app.devin.ai/outposts/connect'
const DEVIN_TOKEN_URL = 'https://api.devin.ai/outposts/connection-token'
const OAUTH_ATTEMPT_TTL_SECONDS = 30 * 60
const REQUEST_TIMEOUT_MS = 15_000

const oauthAttemptSchema = z.strictObject({
  expiresAt: z.number().int().positive(),
  nonce: z.string().min(32).max(128),
  operationId: z.uuid(),
  returnOrigin: z.url(),
  teamId: z.string().min(1).max(256),
  teamSlug: z.string().min(1).max(256),
  userId: z.string().min(1).max(256),
  version: z.literal(1),
})

const tokenResponseSchema = z.looseObject({
  access_token: z.string().min(1).max(8192),
  api_base_url: z.string().min(1).max(512),
  outpost_pool_id: z.string().min(1).max(256),
})

export type DevinOAuthAttempt = z.infer<typeof oauthAttemptSchema>

export type DevinConnectionToken = {
  accessToken: string
  apiUrl: string
  poolId: string
}

export class DevinOAuthError extends Error {
  constructor(
    readonly kind: 'config' | 'invalid_grant' | 'provider' | 'response'
  ) {
    super(`Devin OAuth failed: ${kind}`)
  }
}

export function isDevinOAuthConfigured(returnOrigin: string) {
  try {
    validateCallbackHost(getCallbackUrl(), normalizeReturnOrigin(returnOrigin))
    getConnectUrl()
    getSecret()
    return true
  } catch {
    return false
  }
}

export function createDevinOAuthAttempt(input: {
  operationId: string
  returnOrigin: string
  teamId: string
  teamSlug: string
  userId: string
}) {
  const attempt: DevinOAuthAttempt = {
    expiresAt: Date.now() + OAUTH_ATTEMPT_TTL_SECONDS * 1000,
    nonce: randomBytes(32).toString('base64url'),
    operationId: input.operationId,
    returnOrigin: normalizeReturnOrigin(input.returnOrigin),
    teamId: input.teamId,
    teamSlug: input.teamSlug,
    userId: input.userId,
    version: 1,
  }
  return {
    attemptCookie: signAttempt(attempt),
    connectUrl: getDevinOAuthConnectUrl(attempt),
  }
}

export function getDevinOAuthConnectUrl(attempt: DevinOAuthAttempt) {
  const verifier = deriveVerifier(attempt)
  const callbackUrl = getCallbackUrl()
  validateCallbackHost(callbackUrl, attempt.returnOrigin)
  const connectUrl = getConnectUrl()
  connectUrl.searchParams.set('callback_url', callbackUrl)
  connectUrl.searchParams.set('code_challenge', pkceChallenge(verifier))
  connectUrl.searchParams.set('platform', 'linux')
  connectUrl.searchParams.set('pool_name', 'E2B worker')

  return connectUrl
}

export function readDevinOAuthAttempt(
  signedAttempt: string | undefined
): DevinOAuthAttempt | null {
  if (!signedAttempt) return null
  const [encoded, signature, ...rest] = signedAttempt.split('.')
  if (!encoded || !signature || rest.length > 0) return null

  const expected = sign(encoded)
  if (!safeEqual(signature, expected)) return null

  try {
    const parsed = oauthAttemptSchema.safeParse(
      JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    )
    if (!parsed.success || parsed.data.expiresAt <= Date.now()) return null
    return parsed.data
  } catch {
    return null
  }
}

export function getDevinOAuthCookieName() {
  const instancePrefix = process.env.AUTH_COOKIE_PREFIX
    ? `${process.env.AUTH_COOKIE_PREFIX}.`
    : ''
  return process.env.NODE_ENV === 'production'
    ? `__Host-${instancePrefix}e2b-devin-oauth`
    : `${instancePrefix}e2b-devin-oauth`
}

export function getDevinOAuthCookieOptions() {
  return {
    httpOnly: true,
    maxAge: OAUTH_ATTEMPT_TTL_SECONDS,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  }
}

export async function exchangeDevinConnectionCode(
  code: string,
  attempt: DevinOAuthAttempt
): Promise<DevinConnectionToken> {
  let response: Response
  try {
    response = await fetch(DEVIN_TOKEN_URL, {
      body: new URLSearchParams({
        code,
        code_verifier: deriveVerifier(attempt),
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new DevinOAuthError('provider')
  }

  const body = await readJsonRecord(response)
  if (!response.ok) {
    throw new DevinOAuthError(
      response.status === 400 && body?.error === 'invalid_grant'
        ? 'invalid_grant'
        : 'provider'
    )
  }

  const parsed = tokenResponseSchema.safeParse(body)
  if (!parsed.success) throw new DevinOAuthError('response')

  return {
    accessToken: parsed.data.access_token,
    apiUrl: normalizeDevinApiUrl(parsed.data.api_base_url),
    poolId: parsed.data.outpost_pool_id,
  }
}

function signAttempt(attempt: DevinOAuthAttempt) {
  const encoded = Buffer.from(JSON.stringify(attempt)).toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

function sign(value: string) {
  return createHmac('sha256', getSecret())
    .update(`devin-oauth-state:${value}`)
    .digest('base64url')
}

function deriveVerifier(attempt: DevinOAuthAttempt) {
  return createHmac('sha256', getSecret())
    .update(
      `devin-oauth-pkce:${attempt.nonce}:${attempt.userId}:${attempt.teamId}:${attempt.operationId}:${attempt.expiresAt}`
    )
    .digest('base64url')
}

function pkceChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url')
}

function getSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new DevinOAuthError('config')
  return secret
}

function getCallbackUrl() {
  const value = process.env.DEVIN_OUTPOSTS_CALLBACK_URL
  if (!value) throw new DevinOAuthError('config')

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new DevinOAuthError('config')
  }
  const localHttp =
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  if (
    (!localHttp && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/callback'
  ) {
    throw new DevinOAuthError('config')
  }
  return url.toString()
}

function getConnectUrl() {
  const value =
    process.env.DEVIN_OUTPOSTS_CONNECT_URL || DEFAULT_DEVIN_CONNECT_URL
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new DevinOAuthError('config')
  }
  const hostname = url.hostname.toLowerCase()
  const devinOwnedHost =
    hostname === 'devin.ai' ||
    hostname.endsWith('.devin.ai') ||
    hostname === 'devinenterprise.com' ||
    hostname.endsWith('.devinenterprise.com')
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/outposts/connect' ||
    url.search ||
    url.hash ||
    !devinOwnedHost
  ) {
    throw new DevinOAuthError('config')
  }
  return url
}

function normalizeReturnOrigin(value: string) {
  const url = new URL(value)
  const localHttp =
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  if ((!localHttp && url.protocol !== 'https:') || url.origin !== value) {
    throw new DevinOAuthError('config')
  }
  return url.origin
}

function validateCallbackHost(callbackUrl: string, returnOrigin: string) {
  if (new URL(callbackUrl).hostname !== new URL(returnOrigin).hostname) {
    throw new DevinOAuthError('config')
  }
}

async function readJsonRecord(response: Response) {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('application/json')) return null
  try {
    const value: unknown = await response.json()
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  )
}
