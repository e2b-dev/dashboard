import { createClient } from '@/lib/clients/supabase/server'
import 'server-only'

/**
 * Retrieves the current user session from Supabase authentication in an insecure way.
 *
 * IMPORTANT: This function should ONLY be used for reading user data for display purposes,
 * such as showing a user's name or avatar. It must NOT be used for any authentication
 * or authorization checks, as the session data could be stale or tampered with.
 *
 * For any security-critical operations that require validating the user's session,
 * use proper server-side authentication methods instead.
 *
 * This function suppresses Supabase's security warnings since we acknowledge the risks
 * and are intentionally using it only for non-sensitive display purposes.
 *
 * @see https://github.com/supabase/auth-js/issues/873 - Known issue with getSession() warnings
 */
export async function getSessionInsecure(
  supabase?: Awaited<ReturnType<typeof createClient>>
) {
  const client = supabase ?? (await createClient())

  // Store original console functions
  const originalWarn = console.warn
  const originalLog = console.log

  // Warnings to suppress
  const IGNORE_WARNINGS = [
    'Using supabase.auth.getSession() is potentially insecure',
    'Using the user object as returned from supabase.auth.getSession()',
    'could be insecure! This value comes directly from the storage medium',
  ]

  // Override console.warn to filter out specific warnings
  console.warn = function (...args) {
    if (
      !args.some(
        (arg) =>
          typeof arg === 'string' &&
          IGNORE_WARNINGS.some((warning) => arg.includes(warning))
      )
    ) {
      originalWarn.apply(console, args)
    }
  }

  // Override console.log to filter out specific warnings
  console.log = function (...args) {
    if (
      !args.some(
        (arg) =>
          typeof arg === 'string' &&
          IGNORE_WARNINGS.some((warning) => arg.includes(warning))
      )
    ) {
      originalLog.apply(console, args)
    }
  }

  const {
    data: { session },
  } = await client.auth.getSession()

  return session
}
