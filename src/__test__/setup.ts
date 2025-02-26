import { loadEnvConfig } from '@next/env'
import { vi } from 'vitest'

vi.stubEnv('NODE_ENV', 'test')

const projectDir = process.cwd()
loadEnvConfig(projectDir)
