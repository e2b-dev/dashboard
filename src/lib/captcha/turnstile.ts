'use server'

import { CAPTCHA_REQUIRED_SERVER } from '@/configs/flags'
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
  if (!CAPTCHA_REQUIRED_SERVER) return true
  if (!token) return false

  const secretKey = process.env.TURNSTILE_SECRET_KEY!

  try {
    const formData = new FormData()
    formData.append('secret', secretKey)
    formData.append('response', token)

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(5000),
      }
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

      return false
    }

    l.info(
      {
        key: 'turnstile:verification_succeeded',
        context: { success: result.success },
      },
      'Turnstile verification succeeded'
    )

    return true
  } catch (error) {
    l.error(
      {
        key: 'turnstile:verification_error',
        error: error instanceof Error ? error.message : String(error),
      },
      'Turnstile verification error - failing closed to prevent bypass'
    )
    return false
  }
}
