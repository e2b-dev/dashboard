import path from 'node:path'
import type { NextConfig } from 'next'

const browserStub = (file: string) => path.resolve(process.cwd(), 'stubs', file)

const browserNodeModuleStubs = {
  crypto: browserStub('crypto.ts'),
  fs: browserStub('fs.ts'),
  'fs/promises': browserStub('fs-promises.ts'),
  path: browserStub('path.ts'),
  'node:crypto': browserStub('crypto.ts'),
  'node:fs': browserStub('fs.ts'),
  'node:fs/promises': browserStub('fs-promises.ts'),
  'node:path': browserStub('path.ts'),
}

const config: NextConfig = {
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
      'fs/promises': { browser: './stubs/fs-promises.ts' },
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
        new webpack.NormalModuleReplacementPlugin(
          /^node:/,
          (resource: { request: string }) => {
            resource.request = resource.request.replace(/^node:/, '')
          }
        )
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
  skipTrailingSlashRedirect: true,
}

export default config
