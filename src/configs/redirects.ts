// For certain redirects, we want to ship custom headers as well
// These redirects need to be handled in middleware

export interface MiddlewareRedirect {
  source: string
  destination: string
  statusCode: number
  headers?: Record<string, string>
}

export const MIDDLEWARE_REDIRECTS: MiddlewareRedirect[] = [
  {
    source: '/change',
    destination:
      '/careers?utm_source=billboard&utm_medium=outdoor&utm_campaign=prague_ooh_2025&utm_content=change',
    statusCode: 302,
    headers: {
      'X-Robots-Tag': 'noindex',
    },
  },
  {
    source: '/humans',
    destination:
      '/careers?utm_source=billboard&utm_medium=outdoor&utm_campaign=prague_ooh_2025&utm_content=humans',
    statusCode: 302,
    headers: {
      'X-Robots-Tag': 'noindex',
    },
  },
  {
    source: '/start',
    destination:
      '/careers?utm_source=billboard&utm_medium=outdoor&utm_campaign=prague_ooh_2025&utm_content=start',
    statusCode: 302,
    headers: {
      'X-Robots-Tag': 'noindex',
    },
  },
  {
    source: '/machines',
    destination:
      '/careers?utm_source=billboard&utm_medium=outdoor&utm_campaign=prague_ooh_2025&utm_content=machines',
    statusCode: 302,
    headers: {
      'X-Robots-Tag': 'noindex',
    },
  },
]
