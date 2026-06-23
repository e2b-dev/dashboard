import type { Identity } from '@ory/client-fetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fromKratosSessionIdentity,
  fromOryIdentity,
} from '@/core/server/auth/ory/identity'
import { l } from '@/core/shared/clients/logger/logger'

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const errorMock = vi.mocked(l.error)

afterEach(() => {
  errorMock.mockReset()
})

const DRIFT_KEY = 'auth_events:identity_traits:schema_drift'

function driftLogged(): boolean {
  return errorMock.mock.calls.some(
    ([meta]) =>
      typeof meta === 'object' &&
      meta !== null &&
      (meta as { key?: string }).key === DRIFT_KEY
  )
}

function sessionIdentity(overrides: {
  traits?: unknown
  metadata_public?: unknown
}) {
  return { id: 'identity-1', external_id: 'e2b-user-1', ...overrides }
}

function adminIdentity(overrides: {
  traits?: unknown
  metadata_public?: unknown
}): Identity {
  return {
    id: 'identity-1',
    external_id: 'e2b-user-1',
    ...overrides,
  } as Identity
}

describe('AuthUser id sourcing', () => {
  it('sets id from external_id and identityId from the Kratos id', () => {
    const fromSession = fromKratosSessionIdentity(
      sessionIdentity({ traits: { email: 'jane@e2b.dev' } })
    )
    const fromAdmin = fromOryIdentity(
      adminIdentity({ traits: { email: 'jane@e2b.dev' } })
    )

    for (const user of [fromSession, fromAdmin]) {
      expect(user.id).toBe('e2b-user-1')
      expect(user.identityId).toBe('identity-1')
    }
  })

  it('throws when the identity has no external_id', () => {
    expect(() =>
      fromKratosSessionIdentity({
        id: 'identity-1',
        traits: { email: 'jane@e2b.dev' },
      })
    ).toThrow(/external_id/)
    expect(() =>
      fromOryIdentity({
        id: 'identity-1',
        traits: { email: 'jane@e2b.dev' },
      } as Identity)
    ).toThrow(/external_id/)
  })
})

describe('parseOryTraits via identity mappers', () => {
  it('accepts valid traits without logging drift', () => {
    const user = fromKratosSessionIdentity(
      sessionIdentity({ traits: { email: 'jane@e2b.dev', name: 'Jane Doe' } })
    )

    expect(user.email).toBe('jane@e2b.dev')
    expect(user.name).toBe('Jane Doe')
    expect(driftLogged()).toBe(false)
  })

  it('accepts traits without the optional name', () => {
    const user = fromKratosSessionIdentity(
      sessionIdentity({ traits: { email: 'jane@e2b.dev' } })
    )

    expect(user.name).toBeNull()
    expect(driftLogged()).toBe(false)
  })

  it('logs drift when the required email is missing but still returns a user', () => {
    const user = fromOryIdentity(adminIdentity({ traits: { name: 'Jane' } }))

    expect(driftLogged()).toBe(true)
    expect(user.email).toBeNull()
    expect(user.name).toBe('Jane')
  })

  it('logs drift when name is retyped (legacy { first, last } shape)', () => {
    const user = fromOryIdentity(
      adminIdentity({
        traits: { email: 'jane@e2b.dev', name: { first: 'Jane', last: 'Doe' } },
      })
    )

    expect(driftLogged()).toBe(true)
    // No longer composited — the preset stores name as a flat string.
    expect(user.name).toBeNull()
  })

  it('logs drift on an unexpected extra trait (.strict)', () => {
    fromKratosSessionIdentity(
      sessionIdentity({
        traits: { email: 'jane@e2b.dev', picture: 'https://x/y.png' },
      })
    )

    expect(driftLogged()).toBe(true)
  })
})

describe('avatar resolves from metadata_public, not traits', () => {
  it('reads picture from metadata_public', () => {
    const url = 'https://lh3.googleusercontent.com/a/abc=s96-c'
    const fromSession = fromKratosSessionIdentity(
      sessionIdentity({
        traits: { email: 'jane@e2b.dev' },
        metadata_public: { picture: url },
      })
    )
    const fromAdmin = fromOryIdentity(
      adminIdentity({
        traits: { email: 'jane@e2b.dev' },
        metadata_public: { picture: url },
      })
    )

    expect(fromSession.avatarUrl).toBe(url)
    expect(fromAdmin.avatarUrl).toBe(url)
  })

  it('ignores a picture placed in traits and yields null avatar', () => {
    const user = fromKratosSessionIdentity(
      sessionIdentity({
        traits: { email: 'jane@e2b.dev', picture: 'https://x/y.png' },
      })
    )

    expect(user.avatarUrl).toBeNull()
  })
})
