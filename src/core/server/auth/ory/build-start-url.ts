import { relativeUrlSchema } from '@/core/shared/schemas/url'

export type OryAuthIntent = 'signin' | 'signup' | 'reauth'

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
