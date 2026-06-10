import type { NextRequest } from 'next/server'
import type { Session } from 'next-auth'

/**
 * Auth.js is a temporary adapter while the dashboard moves to Ory-native UI.
 * Keep every Auth.js Session detail that contains Ory tokens behind this
 * boundary, and wrap public Auth.js handlers with withSanitizedOryAuthJsHandler.
 */

export type OrySessionFields = {
  accessToken?: string
  idToken?: string
  identityId?: string
  error?: string
}

export type OryInternalAuthJsSession = Session & OrySessionFields

export type ForwardedOrySessionUser = {
  id: string
  email: string | null
  name: string | null
  image: string | null
}

export type ForwardedOryRequestSession =
  | {
      status: 'authenticated'
      user: ForwardedOrySessionUser
      fields: OrySessionFields
    }
  | { status: 'unauthenticated'; error?: string }

type AuthJsRouteHandler = (request: NextRequest) => Response | Promise<Response>
type HeadersWithSetCookie = Headers & { getSetCookie?: () => string[] }

const ORY_TOKEN_SESSION_KEYS = [
  'accessToken',
  'idToken',
  'refreshToken',
  'identityId',
] as const

const FORWARDED_ORY_AUTH_STATUS_HEADER = 'x-e2b-internal-ory-auth-status'
const FORWARDED_ORY_USER_ID_HEADER = 'x-e2b-internal-auth-user-id'
const FORWARDED_ORY_USER_EMAIL_HEADER = 'x-e2b-internal-auth-user-email'
const FORWARDED_ORY_USER_NAME_HEADER = 'x-e2b-internal-auth-user-name'
const FORWARDED_ORY_USER_IMAGE_HEADER = 'x-e2b-internal-auth-user-image'
const FORWARDED_ORY_ACCESS_TOKEN_HEADER = 'x-e2b-internal-ory-access-token'
const FORWARDED_ORY_ID_TOKEN_HEADER = 'x-e2b-internal-ory-id-token'
const FORWARDED_ORY_IDENTITY_ID_HEADER = 'x-e2b-internal-ory-identity-id'
const FORWARDED_ORY_SESSION_ERROR_HEADER = 'x-e2b-internal-ory-session-error'

const FORWARDED_ORY_AUTH_HEADER_NAMES = [
  FORWARDED_ORY_AUTH_STATUS_HEADER,
  FORWARDED_ORY_USER_ID_HEADER,
  FORWARDED_ORY_USER_EMAIL_HEADER,
  FORWARDED_ORY_USER_NAME_HEADER,
  FORWARDED_ORY_USER_IMAGE_HEADER,
  FORWARDED_ORY_ACCESS_TOKEN_HEADER,
  FORWARDED_ORY_ID_TOKEN_HEADER,
  FORWARDED_ORY_IDENTITY_ID_HEADER,
  FORWARDED_ORY_SESSION_ERROR_HEADER,
] as const

export function readOrySessionFields(
  session: Session | null | undefined
): OrySessionFields | null {
  if (!session) return null

  const internalSession = session as OryInternalAuthJsSession
  return {
    accessToken: internalSession.accessToken,
    idToken: internalSession.idToken,
    identityId: internalSession.identityId,
    error: internalSession.error,
  }
}

export function isOrySessionAuthenticated(
  session: Session | null | undefined
): boolean {
  const fields = readOrySessionFields(session)
  return !!session?.user?.id && !!fields?.accessToken && !fields.error
}

export function stripForwardedOryAuthHeaders(headers: Headers): Headers {
  const nextHeaders = new Headers(headers)
  for (const headerName of FORWARDED_ORY_AUTH_HEADER_NAMES) {
    nextHeaders.delete(headerName)
  }
  return nextHeaders
}

