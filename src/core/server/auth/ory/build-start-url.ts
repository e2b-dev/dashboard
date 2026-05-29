export type OryAuthIntent = 'signin' | 'signup' | 'reauth'

const ORY_START_PATH = '/api/auth/oauth-start'

export function buildOryStartURL(
  intent: OryAuthIntent,
  returnTo?: string
): string {
  const params = new URLSearchParams({ intent })
  if (returnTo && returnTo.length > 0) {
    params.set('returnTo', returnTo)
  }
  return `${ORY_START_PATH}?${params}`
}
