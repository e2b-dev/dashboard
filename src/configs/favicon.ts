export type FaviconEnvironment = 'production' | 'preview' | 'development'

export const FAVICON_SIZE = {
  width: 32,
  height: 32,
} as const

export const FAVICON_CONTENT_TYPE = 'image/x-icon'

// Production ships light/dark variants selected via the media attribute on
// the icon links; preview and development keep static environment colors.
const FAVICON_HREFS = {
  production: { light: '/favicon.ico', dark: '/favicon-dark.ico' },
  preview: '/favicon-preview.ico',
  development: '/favicon-development.ico',
} as const satisfies Record<
  FaviconEnvironment,
  string | { light: string; dark: string }
>

interface FaviconIcon {
  url: string
  type: string
  sizes: string
  media?: string
}

export function getFaviconEnvironment(vercelEnv?: string): FaviconEnvironment {
  if (vercelEnv === 'production' || vercelEnv === 'preview') {
    return vercelEnv
  }

  return 'development'
}

export function getFaviconIcons(vercelEnv?: string): FaviconIcon[] {
  const href = FAVICON_HREFS[getFaviconEnvironment(vercelEnv)]
  const sizes = `${FAVICON_SIZE.width}x${FAVICON_SIZE.height}`

  if (typeof href === 'string') {
    return [{ url: href, type: FAVICON_CONTENT_TYPE, sizes }]
  }

  return [
    {
      url: href.light,
      type: FAVICON_CONTENT_TYPE,
      sizes,
      media: '(prefers-color-scheme: light)',
    },
    {
      url: href.dark,
      type: FAVICON_CONTENT_TYPE,
      sizes,
      media: '(prefers-color-scheme: dark)',
    },
  ]
}
