import { describe, expect, it } from 'vitest'
import {
  getActiveTagSearch,
  hasInvalidTagSearchInput,
  sanitizeTagSearch,
  serverSortToSorting,
  sortingToServerSort,
} from '@/features/dashboard/templates/tags/table-config'

describe('sanitizeTagSearch', () => {
  it('returns empty for empty input', () => {
    expect(sanitizeTagSearch('')).toBe('')
  })

  it('lowercases ASCII letters', () => {
    expect(sanitizeTagSearch('PROD')).toBe('prod')
  })

  it('keeps dots, underscores, hyphens', () => {
    expect(sanitizeTagSearch('a_b-c.d')).toBe('a_b-c.d')
  })

  it('strips disallowed characters', () => {
    expect(sanitizeTagSearch('prod@v1!')).toBe('prodv1')
    expect(sanitizeTagSearch('%')).toBe('')
    expect(sanitizeTagSearch('a b c')).toBe('abc')
  })

  it('caps length at 64 characters', () => {
    const long = 'a'.repeat(80)
    expect(sanitizeTagSearch(long)).toHaveLength(64)
  })

  it('treats all-invalid input as empty', () => {
    expect(sanitizeTagSearch('@@@')).toBe('')
  })
})

describe('getActiveTagSearch', () => {
  it('returns undefined for empty input', () => {
    expect(getActiveTagSearch('')).toBeUndefined()
  })

  it('returns sanitized value for valid input', () => {
    expect(getActiveTagSearch('PROD')).toBe('prod')
  })

  it('returns undefined while input is invalid', () => {
    expect(getActiveTagSearch('${}1')).toBeUndefined()
    expect(getActiveTagSearch('@@@')).toBeUndefined()
  })
})

describe('hasInvalidTagSearchInput', () => {
  it('returns false for empty input', () => {
    expect(hasInvalidTagSearchInput('')).toBe(false)
  })

  it('returns false for allowed characters only', () => {
    expect(hasInvalidTagSearchInput('prod_v1')).toBe(false)
    expect(hasInvalidTagSearchInput('PROD')).toBe(false)
  })

  it('returns true when any disallowed character is present', () => {
    expect(hasInvalidTagSearchInput('${}1')).toBe(true)
    expect(hasInvalidTagSearchInput('prod@v1')).toBe(true)
    expect(hasInvalidTagSearchInput('a b')).toBe(true)
  })

  it('returns true when input exceeds max length', () => {
    expect(hasInvalidTagSearchInput('a'.repeat(65))).toBe(true)
  })
})

describe('sortingToServerSort', () => {
  it('returns latest_desc for empty sorting', () => {
    expect(sortingToServerSort([])).toBe('latest_desc')
  })

  it('returns latest_desc for multi-column sorting (server only supports single)', () => {
    expect(
      sortingToServerSort([
        { id: 'tag', desc: false },
        { id: 'assignedAt', desc: true },
      ])
    ).toBe('latest_desc')
  })

  it('maps assignedAt desc/asc', () => {
    expect(sortingToServerSort([{ id: 'assignedAt', desc: true }])).toBe(
      'latest_desc'
    )
    expect(sortingToServerSort([{ id: 'assignedAt', desc: false }])).toBe(
      'latest_asc'
    )
  })

  it('maps tag asc/desc', () => {
    expect(sortingToServerSort([{ id: 'tag', desc: false }])).toBe('name_asc')
    expect(sortingToServerSort([{ id: 'tag', desc: true }])).toBe('name_desc')
  })

  it('defaults unknown column id to latest_desc', () => {
    expect(sortingToServerSort([{ id: 'unknown', desc: false }])).toBe(
      'latest_desc'
    )
  })
})

describe('serverSortToSorting', () => {
  it('round-trips with sortingToServerSort for every variant', () => {
    const variants = [
      'latest_desc',
      'latest_asc',
      'name_asc',
      'name_desc',
    ] as const
    for (const v of variants) {
      expect(sortingToServerSort(serverSortToSorting(v))).toBe(v)
    }
  })
})
