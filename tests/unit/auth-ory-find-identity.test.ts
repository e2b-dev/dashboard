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

beforeEach(() => {
  getIdentityMock.mockReset()
  getIdentityByExternalIDMock.mockReset()
  listIdentitiesMock.mockReset()
  loggerMocks.error.mockClear()
})

describe('findOryIdentityBySubject', () => {
  it('falls back from Kratos id to external_id and preserves credential includes', async () => {
    getIdentityMock.mockRejectedValue(notFound())
    getIdentityByExternalIDMock.mockResolvedValue({ id: 'kratos-uuid' })

    const identity = await findOryIdentityBySubject('e2b-user-id', [
      'password',
      'oidc',
    ])

    expect(identity).toEqual({ id: 'kratos-uuid' })
    expect(getIdentityMock).toHaveBeenCalledWith({
      id: 'e2b-user-id',
      includeCredential: ['password', 'oidc'],
    })
    expect(getIdentityByExternalIDMock).toHaveBeenCalledWith({
      externalID: 'e2b-user-id',
      includeCredential: ['password', 'oidc'],
    })
  })
})

describe('findOryIdentityByEmail', () => {
  it('queries by credentials identifier and prefers an exact email trait match', async () => {
    listIdentitiesMock.mockResolvedValue([
      { id: 'other', traits: { email: 'someone@else.test' } },
      { id: 'match', traits: { email: 'Ada@Example.test' } },
    ])

    const identity = await findOryIdentityByEmail('ada@example.test', [
      'password',
      'oidc',
    ])

    expect(identity?.id).toBe('match')
    expect(listIdentitiesMock).toHaveBeenCalledWith({
      credentialsIdentifier: 'ada@example.test',
      pageSize: 2,
      includeCredential: ['password', 'oidc'],
    })
  })
})

describe('resolveOryIdentity', () => {
  it('falls back to verified email when subject lookup misses', async () => {
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
})
