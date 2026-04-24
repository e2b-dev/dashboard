import { z } from 'zod'

// Validates a string as a positive whole USD amount. Example: "1250" -> valid, "abc" -> invalid.
const CurrencyInputSchema = z
  .string()
  .trim()
  .min(1, 'Enter a value.')
  .regex(/^\d+$/, 'Enter a whole USD amount.')
  .refine((value) => Number(value) >= 1, 'Value must be at least 1.')

// Removes non-digits from a USD draft value. Example: "$1,250" -> "1250".
const sanitizeCurrencyInput = (value: string) => value.replace(/\D+/g, '')

export { CurrencyInputSchema, sanitizeCurrencyInput }
