import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  post: vi.fn(),
}))

vi.mock('@/core/shared/clients/api', () => ({
  api: {
    POST: apiMocks.post,
  },
}))

vi.mock('@/core/shared/clients/logger/logger', () => ({
  l: { error: vi.fn(), warn: vi.fn() },
  serializeErrorForLog: vi.fn((error: unknown) => error),
}))

const { getAuthUserEmailsById, resolveCreatorEmails } = await import(
  '@/core/modules/users/auth-user-emails.server'
)

describe('auth user emails', () => {
  beforeEach(() => {
    apiMocks.post.mockReset()
    process.env.DASHBOARD_API_ADMIN_TOKEN = 'admin-token'
  })

  it('resolves emails through dashboard-api admin profiles', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        profiles: [
          { userId: 'user-1', email: 'one@example.test' },
          { userId: 'user-2', email: null },
        ],
      },
      error: null,
      response: { ok: true, status: 200 },
    })

    const emails = await getAuthUserEmailsById(['user-1', 'user-1', 'user-2'])

    expect(apiMocks.post).toHaveBeenCalledWith('/admin/user-profiles/resolve', {
      headers: { 'X-Admin-Token': 'admin-token' },
      body: { userIds: ['user-1', 'user-2'] },
    })
    expect(emails).toEqual(
      new Map([
        ['user-1', 'one@example.test'],
        ['user-2', null],
      ])
    )
  })

  it('leaves creator data unchanged when email resolution fails', async () => {
    const items = [{ createdBy: { id: 'user-1', email: null }, value: 1 }]
    const result = await resolveCreatorEmails(items, async () => {
      throw new Error('resolver unavailable')
    })

    expect(result).toEqual(items)
  })
})
