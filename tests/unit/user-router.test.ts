import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTRPCContext } from '@/core/server/trpc/init'

const providerMock = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  getUserProfile: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  startReauthForAccountSettings: vi.fn(),
  handleCredentialChangeSuccess: vi.fn(),
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

  it('denies email changes when the provider profile says they are not changeable', async () => {
    providerMock.getUserProfile.mockResolvedValue(authUser)

    const ctx = await createTRPCContext({ headers: new Headers() })
    const caller = createCaller(ctx)

    const result = await caller.update({ email: 'new@example.test' })

    expect(result).toEqual({
      status: 'error',
      code: 'account_credentials_not_changeable',
    })
    expect(providerMock.getUserProfile).toHaveBeenCalled()
    expect(providerMock.updateUser).not.toHaveBeenCalled()
  })

  it('falls back to session capabilities when live profile lookup fails', async () => {
    providerMock.getUserProfile.mockResolvedValue(null)
    providerMock.updateUser.mockResolvedValue({
      ok: true,
      user: authUser,
    })

    const ctx = await createTRPCContext({ headers: new Headers() })
    const caller = createCaller(ctx)

    const result = await caller.update({ password: 'new-password' })

    expect(result).toEqual({ status: 'ok', user: authUser })
    expect(providerMock.getUserProfile).toHaveBeenCalled()
    expect(providerMock.updateUser).toHaveBeenCalledWith({
      email: undefined,
      password: 'new-password',
      name: undefined,
    })
  })
})
