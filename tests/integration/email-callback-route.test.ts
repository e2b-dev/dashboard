import { redirect } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/auth/email-callback/route'
import { PROTECTED_URLS } from '@/configs/urls'

const { mockSupabaseClient } = vi.hoisted(() => ({
  mockSupabaseClient: {
    auth: {
      exchangeCodeForSession: vi.fn(),
    },
  },
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url) => ({ destination: url })),
}))

vi.mock('@/core/shared/clients/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

describe('Email Callback Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserves email update messages as a single query parameter', async () => {
    const result = await GET(
      new Request(
        'https://dashboard.e2b.dev/api/auth/email-callback?message=Confirm%20the%20other%20email'
      )
    )

    const expectedParams = new URLSearchParams({
      message: 'Confirm the other email',
      type: 'update_email',
    })

    expect(redirect).toHaveBeenCalledWith(
      `${PROTECTED_URLS.ACCOUNT_SETTINGS}?${expectedParams.toString()}`
    )
    expect(result).toEqual({
      destination: `${PROTECTED_URLS.ACCOUNT_SETTINGS}?${expectedParams.toString()}`,
    })
  })

  it('does not allow message to inject sibling query parameters', async () => {
    const result = await GET(
      new Request(
        'https://dashboard.e2b.dev/api/auth/email-callback?message=legit%26success%3Dinjected'
      )
    )

    const redirectUrl = vi.mocked(redirect).mock.calls[0][0]
    const searchParams = new URL(`https://dashboard.e2b.dev${redirectUrl}`)
      .searchParams

    expect(searchParams.get('message')).toBe('legit&success=injected')
    expect(searchParams.get('type')).toBe('update_email')
    expect(searchParams.has('success')).toBe(false)
    expect(result).toEqual({ destination: redirectUrl })
  })

  it('shows the message without consuming the code when both are present', async () => {
    // Regression guard for the branch consolidation in 01d33500:
    // when both code and message are present, message must take precedence
    // and the OTP code must NOT be exchanged (otherwise a partial validation
    // would burn the token prematurely).
    const result = await GET(
      new Request(
        'https://dashboard.e2b.dev/api/auth/email-callback?code=unused&message=Check%20your%20other%20inbox'
      )
    )

    const expectedParams = new URLSearchParams({
      message: 'Check your other inbox',
      type: 'update_email',
    })

    expect(
      mockSupabaseClient.auth.exchangeCodeForSession
    ).not.toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith(
      `${PROTECTED_URLS.ACCOUNT_SETTINGS}?${expectedParams.toString()}`
    )
    expect(result).toEqual({
      destination: `${PROTECTED_URLS.ACCOUNT_SETTINGS}?${expectedParams.toString()}`,
    })
  })

  it('returns a generic error when neither code nor message is provided', async () => {
    const result = await GET(
      new Request('https://dashboard.e2b.dev/api/auth/email-callback')
    )

    const expectedParams = new URLSearchParams({
      error: 'Invalid email verification link',
      type: 'update_email',
    })

    expect(
      mockSupabaseClient.auth.exchangeCodeForSession
    ).not.toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith(
      `${PROTECTED_URLS.ACCOUNT_SETTINGS}?${expectedParams.toString()}`
    )
    expect(result).toEqual({
      destination: `${PROTECTED_URLS.ACCOUNT_SETTINGS}?${expectedParams.toString()}`,
    })
  })

  it('uses a single encoded redirect for successful email updates', async () => {
    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      error: null,
    })

    const result = await GET(
      new Request(
        'https://dashboard.e2b.dev/api/auth/email-callback?code=test-code&new_email=new%2Balias%40example.com'
      )
    )

    const expectedParams = new URLSearchParams({
      success: 'E-Mail changed successfully',
      new_email: 'new+alias@example.com',
      type: 'update_email',
    })

    expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      'test-code'
    )
    expect(redirect).toHaveBeenCalledWith(
      `${PROTECTED_URLS.ACCOUNT_SETTINGS}?${expectedParams.toString()}`
    )
    expect(result).toEqual({
      destination: `${PROTECTED_URLS.ACCOUNT_SETTINGS}?${expectedParams.toString()}`,
    })
  })

  it('returns a generic error when the supabase code exchange fails', async () => {
    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      error: { message: 'Token has expired or is invalid' },
    })

    const result = await GET(
      new Request(
        'https://dashboard.e2b.dev/api/auth/email-callback?code=expired'
      )
    )

    const expectedParams = new URLSearchParams({
      error: 'Failed to update E-Mail',
      type: 'update_email',
    })

    expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      'expired'
    )
    expect(redirect).toHaveBeenCalledWith(
      `${PROTECTED_URLS.ACCOUNT_SETTINGS}?${expectedParams.toString()}`
    )
    expect(result).toEqual({
      destination: `${PROTECTED_URLS.ACCOUNT_SETTINGS}?${expectedParams.toString()}`,
    })
  })
})
