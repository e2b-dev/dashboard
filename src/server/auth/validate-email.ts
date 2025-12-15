import { KV_KEYS } from '@/configs/keys'
import { l } from '@/lib/clients/logger/logger'
import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { kv } from '@vercel/kv'
import { serializeError } from 'serialize-error'

const GMAIL_DOMAINS = ['gmail.com', 'googlemail.com']

/**
 * Checks if an email address is from Gmail (including googlemail.com alias)
 */
export function isGmailAddress(email: string): boolean {
  const parts = email.toLowerCase().split('@')
  const domain = parts[1] ?? ''
  return GMAIL_DOMAINS.includes(domain)
}

/**
 * Normalizes a Gmail address to prevent alias abuse.
 * Gmail ignores dots in the local part and everything after + (plus addressing).
 *
 * Examples:
 * - john.doe@gmail.com → johndoe@gmail.com
 * - johndoe+spam@gmail.com → johndoe@gmail.com
 * - j.o.h.n.d.o.e+test@googlemail.com → johndoe@gmail.com
 *
 * @param email - Email address to normalize
 * @returns Normalized email (only modified for Gmail addresses)
 */
export function normalizeGmailEmail(email: string): string {
  const lowerEmail = email.toLowerCase()
  const parts = lowerEmail.split('@')
  const localPart = parts[0] ?? ''
  const domain = parts[1] ?? ''

  if (!GMAIL_DOMAINS.includes(domain)) {
    return lowerEmail
  }

  // remove everything after + (plus addressing)
  const withoutPlus = localPart.split('+')[0] ?? ''

  // remove all dots from local part
  const normalized = withoutPlus.replace(/\./g, '')

  // always normalize to gmail.com (googlemail.com is an alias)
  return `${normalized}@gmail.com`
}

type NormalizedGmailRow = {
  id: string
  email: string
  normalized_email: string
}

/**
 * Checks if a Gmail address (or alias variant) already exists in the database.
 * This prevents abuse where users create multiple accounts using Gmail's
 * dot-ignoring and plus-addressing features.
 *
 * Uses the `normalized_gmail_emails` view which computes normalization in Postgres.
 * The view is indexed and restricted to service_role only.
 *
 * @param email - Email to check for duplicates
 * @returns true if a duplicate exists, false otherwise
 */
export async function checkDuplicateGmailEmail(
  email: string
): Promise<boolean> {
  if (!isGmailAddress(email)) {
    return false
  }

  const normalizedEmail = normalizeGmailEmail(email)

  // query the indexed view (service_role only) for fast duplicate check
  const { count, error } = await supabaseAdmin
    .from('normalized_gmail_emails' as 'auth_users')
    .select('*', { count: 'exact', head: true })
    .eq('normalized_email' as 'email', normalizedEmail)

  if (error) {
    l.error(
      {
        key: 'check_duplicate_gmail:db_error',
        error: serializeError(error),
        context: { email },
      },
      'Failed to check for duplicate Gmail addresses'
    )
    // fail open - don't block sign-up on query errors
    return false
  }

  return (count ?? 0) > 0
}

/**
 * Response type from the ZeroBounce email validation API
 */
export type EmailValidationResponse = {
  address: string
  status: string
  sub_status: string
  free_email: boolean
  account: string
  domain: string
  mx_found: boolean
  did_you_mean: string | null
  domain_age_days: string | null
  active_in_days: string | null
  smtp_provider: string | null
  mx_record: string | null
  firstname: string | null
  lastname: string | null
  gender: string | null
  country: string | null
  region: string | null
  city: string | null
  zipcode: string | null
  processed_at: string
}

/**
 * Validates an email address using the ZeroBounce API
 *
 * This function checks if an email is deliverable and safe to use by querying
 * the ZeroBounce validation service. It handles various email statuses including
 * invalid addresses, spam traps, and abusive accounts.
 *
 * @param email - The email address to validate
 * @returns An object containing validation result and response data, or null
 *   - Object with `{ valid: boolean, data: EmailValidationResponse }` when validation succeeds
 *   - `null` if validation couldn't be performed (API key missing or error occurred)
 *          This allows for graceful degradation when email validation is unavailable
 *
 * @example
 * const result = await validateEmail("user@example.com");
 * if (result === null) {
 *   // Validation service unavailable
 * } else if (result.valid) {
 *   // Email is valid
 * } else {
 *   // Email is invalid
 * }
 */
export async function validateEmail(
  email: string
): Promise<{ valid: boolean; data: EmailValidationResponse } | null> {
  if (!process.env.ZEROBOUNCE_API_KEY) {
    return null
  }

  try {
    const response = await fetch(
      `https://api.zerobounce.net/v2/validate?api_key=${process.env.ZEROBOUNCE_API_KEY}&email=${email}&ip_address=`
    )

    const responseData = await response.json()

    // Convert the mx_found string value to a boolean if it's 'true' or 'false'
    // Otherwise keep the original value (could be null or another value)
    const data = {
      ...responseData,
      mx_found:
        responseData.mx_found === 'true'
          ? true
          : responseData.mx_found === 'false'
            ? false
            : responseData.mx_found,
    } as EmailValidationResponse

    switch (data.status) {
      case 'invalid':
      case 'spamtrap':
      case 'abuse':
      case 'do_not_mail':
        return { valid: false, data }
      default:
        return { valid: true, data }
    }
  } catch (error) {
    l.error({
      key: 'validate_email:error',
      error: serializeError(error),
      context: {
        email,
      },
    })
    return null
  }
}

export const shouldWarnAboutAlternateEmail = async (
  validationResult: EmailValidationResponse
): Promise<boolean> => {
  if (validationResult.sub_status === 'alternate') {
    const warnedAlternateEmail = await kv.get(
      KV_KEYS.WARNED_ALTERNATE_EMAIL(validationResult.address)
    )

    if (!warnedAlternateEmail) {
      await kv.set(
        KV_KEYS.WARNED_ALTERNATE_EMAIL(validationResult.address),
        true
      )

      return true
    }
  }

  return false
}
