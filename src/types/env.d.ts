import type { Env } from '@/lib/env'

// process.env contains raw strings until validation runs.
type RawEnv = { [Key in keyof Env]?: string }

declare global {
  namespace NodeJS {
    interface ProcessEnv extends RawEnv {
      /**
       * @deprecated Use E2B_INFRA_API_URL instead. This will be removed in a future version.
       * TODO: Remove INFRA_API_URL support
       */
      INFRA_API_URL?: string
    }
  }
}
