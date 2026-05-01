import { AUTH_URLS } from '@/configs/urls'

export function buildSignInHrefWithEmail(email: string): string {
  const normalizedEmail = email.trim()
  if (!normalizedEmail) {
    return AUTH_URLS.SIGN_IN
  }

  const params = new URLSearchParams({ email: normalizedEmail })
  return `${AUTH_URLS.SIGN_IN}?${params.toString()}`
}
