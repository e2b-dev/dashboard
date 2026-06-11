export type FaviconEnvironment = 'production' | 'preview' | 'development'

export const FAVICON_SIZE = {
  width: 32,
  height: 32,
} as const

export const FAVICON_ICO_CONTENT_TYPE = 'image/x-icon'
export const FAVICON_SVG_CONTENT_TYPE = 'image/svg+xml'

const FAVICON_ICO_HREFS = {
  production: '/favicon.ico',
  preview: '/favicon-preview.ico',
  development: '/favicon-development.ico',
} as const satisfies Record<FaviconEnvironment, string>

// SVG favicons embed a prefers-color-scheme media query so the icon adapts
// to the system theme; the ICO entries are fallbacks for browsers without
// SVG favicon support (e.g. Safari).
const FAVICON_SVG_HREFS = {
  production: '/favicon.svg',
  preview: '/favicon-preview.svg',
  development: '/favicon-development.svg',
} as const satisfies Record<FaviconEnvironment, string>

export function getFaviconEnvironment(vercelEnv?: string): FaviconEnvironment {
  if (vercelEnv === 'production' || vercelEnv === 'preview') {
    return vercelEnv
  }

  return 'development'
}

export function getFaviconIcons(vercelEnv?: string) {
  const environment = getFaviconEnvironment(vercelEnv)

  return [
    {
      url: FAVICON_ICO_HREFS[environment],
      type: FAVICON_ICO_CONTENT_TYPE,
      sizes: `${FAVICON_SIZE.width}x${FAVICON_SIZE.height}`,
    },
    {
      url: FAVICON_SVG_HREFS[environment],
      type: FAVICON_SVG_CONTENT_TYPE,
      sizes: 'any',
    },
  ]
}
