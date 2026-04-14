import { describe, expect, it } from 'vitest'
import {
  CurrencyInputSchema,
  formatCurrencyValue,
  sanitizeCurrencyInput,
} from '@/lib/utils/currency'

describe('sanitizeCurrencyInput', () => {
  it('strips non-digit characters', () => {
    expect(sanitizeCurrencyInput('$1,250')).toBe('1250')
  })

  it('preserves digit-only input', () => {
    expect(sanitizeCurrencyInput('1250')).toBe('1250')
  })

  it('returns empty string for non-digit input', () => {
    expect(sanitizeCurrencyInput('abc')).toBe('')
  })

  it('handles empty string', () => {
    expect(sanitizeCurrencyInput('')).toBe('')
  })
})

describe('formatCurrencyValue', () => {
  it('formats integer with thousands separator', () => {
    expect(formatCurrencyValue(1250)).toBe('1,250')
  })

  it('formats small values without separator', () => {
    expect(formatCurrencyValue(100)).toBe('100')
  })

  it('formats zero', () => {
    expect(formatCurrencyValue(0)).toBe('0')
  })

  it('formats large values', () => {
    expect(formatCurrencyValue(1000000)).toBe('1,000,000')
  })
})

describe('CurrencyInputSchema', () => {
  it('accepts valid digit string', () => {
    expect(CurrencyInputSchema.safeParse('100').success).toBe(true)
  })

  it('rejects empty string', () => {
    expect(CurrencyInputSchema.safeParse('').success).toBe(false)
  })

  it('rejects whitespace-only string', () => {
    expect(CurrencyInputSchema.safeParse('   ').success).toBe(false)
  })

  it('rejects strings with non-digit characters', () => {
    expect(CurrencyInputSchema.safeParse('12.50').success).toBe(false)
    expect(CurrencyInputSchema.safeParse('1,250').success).toBe(false)
    expect(CurrencyInputSchema.safeParse('abc').success).toBe(false)
  })

  it('rejects zero', () => {
    expect(CurrencyInputSchema.safeParse('0').success).toBe(false)
  })

  it('accepts minimum value of 1', () => {
    expect(CurrencyInputSchema.safeParse('1').success).toBe(true)
  })

  it('trims whitespace before validating', () => {
    expect(CurrencyInputSchema.safeParse(' 100 ').success).toBe(true)
  })

  it('accepts large values', () => {
    expect(CurrencyInputSchema.safeParse('999999').success).toBe(true)
  })
})
