export type FaviconEnvironment = 'production' | 'preview' | 'development'

export const FAVICON_SIZE = {
  width: 32,
  height: 32,
} as const

export const FAVICON_CONTENT_TYPE = 'image/x-icon'

const FAVICON_HREFS = {
  production: '/favicon.ico',
  preview: '/favicon-preview.ico',
  development: '/favicon-development.ico',
} as const satisfies Record<FaviconEnvironment, string>

export function getFaviconEnvironment(vercelEnv?: string): FaviconEnvironment {
  if (vercelEnv === 'production' || vercelEnv === 'preview') {
    return vercelEnv
  }

  return 'development'
}

export function getFaviconHref(vercelEnv?: string) {
  return FAVICON_HREFS[getFaviconEnvironment(vercelEnv)]
}
