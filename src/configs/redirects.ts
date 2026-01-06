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
    source: '/machines',
    destination:
      '/careers?utm_source=billboard&utm_medium=outdoor&utm_campaign=prague_ooh_2025&utm_content=machines',
    statusCode: 302,
    headers: {
      'X-Robots-Tag': 'noindex',
    },
  },

  // Docker MCP Campaign
  {
    source: '/start',
    destination:
      '/docs/mcp?utm_source=billboard&utm_medium=outdoor&utm_campaign=docker_2025&utm_content=ooh',
    statusCode: 302,
    headers: {
      'X-Robots-Tag': 'noindex',
    },
  },

  // Manus Billboard Campaign
  {
    source: '/computers',
    destination:
      '/blog/how-manus-uses-e2b-to-provide-agents-with-virtual-computers?utm_source=billboard&utm_medium=outdoor&utm_campaign=manus_2025&utm_content=computers',
    statusCode: 302,
    headers: {
      'X-Robots-Tag': 'noindex',
    },
  },
]
