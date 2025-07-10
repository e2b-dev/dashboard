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
