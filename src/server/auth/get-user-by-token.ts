import 'server-only'

import { supabaseAdmin } from '@/lib/clients/supabase/admin'
import { AuthSessionMissingError } from '@supabase/supabase-js'
import { cache } from 'react'

/**
 * Retrieves a user from Supabase using their access token.
 *
 * This function uses the Supabase admin client instead of the regular client because:
 * 1. The admin client doesn't rely on cookies, making it suitable for server-side operations
 * 2. It allows us to use React's cache function for request memoization (see get-user-by-token-memo.tsx)
 * 3. It provides a consistent interface for token-based user retrieval across the application
 *
 * @param accessToken - The user's Supabase access token
 * @returns A promise that resolves to an object containing either the user data or an error
 * @throws {AuthSessionMissingError} When no access token is provided
 */
function getUserByToken(accessToken: string | undefined) {
  const trimmedAccessToken = accessToken?.trim()

  if (!trimmedAccessToken) {
    return { error: AuthSessionMissingError, data: { user: null } }
  }

  return supabaseAdmin.auth.getUser(accessToken)
}

export default cache(getUserByToken)
