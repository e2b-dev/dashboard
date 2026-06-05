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

describe('fromOryIdentity', () => {
  it('uses an explicit app user id when the Kratos id differs', () => {
    const user = fromOryIdentity(identity({ id: 'kratos-uuid' }), {
      userId: 'e2b-user-id',
    })

    expect(user.id).toBe('e2b-user-id')
  })

  it('maps password credentials to the dashboard email provider vocabulary', () => {
    const user = fromOryIdentity(
      identity({
        traits: { email: 'ada@example.test', name: 'Ada' },
        credentials: { password: { config: { hashed_password: 'hash' } } },
      })
    )

    expect(user).toEqual(
      expect.objectContaining({
        email: 'ada@example.test',
        name: 'Ada',
        providers: ['email'],
        canChangeEmail: false,
        canChangePassword: true,
      })
    )
  })

  it('blocks password changes when an OIDC credential is linked', () => {
    const user = fromOryIdentity(
      identity({
        credentials: {
          password: { config: { hashed_password: 'hash' } },
          oidc: { identifiers: ['github:123'] },
        },
      })
    )

    expect(user.canChangeEmail).toBe(false)
    expect(user.canChangePassword).toBe(false)
  })
})
