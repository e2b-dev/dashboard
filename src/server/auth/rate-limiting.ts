import { l } from '@/lib/clients/logger/logger'
import { Duration } from '@/lib/utils/duration'
import ratelimit from '@/lib/utils/ratelimit'
import { serializeError } from 'serialize-error'

// helper to parse and validate positive numbers
function parsePositiveNumber(
  value: string | undefined,
  defaultValue: number,
  name: string
): number {
  if (!value) return defaultValue

  const parsed = Number(value)
  if (isNaN(parsed) || parsed <= 0) {
    l.warn({
      key: 'rate_limit_config:invalid_value',
      context: {
        variable: name,
        value,
        defaultUsed: defaultValue,
      },
    })
    return defaultValue
  }

  return parsed
}

// sign-up attempts configuration (prevent spam)
const SIGN_UP_ATTEMPTS_LIMIT_PER_WINDOW = parsePositiveNumber(
  process.env.SIGN_UP_ATTEMPTS_LIMIT_PER_WINDOW as string | undefined,
  10,
  'SIGN_UP_ATTEMPTS_LIMIT_PER_WINDOW'
)
const SIGN_UP_ATTEMPTS_WINDOW_HOURS = parsePositiveNumber(
  process.env.SIGN_UP_ATTEMPTS_WINDOW_HOURS as string | undefined,
  1,
  'SIGN_UP_ATTEMPTS_WINDOW_HOURS'
)

// actual sign-ups configuration (limit account creation)
const SIGN_UP_LIMIT_PER_WINDOW = parsePositiveNumber(
  process.env.SIGN_UP_LIMIT_PER_WINDOW as string | undefined,
  1,
  'SIGN_UP_LIMIT_PER_WINDOW'
)
const SIGN_UP_WINDOW_HOURS = parsePositiveNumber(
  process.env.SIGN_UP_WINDOW_HOURS as string | undefined,
  24,
  'SIGN_UP_WINDOW_HOURS'
)

// convert to duration format
const SIGN_UP_ATTEMPTS_WINDOW: Duration = `${SIGN_UP_ATTEMPTS_WINDOW_HOURS}h`
const SIGN_UP_WINDOW: Duration = `${SIGN_UP_WINDOW_HOURS}h`

export async function isSignUpAttemptRateLimited(
  identifier: string
): Promise<boolean> {
  try {
    const result = await ratelimit(
      `signup-attempt:${identifier}`,
      SIGN_UP_ATTEMPTS_LIMIT_PER_WINDOW,
      SIGN_UP_ATTEMPTS_WINDOW
    )

    if (!result) {
      return false
    }

    return !result.success
  } catch (error) {
    l.error({
      key: 'sign_up_attempt_rate_limit:check_error',
      error: serializeError(error),
    })
    // on error, allow the request to proceed
    return false
  }
}

export async function isSignUpRateLimited(
  identifier: string
): Promise<boolean> {
  try {
    const result = await ratelimit(
      `signup:${identifier}`,
      SIGN_UP_LIMIT_PER_WINDOW,
      SIGN_UP_WINDOW
    )

    if (!result) {
      return false
    }

    return !result.success
  } catch (error) {
    l.error({
      key: 'sign_up_rate_limit:check_error',
      error: serializeError(error),
    })
    // on error, allow the request to proceed
    return false
  }
}

export function logRateLimitConfiguration() {
  l.info({
    key: 'rate_limit_configuration',
    context: {
      sign_up_attempts: {
        limit: SIGN_UP_ATTEMPTS_LIMIT_PER_WINDOW,
        window: SIGN_UP_ATTEMPTS_WINDOW,
      },
      sign_ups: {
        limit: SIGN_UP_LIMIT_PER_WINDOW,
        window: SIGN_UP_WINDOW,
      },
    },
  })
}
