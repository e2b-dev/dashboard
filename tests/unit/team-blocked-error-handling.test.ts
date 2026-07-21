import { describe, expect, it } from 'vitest'
import {
  extractBlockedReason,
  getPublicErrorMessage,
  getPublicRepoErrorMessage,
  isTeamBlockedError,
  PUBLIC_ERROR_MESSAGE_FORBIDDEN,
  PUBLIC_ERROR_MESSAGE_INTERNAL,
} from '@/core/shared/errors'

describe('isTeamBlockedError', () => {
  it('matches 403 with the bare "team is blocked" prefix', () => {
    expect(
      isTeamBlockedError({ status: 403, message: 'team is blocked' })
    ).toBe(true)
  })

  it('matches 403 with a reason suffix', () => {
    expect(
      isTeamBlockedError({
        status: 403,
        message: 'team is blocked: billing limit',
      })
    ).toBe(true)
  })

  it('is case-insensitive on the prefix', () => {
    expect(
      isTeamBlockedError({
        status: 403,
        message: 'Team Is Blocked: Verification Required',
      })
    ).toBe(true)
  })

  it('rejects non-403 statuses', () => {
    expect(
      isTeamBlockedError({ status: 401, message: 'team is blocked' })
    ).toBe(false)
    expect(
      isTeamBlockedError({ status: 500, message: 'team is blocked' })
    ).toBe(false)
  })

  it('rejects 403 responses without the prefix', () => {
    expect(isTeamBlockedError({ status: 403, message: 'team is banned' })).toBe(
      false
    )
    expect(isTeamBlockedError({ status: 403, message: 'forbidden' })).toBe(
      false
    )
  })

  it('rejects missing message', () => {
    expect(isTeamBlockedError({ status: 403, message: null })).toBe(false)
    expect(isTeamBlockedError({ status: 403, message: undefined })).toBe(false)
  })
})

describe('extractBlockedReason', () => {
  it('extracts a simple reason', () => {
    expect(extractBlockedReason('team is blocked: billing limit')).toBe(
      'billing limit'
    )
    expect(extractBlockedReason('team is blocked: verification required')).toBe(
      'verification required'
    )
  })

  it('returns null for the bare prefix', () => {
    expect(extractBlockedReason('team is blocked')).toBeNull()
  })

  it('returns null for non-blocked messages', () => {
    expect(extractBlockedReason('forbidden')).toBeNull()
    expect(extractBlockedReason('team is banned')).toBeNull()
  })

  it('trims extra whitespace around the reason', () => {
    expect(
      extractBlockedReason('team is blocked:  verification required ')
    ).toBe('verification required')
  })

  it('returns null on null/undefined/empty input', () => {
    expect(extractBlockedReason(null)).toBeNull()
    expect(extractBlockedReason(undefined)).toBeNull()
    expect(extractBlockedReason('')).toBeNull()
  })
})

describe('getPublicErrorMessage with team-blocked translation', () => {
  it('translates billing-limit blocked messages', () => {
    expect(
      getPublicErrorMessage({
        status: 403,
        message: 'team is blocked: billing limit',
      })
    ).toBe('Billing limit reached.')
  })

  it('translates verification-required blocked messages', () => {
    expect(
      getPublicErrorMessage({
        status: 403,
        message: 'team is blocked: verification required',
      })
    ).toBe('Verification required.')
  })

  it('translates missing-payment-method blocked messages', () => {
    expect(
      getPublicErrorMessage({
        status: 403,
        message: 'team is blocked: missing payment method',
      })
    ).toBe('Missing payment method.')
  })

  it('returns the raw reason for unrecognized blocked reasons', () => {
    expect(
      getPublicErrorMessage({
        status: 403,
        message: 'team is blocked: blocked by support',
      })
    ).toBe('blocked by support')
  })

  it('returns generic "Project suspended." for the bare prefix', () => {
    expect(
      getPublicErrorMessage({ status: 403, message: 'team is blocked' })
    ).toBe('Project suspended.')
  })

  it('falls through to generic forbidden when message is missing', () => {
    expect(getPublicErrorMessage({ status: 403 })).toBe(
      PUBLIC_ERROR_MESSAGE_FORBIDDEN
    )
    expect(getPublicErrorMessage({ code: 'forbidden' })).toBe(
      PUBLIC_ERROR_MESSAGE_FORBIDDEN
    )
  })

  it('falls through to generic forbidden for non-blocked 403 messages', () => {
    expect(
      getPublicErrorMessage({ status: 403, message: 'something else' })
    ).toBe(PUBLIC_ERROR_MESSAGE_FORBIDDEN)
  })

  it('does not translate when status is not 403', () => {
    expect(
      getPublicErrorMessage({
        status: 500,
        message: 'team is blocked: billing limit',
      })
    ).toBe(PUBLIC_ERROR_MESSAGE_INTERNAL)
  })
})

describe('getPublicRepoErrorMessage', () => {
  it('forwards message so team-blocked translation fires', () => {
    expect(
      getPublicRepoErrorMessage({
        code: 'forbidden',
        status: 403,
        message: 'team is blocked: billing limit',
      })
    ).toBe('Billing limit reached.')
  })

  it('obfuscates non-blocked 403s', () => {
    expect(
      getPublicRepoErrorMessage({
        code: 'forbidden',
        status: 403,
        message: 'unauthorized for this endpoint',
      })
    ).toBe(PUBLIC_ERROR_MESSAGE_FORBIDDEN)
  })

  it('returns raw message for not_found / validation / conflict', () => {
    expect(
      getPublicRepoErrorMessage({
        code: 'not_found',
        status: 404,
        message: 'team not found',
      })
    ).toBe('team not found')
    expect(
      getPublicRepoErrorMessage({
        code: 'validation',
        status: 400,
        message: 'invalid input: foo',
      })
    ).toBe('invalid input: foo')
    expect(
      getPublicRepoErrorMessage({
        code: 'conflict',
        status: 409,
        message: 'team slug taken',
      })
    ).toBe('team slug taken')
  })
})
