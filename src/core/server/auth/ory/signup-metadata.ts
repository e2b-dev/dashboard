import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { l } from '@/core/shared/clients/logger/logger'

export const ORY_SIGNUP_METADATA_COOKIE = 'e2b-ory-signup-metadata'

const SIGNUP_METADATA_COOKIE_MAX_AGE_SECONDS = 30 * 60
const MAX_IP_LENGTH = 128
const MAX_USER_AGENT_LENGTH = 1024

export type OrySignupMetadata = {
  signup_ip?: string
  signup_user_agent?: string
}

export type OrySignupMetadataCookieOptions = {
  httpOnly: true
  sameSite: 'lax'
  path: '/'
  secure: boolean
  maxAge: number
}

export function readOrySignupMetadataFromHeaders(
  headers: Headers
): OrySignupMetadata | null {
  const metadata = {
    signup_ip: readClientIp(headers),
    signup_user_agent: normalizeHeaderValue(
      headers.get('user-agent'),
      MAX_USER_AGENT_LENGTH
    ),
  } satisfies OrySignupMetadata

  return metadata.signup_ip || metadata.signup_user_agent ? metadata : null
}

// Tamper-evident HMAC handoff between the start route (sets it on the redirect)
// and the callback's bootstrap (reads it). httpOnly + same-origin already gate
// access; the signature guards against a forged value.
export function encodeOrySignupMetadata(
  metadata: OrySignupMetadata | null
): string | null {
  if (!metadata) return null

  const secret = process.env.E2B_SESSION_SECRET
  if (!secret) {
    l.warn(
      { key: 'auth_provider:ory_signup_metadata:missing_secret' },
      'Skipping Ory signup metadata handoff because E2B_SESSION_SECRET is not configured'
    )
    return null
  }

  const payload = Buffer.from(JSON.stringify(metadata), 'utf8').toString(
    'base64url'
  )
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')

  return `${payload}.${signature}`
}

export function signupMetadataCookieOptions(): OrySignupMetadataCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SIGNUP_METADATA_COOKIE_MAX_AGE_SECONDS,
  }
}

export async function readOrySignupMetadataCookie(): Promise<OrySignupMetadata | null> {
  const cookieStore = await cookies()
  const encoded = cookieStore.get(ORY_SIGNUP_METADATA_COOKIE)?.value

  if (!encoded) return null

  const metadata = decodeSignupMetadata(encoded)
  if (!metadata) {
    l.warn(
      { key: 'auth_provider:ory_signup_metadata:invalid_cookie' },
      'Ignoring invalid Ory signup metadata cookie'
    )
  }

  return metadata
}

function decodeSignupMetadata(value: string): OrySignupMetadata | null {
  const secret = process.env.E2B_SESSION_SECRET
  if (!secret) return null

  const [payload, signature] = value.split('.')
  if (!payload || !signature) return null

  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')

  if (!safeEqual(signature, expectedSignature)) return null

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    ) as OrySignupMetadata
    return sanitizeSignupMetadata(parsed)
  } catch {
    return null
  }
}

function sanitizeSignupMetadata(
  metadata: OrySignupMetadata
): OrySignupMetadata | null {
  const sanitized = {
    signup_ip: normalizeHeaderValue(metadata.signup_ip, MAX_IP_LENGTH),
    signup_user_agent: normalizeHeaderValue(
      metadata.signup_user_agent,
      MAX_USER_AGENT_LENGTH
    ),
  } satisfies OrySignupMetadata

  return sanitized.signup_ip || sanitized.signup_user_agent ? sanitized : null
}

function readClientIp(headers: Headers): string | undefined {
  return (
    normalizeHeaderValue(
      headers.get('x-forwarded-for')?.split(',')[0],
      MAX_IP_LENGTH
    ) ??
    normalizeHeaderValue(headers.get('x-real-ip'), MAX_IP_LENGTH) ??
    normalizeHeaderValue(headers.get('cf-connecting-ip'), MAX_IP_LENGTH)
  )
}

function normalizeHeaderValue(
  value: string | null | undefined,
  maxLength: number
): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, maxLength)
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  )
}
