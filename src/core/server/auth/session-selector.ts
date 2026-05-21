import { AUTH_PROVIDER_TYPES, type AuthProviderType } from './auth-provider'
import { HostedOryAuthProvider } from './hosted-ory-auth-provider'
import {
  ManagedSupabaseAuthProvider,
  type SupabaseServerClient,
} from './managed-supabase-auth-provider'

export type CreateAuthProviderOptions = {
  supabaseClient?: SupabaseServerClient
}

export type AuthProviderByType = {
  [AUTH_PROVIDER_TYPES.MANAGED_SUPABASE]: ManagedSupabaseAuthProvider
  [AUTH_PROVIDER_TYPES.HOSTED_ORY]: HostedOryAuthProvider
}

export function createAuthProvider(
  options?: CreateAuthProviderOptions
): ManagedSupabaseAuthProvider
export function createAuthProvider<TType extends AuthProviderType>(
  type: TType,
  options?: CreateAuthProviderOptions
): AuthProviderByType[TType]
export function createAuthProvider(
  typeOrOptions: AuthProviderType | CreateAuthProviderOptions = {},
  maybeOptions: CreateAuthProviderOptions = {}
) {
  if (typeOrOptions === AUTH_PROVIDER_TYPES.HOSTED_ORY) {
    return new HostedOryAuthProvider()
  }

  const options =
    typeof typeOrOptions === 'string' ? maybeOptions : typeOrOptions

  return new ManagedSupabaseAuthProvider(options.supabaseClient)
}

export const authProvider = createAuthProvider()
