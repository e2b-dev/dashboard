import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
import { describe, expect, it } from 'vitest'

describe('TeamIdOrSlugSchema', () => {
  describe('accepts valid UUIDs', () => {
    it('accepts a standard UUID', () => {
      expect(
        TeamIdOrSlugSchema.safeParse('550e8400-e29b-41d4-a716-446655440000')
          .success
      ).toBe(true)
    })
  })

  describe('accepts valid slugs', () => {
    it('accepts lowercase words separated by hyphens', () => {
      expect(TeamIdOrSlugSchema.safeParse('acme-inc').success).toBe(true)
    })

    it('accepts slugs with random suffix from DB', () => {
      expect(TeamIdOrSlugSchema.safeParse('acme-inc-a3f2').success).toBe(true)
    })

    it('accepts single word slugs', () => {
      expect(TeamIdOrSlugSchema.safeParse('singleword').success).toBe(true)
    })

    it('accepts numeric slugs', () => {
      expect(TeamIdOrSlugSchema.safeParse('123').success).toBe(true)
    })

    it('accepts mixed alphanumeric slugs', () => {
      expect(TeamIdOrSlugSchema.safeParse('team-123').success).toBe(true)
    })
  })

  describe('rejects invalid inputs', () => {
    it('rejects uppercase characters', () => {
      expect(TeamIdOrSlugSchema.safeParse('UPPERCASE').success).toBe(false)
    })

    it('rejects strings with spaces', () => {
      expect(TeamIdOrSlugSchema.safeParse('has spaces').success).toBe(false)
    })

    it('rejects strings with underscores', () => {
      expect(TeamIdOrSlugSchema.safeParse('has_underscore').success).toBe(false)
    })

    it('rejects leading hyphens', () => {
      expect(TeamIdOrSlugSchema.safeParse('-leading').success).toBe(false)
    })

    it('rejects trailing hyphens', () => {
      expect(TeamIdOrSlugSchema.safeParse('trailing-').success).toBe(false)
    })

    it('rejects double hyphens', () => {
      expect(TeamIdOrSlugSchema.safeParse('double--hyphen').success).toBe(false)
    })

    it('rejects empty strings', () => {
      expect(TeamIdOrSlugSchema.safeParse('').success).toBe(false)
    })

    it('rejects special characters', () => {
      expect(TeamIdOrSlugSchema.safeParse('special!chars').success).toBe(false)
    })

    it('rejects path traversal attempts', () => {
      expect(TeamIdOrSlugSchema.safeParse('../../etc/passwd').success).toBe(
        false
      )
    })
  })
})
