import 'server-only'

export function getSupabaseAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Supabase auth env is required when AUTH_PROVIDER=supabase')
  }

  return { url, anonKey }
}
