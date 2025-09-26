import 'server-cli-only'

import { l } from '@/lib/clients/logger/logger'
import { Duration, Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

const SIGN_UP_LIMIT_PER_WINDOW = parseInt(
  process.env.SIGN_UP_LIMIT_PER_WINDOW || '1'
)
const SIGN_UP_WINDOW_HOURS = parseInt(process.env.SIGN_UP_WINDOW_HOURS || '24')

const SIGN_UP_WINDOW: Duration = `${SIGN_UP_WINDOW_HOURS}h`

const _ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(SIGN_UP_LIMIT_PER_WINDOW, SIGN_UP_WINDOW),
})

export async function incrementSignUpRateLimit(
  identifier: string
): Promise<boolean> {
  const result = await _ratelimit.limit(identifier)

  if (!result.success) {
    l.error({
      key: 'sign_up_rate_limit_increment:limit_error',
      context: {
        identifier,
        result,
      },
    })

    return false
  }

  return result.remaining === 0
}

export async function isSignUpRateLimited(
  identifier: string
): Promise<boolean> {
  const result = await _ratelimit.getRemaining(identifier)

  return result.remaining === 0
}
