import pino from 'pino'
import { describe, expect, it } from 'vitest'
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
            Authorization: 'Bearer secret-auth-header',
          },
        },
      },
      server_function_input: {
        access_token: 'supabase-access-token',
        api_key: 'team-api-key',
        captchaToken: 'captcha-secret',
        nested: {
          token_hash: 'otp-token-hash',
        },
        password: 'super-secret-password',
      },
    })

    const payload = JSON.parse(writes[0] ?? '{}') as {
      error?: {
        config?: {
          headers?: {
            Authorization?: string
          }
        }
      }
      server_function_input?: {
        access_token?: string
        api_key?: string
        captchaToken?: string
        nested?: {
          token_hash?: string
        }
        password?: string
      }
    }

    expect(payload.server_function_input?.password).toBe(REDACTION_CENSOR)
    expect(payload.server_function_input?.captchaToken).toBe(REDACTION_CENSOR)
    expect(payload.server_function_input?.access_token).toBe(REDACTION_CENSOR)
    expect(payload.server_function_input?.api_key).toBe(REDACTION_CENSOR)
    expect(payload.server_function_input?.nested?.token_hash).toBe(
      REDACTION_CENSOR
    )
    expect(payload.error?.config?.headers?.Authorization).toBe(REDACTION_CENSOR)
  })
})
