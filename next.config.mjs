// NOTE: related to src/configs/rewrites.ts
export const DOCUMENTATION_DOMAIN = 'e2b.mintlify.app'

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  reactCompiler: true,
  experimental: {
    useCache: true,
    turbopackFileSystemCacheForDev: true,
    serverActions: {
      bodySizeLimit: '5mb',
    },
    authInterrupts: true,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  serverExternalPackages: ['pino'],
  trailingSlash: false,
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          // config to prevent the browser from rendering the page inside a frame or iframe and avoid clickjacking http://en.wikipedia.org/wiki/Clickjacking
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
      ],
    },
  ],
  rewrites: async () => ({
    beforeFiles: [
      {
        source: '/ph-proxy/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ph-proxy/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },

      // Asset rewrites for Mintlify
      {
        source: '/mintlify-assets/:path*',
        destination: `https://${DOCUMENTATION_DOMAIN}/mintlify-assets/:path*`,
      },
      {
        source: '/_mintlify/:path*',
        destination: `https://${DOCUMENTATION_DOMAIN}/_mintlify/:path*`,
      },
    ],
  }),
  redirects: async () => [
    {
      source: '/docs/api/cli',
      destination: '/auth/cli',
      permanent: true,
    },
    {
      source: '/auth/sign-in',
      destination: '/sign-in',
      permanent: true,
    },
    {
      source: '/auth/sign-up',
      destination: '/sign-up',
      permanent: true,
    },
    // SEO Redirects
    {
      source: '/ai-agents/:path*',
      destination: '/',
      permanent: true,
    },
  ],
  skipTrailingSlashRedirect: true,
}

export default config
