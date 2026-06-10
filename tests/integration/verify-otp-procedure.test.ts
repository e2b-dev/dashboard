import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PROTECTED_URLS } from '@/configs/urls'
import { authRouter } from '@/core/server/api/routers/auth'
import { createCallerFactory, createTRPCContext } from '@/core/server/trpc/init'

const { mockVerifyOtp } = vi.hoisted(() => ({
  mockVerifyOtp: vi.fn(),
}))

vi.mock('@/core/modules/auth/repository.server', () => ({
  authRepository: {
    verifyOtp: mockVerifyOtp,
  },
}))

const createCaller = createCallerFactory(authRouter)

describe('Verify OTP procedure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects successful email changes to account settings without reusing the email callback', async () => {
    mockVerifyOtp.mockResolvedValue({
      ok: true,
      data: { userId: 'user-123' },
    })

    const caller = createCaller(
      await createTRPCContext({
        headers: new Headers(),
        requestUrl: 'http://localhost:3000/api/trpc',
      })
    )

    const body = await caller.verifyOtp({
      token_hash: 'token-hash',
      type: 'email_change',
      next: 'http://localhost:3000/api/auth/email-callback?new_email=new%40example.com',
    })

    const redirectUrl = new URL(body.redirectUrl)

    expect(mockVerifyOtp).toHaveBeenCalledWith('token-hash', 'email_change')
    expect(redirectUrl.pathname).toBe(PROTECTED_URLS.ACCOUNT_SETTINGS)
    expect(redirectUrl.searchParams.get('success')).toBe(
      'E-Mail changed successfully'
    )
    expect(redirectUrl.searchParams.get('type')).toBe('update_email')
    expect(redirectUrl.searchParams.get('new_email')).toBe('new@example.com')
    expect(redirectUrl.searchParams.has('reauth')).toBe(false)
  })
})
