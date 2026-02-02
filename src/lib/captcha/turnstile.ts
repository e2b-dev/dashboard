'use server'

import { CAPTCHA_ENABLED } from '@/configs/flags'
import { l } from '@/lib/clients/logger/logger'

interface TurnstileResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

export async function verifyTurnstileToken(
  token: string | undefined
): Promise<boolean> {
  if (!CAPTCHA_ENABLED) return true
  if (!token) return false

  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) {
    l.warn(
      { key: 'turnstile:missing_secret_key' },
      'TURNSTILE_SECRET_KEY not configured, skipping validation'
    )
    return true
  }

  try {
    const formData = new FormData()
    formData.append('secret', secretKey)
    formData.append('response', token)

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: formData }
    )

    const result: TurnstileResponse = await response.json()

    if (!result.success) {
      l.warn(
        {
          key: 'turnstile:verification_failed',
          context: { errorCodes: result['error-codes'] },
        },
        `Turnstile verification failed: ${result['error-codes']?.join(', ')}`
      )
    }

    return result.success
  } catch (error) {
    l.error(
      {
        key: 'turnstile:verification_error',
        error: error instanceof Error ? error.message : String(error),
      },
      'Turnstile verification error'
    )
    return false
  }
}