export function createForwardedOryAuthHeaders(
  headers: Headers,
  session: Session | null | undefined
): Headers {
  const nextHeaders = stripForwardedOryAuthHeaders(headers)
  const fields = readOrySessionFields(session)

  if (!session?.user?.id || !fields?.accessToken || fields.error) {
    nextHeaders.set(FORWARDED_ORY_AUTH_STATUS_HEADER, 'unauthenticated')
    setOptionalHeader(
      nextHeaders,
      FORWARDED_ORY_SESSION_ERROR_HEADER,
      fields?.error
    )
    return nextHeaders
  }

  nextHeaders.set(FORWARDED_ORY_AUTH_STATUS_HEADER, 'authenticated')
  nextHeaders.set(FORWARDED_ORY_USER_ID_HEADER, session.user.id)
  nextHeaders.set(FORWARDED_ORY_ACCESS_TOKEN_HEADER, fields.accessToken)
  setOptionalHeader(
    nextHeaders,
    FORWARDED_ORY_USER_EMAIL_HEADER,
    session.user.email
  )
  setOptionalHeader(
    nextHeaders,
    FORWARDED_ORY_USER_NAME_HEADER,
    session.user.name
  )
  setOptionalHeader(
    nextHeaders,
    FORWARDED_ORY_USER_IMAGE_HEADER,
    session.user.image
  )
  setOptionalHeader(nextHeaders, FORWARDED_ORY_ID_TOKEN_HEADER, fields.idToken)
  setOptionalHeader(
    nextHeaders,
    FORWARDED_ORY_IDENTITY_ID_HEADER,
    fields.identityId
  )
  return nextHeaders
}

export function readForwardedOryRequestSession(
  headers: Headers
): ForwardedOryRequestSession | null {
  const status = headers.get(FORWARDED_ORY_AUTH_STATUS_HEADER)
  if (!status) return null

  if (status === 'unauthenticated') {
    return {
      status,
      error: headers.get(FORWARDED_ORY_SESSION_ERROR_HEADER) ?? undefined,
    }
  }

  if (status !== 'authenticated') return null

  const userId = headers.get(FORWARDED_ORY_USER_ID_HEADER)
  const accessToken = headers.get(FORWARDED_ORY_ACCESS_TOKEN_HEADER)
  if (!userId || !accessToken) return null

  return {
    status,
    user: {
      id: userId,
      email: headers.get(FORWARDED_ORY_USER_EMAIL_HEADER),
      name: headers.get(FORWARDED_ORY_USER_NAME_HEADER),
      image: headers.get(FORWARDED_ORY_USER_IMAGE_HEADER),
    },
    fields: {
      accessToken,
      idToken: headers.get(FORWARDED_ORY_ID_TOKEN_HEADER) ?? undefined,
      identityId: headers.get(FORWARDED_ORY_IDENTITY_ID_HEADER) ?? undefined,
    },
  }
}

export function withSanitizedOryAuthJsHandler(
  handler: AuthJsRouteHandler
): AuthJsRouteHandler {
  return async (request) => {
    const response = await handler(request)
    return sanitizeOryAuthJsSessionResponse(request, response)
  }
}

async function sanitizeOryAuthJsSessionResponse(
  request: Request,
  response: Response
): Promise<Response> {
  if (!isAuthJsSessionRoute(request.url)) {
    return response
  }

  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    return response
  }

  const body = (await response.json()) as unknown
  const headers = copyResponseHeaders(response.headers)

  const sanitizedResponse = Response.json(
    sanitizeOryPublicSessionPayload(body),
    {
      status: response.status,
      headers,
    }
  )
  copySetCookieHeaders(response.headers, sanitizedResponse.headers)
  return sanitizedResponse
}

export function sanitizeOryPublicSessionPayload(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value

  const session = stripOryTokenFields(value as Record<string, unknown>)

  if (session.user && typeof session.user === 'object') {
    session.user = stripOryTokenFields(session.user as Record<string, unknown>)
  }

  return session
}

function isAuthJsSessionRoute(url: string): boolean {
  return new URL(url).pathname.replace(/\/+$/, '').endsWith('/session')
}

function stripOryTokenFields(
  value: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...value }
  for (const key of ORY_TOKEN_SESSION_KEYS) {
    delete result[key]
  }
  return result
}

function copyResponseHeaders(source: Headers): Headers {
  const target = new Headers()
  source.forEach((value, key) => {
    const lowerKey = key.toLowerCase()
    if (lowerKey === 'content-length' || lowerKey === 'set-cookie') return
    target.set(key, value)
  })
  return target
}

function copySetCookieHeaders(source: Headers, target: Headers): void {
  const setCookies = (source as HeadersWithSetCookie).getSetCookie?.()
  if (setCookies?.length) {
    for (const cookie of setCookies) {
      target.append('set-cookie', cookie)
    }
    return
  }

  const cookie = source.get('set-cookie')
  if (cookie) target.append('set-cookie', cookie)
}

function setOptionalHeader(
  headers: Headers,
  name: string,
  value: string | null | undefined
): void {
  if (value) headers.set(name, value)
}
