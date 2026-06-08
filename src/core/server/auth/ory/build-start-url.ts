import { relativeUrlSchema } from '@/core/shared/schemas/url'

export type OryAuthIntent = 'signin' | 'signup' | 'reauth'

export type OryAuthorizationParams =
  | { prompt: 'registration' | 'login' }
  | undefined

const ORY_START_PATH = '/api/auth/oauth-start'

export function normalizeOryReturnTo(
  returnTo?: string | null
): string | undefined {
  const parsedReturnTo = relativeUrlSchema.safeParse(returnTo)
  return parsedReturnTo.success ? parsedReturnTo.data : undefined
}

export function buildOryStartURL(
  intent: OryAuthIntent,
  returnTo?: string
): string {
  const params = new URLSearchParams({ intent })
  const safeReturnTo = normalizeOryReturnTo(returnTo)
  if (safeReturnTo) {
    params.set('returnTo', safeReturnTo)
  }
  return `${ORY_START_PATH}?${params}`
}

export function readOryAuthIntent(value: string | null): OryAuthIntent | null {
  if (value === null) return 'signin'
  if (value === 'signin' || value === 'signup' || value === 'reauth') {
    return value
  }
  return null
}

export function authorizationParamsForOryIntent(
  intent: OryAuthIntent
): OryAuthorizationParams {
  if (intent === 'signup') return { prompt: 'registration' }
  if (intent === 'reauth') return { prompt: 'login' }
  return undefined
}

export function shouldCaptureOrySignupMetadata(intent: OryAuthIntent): boolean {
  return intent === 'signup'
}
