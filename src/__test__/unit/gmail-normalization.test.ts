import { describe, expect, it, vi } from 'vitest'

// mock supabase admin client to avoid env var requirements
vi.mock('@/lib/clients/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

// mock vercel kv
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

import {
  isGmailAddress,
  normalizeGmailEmail,
} from '@/server/auth/validate-email'

describe('Gmail Normalization', () => {
  describe('isGmailAddress', () => {
    it('should return true for gmail.com addresses', () => {
      expect(isGmailAddress('user@gmail.com')).toBe(true)
      expect(isGmailAddress('USER@GMAIL.COM')).toBe(true)
      expect(isGmailAddress('user@Gmail.Com')).toBe(true)
    })

    it('should return true for googlemail.com addresses', () => {
      expect(isGmailAddress('user@googlemail.com')).toBe(true)
      expect(isGmailAddress('USER@GOOGLEMAIL.COM')).toBe(true)
    })

    it('should return false for non-Gmail addresses', () => {
      expect(isGmailAddress('user@example.com')).toBe(false)
      expect(isGmailAddress('user@company.org')).toBe(false)
      expect(isGmailAddress('user@outlook.com')).toBe(false)
      expect(isGmailAddress('user@notgmail.com')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isGmailAddress('user@gmail.com.br')).toBe(false)
      expect(isGmailAddress('user@fakegmail.com')).toBe(false)
    })
  })

  describe('normalizeGmailEmail', () => {
    describe('dot removal', () => {
      it('should remove dots from Gmail local part', () => {
        expect(normalizeGmailEmail('john.doe@gmail.com')).toBe(
          'johndoe@gmail.com'
        )
        expect(normalizeGmailEmail('j.o.h.n.d.o.e@gmail.com')).toBe(
          'johndoe@gmail.com'
        )
        expect(normalizeGmailEmail('john..doe@gmail.com')).toBe(
          'johndoe@gmail.com'
        )
      })

      it('should handle email with no dots', () => {
        expect(normalizeGmailEmail('johndoe@gmail.com')).toBe(
          'johndoe@gmail.com'
        )
      })
    })

    describe('plus addressing', () => {
      it('should remove everything after + in Gmail addresses', () => {
        expect(normalizeGmailEmail('johndoe+spam@gmail.com')).toBe(
          'johndoe@gmail.com'
        )
        expect(normalizeGmailEmail('johndoe+newsletter+test@gmail.com')).toBe(
          'johndoe@gmail.com'
        )
      })

      it('should handle combined dots and plus addressing', () => {
        expect(normalizeGmailEmail('john.doe+spam@gmail.com')).toBe(
          'johndoe@gmail.com'
        )
        expect(normalizeGmailEmail('j.o.h.n+test@gmail.com')).toBe(
          'john@gmail.com'
        )
      })
    })

    describe('case normalization', () => {
      it('should lowercase Gmail addresses', () => {
        expect(normalizeGmailEmail('JohnDoe@Gmail.COM')).toBe(
          'johndoe@gmail.com'
        )
        expect(normalizeGmailEmail('JOHNDOE@GMAIL.COM')).toBe(
          'johndoe@gmail.com'
        )
      })
    })

    describe('googlemail.com handling', () => {
      it('should normalize googlemail.com to gmail.com', () => {
        expect(normalizeGmailEmail('johndoe@googlemail.com')).toBe(
          'johndoe@gmail.com'
        )
        expect(normalizeGmailEmail('john.doe@googlemail.com')).toBe(
          'johndoe@gmail.com'
        )
        expect(normalizeGmailEmail('john.doe+test@googlemail.com')).toBe(
          'johndoe@gmail.com'
        )
      })
    })

    describe('non-Gmail addresses', () => {
      it('should only lowercase non-Gmail addresses', () => {
        expect(normalizeGmailEmail('John.Doe@Example.com')).toBe(
          'john.doe@example.com'
        )
        expect(normalizeGmailEmail('john.doe+test@company.org')).toBe(
          'john.doe+test@company.org'
        )
      })
    })

    describe('real-world abuse scenarios', () => {
      it('should detect alias abuse pattern: dalemartin51299', () => {
        const original = 'dalemartin51299@gmail.com'
        const abusive = 'dalemarti.n5.1.2.99@gmail.com'

        expect(normalizeGmailEmail(original)).toBe(normalizeGmailEmail(abusive))
        expect(normalizeGmailEmail(abusive)).toBe('dalemartin51299@gmail.com')
      })

      it('should detect multiple abuse variations', () => {
        const normalized = 'testuser@gmail.com'

        expect(normalizeGmailEmail('test.user@gmail.com')).toBe(normalized)
        expect(normalizeGmailEmail('t.e.s.t.u.s.e.r@gmail.com')).toBe(
          normalized
        )
        expect(normalizeGmailEmail('testuser+spam@gmail.com')).toBe(normalized)
        expect(normalizeGmailEmail('test.user+anything@gmail.com')).toBe(
          normalized
        )
        expect(normalizeGmailEmail('TESTUSER@GMAIL.COM')).toBe(normalized)
        expect(normalizeGmailEmail('Test.User@GoogleMail.com')).toBe(normalized)
      })
    })
  })
})
