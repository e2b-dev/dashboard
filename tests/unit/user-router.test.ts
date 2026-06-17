import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTRPCContext } from '@/core/server/trpc/init'

const authMock = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getUserProfile: vi.fn(),
  updateUser: vi.fn(),
  handleCredentialChangeSuccess: vi.fn(),
}))

vi.mock('@/core/server/auth', () => ({
  getAuthContext: authMock.getAuthContext,
  getUserProfile: authMock.getUserProfile,
  updateUser: authMock.updateUser,
  handleCredentialChangeSuccess: authMock.handleCredentialChangeSuccess,
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
    authMock.getAuthContext.mockReset().mockResolvedValue({
      user: authUser,
      accessToken: 'access-token',
    })
    authMock.getUserProfile.mockReset()
    authMock.updateUser.mockReset()
    authMock.handleCredentialChangeSuccess.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('denies email changes when the provider profile says they are not changeable', async () => {
    authMock.getUserProfile.mockResolvedValue(authUser)

    const ctx = await createTRPCContext({ headers: new Headers() })
    const caller = createCaller(ctx)

    const result = await caller.update({ email: 'new@example.test' })

    expect(result).toEqual({
      status: 'error',
      code: 'account_credentials_not_changeable',
    })
    expect(authMock.getUserProfile).toHaveBeenCalled()
    expect(authMock.updateUser).not.toHaveBeenCalled()
  })

  it('falls back to session capabilities when live profile lookup fails', async () => {
    authMock.getUserProfile.mockResolvedValue(null)
    authMock.updateUser.mockResolvedValue({
      ok: true,
      user: authUser,
    })

    const ctx = await createTRPCContext({ headers: new Headers() })
    const caller = createCaller(ctx)

    const result = await caller.update({ password: 'new-password' })

    expect(result).toEqual({ status: 'ok', user: authUser })
    expect(authMock.getUserProfile).toHaveBeenCalled()
    expect(authMock.updateUser).toHaveBeenCalledWith({
      email: undefined,
      password: 'new-password',
      name: undefined,
    })
  })
})
