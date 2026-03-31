import { describe, expect, it } from 'vitest'

/**
 * Tests for the tag column filter logic used in the templates table.
 * The filter checks if any of a template's tags contain the filter value (case-insensitive).
 */

function tagFilterFn(tags: string[], filterValue: string): boolean {
  return tags.some((tag) =>
    tag.toLowerCase().includes(filterValue.toLowerCase())
  )
}

describe('Template Tag Filter', () => {
  it('matches an exact tag name', () => {
    expect(tagFilterFn(['production', 'latest'], 'production')).toBe(true)
  })

  it('matches a partial tag name', () => {
    expect(tagFilterFn(['production', 'latest'], 'prod')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(tagFilterFn(['Production', 'Latest'], 'production')).toBe(true)
    expect(tagFilterFn(['production'], 'PROD')).toBe(true)
  })

  it('returns false when no tags match', () => {
    expect(tagFilterFn(['staging', 'v1.0.0'], 'production')).toBe(false)
  })

  it('returns false for empty tags array', () => {
    expect(tagFilterFn([], 'production')).toBe(false)
  })

  it('matches version-style tags', () => {
    expect(tagFilterFn(['v1.0.0', 'v2.1.0'], 'v2')).toBe(true)
    expect(tagFilterFn(['v1.0.0', 'v2.1.0'], '1.0')).toBe(true)
  })

  it('matches when filter is a single character', () => {
    expect(tagFilterFn(['latest', 'stable'], 'l')).toBe(true)
    expect(tagFilterFn(['latest', 'stable'], 'z')).toBe(false)
  })
})
