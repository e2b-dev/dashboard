import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'

class MockNormalModuleReplacementPlugin {
  readonly pattern: RegExp
  readonly callback: (resource: { request: string }) => void

  constructor(
    pattern: RegExp,
    callback: (resource: { request: string }) => void
  ) {
    this.pattern = pattern
    this.callback = callback
  }
}

describe('E2B browser module stubs', () => {
  it('aliases node built-ins after webpack strips node: scheme requests', () => {
    const webpackConfig = {
      resolve: { alias: {} as Record<string, string> },
      plugins: [] as MockNormalModuleReplacementPlugin[],
    }

    nextConfig.webpack?.(webpackConfig, {
      isServer: false,
      webpack: {
        NormalModuleReplacementPlugin: MockNormalModuleReplacementPlugin,
      },
    })

    expect(webpackConfig.resolve.alias).toMatchObject({
      crypto: expect.stringContaining('stubs/crypto.ts'),
      fs: expect.stringContaining('stubs/fs.ts'),
      'fs/promises': expect.stringContaining('stubs/fs-promises.ts'),
      path: expect.stringContaining('stubs/path.ts'),
      'node:crypto': expect.stringContaining('stubs/crypto.ts'),
      'node:fs': expect.stringContaining('stubs/fs.ts'),
      'node:fs/promises': expect.stringContaining('stubs/fs-promises.ts'),
      'node:path': expect.stringContaining('stubs/path.ts'),
    })

    const plugin = webpackConfig.plugins.find((plugin) =>
      plugin.pattern.test('node:fs/promises')
    )
    expect(plugin).toBeDefined()

    const resource = { request: 'node:fs/promises' }
    plugin?.callback(resource)

    expect(resource.request).toBe('fs/promises')
    expect(webpackConfig.resolve.alias[resource.request]).toContain(
      'stubs/fs-promises.ts'
    )
  })

  it('does not rewrite server webpack builds', () => {
    const webpackConfig = {
      resolve: { alias: {} as Record<string, string> },
      plugins: [] as MockNormalModuleReplacementPlugin[],
    }

    nextConfig.webpack?.(webpackConfig, {
      isServer: true,
      webpack: {
        NormalModuleReplacementPlugin: MockNormalModuleReplacementPlugin,
      },
    })

    expect(webpackConfig.resolve.alias).toEqual({})
    expect(webpackConfig.plugins).toEqual([])
  })
})
