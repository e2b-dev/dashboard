import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStoreMock = vi.hoisted(() => {
  let value: string | undefined

  return {
    set: vi.fn((_: string, nextValue: string) => {
      value = nextValue
    }),
    get: vi.fn(() => (value ? { value } : undefined)),
    delete: vi.fn(() => {
      value = undefined
    }),
    reset: () => {
      value = undefined
    },
  }
})

const getIdentityMock = vi.hoisted(() => vi.fn())
const patchIdentityMock = vi.hoisted(() => vi.fn())
const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(cookieStoreMock)),
}))

vi.mock('@/core/server/auth/ory/client', () => ({
  getOryIdentityApi: () => ({
    getIdentity: getIdentityMock,
    patchIdentity: patchIdentityMock,
  }),
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: loggerMocks,
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const {
  readOrySignupMetadataFromHeaders,
  setOrySignupMetadataCookie,
  persistOrySignupMetadata,
  persistOrySignupMetadataFromCookie,
} = await import('@/core/server/auth/ory/signup-metadata')

describe('Ory signup metadata', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret'
    cookieStoreMock.reset()
    cookieStoreMock.set.mockClear()
    cookieStoreMock.get.mockClear()
    cookieStoreMock.delete.mockClear()
    getIdentityMock.mockReset()
    patchIdentityMock.mockReset()
    loggerMocks.error.mockClear()
    loggerMocks.warn.mockClear()
  })

  it('reads the client IP and user agent from request headers', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.10, 10.0.0.1',
      'user-agent': 'Mozilla/5.0',
    })

    expect(readOrySignupMetadataFromHeaders(headers)).toEqual({
      signup_ip: '203.0.113.10',
      signup_user_agent: 'Mozilla/5.0',
    })
  })

  it('persists signup metadata from the signed handoff cookie', async () => {
    getIdentityMock.mockResolvedValue({ id: 'kratos-id', metadata_admin: {} })
    patchIdentityMock.mockResolvedValue({})

    await setOrySignupMetadataCookie({
      signup_ip: '203.0.113.10',
      signup_user_agent: 'Mozilla/5.0',
    })
    await persistOrySignupMetadataFromCookie('kratos-id')

    expect(cookieStoreMock.set).toHaveBeenCalledWith(
      'e2b-ory-signup-metadata',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
    )
    expect(cookieStoreMock.delete).toHaveBeenCalledWith(
      'e2b-ory-signup-metadata'
    )
    expect(patchIdentityMock).toHaveBeenCalledWith({
      id: 'kratos-id',
      jsonPatch: [
        {
          op: 'add',
          path: '/metadata_admin/signup_ip',
          value: '203.0.113.10',
        },
        {
          op: 'add',
          path: '/metadata_admin/signup_user_agent',
          value: 'Mozilla/5.0',
        },
      ],
    })
  })

  it('does not overwrite existing signup metadata', async () => {
    getIdentityMock.mockResolvedValue({
      id: 'kratos-id',
      metadata_admin: { signup_ip: '198.51.100.1' },
    })
    patchIdentityMock.mockResolvedValue({})

    await persistOrySignupMetadata('kratos-id', {
      signup_ip: '203.0.113.10',
      signup_user_agent: 'Mozilla/5.0',
    })

    expect(patchIdentityMock).toHaveBeenCalledWith({
      id: 'kratos-id',
      jsonPatch: [
        {
          op: 'add',
          path: '/metadata_admin/signup_user_agent',
          value: 'Mozilla/5.0',
        },
      ],
    })
  })
})
