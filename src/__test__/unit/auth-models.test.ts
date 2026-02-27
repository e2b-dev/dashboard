import {
  ConfirmEmailInputSchema,
  type ConfirmEmailInput,
} from '@/server/api/models/auth.models'
import { describe, expect, it } from 'vitest'

describe('ConfirmEmailInputSchema', () => {
  const validBase: Omit<ConfirmEmailInput, 'next'> = {
    token_hash: 'otp-token-hash',
    type: 'signup',
  }

  it('accepts localhost and loopback URLs over HTTP(S)', () => {
    const localhostResult = ConfirmEmailInputSchema.safeParse({
      ...validBase,
      next: 'http://localhost:3000/auth/confirm',
    })
    const loopbackResult = ConfirmEmailInputSchema.safeParse({
      ...validBase,
      next: 'https://127.0.0.1:3000/auth/confirm',
    })

    expect(localhostResult.success).toBe(true)
    expect(loopbackResult.success).toBe(true)
  })

  it('rejects non-http protocols and relative paths', () => {
    const javascriptResult = ConfirmEmailInputSchema.safeParse({
      ...validBase,
      next: 'javascript:alert(1)',
    })
    const ftpResult = ConfirmEmailInputSchema.safeParse({
      ...validBase,
      next: 'ftp://example.com/path',
    })
    const relativeResult = ConfirmEmailInputSchema.safeParse({
      ...validBase,
      next: '/dashboard',
    })

    expect(javascriptResult.success).toBe(false)
    expect(ftpResult.success).toBe(false)
    expect(relativeResult.success).toBe(false)
  })
})
