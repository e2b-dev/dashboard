export type FaviconEnvironment = 'production' | 'preview' | 'development'

export const FAVICON_SIZE = {
  width: 32,
  height: 32,
} as const

export const FAVICON_ICO_CONTENT_TYPE = 'image/x-icon'
export const FAVICON_SVG_CONTENT_TYPE = 'image/svg+xml'

type SchemeHrefs = { light: string; dark: string }

// Production ships light/dark variants selected via the media attribute on
// the icon links; preview and development keep static environment colors.
// ICO entries come first so browsers without SVG favicon support (e.g.
// Safari, legacy browsers) still resolve a raster icon.
const FAVICON_HREFS = {
  production: {
    ico: { light: '/favicon.ico', dark: '/favicon-dark.ico' },
    svg: { light: '/favicon.svg', dark: '/favicon-dark.svg' },
  },
  preview: {
    ico: '/favicon-preview.ico',
    svg: '/favicon-preview.svg',
  },
  development: {
    ico: '/favicon-development.ico',
    svg: '/favicon-development.svg',
  },
} as const satisfies Record<
  FaviconEnvironment,
  {
    ico: string | SchemeHrefs
    svg: string | SchemeHrefs
  }
>

interface FaviconIcon {
  url: string
  type: string
  sizes: string
  media?: string
}

function toIconEntries(
  href: string | SchemeHrefs,
  type: string,
  sizes: string
): FaviconIcon[] {
  if (typeof href === 'string') {
    return [{ url: href, type, sizes }]
  }

  return [
    { url: href.light, type, sizes, media: '(prefers-color-scheme: light)' },
    { url: href.dark, type, sizes, media: '(prefers-color-scheme: dark)' },
  ]
}

export function getFaviconEnvironment(vercelEnv?: string): FaviconEnvironment {
  if (vercelEnv === 'production' || vercelEnv === 'preview') {
    return vercelEnv
  }

  return 'development'
}

export function getFaviconIcons(vercelEnv?: string): FaviconIcon[] {
  const { ico, svg } = FAVICON_HREFS[getFaviconEnvironment(vercelEnv)]
  const icoSizes = `${FAVICON_SIZE.width}x${FAVICON_SIZE.height}`

  return [
    ...toIconEntries(ico, FAVICON_ICO_CONTENT_TYPE, icoSizes),
    ...toIconEntries(svg, FAVICON_SVG_CONTENT_TYPE, 'any'),
  ]
}
