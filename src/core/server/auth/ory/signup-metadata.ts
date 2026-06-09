import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { type JsonPatch, JsonPatchOpEnum } from '@ory/client-fetch'
import { cookies } from 'next/headers'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { getOryIdentityApi } from './client'

export const ORY_SIGNUP_METADATA_COOKIE = 'e2b-ory-signup-metadata'

const SIGNUP_METADATA_COOKIE_MAX_AGE_SECONDS = 30 * 60
const MAX_IP_LENGTH = 128
const MAX_USER_AGENT_LENGTH = 1024

export type OrySignupMetadata = {
  signup_ip?: string
  signup_user_agent?: string
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

export async function setOrySignupMetadataCookie(
  metadata: OrySignupMetadata | null
): Promise<void> {
  if (!metadata) return

  const encoded = encodeSignupMetadata(metadata)
  if (!encoded) {
    l.warn(
      { key: 'auth_provider:ory_signup_metadata:missing_secret' },
      'Skipping Ory signup metadata handoff because AUTH_SECRET is not configured'
    )
    return
  }

  const cookieStore = await cookies()
  cookieStore.set(ORY_SIGNUP_METADATA_COOKIE, encoded, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SIGNUP_METADATA_COOKIE_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function persistOrySignupMetadataFromCookie(
  identityId?: string
): Promise<void> {
  const metadata = await consumeOrySignupMetadataCookie()
  if (!metadata) return

  if (!identityId) {
    l.warn(
      { key: 'auth_provider:ory_signup_metadata:missing_identity' },
      'Could not persist Ory signup metadata because the Kratos identity id is missing'
    )
    return
  }

  try {
    await persistOrySignupMetadata(identityId, metadata)
  } catch (error) {
    l.error(
      {
        key: 'auth_provider:ory_signup_metadata:update_error',
        user_id: identityId,
        error: serializeErrorForLog(error),
      },
      'Failed to persist Ory signup metadata'
    )
  }
}

export async function persistOrySignupMetadata(
  identityId: string,
  metadata: OrySignupMetadata
): Promise<void> {
  const api = getOryIdentityApi()
  const identity = await api.getIdentity({ id: identityId })
  const currentMetadata = objectMetadata(identity.metadata_admin)
  const existingMetadata = currentMetadata ?? {}
  const fieldsToAdd: OrySignupMetadata = {}

  if (metadata.signup_ip && !Object.hasOwn(existingMetadata, 'signup_ip')) {
    fieldsToAdd.signup_ip = metadata.signup_ip
  }

  if (
    metadata.signup_user_agent &&
    !Object.hasOwn(existingMetadata, 'signup_user_agent')
  ) {
    fieldsToAdd.signup_user_agent = metadata.signup_user_agent
  }

  if (!fieldsToAdd.signup_ip && !fieldsToAdd.signup_user_agent) return

  const jsonPatch: JsonPatch[] = currentMetadata
    ? Object.entries(fieldsToAdd).map(([key, value]) => ({
        op: JsonPatchOpEnum.Add,
        path: `/metadata_admin/${escapeJsonPointer(key)}`,
        value,
      }))
    : [
        {
          op: JsonPatchOpEnum.Add,
          path: '/metadata_admin',
          value: fieldsToAdd,
        },
      ]

  await api.patchIdentity({ id: identityId, jsonPatch })
}

async function consumeOrySignupMetadataCookie(): Promise<OrySignupMetadata | null> {
  const cookieStore = await cookies()
  const encoded = cookieStore.get(ORY_SIGNUP_METADATA_COOKIE)?.value

  cookieStore.delete(ORY_SIGNUP_METADATA_COOKIE)

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

function encodeSignupMetadata(metadata: OrySignupMetadata): string | null {
  const secret = process.env.AUTH_SECRET
  if (!secret) return null

  const payload = Buffer.from(JSON.stringify(metadata), 'utf8').toString(
    'base64url'
  )
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')

  return `${payload}.${signature}`
}

function decodeSignupMetadata(value: string): OrySignupMetadata | null {
  const secret = process.env.AUTH_SECRET
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

function objectMetadata(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function escapeJsonPointer(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1')
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  )
}
