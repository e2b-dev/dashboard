import type { Env } from '@/lib/env'

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {
      /**
       * @deprecated Use NEXT_PUBLIC_INFRA_API_URL instead. This will be removed in a future version.
       * TODO: Remove INFRA_API_URL support
       */
      INFRA_API_URL?: string
    }
  }
}
