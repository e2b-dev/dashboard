import { loadEnvConfig } from '@next/env'
import { execSync } from 'child_process'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

const shouldBuildStorybook =
  process.env.NEXT_PUBLIC_EXPOSE_STORYBOOK &&
  process.env.NEXT_PUBLIC_EXPOSE_STORYBOOK === '1'

if (!shouldBuildStorybook) {
  console.log(
    'Skipping Storybook build - NEXT_PUBLIC_EXPOSE_STORYBOOK =',
    process.env.NEXT_PUBLIC_EXPOSE_STORYBOOK
  )
  process.exit(0)
}

try {
  execSync('storybook build -o public/storybook', { stdio: 'inherit' })
} catch (error) {
  console.error('Failed to build Storybook:', error)
  process.exit(1)
}
