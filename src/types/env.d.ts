import type { Env } from '@/lib/env'

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {}
  }
}
