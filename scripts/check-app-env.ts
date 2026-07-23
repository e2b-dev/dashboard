import { loadEnvConfig } from '@next/env'
import { appEnvSchema, validateEnv } from '../src/lib/env'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

validateEnv(appEnvSchema)
