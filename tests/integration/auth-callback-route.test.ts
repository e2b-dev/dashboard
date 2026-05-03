import { redirect } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_URLS } from '@/configs/urls'

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

vi.mock('@/lib/utils/auth', () => ({
  encodedRedirect: vi.fn((type, url, message) => ({
    type,
    destination: `${url}?${type}=${encodeURIComponent(message)}`,
    message,
  })),
}))

import { GET } from '@/app/api/auth/callback/route'

describe('Auth Callback Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to dashboard after a successful session exchange', async () => {
    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      data: {
        user: { id: 'user-123' },
        session: { access_token: 'access-token' },
      },
      error: null,
    })

    const result = await GET(
      new Request('https://dashboard.e2b.dev/api/auth/callback?code=test')
    )

    expect(redirect).toHaveBeenCalledWith('/dashboard')
    expect(result).toEqual({ destination: '/dashboard' })
  })

  it('redirects cleanly when the exchanged session has no user id', async () => {
    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      data: {
        user: null,
        session: { access_token: 'access-token' },
      },
      error: null,
    })

    await expect(
      GET(new Request('https://dashboard.e2b.dev/api/auth/callback?code=test'))
    ).rejects.toEqual({
      type: 'error',
      destination: `${AUTH_URLS.SIGN_IN}?error=${encodeURIComponent('Missing session after auth callback')}`,
      message: 'Missing session after auth callback',
    })
  })
})
