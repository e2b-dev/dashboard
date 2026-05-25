import 'server-only'

import type { Identity } from '@ory/client-fetch'
import type { Session } from 'next-auth'
import type { AuthUser } from '../types'

// auth.js sessions only carry the basic user shape; identity providers list
// requires an Ory IdentityApi lookup. fromAuthSession is the cheap path used
// during request-time getAuthContext.
export function fromAuthSession(session: Session): AuthUser {
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    avatarUrl: session.user.image ?? null,
    providers: [],
  }
}

// fromOryIdentity is used by oryAuthAdmin (admin lookups) where we have the
// full Identity object including credentials and traits.
export function fromOryIdentity(identity: Identity): AuthUser {
  const traits = (identity.traits ?? {}) as Record<string, unknown>
  const email = readString(traits, 'email')
  const name = readDisplayName(traits)
  const avatarUrl =
    readString(traits, 'picture') ?? readString(traits, 'avatar_url')
  const providers = identity.credentials
    ? Object.keys(identity.credentials)
    : []

  return {
    id: identity.id,
    email,
    name,
    avatarUrl,
    providers,
  }
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
