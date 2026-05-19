import { describe, expect, it, vi } from 'vitest'
import { createKeysRepository } from '@/core/modules/keys/repository.server'

vi.mock('@/core/shared/clients/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

function createApiResponse<T>(input: {
  ok: boolean
  status: number
  data?: T
  error?: { message?: string } | null
}) {
  return {
    data: input.data,
    error: input.error ?? null,
    response: {
      ok: input.ok,
      status: input.status,
    },
  }
}

const baseApiKey = {
  createdAt: '2026-01-01T00:00:00Z',
  id: 'api-key-id',
  mask: {
    prefix: 'e2b',
    valueLength: 16,
    maskedValuePrefix: 'abc',
    maskedValueSuffix: 'xyz',
  },
  name: 'Key',
}

describe('createKeysRepository', () => {
  it('hydrates only missing creator emails when listing API keys', async () => {
    const missingEmailUserId = '11111111-1111-1111-1111-111111111111'
    const existingEmailUserId = '22222222-2222-2222-2222-222222222222'
    const resolveAuthUserEmailsById = vi
      .fn()
      .mockResolvedValue(new Map([[missingEmailUserId, 'resolved@e2b.dev']]))

    const infraClient = {
      GET: vi.fn().mockResolvedValue(
        createApiResponse({
          ok: true,
          status: 200,
          data: [
            {
              ...baseApiKey,
              id: 'missing-email-key',
              createdBy: {
                id: missingEmailUserId,
                email: null,
              },
            },
            {
              ...baseApiKey,
              id: 'existing-email-key',
              createdBy: {
                id: existingEmailUserId,
                email: 'existing@e2b.dev',
              },
            },
          ],
        })
      ),
      POST: vi.fn(),
      DELETE: vi.fn(),
    }

    const repository = createKeysRepository(
      {
        accessToken: 'token',
        teamId: 'team-id',
      },
      {
        infraClient:
          infraClient as unknown as typeof import('@/core/shared/clients/api').infra,
        authHeaders: vi.fn(() => ({ 'X-Supabase-Token': 'token' })),
        resolveAuthUserEmailsById,
      }
    )

    const result = await repository.listTeamApiKeys()

    expect(resolveAuthUserEmailsById).toHaveBeenCalledWith([missingEmailUserId])
    expect(result).toEqual({
      ok: true,
      data: [
        expect.objectContaining({
          id: 'missing-email-key',
          createdBy: {
            id: missingEmailUserId,
            email: 'resolved@e2b.dev',
          },
        }),
        expect.objectContaining({
          id: 'existing-email-key',
          createdBy: {
            id: existingEmailUserId,
            email: 'existing@e2b.dev',
          },
        }),
      ],
    })
  })

  it('keeps API key listing usable when creator email lookup fails', async () => {
    const userId = '11111111-1111-1111-1111-111111111111'
    const resolveAuthUserEmailsById = vi
      .fn()
      .mockRejectedValue(new Error('lookup failed'))

    const apiKey = {
      ...baseApiKey,
      createdBy: {
        id: userId,
        email: null,
      },
    }

    const infraClient = {
      GET: vi.fn().mockResolvedValue(
        createApiResponse({
          ok: true,
          status: 200,
          data: [apiKey],
        })
      ),
      POST: vi.fn(),
      DELETE: vi.fn(),
    }

    const repository = createKeysRepository(
      {
        accessToken: 'token',
        teamId: 'team-id',
      },
      {
        infraClient:
          infraClient as unknown as typeof import('@/core/shared/clients/api').infra,
        authHeaders: vi.fn(() => ({ 'X-Supabase-Token': 'token' })),
        resolveAuthUserEmailsById,
      }
    )

    await expect(repository.listTeamApiKeys()).resolves.toEqual({
      ok: true,
      data: [apiKey],
    })
  })
})
