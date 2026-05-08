// NOTE: related to src/configs/rewrites.ts
import path from 'node:path'

export const DOCUMENTATION_DOMAIN = 'e2b.mintlify.app'

const browserStub = (file) => path.resolve(process.cwd(), 'stubs', file)

const browserNodeModuleStubs = {
  crypto: browserStub('crypto.ts'),
  fs: browserStub('fs.ts'),
  path: browserStub('path.ts'),
  'node:crypto': browserStub('crypto.ts'),
  'node:fs': browserStub('fs.ts'),
  'node:fs/promises': browserStub('fs-promises.ts'),
  'node:path': browserStub('path.ts'),
}

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
  turbopack: {
    resolveAlias: {
      crypto: { browser: './stubs/crypto.ts' },
      fs: { browser: './stubs/fs.ts' },
      path: { browser: './stubs/path.ts' },
      'node:crypto': { browser: './stubs/crypto.ts' },
      'node:fs': { browser: './stubs/fs.ts' },
      'node:fs/promises': { browser: './stubs/fs-promises.ts' },
      'node:path': { browser: './stubs/path.ts' },
    },
  },
  webpack: (webpackConfig, { isServer, webpack }) => {
    if (!isServer) {
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        ...browserNodeModuleStubs,
      }

      webpackConfig.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '')
        })
      )
    }

    return webpackConfig
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
      // LLMs.txt
      {
        source: '/llms.txt',
        destination: `https://${DOCUMENTATION_DOMAIN}/llms.txt`,
      },
      {
        source: '/llms-full.txt',
        destination: `https://${DOCUMENTATION_DOMAIN}/llms-full.txt`,
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
