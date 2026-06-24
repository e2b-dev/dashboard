import { describe, expect, it } from 'vitest'
import {
  httpUrlSchema,
  isLoopbackUrl,
  loopbackUrlSchema,
  relativeUrlSchema,
} from '@/core/shared/schemas/url'

describe('httpUrlSchema', () => {
  describe('accepts valid http/https URLs', () => {
    it('accepts https production URLs', () => {
      expect(httpUrlSchema.safeParse('https://e2b.dev/dashboard').success).toBe(
        true
      )
    })

    it('accepts https URLs with paths and query params', () => {
      expect(
        httpUrlSchema.safeParse('https://e2b.dev/dashboard?tab=settings')
          .success
      ).toBe(true)
    })

    it('accepts http localhost URLs', () => {
      expect(
        httpUrlSchema.safeParse('http://localhost:3000/dashboard').success
      ).toBe(true)
    })

    it('accepts http localhost without port', () => {
      expect(httpUrlSchema.safeParse('http://localhost').success).toBe(true)
    })

    it('accepts http 127.0.0.1 URLs', () => {
      expect(httpUrlSchema.safeParse('http://127.0.0.1:3000').success).toBe(
        true
      )
    })

    it('accepts https URLs with subdomains', () => {
      expect(
        httpUrlSchema.safeParse('https://app.e2b.dev/dashboard').success
      ).toBe(true)
    })
  })

  describe('rejects non-http(s) schemes', () => {
    it('rejects mailto URLs', () => {
      expect(httpUrlSchema.safeParse('mailto:user@example.com').success).toBe(
        false
      )
    })

    it('rejects ftp URLs', () => {
      expect(httpUrlSchema.safeParse('ftp://files.example.com').success).toBe(
        false
      )
    })

    it('rejects file URLs', () => {
      expect(httpUrlSchema.safeParse('file:///etc/passwd').success).toBe(false)
    })

    it('rejects javascript URLs', () => {
      expect(httpUrlSchema.safeParse('javascript:alert(1)').success).toBe(false)
    })
  })

  describe('rejects invalid inputs', () => {
    it('rejects plain strings', () => {
      expect(httpUrlSchema.safeParse('not-a-url').success).toBe(false)
    })

    it('rejects empty strings', () => {
      expect(httpUrlSchema.safeParse('').success).toBe(false)
    })
  })
})

describe('isLoopbackUrl', () => {
  describe('accepts genuine loopback URLs', () => {
    it('accepts http localhost with port and path', () => {
      expect(isLoopbackUrl('http://localhost:3000/callback')).toBe(true)
    })

    it('accepts http localhost without port', () => {
      expect(isLoopbackUrl('http://localhost')).toBe(true)
    })

    it('accepts http 127.0.0.1 with port', () => {
      expect(isLoopbackUrl('http://127.0.0.1:55021')).toBe(true)
    })

    it('accepts http IPv6 loopback', () => {
      expect(isLoopbackUrl('http://[::1]:9000')).toBe(true)
    })

    it('accepts https loopback', () => {
      expect(isLoopbackUrl('https://localhost:3000/callback')).toBe(true)
    })
  })

  describe('rejects host-confusion bypass attempts', () => {
    it('rejects a subdomain of an attacker host', () => {
      expect(isLoopbackUrl('http://localhost.evil.com')).toBe(false)
    })

    it('rejects a subdomain with a port', () => {
      expect(isLoopbackUrl('http://localhost.evil.com:3000/callback')).toBe(
        false
      )
    })

    it('rejects a hyphenated attacker host', () => {
      expect(isLoopbackUrl('http://localhost-evil.com')).toBe(false)
    })

    it('rejects userinfo pointing at an attacker host', () => {
      expect(isLoopbackUrl('http://localhost@evil.com')).toBe(false)
    })

    it('rejects an attacker host with localhost in the path', () => {
      expect(isLoopbackUrl('http://evil.com/localhost')).toBe(false)
    })
  })

  describe('rejects non-http(s) and malformed inputs', () => {
    it('rejects a non-loopback https host', () => {
      expect(isLoopbackUrl('https://evil.com')).toBe(false)
    })

    it('rejects javascript URLs', () => {
      expect(isLoopbackUrl('javascript:alert(1)')).toBe(false)
    })

    it('rejects file URLs to loopback-looking paths', () => {
      expect(isLoopbackUrl('file://localhost/etc/passwd')).toBe(false)
    })

    it('rejects protocol-relative URLs', () => {
      expect(isLoopbackUrl('//localhost')).toBe(false)
    })

    it('rejects plain strings', () => {
      expect(isLoopbackUrl('not-a-url')).toBe(false)
    })

    it('rejects empty strings', () => {
      expect(isLoopbackUrl('')).toBe(false)
    })
  })
})

describe('relativeUrlSchema', () => {
  describe('accepts safe relative paths', () => {
    it('accepts a bare path', () => {
      expect(relativeUrlSchema.safeParse('/dashboard').success).toBe(true)
    })

    it('accepts a path with query params', () => {
      expect(
        relativeUrlSchema.safeParse('/dashboard?tab=settings').success
      ).toBe(true)
    })

    it('accepts a nested path', () => {
      expect(relativeUrlSchema.safeParse('/a/b/c').success).toBe(true)
    })
  })

  describe('rejects open-redirect bypass attempts', () => {
    it('rejects the backslash bypass', () => {
      // `new URL('/\\evil.com', origin)` normalizes to https://evil.com/
      expect(relativeUrlSchema.safeParse('/\\evil.com').success).toBe(false)
    })

    it('rejects protocol-relative URLs', () => {
      expect(relativeUrlSchema.safeParse('//evil.com').success).toBe(false)
    })

    it('rejects absolute http(s) URLs', () => {
      expect(relativeUrlSchema.safeParse('https://evil.com').success).toBe(
        false
      )
    })

    it('rejects an embedded scheme', () => {
      expect(relativeUrlSchema.safeParse('/path://evil.com').success).toBe(
        false
      )
    })

    it('rejects a tab control char', () => {
      expect(relativeUrlSchema.safeParse('/\tevil.com').success).toBe(false)
    })

    it('rejects a newline control char', () => {
      expect(relativeUrlSchema.safeParse('/foo\nbar').success).toBe(false)
    })

    it('rejects a NUL control char', () => {
      expect(relativeUrlSchema.safeParse('/\x00').success).toBe(false)
    })

    it('rejects a non-relative path', () => {
      expect(relativeUrlSchema.safeParse('dashboard').success).toBe(false)
    })
  })
})

describe('loopbackUrlSchema', () => {
  it('parses a genuine loopback URL', () => {
    expect(loopbackUrlSchema.safeParse('http://localhost:3000').success).toBe(
      true
    )
  })

  it('fails on a host-confusion bypass attempt', () => {
    expect(
      loopbackUrlSchema.safeParse('http://localhost.evil.com').success
    ).toBe(false)
  })
})
