import { beforeEach, describe, expect, it, vi } from 'vitest'

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
}))

const serializeErrorForLog = vi.hoisted(() => vi.fn((error: unknown) => error))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: loggerMocks,
  serializeErrorForLog,
}))

import {
  throwTRPCErrorFromRepoError,
  toActionErrorFromRepoError,
  toRouteErrorResponse,
} from '@/core/server/adapters/errors'
import { createRepoError } from '@/core/shared/errors'

describe('repo error transport logging', () => {
  beforeEach(() => {
    loggerMocks.error.mockClear()
    loggerMocks.warn.mockClear()
    serializeErrorForLog.mockClear()
  })

  it('skips duplicate transport logs for unobfuscated tRPC repo errors', () => {
    const error = createRepoError({
      code: 'validation',
      status: 400,
      message: 'User is already part of this team.',
    })

    expect(() => throwTRPCErrorFromRepoError(error)).toThrow()

    expect(loggerMocks.warn).not.toHaveBeenCalled()
    expect(loggerMocks.error).not.toHaveBeenCalled()
  })

  it('skips duplicate transport logs for unobfuscated action repo errors', () => {
    const error = createRepoError({
      code: 'conflict',
      status: 409,
      message: 'User is already part of this team.',
    })

    expect(() => toActionErrorFromRepoError(error)).toThrow(
      'User is already part of this team.'
    )

    expect(loggerMocks.warn).not.toHaveBeenCalled()
    expect(loggerMocks.error).not.toHaveBeenCalled()
  })

  it('keeps route logging for unobfuscated repo errors', async () => {
    const error = createRepoError({
      code: 'validation',
      status: 400,
      message: 'Invalid request payload.',
    })

    const response = toRouteErrorResponse(error)

    expect(loggerMocks.warn).toHaveBeenCalledTimes(1)
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        error,
        key: 'transport:route:repo_error',
        observed_message: 'Invalid request payload.',
        public_message: 'Invalid request payload.',
        repo_error_code: 'validation',
        repo_error_status: 400,
        transport: 'route',
        was_obfuscated: false,
      }),
      '[route] validation: Invalid request payload.'
    )
    expect(loggerMocks.error).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid request payload.',
    })
  })

  it('still logs obfuscated tRPC repo errors at the transport layer', () => {
    const error = createRepoError({
      code: 'unauthorized',
      status: 401,
      message: 'JWT expired',
    })

    expect(() => throwTRPCErrorFromRepoError(error)).toThrow()

    expect(loggerMocks.warn).toHaveBeenCalledTimes(1)
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        error,
        key: 'transport:trpc:repo_error',
        observed_message: 'JWT expired',
        public_message: 'Unauthorized',
        repo_error_code: 'unauthorized',
        repo_error_status: 401,
        transport: 'trpc',
        was_obfuscated: true,
      }),
      '[trpc] unauthorized: JWT expired'
    )
    expect(loggerMocks.error).not.toHaveBeenCalled()
  })
})
