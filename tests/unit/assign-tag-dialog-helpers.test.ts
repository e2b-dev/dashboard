import { describe, expect, it } from 'vitest'
import {
  buildAssignTarget,
  isValidTagShape,
  isValidUuid,
  normalizeTagInput,
  TAG_MAX_LENGTH,
} from '@/features/dashboard/templates/tags/helpers'

describe('normalizeTagInput', () => {
  it('lowercases ASCII letters so user input matches the server normalization', () => {
    expect(normalizeTagInput('MyRelease')).toBe('myrelease')
  })

  it('replaces every whitespace character with a hyphen without collapsing runs', () => {
    expect(normalizeTagInput('new release')).toBe('new-release')
    expect(normalizeTagInput('new  release')).toBe('new--release')
    expect(normalizeTagInput('paste\twith\nnewlines')).toBe(
      'paste-with-newlines'
    )
  })

  it('leaves an already-valid value untouched', () => {
    expect(normalizeTagInput('v1.2.3-rc4')).toBe('v1.2.3-rc4')
  })
})

describe('isValidTagShape', () => {
  it('accepts the tag charset shared with infra `id.tagRegex`', () => {
    expect(isValidTagShape('new-release')).toBe(true)
    expect(isValidTagShape('v1.2.3')).toBe(true)
    expect(isValidTagShape('snake_case')).toBe(true)
  })

  it('rejects uppercase characters', () => {
    expect(isValidTagShape('MyTag')).toBe(false)
  })

  it('rejects whitespace and reserved chars', () => {
    expect(isValidTagShape('with space')).toBe(false)
    expect(isValidTagShape('slash/here')).toBe(false)
    expect(isValidTagShape('colon:here')).toBe(false)
    expect(isValidTagShape('')).toBe(false)
  })

  it('caps length at the infra tag max', () => {
    expect(isValidTagShape('a'.repeat(TAG_MAX_LENGTH))).toBe(true)
    expect(isValidTagShape('a'.repeat(TAG_MAX_LENGTH + 1))).toBe(false)
  })
})

describe('isValidUuid', () => {
  it('accepts canonical UUIDs', () => {
    expect(isValidUuid('bcdaef01-2345-6789-0abc-def123456789')).toBe(true)
  })

  it('is case insensitive', () => {
    expect(isValidUuid('BCDAEF01-2345-6789-0ABC-DEF123456789')).toBe(true)
  })

  it('rejects partial UUIDs', () => {
    expect(isValidUuid('bcdaef01-2345')).toBe(false)
  })

  it('rejects malformed UUIDs', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false)
    expect(isValidUuid('')).toBe(false)
    expect(isValidUuid('  bcdaef01-2345-6789-0abc-def123456789  ')).toBe(false)
  })
})

describe('buildAssignTarget', () => {
  it('joins template name and build UUID with a colon', () => {
    expect(
      buildAssignTarget('my-template', 'bcdaef01-2345-6789-0abc-def123456789')
    ).toBe('my-template:bcdaef01-2345-6789-0abc-def123456789')
  })
})
