import {
  absoluteHttpOrHttpsUrlSchema,
  relativeUrlSchema,
} from '@/lib/schemas/url'
import { describe, expect, it } from 'vitest'

describe('absoluteHttpOrHttpsUrlSchema', () => {
  it('accepts http/https absolute URLs including localhost and loopback hosts', () => {
    expect(
      absoluteHttpOrHttpsUrlSchema.safeParse('https://e2b.dev/path').success
    ).toBe(true)
    expect(
      absoluteHttpOrHttpsUrlSchema.safeParse(
        'http://localhost:3000/auth/callback'
      ).success
    ).toBe(true)
    expect(
      absoluteHttpOrHttpsUrlSchema.safeParse('https://127.0.0.1:3000').success
    ).toBe(true)
  })

  it('rejects non-http protocols and relative paths', () => {
    expect(
      absoluteHttpOrHttpsUrlSchema.safeParse('ftp://example.com').success
    ).toBe(false)
    expect(
      absoluteHttpOrHttpsUrlSchema.safeParse('javascript:alert(1)').success
    ).toBe(false)
    expect(absoluteHttpOrHttpsUrlSchema.safeParse('/dashboard').success).toBe(
      false
    )
  })
})

describe('relativeUrlSchema', () => {
  it('accepts safe relative paths', () => {
    expect(relativeUrlSchema.safeParse('/dashboard').success).toBe(true)
    expect(relativeUrlSchema.safeParse('/dashboard?tab=usage').success).toBe(
      true
    )
  })

  it('rejects external and protocol-like URLs', () => {
    expect(relativeUrlSchema.safeParse('https://e2b.dev').success).toBe(false)
    expect(relativeUrlSchema.safeParse('//evil.com').success).toBe(false)
  })
})
