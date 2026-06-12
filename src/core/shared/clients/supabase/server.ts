import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/core/shared/contracts/database.types'
import { getSupabaseAuthConfig } from './env'

export const createClient = async () => {
  const { url, anonKey } = getSupabaseAuthConfig()
  const cookieStore = await cookies()

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch (_error) {}
      },
    },
  })
}
