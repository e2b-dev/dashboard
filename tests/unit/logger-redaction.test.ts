import pino from 'pino'
import { describe, expect, it } from 'vitest'

const AUTHORIZATION_HEADER = 'Authorization'
const BEARER_TOKEN_PREFIX = 'Bearer '

import {
  REDACTION_CENSOR,
  REDACTION_PATHS,
} from '@/core/shared/clients/logger/redaction'

describe('logger redaction', () => {
  it('redacts sensitive fields used by observability payloads', () => {
    const writes: string[] = []

    const logger = pino(
      {
        base: undefined,
        redact: {
          paths: REDACTION_PATHS,
          censor: REDACTION_CENSOR,
        },
        timestamp: false,
      },
      {
        write(chunk: string) {
          writes.push(chunk)
        },
      }
    )

    logger.info({
      error: {
        config: {
          headers: {
            [AUTHORIZATION_HEADER]: `${BEARER_TOKEN_PREFIX}secret-auth-header`,
          },
        },
      },
      server_function_input: {
        access_token: 'auth-provider-access-token',
        api_key: 'team-api-key',
        captchaToken: 'captcha-secret',
        nested: {
          token_hash: 'otp-token-hash',
          signatureSecret: 'nested-signature-secret',
        },
        password: 'super-secret-password',
        signatureSecret: 'webhook-signing-secret',
      },
    })

    const payload = JSON.parse(writes[0] ?? '{}') as {
      error?: {
        config?: {
          headers?: Partial<Record<typeof AUTHORIZATION_HEADER, string>>
        }
      }
      server_function_input?: {
        access_token?: string
        api_key?: string
        captchaToken?: string
        nested?: {
          token_hash?: string
          signatureSecret?: string
        }
        password?: string
        signatureSecret?: string
      }
    }

    expect(payload.server_function_input?.password).toBe(REDACTION_CENSOR)
    expect(payload.server_function_input?.captchaToken).toBe(REDACTION_CENSOR)
    expect(payload.server_function_input?.access_token).toBe(REDACTION_CENSOR)
    expect(payload.server_function_input?.api_key).toBe(REDACTION_CENSOR)
    expect(payload.server_function_input?.signatureSecret).toBe(
      REDACTION_CENSOR
    )
    expect(payload.server_function_input?.nested?.token_hash).toBe(
      REDACTION_CENSOR
    )
    expect(payload.server_function_input?.nested?.signatureSecret).toBe(
      REDACTION_CENSOR
    )
    expect(payload.error?.config?.headers?.[AUTHORIZATION_HEADER]).toBe(
      REDACTION_CENSOR
    )
  })

  it('redacts signatureSecret at top level', () => {
    const writes: string[] = []

    const logger = pino(
      {
        base: undefined,
        redact: {
          paths: REDACTION_PATHS,
          censor: REDACTION_CENSOR,
        },
        timestamp: false,
      },
      {
        write(chunk: string) {
          writes.push(chunk)
        },
      }
    )

    logger.info({ signatureSecret: 'top-level-webhook-secret' })

    const payload = JSON.parse(writes[0] ?? '{}') as {
      signatureSecret?: string
    }

    expect(payload.signatureSecret).toBe(REDACTION_CENSOR)
  })
})
