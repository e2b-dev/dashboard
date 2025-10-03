import { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 * @param {Record<string, string>} queryParams - Additional query parameters to be added to the redirect URL.
 * @returns {never} This function doesn't return as it triggers a redirect.
 */
export function encodedRedirect(
  type: 'error' | 'success',
  path: string,
  message: string,
  queryParams?: Record<string, string>
) {
  const queryString = new URLSearchParams()
  queryString.set(type, encodeURIComponent(message))
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      queryString.set(key, value)
    })
  }
  return redirect(`${path}?${queryString.toString()}`)
}

export function getUserProviders(user: User) {
  return user.app_metadata.providers as string[] | undefined
}

/**
 * Checks if a user's email is verified based on their OAuth provider's identity data.
 * Intended for use at signup when user has exactly one identity.
 * @param {User} user - The Supabase user object
 * @returns {{ verified: boolean, provider?: string, reason?: string }} - Verification status and details
 */
export function isOAuthEmailVerified(user: User): {
  verified: boolean
  provider?: string
  reason?: string
} {
  // Get the user's identities (OAuth providers they've signed in with)
  const identities = user.identities || []

  if (identities.length === 0) {
    // Email/password user - consider verified if email_confirmed_at is set
    return {
      verified: !!user.email_confirmed_at,
      reason: user.email_confirmed_at
        ? 'Email confirmed'
        : 'Email not confirmed',
    }
  }

  // Check the first identity (at signup, there's only one)
  const identity = identities[0]
  if (!identity) {
    return { verified: false, reason: 'No identity found' }
  }

  const provider = identity.provider
  const identityData = identity.identity_data

  if (!identityData) {
    return {
      verified: false,
      provider,
      reason: 'No identity data available',
    }
  }

  switch (provider) {
    case 'google':
      // Google provides email_verified field
      // Require explicit true - fail closed if undefined/null/false
      if (identityData.email_verified !== true) {
        return {
          verified: false,
          provider: 'google',
          reason: 'Google email not verified',
        }
      }
      break

    case 'github':
      // GitHub provides verified field (for email verification)
      // Note: GitHub returns the primary email's verification status
      // Require explicit true - fail closed if undefined/null/false
      if (identityData.verified !== true) {
        return {
          verified: false,
          provider: 'github',
          reason: 'GitHub email not verified',
        }
      }
      break

    // Add other providers as needed
    default:
      // For other OAuth providers, assume verified if they have an email
      break
  }

  // If we get here, the check passed
  return { verified: true, provider }
}
