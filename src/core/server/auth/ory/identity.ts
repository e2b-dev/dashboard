import 'server-only'

import type { Identity } from '@ory/client-fetch'
import { z } from 'zod'
import { l } from '@/core/shared/clients/logger/logger'
import type { AuthUser } from '../types'

type FromOryIdentityOptions = {
  userId?: string
}

export const oryIdentityTraitsSchema = z
  .object({
    email: z.email().max(320),
    name: z.string().max(320).optional(),
  })
  .strict()

export type OryIdentityTraits = z.infer<typeof oryIdentityTraitsSchema>

type TraitSource = 'kratos_session' | 'admin_identity'

function parseOryTraits(
  raw: unknown,
  ctx: { identityId: string; source: TraitSource }
): Record<string, unknown> {
  const traits = (raw ?? {}) as Record<string, unknown>
  const result = oryIdentityTraitsSchema.safeParse(traits)

  if (!result.success) {
    l.error(
      {
        key: 'auth_events:identity_traits:schema_drift',
        context: {
          identity_id: ctx.identityId,
          source: ctx.source,
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            code: issue.code,
          })),
        },
      },
      'Ory identity traits failed schema validation (possible schema drift)'
    )
  }

  return traits
}

function readPublicPicture(metadataPublic: unknown): string | null {
  const meta = (metadataPublic ?? {}) as Record<string, unknown>
  return readString(meta, 'picture')
}

// Build the user from a live Kratos session identity (whoami) — the source of
// truth for getAuthContext. The session identity carries traits but not
// credentials, so provider/credential flags stay false — use fromOryIdentity
// with an admin lookup when those are needed (e.g. the profile query).
export function fromKratosSessionIdentity(identity: {
  id: string
  traits?: unknown
  metadata_public?: unknown
}): AuthUser {
  const traits = parseOryTraits(identity.traits, {
    identityId: identity.id,
    source: 'kratos_session',
  })
  return {
    id: identity.id,
    email: readString(traits, 'email'),
    name: readString(traits, 'name'),
    avatarUrl: readPublicPicture(identity.metadata_public),
    providers: [],
    canChangeEmail: false,
    canChangePassword: false,
  }
}

// Rich path: build the user from a full Kratos Identity (traits + credentials).
// Used wherever we've fetched the identity via the admin API — admin lookups and
// the live profile query.
export function fromOryIdentity(
  identity: Identity,
  options: FromOryIdentityOptions = {}
): AuthUser {
  const traits = parseOryTraits(identity.traits, {
    identityId: identity.id,
    source: 'admin_identity',
  })
  const email = readString(traits, 'email')
  const name = readString(traits, 'name')
  const avatarUrl = readPublicPicture(identity.metadata_public)
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
// vocabulary the dashboard UI expects. Map `password` → `email` for display
// parity, while preserving other keys like `oidc`.
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