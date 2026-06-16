import 'server-only'

import type { Identity } from '@ory/client-fetch'
import type { AuthUser } from '../types'

type FromOryIdentityOptions = {
  userId?: string
}

// Rich path: build the user from a full Kratos Identity (traits + credentials).
// Used wherever we've fetched the identity via the admin API — admin lookups and
// the live profile query.
export function fromOryIdentity(
  identity: Identity,
  options: FromOryIdentityOptions = {}
): AuthUser {
  const traits = (identity.traits ?? {}) as Record<string, unknown>
  const email = readString(traits, 'email')
  const name = readDisplayName(traits)
  const avatarUrl =
    readString(traits, 'picture') ?? readString(traits, 'avatar_url')
  const providers = normalizeProviders(identity.credentials)
  const hasPasswordCredential = hasUsablePasswordCredential(
    identity.credentials?.password
  )
  const hasOidcCredential = hasLinkedOidcCredential(identity.credentials?.oidc)
  const canChangePassword = hasPasswordCredential && !hasOidcCredential

  return {
    id: options.userId ?? identity.id,
    email,
    name,
    avatarUrl,
    providers,
    // Email changes are disabled until the custom UI drives Ory's
    // settings/verification flows instead of patching traits directly.
    canChangeEmail: false,
    canChangePassword,
  }
}

// Kratos credential keys (`password`, `oidc`, …) don't match the provider
// vocabulary the dashboard UI expects (Supabase emits `email` for the
// email/password credential). Map `password` → `email` for display parity,
// while preserving other keys like `oidc`.
function normalizeProviders(credentials: Identity['credentials']): string[] {
  if (!credentials) return []

  const mapped = Object.keys(credentials).map((key) =>
    key === 'password' ? 'email' : key
  )

  return [...new Set(mapped)]
}

function hasUsablePasswordCredential(
  credential: NonNullable<Identity['credentials']>[string] | undefined
): boolean {
  const config = credential?.config as Record<string, unknown> | undefined
  return (
    (typeof config?.hashed_password === 'string' &&
      config.hashed_password !== '') ||
    config?.use_password_migration_hook === true
  )
}

function hasLinkedOidcCredential(
  credential: NonNullable<Identity['credentials']>[string] | undefined
): boolean {
  if (!credential) return false

  if (credential.identifiers && credential.identifiers.length > 0) {
    return true
  }

  const config = credential.config as Record<string, unknown> | undefined
  const providers = config?.providers
  return Array.isArray(providers) && providers.length > 0
}

function readString(
  traits: Record<string, unknown>,
  key: string
): string | null {
  const value = traits[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readDisplayName(traits: Record<string, unknown>): string | null {
  // ory's default schema nests name as { first, last } or stores it flat
  const flat = readString(traits, 'name')
  if (flat) return flat

  const nested = traits.name
  if (nested && typeof nested === 'object') {
    const obj = nested as Record<string, unknown>
    const first = readString(obj, 'first')
    const last = readString(obj, 'last')
    const composite = [first, last].filter(Boolean).join(' ').trim()
    if (composite) return composite
  }

  return null
}
