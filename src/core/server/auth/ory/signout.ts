import { createHmac, timingSafeEqual } from 'node:crypto'

export const ORY_SIGN_OUT_FLOW_PATH = '/api/auth/oauth/signout-flow'
export const ORY_POST_LOGOUT_CALLBACK_PATH = '/api/auth/oauth/signed-out'

const LOGOUT_STATE_MAX_AGE_MS = 10 * 60 * 1000

type SignOutMessage = {
  type: 'error' | 'success' | 'message'
  value: string
}

export type OrySignOutOptions = {
  returnTo?: string
  message?: SignOutMessage
}

type LogoutState = OrySignOutOptions & {
  expiresAt: number
}

export function getOrySignOutPath(options: OrySignOutOptions = {}): string {
  const params = new URLSearchParams()

  if (options.returnTo) params.set('returnTo', options.returnTo)
  if (options.message) {
    params.set('messageType', options.message.type)
    params.set('message', options.message.value)
  }

  const query = params.toString()
  return query ? `${ORY_SIGN_OUT_FLOW_PATH}?${query}` : ORY_SIGN_OUT_FLOW_PATH
}

export function getLogoutFinalUrl(
  options: OrySignOutOptions | null,
  origin: string
): string {
  const url = new URL(resolveReturnTo(options?.returnTo, origin))

  if (options?.message) {
    url.searchParams.set(options.message.type, options.message.value)
  }

  return url.toString()
}

export function buildLogoutState(options: OrySignOutOptions): string | null {
  const secret = process.env.AUTH_SECRET
  if (!secret) return null

  const state: LogoutState = {
    ...options,
    expiresAt: Date.now() + LOGOUT_STATE_MAX_AGE_MS,
  }
  const payload = base64UrlEncode(JSON.stringify(state))
  const signature = sign(payload, secret)

  return `${payload}.${signature}`
}

export function parseLogoutState(
  state: string | null
): OrySignOutOptions | null {
  if (!state) return null

  const secret = process.env.AUTH_SECRET
  if (!secret) return null

  const [payload, signature] = state.split('.')
  if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) {
    return null
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as Partial<LogoutState>
    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) return null

    return {
      returnTo:
        typeof parsed.returnTo === 'string' ? parsed.returnTo : undefined,
      message: isSignOutMessage(parsed.message) ? parsed.message : undefined,
    }
  } catch {
    return null
  }
}

function isSignOutMessage(value: unknown): value is SignOutMessage {
  if (!value || typeof value !== 'object') return false

  const message = value as Partial<SignOutMessage>
  return (
    (message.type === 'error' ||
      message.type === 'success' ||
      message.type === 'message') &&
    typeof message.value === 'string'
  )
}

function resolveReturnTo(returnTo: string | undefined, origin: string): string {
  if (!returnTo) return `${origin}/`
  if (returnTo.startsWith('/')) return `${origin}${returnTo}`

  try {
    if (new URL(returnTo).origin === origin) return returnTo
  } catch {
    return `${origin}/`
  }

  return `${origin}/`
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)

  return left.length === right.length && timingSafeEqual(left, right)
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}
