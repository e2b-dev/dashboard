import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/nextjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const srcDir = path.join(repoRoot, 'src')

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: [],
  framework: {
    name: '@storybook/nextjs',
    options: {
      nextConfigPath: path.join(repoRoot, 'next.config.mjs'),
    },
  },
  typescript: {
    reactDocgen: false,
  },
  webpackFinal: async (config) => {
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@/contracts/argus-api': path.join(
        srcDir,
        'core/shared/contracts/argus-api.types.ts'
      ),
      '@/contracts/dashboard-api': path.join(
        srcDir,
        'core/shared/contracts/dashboard-api.types.ts'
      ),
      '@/contracts/infra-api': path.join(
        srcDir,
        'core/shared/contracts/infra-api.types.ts'
      ),
      '@': srcDir,
      'next-safe-action/hooks$': path.join(
        __dirname,
        'mocks/next-safe-action-hooks.tsx'
      ),
      [path.join(srcDir, 'core/server/actions/key-actions')]: path.join(
        __dirname,
        'mocks/key-actions.ts'
      ),
    }
    return config
  },
}

export default config
