import { ResponseError } from '@ory/client-fetch'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const getIdentityMock = vi.hoisted(() => vi.fn())
const getIdentityByExternalIDMock = vi.hoisted(() => vi.fn())
const listIdentitiesMock = vi.hoisted(() => vi.fn())

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: loggerMocks,
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

vi.mock('@/core/server/auth/ory/client', () => ({
  getOryIdentityApi: () => ({
    getIdentity: getIdentityMock,
    getIdentityByExternalID: getIdentityByExternalIDMock,
    listIdentities: listIdentitiesMock,
  }),
}))

const { resolveOryIdentity, findOryIdentityBySubject, findOryIdentityByEmail } =
  await import('@/core/server/auth/ory/find-identity')

function notFound(): ResponseError {
  return new ResponseError(new Response(null, { status: 404 }), 'not found')
}

describe('findOryIdentityBySubject', () => {
  beforeEach(() => {
    getIdentityMock.mockReset()
    getIdentityByExternalIDMock.mockReset()
    loggerMocks.error.mockClear()
  })

  it('resolves by Kratos id without an external_id lookup', async () => {
    getIdentityMock.mockResolvedValue({ id: 'sub-is-kratos-id' })

    const identity = await findOryIdentityBySubject('sub-is-kratos-id')

    expect(identity).toEqual({ id: 'sub-is-kratos-id' })
    expect(getIdentityByExternalIDMock).not.toHaveBeenCalled()
  })

  it('falls back to external_id when the id lookup 404s', async () => {
    getIdentityMock.mockRejectedValue(notFound())
    getIdentityByExternalIDMock.mockResolvedValue({ id: 'kratos-uuid' })

    const identity = await findOryIdentityBySubject('legacy-id')

    expect(getIdentityByExternalIDMock).toHaveBeenCalledWith({
      externalID: 'legacy-id',
    })
    expect(identity).toEqual({ id: 'kratos-uuid' })
  })

  it('passes included credential requests through both subject lookup strategies', async () => {
    getIdentityMock.mockRejectedValue(notFound())
    getIdentityByExternalIDMock.mockResolvedValue({ id: 'kratos-uuid' })

    await findOryIdentityBySubject('legacy-id', ['password', 'oidc'])

    expect(getIdentityMock).toHaveBeenCalledWith({
      id: 'legacy-id',
      includeCredential: ['password', 'oidc'],
    })
    expect(getIdentityByExternalIDMock).toHaveBeenCalledWith({
      externalID: 'legacy-id',
      includeCredential: ['password', 'oidc'],
    })
  })

  it('returns null without a terminal error log when both miss', async () => {
    getIdentityMock.mockRejectedValue(notFound())
    getIdentityByExternalIDMock.mockRejectedValue(notFound())

    const identity = await findOryIdentityBySubject('ghost')

    expect(identity).toBeNull()
    // the terminal not_found error belongs to resolveOryIdentity, not here
    expect(loggerMocks.error).not.toHaveBeenCalled()
  })
})

describe('findOryIdentityByEmail', () => {
  beforeEach(() => {
    listIdentitiesMock.mockReset()
    loggerMocks.error.mockClear()
  })

  it('queries by credentials identifier and prefers an exact email match', async () => {
    listIdentitiesMock.mockResolvedValue([
      { id: 'other', traits: { email: 'someone@else.test' } },
      { id: 'match', traits: { email: 'Ada@Example.test' } },
    ])

    const identity = await findOryIdentityByEmail('ada@example.test')

    expect(listIdentitiesMock).toHaveBeenCalledWith({
      credentialsIdentifier: 'ada@example.test',
      pageSize: 2,
    })
    expect(identity?.id).toBe('match')
  })

  it('returns null when no identity has that credential', async () => {
    listIdentitiesMock.mockResolvedValue([])

    const identity = await findOryIdentityByEmail('nobody@example.test')

    expect(identity).toBeNull()
  })

  it('passes included credential requests through email lookups', async () => {
    listIdentitiesMock.mockResolvedValue([
      { id: 'match', traits: { email: 'ada@example.test' } },
    ])

    await findOryIdentityByEmail('ada@example.test', ['password', 'oidc'])

    expect(listIdentitiesMock).toHaveBeenCalledWith({
      credentialsIdentifier: 'ada@example.test',
      pageSize: 2,
      includeCredential: ['password', 'oidc'],
    })
  })
})

describe('resolveOryIdentity', () => {
  beforeEach(() => {
    getIdentityMock.mockReset()
    getIdentityByExternalIDMock.mockReset()
    listIdentitiesMock.mockReset()
    loggerMocks.error.mockClear()
  })

  it('tries subjects in order and returns the first hit', async () => {
    getIdentityMock
      .mockRejectedValueOnce(notFound()) // profile.sub by id
      .mockResolvedValueOnce({ id: 'kratos-uuid' }) // token.sub by id
    getIdentityByExternalIDMock.mockRejectedValue(notFound())

    const identity = await resolveOryIdentity({
      subjects: ['profile-sub', 'token-sub'],
    })

    expect(identity).toEqual({ id: 'kratos-uuid' })
    expect(listIdentitiesMock).not.toHaveBeenCalled()
  })

  it('falls back to email when every subject misses', async () => {
    getIdentityMock.mockRejectedValue(notFound())
    getIdentityByExternalIDMock.mockRejectedValue(notFound())
    listIdentitiesMock.mockResolvedValue([
      { id: 'kratos-uuid', traits: { email: 'ada@example.test' } },
    ])

    const identity = await resolveOryIdentity({
      subjects: ['e2b-user-id'],
      email: 'ada@example.test',
    })

    expect(identity?.id).toBe('kratos-uuid')
  })

  it('de-dupes falsy/duplicate subjects and logs not_found when all strategies fail', async () => {
    getIdentityMock.mockRejectedValue(notFound())
    getIdentityByExternalIDMock.mockRejectedValue(notFound())
    listIdentitiesMock.mockResolvedValue([])

    const identity = await resolveOryIdentity({
      subjects: ['x', 'x', null, undefined],
      email: 'ghost@example.test',
    })

    expect(identity).toBeNull()
    // 'x' resolved once despite duplicates → 1 id + 1 external_id call
    expect(getIdentityMock).toHaveBeenCalledTimes(1)
    expect(loggerMocks.error).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'auth_provider:resolve_identity:not_found',
      }),
      expect.any(String)
    )
  })
})
