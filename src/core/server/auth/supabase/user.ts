import type { User } from '@supabase/supabase-js'
import type { AuthUser } from '../types'

export function toAuthUser(user: User): AuthUser {
  const providers = extractProviders(user)
  const canChangeEmail = canChangeEmailPasswordSettings(providers)

  return {
    id: user.id,
    email: user.email ?? null,
    name: getStringFromMetadata(user.user_metadata, 'name'),
    avatarUrl: getStringFromMetadata(user.user_metadata, 'avatar_url'),
    providers,
    canChangeEmail,
    canChangePassword: canChangeEmail,
  }
}

function getStringFromMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string
): string | null {
  const value = metadata?.[key]
  return typeof value === 'string' ? value : null
}

function extractProviders(user: User): string[] {
  const fromAppMetadata = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers.filter(
        (provider): provider is string => typeof provider === 'string'
      )
    : []

  const fromIdentities =
    user.identities
      ?.map((identity) => identity.provider)
      .filter((provider): provider is string => typeof provider === 'string') ??
    []

  return [...new Set([...fromAppMetadata, ...fromIdentities])]
}

function canChangeEmailPasswordSettings(providers: string[]): boolean {
  return (
    providers.includes('email') &&
    providers.every((provider) => {
      return provider === 'email'
    })
  )
}
