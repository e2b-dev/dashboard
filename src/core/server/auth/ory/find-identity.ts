import 'server-only'

import { type Identity, ResponseError } from '@ory/client-fetch'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { getOryIdentityApi } from './client'
import { readOryError } from './ory-error'

// Resolving the Kratos identity for the logged-in user is not a simple
// "getIdentity(sub)" because the OIDC subject the dashboard sees is not
// guaranteed to be the Kratos identity id:
//   - In a vanilla Ory setup the OAuth2 subject IS the Kratos identity id.
//   - Projects that customize the subject (e.g. to keep a stable app user id
//     across a migration) expose the Kratos id under a *different* OIDC subject,
//     or only via the id_token/userinfo profile `sub`.
//   - Migrated identities may carry a legacy id as `external_id`.
// So we try every identifier we have (a list of candidate subjects, then the
// verified email) and return the first identity that resolves.

export type ResolveOryIdentityInput = {
  // Candidate subject ids, in priority order (e.g. profile.sub, then token.sub).
  // Falsy entries are ignored and duplicates de-duped.
  subjects?: Array<string | null | undefined>
  // Verified login email — the unambiguous fallback for password identities.
  email?: string | null
}

export async function resolveOryIdentity(
  input: ResolveOryIdentityInput
): Promise<Identity | null> {
  const subjects = [
    ...new Set(
      (input.subjects ?? []).filter(
        (subject): subject is string => typeof subject === 'string' && !!subject
      )
    ),
  ]

  for (const subject of subjects) {
    const identity = await findOryIdentityBySubject(subject)
    if (identity) return identity
  }

  if (input.email) {
    const identity = await findOryIdentityByEmail(input.email)
    if (identity) return identity
  }

  l.error(
    {
      key: 'auth_provider:resolve_identity:not_found',
      context: {
        attempted_subjects: subjects,
        attempted_email: input.email ?? null,
        // The project we queried — a mismatch with the token issuer points to a
        // misconfigured admin client (wrong Ory project).
        ory_sdk_url: process.env.ORY_SDK_URL ?? null,
      },
    },
    'no Kratos identity found by subject(s) or email'
  )
  return null
}

// Tries a single subject as a Kratos identity id, then as an external_id. A 404
// means "not this strategy" and falls through; any other error is unexpected,
// logged, and stops the search. The terminal "not found" belongs to
// resolveOryIdentity once every strategy is exhausted.
export async function findOryIdentityBySubject(
  subject: string
): Promise<Identity | null> {
  const api = getOryIdentityApi()

  try {
    return await api.getIdentity({ id: subject })
  } catch (error) {
    if (!isNotFound(error)) {
      await logLookupError('by_id', error)
      return null
    }
  }

  try {
    return await api.getIdentityByExternalID({ externalID: subject })
  } catch (error) {
    if (!isNotFound(error)) {
      await logLookupError('by_external_id', error)
    }
    return null
  }
}

export async function findOryIdentityByEmail(
  email: string
): Promise<Identity | null> {
  try {
    const identities = await getOryIdentityApi().listIdentities({
      credentialsIdentifier: email,
      pageSize: 2,
    })

    if (identities.length === 0) return null

    // Prefer an exact email-trait match; fall back to the first result.
    const exact = identities.find(
      (identity) => emailTrait(identity)?.toLowerCase() === email.toLowerCase()
    )
    return exact ?? identities[0] ?? null
  } catch (error) {
    await logLookupError('by_email', error)
    return null
  }
}

function emailTrait(identity: Identity): string | null {
  const traits = (identity.traits ?? {}) as Record<string, unknown>
  return typeof traits.email === 'string' ? traits.email : null
}

function isNotFound(error: unknown): boolean {
  return error instanceof ResponseError && error.response.status === 404
}

async function logLookupError(
  stage: 'by_id' | 'by_external_id' | 'by_email',
  error: unknown
): Promise<void> {
  const ory = error instanceof ResponseError ? await readOryError(error) : null

  l.error(
    {
      key: 'auth_provider:resolve_identity:error',
      context: { stage, ory },
      error: serializeErrorForLog(error),
    },
    `Ory identity lookup failed (${stage})`
  )
}
