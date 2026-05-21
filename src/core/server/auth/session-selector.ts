import { SupabaseAuthSessionProvider } from './session.supabase'
import type { AuthSessionProvider } from './session-provider'

export function getSelectedAuthSessionProvider(): AuthSessionProvider {
  return new SupabaseAuthSessionProvider()
}
