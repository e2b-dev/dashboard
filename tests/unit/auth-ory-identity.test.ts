import type { Identity } from '@ory/client-fetch'
import { describe, expect, it } from 'vitest'
import { fromOryIdentity } from '@/core/server/auth/ory/identity'

function identity(partial: Partial<Identity>): Identity {
  return {
    id: 'identity-1',
    schema_id: 'default',
    schema_url: '',
    traits: {},
    ...partial,
  } as Identity
}

describe('fromOryIdentity providers normalization', () => {
  it('maps the Kratos `password` credential to `email`', () => {
    const user = fromOryIdentity(identity({ credentials: { password: {} } }))
    expect(user.providers).toEqual(['email'])
  })

  it('maps `password` to `email` and preserves other keys like `oidc`', () => {
    const user = fromOryIdentity(
      identity({ credentials: { password: {}, oidc: {} } })
    )
    expect(user.providers).toEqual(['email', 'oidc'])
  })

  it('leaves oauth-only identities without the email provider', () => {
    const user = fromOryIdentity(identity({ credentials: { oidc: {} } }))
    expect(user.providers).toEqual(['oidc'])
  })

  it('returns no providers when credentials are absent', () => {
    const user = fromOryIdentity(identity({ credentials: undefined }))
    expect(user.providers).toEqual([])
  })
})

describe('fromOryIdentity traits', () => {
  it('reads the flat `name` trait (the project schema shape)', () => {
    const user = fromOryIdentity(
      identity({
        traits: { email: 'ada@example.test', name: 'Ada Lovelace' },
        credentials: { password: {} },
      })
    )
    expect(user.email).toBe('ada@example.test')
    expect(user.name).toBe('Ada Lovelace')
  })

  it('falls back to a nested { first, last } name', () => {
    const user = fromOryIdentity(
      identity({ traits: { name: { first: 'Ada', last: 'Lovelace' } } })
    )
    expect(user.name).toBe('Ada Lovelace')
  })
})
