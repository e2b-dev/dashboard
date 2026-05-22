import { beforeEach, describe, expect, it, vi } from 'vitest'

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const supabaseAdminMocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: loggerMocks,
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

vi.mock('@/core/shared/clients/supabase/admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        getUserById: supabaseAdminMocks.getUserById,
      },
    },
    from: supabaseAdminMocks.from,
  },
}))

const { supabaseAuthAdmin } = await import('@/core/server/auth/supabase/admin')

describe('supabaseAuthAdmin', () => {
  beforeEach(() => {
    loggerMocks.error.mockClear()
    supabaseAdminMocks.getUserById.mockReset()
    supabaseAdminMocks.from.mockReset()
  })

  describe('getUserById', () => {
    it('logs and returns null when supabase returns an error', async () => {
      const error = { message: 'admin api down', status: 503 }
      supabaseAdminMocks.getUserById.mockResolvedValue({
        data: { user: null },
        error,
      })

      const result = await supabaseAuthAdmin.getUserById('user-1')

      expect(result).toBeNull()
      expect(loggerMocks.error).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'auth_admin:get_user_by_id:error',
          user_id: 'user-1',
          error,
        }),
        expect.stringContaining('supabase admin getUserById failed')
      )
    })

    it('returns null without logging when user is missing', async () => {
      supabaseAdminMocks.getUserById.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await supabaseAuthAdmin.getUserById('user-1')

      expect(result).toBeNull()
      expect(loggerMocks.error).not.toHaveBeenCalled()
    })

    it('maps to AuthUser on success', async () => {
      supabaseAdminMocks.getUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-1',
            email: 'a@b.dev',
            user_metadata: { name: 'Alice' },
            app_metadata: { providers: ['email'] },
            identities: [{ provider: 'email' }],
          },
        },
        error: null,
      })

      const result = await supabaseAuthAdmin.getUserById('user-1')

      expect(result).toEqual(
        expect.objectContaining({
          id: 'user-1',
          email: 'a@b.dev',
          name: 'Alice',
          providers: ['email'],
        })
      )
    })
  })

  describe('getEmailsByIds', () => {
    it('logs and throws when supabase query errors', async () => {
      const error = new Error('db unavailable')
      supabaseAdminMocks.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: null, error }),
        }),
      })

      await expect(supabaseAuthAdmin.getEmailsByIds(['user-1'])).rejects.toBe(
        error
      )

      expect(loggerMocks.error).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'auth_admin:get_emails_by_ids:error',
          error,
        }),
        expect.stringContaining('supabase admin getEmailsByIds failed')
      )
    })

    it('returns an empty map without querying when no ids are provided', async () => {
      const result = await supabaseAuthAdmin.getEmailsByIds([])

      expect(result.size).toBe(0)
      expect(supabaseAdminMocks.from).not.toHaveBeenCalled()
    })
  })
})
