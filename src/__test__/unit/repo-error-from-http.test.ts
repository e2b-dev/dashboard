import { describe, expect, it } from 'vitest'
import {
  getPublicRepoErrorMessage,
  PUBLIC_ERROR_MESSAGE_INTERNAL,
  repoErrorFromHttp,
} from '@/core/shared/errors'

describe('repoErrorFromHttp', () => {
  it('preserves 400 messages as validation errors', () => {
    const error = repoErrorFromHttp(400, 'User is already part of this team.')

    expect(error.code).toBe('validation')
    expect(getPublicRepoErrorMessage(error)).toBe(
      'User is already part of this team.'
    )
  })

  it('still obfuscates unexpected internal errors', () => {
    const error = repoErrorFromHttp(500, 'database exploded')

    expect(error.code).toBe('unavailable')
    expect(getPublicRepoErrorMessage(error)).toBe(PUBLIC_ERROR_MESSAGE_INTERNAL)
  })
})
