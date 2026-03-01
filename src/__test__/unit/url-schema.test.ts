import { httpUrlSchema } from '@/lib/schemas/url'
import { describe, expect, it } from 'vitest'

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
      expect(
        httpUrlSchema.safeParse('http://127.0.0.1:3000').success
      ).toBe(true)
    })

    it('accepts https URLs with subdomains', () => {
      expect(
        httpUrlSchema.safeParse('https://app.e2b.dev/dashboard').success
      ).toBe(true)
    })
  })

  describe('rejects non-http(s) schemes', () => {
    it('rejects mailto URLs', () => {
      expect(
        httpUrlSchema.safeParse('mailto:user@example.com').success
      ).toBe(false)
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
      expect(httpUrlSchema.safeParse('javascript:alert(1)').success).toBe(
        false
      )
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
