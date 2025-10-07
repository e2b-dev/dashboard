import 'server-cli-only'

import { KV_KEYS } from '@/configs/keys'
import {
  DEFAULT_SIGN_UP_LIMIT_PER_WINDOW,
  DEFAULT_SIGN_UP_WINDOW_HOURS,
} from '@/configs/limits'
import { kv } from '@vercel/kv'

// we need to ensure the limits are valid numbers
// if parseInt returns NaN, we fallback to the default
const SIGN_UP_LIMIT_PER_WINDOW =
  parseInt(
    process.env.SIGN_UP_LIMIT_PER_WINDOW ||
      DEFAULT_SIGN_UP_LIMIT_PER_WINDOW.toString()
  ) || DEFAULT_SIGN_UP_LIMIT_PER_WINDOW

const SIGN_UP_WINDOW_HOURS =
  parseInt(
    process.env.SIGN_UP_WINDOW_HOURS || DEFAULT_SIGN_UP_WINDOW_HOURS.toString()
  ) || DEFAULT_SIGN_UP_WINDOW_HOURS

/**
 * Increments the sign-up attempt counter and checks if the rate limit has been reached.
 * Uses a Lua script for atomic execution to avoid race conditions.
 *
 * The script:
 * 1. Increments the counter
 * 2. Sets TTL on first increment
 * 3. Returns the new count
 *
 * @param identifier - The unique identifier (e.g., IP address) to track rate limit for
 * @returns Promise<boolean> - Returns true if the rate limit has been exceeded (no more attempts allowed),
 *                            false if more attempts are available
 */
export async function incrementAndCheckSignUpRateLimit(
  identifier: string
): Promise<boolean> {
  const key = KV_KEYS.RATE_LIMIT_SIGN_UP(identifier)
  const windowSeconds = SIGN_UP_WINDOW_HOURS * 60 * 60

  // executes atomically on redis server
  // we ensure TTL exists once per window, even if expire would fail on first increment for some reason
  const luaScript = `
    local count = redis.call('INCR', KEYS[1])
    if count == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    else
      if redis.call('TTL', KEYS[1]) == -1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
    end
    return count
  `

  const count = await kv.eval<string[], number>(
    luaScript,
    [key],
    [windowSeconds.toString()]
  )

  // return true if limit exceeded (rate limited)
  return count > SIGN_UP_LIMIT_PER_WINDOW
}

/**
 * Decrements the sign-up attempt counter when a sign-up fails.
 * Uses a Lua script for atomic execution to avoid race conditions.
 *
 * The script only decrements if:
 * 1. Key exists
 * 2. Current count > 0
 *
 * This allows the user to retry since no account was actually created.
 *
 * @param identifier - The unique identifier whose rate limit should be decremented
 */
export async function decrementSignUpRateLimit(identifier: string) {
  const key = KV_KEYS.RATE_LIMIT_SIGN_UP(identifier)

  // executes atomically on redis server
  const luaScript = `
    local current = redis.call('GET', KEYS[1])
    if current and tonumber(current) > 0 then
      return redis.call('DECR', KEYS[1])
    end
    return current
  `

  await kv.eval<string[], number>(luaScript, [key], [])
}
