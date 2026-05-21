import {
  SupabaseAuthSessionProvider,
  type SupabaseServerClient,
} from './session.supabase'
import type { AuthSessionProvider } from './session-provider'

export type CreateAuthProviderOptions = {
  supabaseClient?: SupabaseServerClient
}

export function createAuthProvider(
  options: CreateAuthProviderOptions = {}
): AuthSessionProvider {
  return new SupabaseAuthSessionProvider(options.supabaseClient)
}

export const authProvider = createAuthProvider()
