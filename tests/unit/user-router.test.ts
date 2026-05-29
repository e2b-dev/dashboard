import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTRPCContext } from '@/core/server/trpc/init'

const providerMock = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getUserProfile: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  startReauthForAccountSettings: vi.fn(),
  signOutOtherSessions: vi.fn(),
}))

vi.mock('@/core/server/auth', () => ({
  createAuthForHeaders: vi.fn(() => providerMock),
}))

vi.mock('@/lib/utils/server', () => ({
  generateE2BUserAccessToken: vi.fn(),
}))

const { createCallerFactory } = await import('@/core/server/trpc/init')
const { userRouter } = await import('@/core/server/api/routers/user')

const createCaller = createCallerFactory(userRouter)

const authUser = {
  id: 'user-1',
  email: 'old@example.test',
  name: 'Ada',
  avatarUrl: null,
  providers: ['email'],
  canChangeEmail: false,
  canChangePassword: true,
}

describe('userRouter.update', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_PROVIDER', 'ory')
    providerMock.getAuthContext.mockResolvedValue({
      user: authUser,
      accessToken: 'access-token',
    })
    providerMock.getUserProfile.mockReset()
    providerMock.updateUser.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('denies email changes in Ory mode before updating the provider user', async () => {
    const ctx = await createTRPCContext({ headers: new Headers() })
    const caller = createCaller(ctx)

    const result = await caller.update({ email: 'new@example.test' })

    expect(result).toEqual({
      status: 'error',
      code: 'account_credentials_not_changeable',
    })
    expect(providerMock.getUserProfile).not.toHaveBeenCalled()
    expect(providerMock.updateUser).not.toHaveBeenCalled()
  })
})
