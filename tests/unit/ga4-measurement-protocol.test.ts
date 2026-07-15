import { describe, expect, it } from 'vitest'
import {
  gaSessionCookieName,
  parseGaClientId,
  parseGaSessionId,
} from '@/core/shared/clients/ga4/measurement-protocol.server'

describe('parseGaClientId', () => {
  it('extracts the client id from a standard _ga cookie', () => {
    expect(parseGaClientId('GA1.1.1247869242.1718123456')).toBe(
      '1247869242.1718123456'
    )
  })

  it('handles domain-depth variants', () => {
    expect(parseGaClientId('GA1.2.111.222')).toBe('111.222')
  })

  it('rejects malformed values', () => {
    expect(parseGaClientId(undefined)).toBeNull()
    expect(parseGaClientId('')).toBeNull()
    expect(parseGaClientId('garbage')).toBeNull()
    expect(parseGaClientId('GA1.1.abc.def')).toBeNull()
    expect(parseGaClientId('GA1.1.123')).toBeNull()
  })
})

describe('gaSessionCookieName', () => {
  it('derives the cookie name from the measurement id', () => {
    expect(gaSessionCookieName('G-SCSZ10RP74')).toBe('_ga_SCSZ10RP74')
  })
})

describe('parseGaSessionId', () => {
  it('parses the legacy GS1 format', () => {
    expect(parseGaSessionId('GS1.1.1718123456.5.1.1718123500.0.0.0')).toBe(
      '1718123456'
    )
  })

  it('parses the current GS2 format', () => {
    expect(
      parseGaSessionId('GS2.1.s1718123456$o5$g1$t1718123500$j0$l0$h0')
    ).toBe('1718123456')
  })

  it('rejects malformed values', () => {
    expect(parseGaSessionId(undefined)).toBeNull()
    expect(parseGaSessionId('')).toBeNull()
    expect(parseGaSessionId('garbage')).toBeNull()
    expect(parseGaSessionId('GA1.1.1247869242.1718123456')).toBeNull()
    expect(parseGaSessionId('GS2.1')).toBeNull()
  })
})
