import { describe, expect, it, vi } from 'vitest'
import { createTemplatesRepository } from '@/core/modules/templates/repository.server'

function createApiResponse<T>(input: {
  ok: boolean
  status: number
  data?: T
  error?: { message?: string } | null
}) {
  return {
    data: input.data,
    error: input.error ?? null,
    response: { ok: input.ok, status: input.status },
  }
}

function createDeps(infraPost: ReturnType<typeof vi.fn>) {
  return {
    apiClient: {
      GET: vi.fn(),
      POST: vi.fn(),
      PATCH: vi.fn(),
      DELETE: vi.fn(),
    } as unknown as Parameters<
      typeof createTemplatesRepository
    >[1]['apiClient'],
    infraClient: {
      GET: vi.fn(),
      POST: infraPost,
      PATCH: vi.fn(),
      DELETE: vi.fn(),
    } as unknown as Parameters<
      typeof createTemplatesRepository
    >[1]['infraClient'],
    authHeaders: vi.fn(() => ({ 'X-Supabase-Token': 'token' })),
    resolveAuthUserEmailsById: vi.fn(async () => new Map<string, string>()),
  }
}

const scope = { accessToken: 'token', teamId: 'team-id' }

describe('createTemplatesRepository.assignTag', () => {
  it('builds the infra target as "<templateName>:<buildId>" and forwards the tag', async () => {
    const post = vi.fn().mockResolvedValue(
      createApiResponse<{ tags: string[]; buildID: string }>({
        ok: true,
        status: 201,
        data: {
          tags: ['new-release'],
          buildID: 'bcdaef01-2345-6789-0abc-def123456789',
        },
      })
    )
    const repo = createTemplatesRepository(scope, createDeps(post))

    const result = await repo.assignTag({
      templateName: 'my-template',
      buildId: 'bcdaef01-2345-6789-0abc-def123456789',
      tag: 'new-release',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        tags: ['new-release'],
        buildID: 'bcdaef01-2345-6789-0abc-def123456789',
      },
    })
    expect(post).toHaveBeenCalledWith(
      '/templates/tags',
      expect.objectContaining({
        body: {
          target: 'my-template:bcdaef01-2345-6789-0abc-def123456789',
          tags: ['new-release'],
        },
      })
    )
  })

  it('maps a 400 response to a validation repo error preserving the server message', async () => {
    const post = vi.fn().mockResolvedValue(
      createApiResponse({
        ok: false,
        status: 400,
        error: { message: 'Invalid tag' },
      })
    )
    const repo = createTemplatesRepository(scope, createDeps(post))

    const result = await repo.assignTag({
      templateName: 'my-template',
      buildId: 'bcdaef01-2345-6789-0abc-def123456789',
      tag: 'Bad Tag',
    })

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'validation',
        status: 400,
        message: 'Invalid tag',
      }),
    })
  })

  it('maps a 404 response to a not-found repo error', async () => {
    const post = vi.fn().mockResolvedValue(
      createApiResponse({
        ok: false,
        status: 404,
        error: { message: 'Template not found' },
      })
    )
    const repo = createTemplatesRepository(scope, createDeps(post))

    const result = await repo.assignTag({
      templateName: 'unknown',
      buildId: 'bcdaef01-2345-6789-0abc-def123456789',
      tag: 'v1',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.status).toBe(404)
  })

  it('maps a 500 response to a generic repo error', async () => {
    const post = vi.fn().mockResolvedValue(
      createApiResponse({
        ok: false,
        status: 500,
        error: { message: 'duplicate key value violates unique constraint' },
      })
    )
    const repo = createTemplatesRepository(scope, createDeps(post))

    const result = await repo.assignTag({
      templateName: 'my-template',
      buildId: 'bcdaef01-2345-6789-0abc-def123456789',
      tag: 'existing',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.status).toBe(500)
    expect(result.error.message).toContain('duplicate key')
  })
})
