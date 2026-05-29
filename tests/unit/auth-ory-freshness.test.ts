import { describe, expect, it } from 'vitest'
import {
  isReauthFresh,
  REAUTH_FRESHNESS_WINDOW_SECONDS,
  readAuthTime,
} from '@/core/server/auth/ory/freshness'

function makeIdToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' })
  ).toString('base64url')
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${header}.${payload}.signature`
}

describe('readAuthTime', () => {
  it('returns null for undefined token', () => {
    expect(readAuthTime(undefined)).toBeNull()
  })

  it('returns null when auth_time claim is missing', () => {
    expect(readAuthTime(makeIdToken({ sub: 'user-1' }))).toBeNull()
  })

  it('returns null when auth_time is not a number', () => {
    expect(readAuthTime(makeIdToken({ auth_time: 'nope' }))).toBeNull()
  })

  it('returns the auth_time epoch seconds when present', () => {
    expect(readAuthTime(makeIdToken({ auth_time: 1_700_000_000 }))).toBe(
      1_700_000_000
    )
  })

  it('returns null for a malformed token', () => {
    expect(readAuthTime('not-a-jwt')).toBeNull()
  })
})

describe('isReauthFresh', () => {
  const now = 1_700_000_000

  it('is true when auth_time is within the window', () => {
    const token = makeIdToken({ auth_time: now - 60 })
    expect(isReauthFresh(token, now)).toBe(true)
  })

  it('is true exactly at the window boundary', () => {
    const token = makeIdToken({
      auth_time: now - REAUTH_FRESHNESS_WINDOW_SECONDS,
    })
    expect(isReauthFresh(token, now)).toBe(true)
  })

  it('is false when auth_time is older than the window', () => {
    const token = makeIdToken({
      auth_time: now - REAUTH_FRESHNESS_WINDOW_SECONDS - 1,
    })
    expect(isReauthFresh(token, now)).toBe(false)
  })

  it('is false when there is no id_token', () => {
    expect(isReauthFresh(undefined, now)).toBe(false)
  })
})
