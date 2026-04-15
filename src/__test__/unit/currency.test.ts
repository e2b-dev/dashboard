import { describe, expect, it } from 'vitest'
import {
  CurrencyInputSchema,
  formatCurrencyValue,
  sanitizeCurrencyInput,
} from '@/lib/utils/currency'

describe('sanitizeCurrencyInput', () => {
  it.each([
    ['$1,250', '1250'],
    ['1250', '1250'],
    ['abc', ''],
    ['', ''],
  ])('returns %p -> %p', (value: string, expected: string) => {
    expect(sanitizeCurrencyInput(value)).toBe(expected)
  })
})

describe('formatCurrencyValue', () => {
  it.each([
    [1250, '1,250'],
    [100, '100'],
    [0, '0'],
    [1000000, '1,000,000'],
  ])('returns %p -> %p', (value: number, expected: string) => {
    expect(formatCurrencyValue(value)).toBe(expected)
  })
})

describe('CurrencyInputSchema', () => {
  it.each(['100', '1', ' 100 ', '999999'])('accepts %p', (value: string) => {
    expect(CurrencyInputSchema.safeParse(value).success).toBe(true)
  })

  it.each([
    '',
    '   ',
    '12.50',
    '1,250',
    'abc',
    '0',
  ])('rejects %p', (value: string) => {
    expect(CurrencyInputSchema.safeParse(value).success).toBe(false)
  })
})
