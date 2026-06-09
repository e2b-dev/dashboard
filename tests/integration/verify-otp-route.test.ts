import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/auth/verify-otp/route'
import { PROTECTED_URLS } from '@/configs/urls'

const { mockVerifyOtp } = vi.hoisted(() => ({
  mockVerifyOtp: vi.fn(),
}))

vi.mock('@/core/modules/auth/repository.server', () => ({
  authRepository: {
    verifyOtp: mockVerifyOtp,
  },
}))

describe('Verify OTP Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects successful email changes to account settings without reusing the email callback', async () => {
    mockVerifyOtp.mockResolvedValue({
      ok: true,
      data: { userId: 'user-123' },
    })

    const response = await POST(
      createRequest({
        token_hash: 'token-hash',
        type: 'email_change',
        next: 'http://localhost:3000/api/auth/email-callback?new_email=new%40example.com',
      })
    )

    const body = await response.json()
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

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
