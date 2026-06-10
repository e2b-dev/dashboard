'use client'

import { COOKIE_MAX_AGE_SECONDS } from '@/configs/cookies'

type BrowserCookieOptions = {
  maxAgeSeconds?: number
}

export function setBrowserCookie(
  name: string,
  value: string,
  options: BrowserCookieOptions = {}
): void {
  const maxAge = options.maxAgeSeconds ?? COOKIE_MAX_AGE_SECONDS
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is not consistently available in the browsers we support.
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}
